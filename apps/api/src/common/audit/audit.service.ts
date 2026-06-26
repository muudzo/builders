import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Role } from '../domain';

export interface AuditEntry {
  actorId?: string | null;
  actorRole: Role | 'SYSTEM' | 'ANON';
  /** Verb-ish action key, e.g. 'PAYMENT_PAID', 'STAGE_UNLOCKED', 'INSPECTION_SIGNED'. */
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only audit trail. Every money / state transition must call `record`.
 * Writes are best-effort logged but never throw into the request path.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          actorRole: entry.actorRole,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          metadata: JSON.stringify(entry.metadata ?? {}),
        },
      });
    } catch (err) {
      // Audit must never break the business operation; surface loudly instead.
      this.logger.error(`Failed to write audit entry ${entry.action}`, err as Error);
    }
  }
}
