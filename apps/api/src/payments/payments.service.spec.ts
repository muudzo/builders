import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../common/audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StageGateService } from '../permits/stage-gate.service';
import { PaymentsService } from './payments.service';
import { PaynowService } from './paynow.service';

interface FakePayment {
  id: string;
  reference: string;
  permitId: string;
  stageId: string;
  method: string;
  payerPhone: string | null;
  amountCents: number;
  currency: string;
  status: string;
  simulated: boolean;
  paynowReference: string | null;
  pollUrl: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

function makePayment(overrides: Partial<FakePayment> = {}): FakePayment {
  return {
    id: 'pay_1',
    reference: 'VAKA-abc-1',
    permitId: 'permit_1',
    stageId: 'stage_1',
    method: 'ECOCASH',
    payerPhone: null,
    amountCents: 5000,
    currency: 'USD',
    status: 'PENDING',
    simulated: true,
    paynowReference: null,
    pollUrl: null,
    paidAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function build(initial: FakePayment) {
  let payment = initial;
  const prisma = {
    payment: {
      findUnique: jest.fn(async () => payment),
      update: jest.fn(async ({ data }: { data: Partial<FakePayment> }) => {
        payment = { ...payment, ...data };
        return payment;
      }),
    },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const stageGate = { markPaidAwaitingInspection: jest.fn().mockResolvedValue(undefined) };
  const paynow = { pollStatus: jest.fn() };

  const service = new PaymentsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    stageGate as unknown as StageGateService,
    paynow as unknown as PaynowService,
  );
  return { service, prisma, audit, stageGate, paynow };
}

describe('PaymentsService.confirm (simulation-only accelerator)', () => {
  it('force-confirms a SIMULATED pending payment and advances the gate', async () => {
    const { service, stageGate } = build(makePayment({ simulated: true, status: 'PENDING' }));
    const result = await service.confirm('pay_1', 'owner_1', 'APPLICANT');
    expect(result.status).toBe('PAID');
    expect(stageGate.markPaidAwaitingInspection).toHaveBeenCalledWith('stage_1', 'owner_1', 'APPLICANT');
  });

  it('REFUSES to force-confirm a LIVE (non-simulated) payment', async () => {
    const { service, stageGate } = build(makePayment({ simulated: false, status: 'PENDING' }));
    await expect(service.confirm('pay_1', 'owner_1', 'APPLICANT')).rejects.toThrow(BadRequestException);
    expect(stageGate.markPaidAwaitingInspection).not.toHaveBeenCalled();
  });

  it('is idempotent when the payment is already PAID', async () => {
    const { service, stageGate } = build(makePayment({ simulated: true, status: 'PAID', paidAt: new Date() }));
    const result = await service.confirm('pay_1', 'owner_1', 'APPLICANT');
    expect(result.status).toBe('PAID');
    expect(stageGate.markPaidAwaitingInspection).not.toHaveBeenCalled();
  });

  it('throws NotFound for an unknown payment', async () => {
    const { service, prisma } = build(makePayment());
    prisma.payment.findUnique.mockResolvedValueOnce(null);
    await expect(service.confirm('nope', 'owner_1', 'APPLICANT')).rejects.toThrow(NotFoundException);
  });
});

describe('PaymentsService.getStatus (live polling)', () => {
  it('does NOT poll Paynow for a simulated pending payment', async () => {
    const { service, paynow } = build(makePayment({ simulated: true, status: 'PENDING', pollUrl: '/x' }));
    const result = await service.getStatus('pay_1');
    expect(paynow.pollStatus).not.toHaveBeenCalled();
    expect(result.status).toBe('PENDING');
  });

  it('polls Paynow for a LIVE pending payment and settles it when paid', async () => {
    const { service, paynow, stageGate } = build(
      makePayment({ simulated: false, status: 'PENDING', pollUrl: 'https://paynow/poll' }),
    );
    paynow.pollStatus.mockResolvedValueOnce({ paid: true, status: 'paid' });
    const result = await service.getStatus('pay_1');
    expect(paynow.pollStatus).toHaveBeenCalledWith('https://paynow/poll');
    expect(result.status).toBe('PAID');
    expect(stageGate.markPaidAwaitingInspection).toHaveBeenCalled();
  });
});
