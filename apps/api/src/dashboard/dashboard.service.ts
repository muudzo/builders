import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { STAGE_DEFINITIONS } from '../common/domain';
import type {
  AuditDto,
  DashboardOverviewDto,
  InspectorLoadDto,
  PaymentsByMethodDto,
  ReconciliationRowDto,
  StageBreakdownDto,
} from './dashboard.types';

const RECENT_ACTIVITY_LIMIT = 100;
const QUEUE_STATUSES = ['PAID_AWAITING_INSPECTION', 'BOOKED'] as const;

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseMetadata(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<DashboardOverviewDto> {
    const todayStart = startOfToday();

    const [
      feesToday,
      feesTotal,
      activePermits,
      completedPermits,
      inspectionsToday,
      awaitingInspection,
      stageCounts,
      paymentsByMethodRaw,
      recentAuditRows,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'PAID', paidAt: { gte: todayStart } },
        _sum: { amountCents: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amountCents: true },
      }),
      this.prisma.permit.count({ where: { status: { in: ['APPROVED', 'IN_PROGRESS'] } } }),
      this.prisma.permit.count({ where: { status: 'COMPLETED' } }),
      this.prisma.inspection.count({ where: { signedAt: { gte: todayStart } } }),
      this.prisma.stage.count({ where: { status: { in: [...QUEUE_STATUSES] } } }),
      this.prisma.stage.groupBy({ by: ['key'], _count: { _all: true } }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { status: 'PAID' },
        _count: { _all: true },
        _sum: { amountCents: true },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: RECENT_ACTIVITY_LIMIT,
      }),
    ]);

    const inspectorLoad = await this.inspectorLoad();

    const stageBreakdown: StageBreakdownDto[] = STAGE_DEFINITIONS.map((def) => ({
      key: def.key,
      label: def.label,
      count: stageCounts.find((row) => row.key === def.key)?._count._all ?? 0,
    }));

    const paymentsByMethod: PaymentsByMethodDto[] = paymentsByMethodRaw.map((row) => ({
      method: row.method,
      count: row._count._all,
      amountCents: row._sum.amountCents ?? 0,
    }));

    const recentActivity: AuditDto[] = recentAuditRows.map((row) => ({
      id: row.id,
      actorRole: row.actorRole,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      metadata: parseMetadata(row.metadata),
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      feesCollectedTodayCents: feesToday._sum.amountCents ?? 0,
      feesCollectedTotalCents: feesTotal._sum.amountCents ?? 0,
      // Framing: every PAID payment is a fee now captured digitally that, on paper, was at
      // structural risk of being collected as untraceable cash. We treat the full PAID total
      // as the recovered-leakage figure for the demo narrative.
      leakageRecoveredCents: feesTotal._sum.amountCents ?? 0,
      activePermits,
      completedPermits,
      inspectionsToday,
      awaitingInspection,
      stageBreakdown,
      paymentsByMethod,
      inspectorLoad,
      recentActivity,
    };
  }

  async reconciliation(): Promise<ReconciliationRowDto[]> {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'PAID' },
      include: { permit: true, stage: true },
      orderBy: { paidAt: 'desc' },
    });

    return payments.map((payment) => ({
      reference: payment.reference,
      permitRef: payment.permit.ref,
      stageLabel: payment.stage.label,
      method: payment.method,
      amountCents: payment.amountCents,
      status: payment.status,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    }));
  }

  async auditTrail(): Promise<AuditDto[]> {
    const rows = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: RECENT_ACTIVITY_LIMIT,
    });
    return rows.map((row) => ({
      id: row.id,
      actorRole: row.actorRole,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      metadata: parseMetadata(row.metadata),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /**
   * "Load" = completed sign-offs per inspector (the only durable inspector<->stage linkage in
   * the schema; stages have no inspector assignment before sign-off). Approximates workload.
   */
  private async inspectorLoad(): Promise<InspectorLoadDto[]> {
    const grouped = await this.prisma.inspection.groupBy({
      by: ['inspectorId'],
      _count: { _all: true },
    });
    if (grouped.length === 0) return [];

    const inspectors = await this.prisma.inspector.findMany({
      where: { id: { in: grouped.map((row) => row.inspectorId) } },
    });

    return grouped.map((row) => ({
      inspectorName: inspectors.find((i) => i.id === row.inspectorId)?.name ?? 'Unknown inspector',
      jobs: row._count._all,
    }));
  }
}
