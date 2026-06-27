import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { StageGateService } from '../permits/stage-gate.service';
import type { PaymentStatus, Role } from '../common/domain';
import { PaynowService } from './paynow.service';
import type { InitiatePaymentDto } from './dto/initiate-payment.dto';
import type { PaynowCallbackDto } from './dto/paynow-callback.dto';
import type { InitiatePaymentResult, PaymentStatusDto } from './payments.types';

const SIMULATED_AUTO_PAY_DELAY_MS = 5_000;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stageGate: StageGateService,
    private readonly paynow: PaynowService,
  ) {}

  async initiate(dto: InitiatePaymentDto, actorId: string, actorRole: Role): Promise<InitiatePaymentResult> {
    const stage = await this.stageGate.getStageOrThrow(dto.stageId);
    this.stageGate.assertStatus(stage, ['AWAITING_PAYMENT']);

    const reference = `VAKA-${stage.id.slice(-6)}-${Date.now().toString(36).toUpperCase()}`;

    const paynowResult = await this.paynow.initiate({
      reference,
      amountCents: stage.amountCents,
      method: dto.method,
      payerPhone: dto.payerPhone,
    });

    const payment = await this.prisma.payment.create({
      data: {
        reference,
        permitId: stage.permitId,
        stageId: stage.id,
        method: dto.method,
        payerPhone: dto.payerPhone,
        amountCents: stage.amountCents,
        status: 'PENDING',
        simulated: paynowResult.simulated,
        paynowReference: paynowResult.paynowReference,
        pollUrl: paynowResult.pollUrl,
      },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'PAYMENT_INITIATED',
      entity: 'Payment',
      entityId: payment.id,
      metadata: { stageId: stage.id, permitId: stage.permitId, method: dto.method, amountCents: stage.amountCents },
    });

    if (paynowResult.simulated) {
      this.scheduleSimulatedAutoPay(payment.id, actorId, actorRole);
    }

    return {
      paymentId: payment.id,
      reference: payment.reference,
      status: 'PENDING',
      instructions: paynowResult.instructions,
      pollUrl: `/api/payments/${payment.id}`,
      simulated: paynowResult.simulated,
      redirectUrl: paynowResult.redirectUrl,
    };
  }

  async getStatus(paymentId: string): Promise<PaymentStatusDto> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    // Real Paynow payments: poll Paynow for the authoritative status while still pending.
    // This is what makes the frontend's existing GET-poll settle live transactions (the
    // result-URL callback may be unreachable in local/dev, so outbound polling is the
    // reliable path).
    if (!payment.simulated && payment.status === 'PENDING' && payment.pollUrl) {
      const result = await this.paynow.pollStatus(payment.pollUrl);
      if (result.paid) {
        const paid = await this.markPaid(payment.id, null, 'SYSTEM');
        return this.toStatusDto(paid);
      }
      if (result.status === 'cancelled' || result.status === 'failed') {
        const failed = await this.markFailed(payment.id, result.status);
        return this.toStatusDto(failed);
      }
    }

    return this.toStatusDto(payment);
  }

  /** Demo accelerator: force a simulated PENDING payment to PAID immediately. */
  async confirm(paymentId: string, actorId: string, actorRole: Role): Promise<PaymentStatusDto> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    if (payment.status === 'PAID') {
      return this.toStatusDto(payment);
    }
    // Security: the force-confirm accelerator is for the simulation demo ONLY. A live Paynow
    // payment can only be settled by polling Paynow's authoritative status.
    if (!payment.simulated) {
      throw new BadRequestException(
        'Live payments cannot be force-confirmed — complete the payment on your phone or the Paynow page.',
      );
    }
    if (payment.status !== 'PENDING') {
      throw new BadRequestException(`Payment ${paymentId} is '${payment.status}'; cannot confirm`);
    }

    const paid = await this.markPaid(payment.id, actorId, actorRole);
    return this.toStatusDto(paid);
  }

  /** Reconcile a real Paynow result-URL callback. No-op-safe in simulation mode (route is @Public). */
  async handlePaynowCallback(dto: PaynowCallbackDto): Promise<{ ok: true }> {
    const payment = await this.prisma.payment.findUnique({ where: { reference: dto.reference } });
    if (!payment) {
      this.logger.warn(`Paynow callback for unknown reference: ${dto.reference}`);
      return { ok: true };
    }
    if (payment.status !== 'PENDING') {
      return { ok: true }; // already reconciled
    }

    // Never trust the POSTed status alone — re-poll Paynow for the authoritative result.
    let status = dto.status.toLowerCase();
    const pollUrl = dto.pollurl ?? payment.pollUrl ?? undefined;
    if (!payment.simulated && pollUrl) {
      const polled = await this.paynow.pollStatus(pollUrl);
      status = polled.paid ? 'paid' : polled.status;
    }

    if (status === 'paid') {
      await this.markPaid(payment.id, null, 'SYSTEM');
    } else if (status === 'cancelled' || status === 'failed') {
      await this.markFailed(payment.id, status);
    }

    return { ok: true };
  }

  private async markFailed(
    paymentId: string,
    reason: string,
  ): Promise<{ id: string; status: string; method: string; amountCents: number; reference: string; paidAt: Date | null }> {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: reason === 'cancelled' ? 'CANCELLED' : 'FAILED' },
    });
    await this.audit.record({
      actorId: null,
      actorRole: 'SYSTEM',
      action: 'PAYMENT_FAILED',
      entity: 'Payment',
      entityId: payment.id,
      metadata: { reference: payment.reference, status: reason },
    });
    return payment;
  }

  private scheduleSimulatedAutoPay(paymentId: string, actorId: string, actorRole: Role): void {
    setTimeout(() => {
      this.markPaid(paymentId, actorId, actorRole).catch((err: unknown) => {
        this.logger.error(`Simulated auto-pay failed for payment ${paymentId}`, err as Error);
      });
    }, SIMULATED_AUTO_PAY_DELAY_MS);
  }

  /** Transition a PENDING payment to PAID, then advance the stage gate. Idempotent on PAID. */
  private async markPaid(
    paymentId: string,
    actorId: string | null,
    actorRole: Role | 'SYSTEM',
  ): Promise<{ id: string; status: string; method: string; amountCents: number; reference: string; paidAt: Date | null; stageId: string }> {
    const existing = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!existing) throw new NotFoundException(`Payment ${paymentId} not found`);
    if (existing.status === 'PAID') return existing;

    const paidAt = new Date();
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID', paidAt },
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'PAYMENT_PAID',
      entity: 'Payment',
      entityId: payment.id,
      metadata: { stageId: payment.stageId, permitId: payment.permitId, amountCents: payment.amountCents },
    });

    await this.stageGate.markPaidAwaitingInspection(payment.stageId, actorId, actorRole);

    return payment;
  }

  private toStatusDto(payment: {
    id: string;
    status: string;
    method: string;
    amountCents: number;
    reference: string;
    paidAt: Date | null;
  }): PaymentStatusDto {
    return {
      id: payment.id,
      status: payment.status as PaymentStatus,
      method: payment.method as PaymentStatusDto['method'],
      amountCents: payment.amountCents,
      reference: payment.reference,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    };
  }
}
