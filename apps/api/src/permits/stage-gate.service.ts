import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Stage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { isFinalStage, nextStageKey, type InspectionResult, type Role, type StageKey } from '../common/domain';

export interface SignOffInput {
  stageId: string;
  result: InspectionResult;
  notes: string;
  photoUrl: string;
  gpsLat: number;
  gpsLng: number;
  inspectorId: string;
  actorId: string;
  actorRole: Role;
}

export interface SignOffOutcome {
  stage: Stage;
  nextStageKey: string | null;
  certificate: { serial: string; qrToken: string; issuedAt: string } | null;
}

/**
 * The single source of truth for the stage-gate state machine. Every transition between
 * stage statuses must go through here so the rule "a stage unlocks only after the previous
 * stage is INSPECTED_PASS" can never be duplicated or drift between modules.
 */
@Injectable()
export class StageGateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Fetch a stage or throw 404. */
  async getStageOrThrow(stageId: string): Promise<Stage> {
    const stage = await this.prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    return stage;
  }

  /** Require the stage to currently be in one of the given statuses, else 400. */
  assertStatus(stage: Stage, allowed: readonly string[]): void {
    if (!allowed.includes(stage.status)) {
      throw new BadRequestException(
        `Stage ${stage.key} is '${stage.status}'; expected one of [${allowed.join(', ')}]`,
      );
    }
  }

  /** APPLICANTs may only act on stages of permits they own; other roles act broadly. */
  async assertActorMayAct(stage: Stage, actorId: string | null, actorRole: Role | 'SYSTEM'): Promise<void> {
    if (actorRole !== 'APPLICANT') return;
    const permit = await this.prisma.permit.findUnique({
      where: { id: stage.permitId },
      select: { ownerUserId: true },
    });
    if (!permit || permit.ownerUserId !== actorId) {
      throw new ForbiddenException('You can only act on your own permit');
    }
  }

  /**
   * Mark a stage PAID_AWAITING_INSPECTION after its fee has been paid.
   * Requires the stage to currently be AWAITING_PAYMENT.
   */
  async markPaidAwaitingInspection(
    stageId: string,
    actorId: string | null,
    actorRole: Role | 'SYSTEM',
  ): Promise<Stage> {
    const stage = await this.getStageOrThrow(stageId);
    this.assertStatus(stage, ['AWAITING_PAYMENT']);

    const updated = await this.prisma.stage.update({
      where: { id: stage.id },
      data: { status: 'PAID_AWAITING_INSPECTION' },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'STAGE_AWAITING_INSPECTION',
      entity: 'Stage',
      entityId: stage.id,
      metadata: { permitId: stage.permitId, stageKey: stage.key },
    });

    return updated;
  }

  /** Book an inspection date. Requires PAID_AWAITING_INSPECTION. */
  async book(stageId: string, date: Date, actorId: string, actorRole: Role): Promise<Stage> {
    const stage = await this.getStageOrThrow(stageId);
    await this.assertActorMayAct(stage, actorId, actorRole);
    this.assertStatus(stage, ['PAID_AWAITING_INSPECTION']);

    const updated = await this.prisma.stage.update({
      where: { id: stage.id },
      data: { status: 'BOOKED', bookedFor: date },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'STAGE_BOOKED',
      entity: 'Stage',
      entityId: stage.id,
      metadata: { permitId: stage.permitId, stageKey: stage.key, bookedFor: date.toISOString() },
    });

    return updated;
  }

  /**
   * Record an inspector sign-off. Requires the stage to be PAID_AWAITING_INSPECTION or BOOKED.
   * PASS: stage -> INSPECTED_PASS, unlock the next stage (LOCKED -> AWAITING_PAYMENT); if this
   * was the final stage, issue a Certificate and mark the permit COMPLETED.
   * FAIL: stage -> INSPECTED_FAIL.
   */
  async signOff(input: SignOffInput): Promise<SignOffOutcome> {
    const stage = await this.getStageOrThrow(input.stageId);
    this.assertStatus(stage, ['PAID_AWAITING_INSPECTION', 'BOOKED']);

    const existing = await this.prisma.inspection.findUnique({ where: { stageId: stage.id } });
    if (existing) {
      throw new BadRequestException(`Stage ${stage.key} already has a recorded inspection`);
    }

    const newStatus = input.result === 'FAIL' ? 'INSPECTED_FAIL' : 'INSPECTED_PASS';

    // Atomic: the inspection record and the stage's status change commit together, so an
    // inspection can never exist without the matching gate transition (or vice versa).
    const [, updatedStage] = await this.prisma.$transaction([
      this.prisma.inspection.create({
        data: {
          permitId: stage.permitId,
          stageId: stage.id,
          inspectorId: input.inspectorId,
          result: input.result,
          notes: input.notes,
          photoUrl: input.photoUrl,
          gpsLat: input.gpsLat,
          gpsLng: input.gpsLng,
        },
      }),
      this.prisma.stage.update({ where: { id: stage.id }, data: { status: newStatus } }),
    ]);

    await this.audit.record({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.result === 'FAIL' ? 'INSPECTION_FAILED' : 'INSPECTION_PASSED',
      entity: 'Stage',
      entityId: stage.id,
      metadata: { permitId: stage.permitId, stageKey: stage.key },
    });

    if (input.result === 'FAIL') {
      return { stage: updatedStage, nextStageKey: null, certificate: null };
    }

    const key = stage.key as StageKey;
    if (isFinalStage(key)) {
      const certificate = await this.issueCertificate(stage.permitId, input.actorId, input.actorRole);
      return { stage: updatedStage, nextStageKey: null, certificate };
    }

    const unlockedKey = await this.unlockNextStage(stage.permitId, key, input.actorId, input.actorRole);
    return { stage: updatedStage, nextStageKey: unlockedKey, certificate: null };
  }

  /** Return a failed stage to remediation: INSPECTED_FAIL -> PAID_AWAITING_INSPECTION. No re-pay. */
  async reRequest(stageId: string, actorId: string, actorRole: Role): Promise<Stage> {
    const stage = await this.getStageOrThrow(stageId);
    await this.assertActorMayAct(stage, actorId, actorRole);
    this.assertStatus(stage, ['INSPECTED_FAIL']);

    const updated = await this.prisma.stage.update({
      where: { id: stage.id },
      data: { status: 'PAID_AWAITING_INSPECTION' },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'INSPECTION_RE_REQUESTED',
      entity: 'Stage',
      entityId: stage.id,
      metadata: { permitId: stage.permitId, stageKey: stage.key },
    });

    return updated;
  }

  private async unlockNextStage(
    permitId: string,
    currentKey: StageKey,
    actorId: string,
    actorRole: Role,
  ): Promise<string | null> {
    const nextKey = nextStageKey(currentKey);
    if (!nextKey) return null;

    const next = await this.prisma.stage.findUnique({
      where: { permitId_key: { permitId, key: nextKey } },
    });
    if (!next) return null;
    this.assertStatus(next, ['LOCKED']);

    await this.prisma.stage.update({
      where: { id: next.id },
      data: { status: 'AWAITING_PAYMENT' },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'STAGE_UNLOCKED',
      entity: 'Stage',
      entityId: next.id,
      metadata: { permitId, stageKey: nextKey },
    });

    return nextKey;
  }

  private async issueCertificate(
    permitId: string,
    actorId: string,
    actorRole: Role,
  ): Promise<{ serial: string; qrToken: string; issuedAt: string }> {
    const permit = await this.prisma.permit.findUnique({ where: { id: permitId } });
    if (!permit) throw new NotFoundException(`Permit ${permitId} not found`);

    const serial = `CoO-${permit.ref}`;
    const qrToken = `vaka_${permit.ref.replace(/-/g, '').toLowerCase()}_${Date.now().toString(36)}`;

    const certificate = await this.prisma.certificate.create({
      data: { permitId, serial, qrToken },
    });

    await this.prisma.permit.update({
      where: { id: permitId },
      data: { status: 'COMPLETED' },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'CERTIFICATE_ISSUED',
      entity: 'Permit',
      entityId: permitId,
      metadata: { permitRef: permit.ref, serial, qrToken },
    });

    return { serial, qrToken, issuedAt: certificate.issuedAt.toISOString() };
  }
}
