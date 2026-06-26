import { BadRequestException } from '@nestjs/common';
import { AuditService } from '../common/audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StageGateService } from './stage-gate.service';

/** A minimal in-memory shape mirroring the Prisma rows StageGateService touches. */
interface FakeStage {
  id: string;
  permitId: string;
  key: string;
  label: string;
  order: number;
  amountCents: number;
  currency: string;
  status: string;
  bookedFor: Date | null;
}

interface FakePermit {
  id: string;
  ref: string;
  status: string;
}

interface FakeInspection {
  id: string;
  permitId: string;
  stageId: string;
  inspectorId: string;
  result: string;
}

interface FakeCertificate {
  id: string;
  permitId: string;
  serial: string;
  qrToken: string;
  issuedAt: Date;
}

/**
 * In-memory Prisma test double. Implements exactly the subset of the PrismaClient surface
 * StageGateService calls, so tests run without a real database (per CONTRACT/testing rules).
 */
class FakePrismaService {
  stages = new Map<string, FakeStage>();
  permits = new Map<string, FakePermit>();
  inspections = new Map<string, FakeInspection>();
  certificates: FakeCertificate[] = [];

  stage = {
    findUnique: async ({ where }: { where: { id?: string; permitId_key?: { permitId: string; key: string } } }) => {
      if (where.id) return this.stages.get(where.id) ?? null;
      if (where.permitId_key) {
        const { permitId, key } = where.permitId_key;
        return [...this.stages.values()].find((s) => s.permitId === permitId && s.key === key) ?? null;
      }
      return null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<FakeStage> }) => {
      const existing = this.stages.get(where.id);
      if (!existing) throw new Error('stage not found');
      const updated = { ...existing, ...data };
      this.stages.set(where.id, updated);
      return updated;
    },
  };

  permit = {
    findUnique: async ({ where }: { where: { id: string } }) => this.permits.get(where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<FakePermit> }) => {
      const existing = this.permits.get(where.id);
      if (!existing) throw new Error('permit not found');
      const updated = { ...existing, ...data };
      this.permits.set(where.id, updated);
      return updated;
    },
  };

  inspection = {
    findUnique: async ({ where }: { where: { stageId: string } }) =>
      [...this.inspections.values()].find((i) => i.stageId === where.stageId) ?? null,
    create: async ({ data }: { data: Omit<FakeInspection, 'id'> }) => {
      const id = `insp_${this.inspections.size + 1}`;
      const record = { id, ...data };
      this.inspections.set(id, record);
      return record;
    },
  };

  certificate = {
    create: async ({ data }: { data: { permitId: string; serial: string; qrToken: string } }) => {
      const record: FakeCertificate = { id: `cert_${this.certificates.length + 1}`, issuedAt: new Date(), ...data };
      this.certificates.push(record);
      return record;
    },
  };
}

function buildHarness() {
  const fakePrisma = new FakePrismaService();
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const gate = new StageGateService(fakePrisma as unknown as PrismaService, audit);
  return { fakePrisma, audit, gate };
}

function seedPermitWithStages(fakePrisma: FakePrismaService): { permitId: string; stageIds: Record<string, string> } {
  const permitId = 'permit_1';
  fakePrisma.permits.set(permitId, { id: permitId, ref: 'BCC-2026-00001', status: 'APPROVED' });

  const defs = [
    { key: 'FOUNDATION', order: 0, status: 'PAID_AWAITING_INSPECTION' },
    { key: 'DPC', order: 1, status: 'LOCKED' },
    { key: 'DRAINAGE', order: 2, status: 'LOCKED' },
    { key: 'SUPERSTRUCTURE', order: 3, status: 'LOCKED' },
    { key: 'FINAL', order: 4, status: 'LOCKED' },
  ];

  const stageIds: Record<string, string> = {};
  defs.forEach((def, i) => {
    const id = `stage_${i + 1}`;
    stageIds[def.key] = id;
    fakePrisma.stages.set(id, {
      id,
      permitId,
      key: def.key,
      label: def.key,
      order: def.order,
      amountCents: 5000,
      currency: 'USD',
      status: def.status,
      bookedFor: null,
    });
  });

  return { permitId, stageIds };
}

describe('StageGateService', () => {
  it('unlocks the next stage (LOCKED -> AWAITING_PAYMENT) when the current stage PASSes', async () => {
    const { fakePrisma, gate } = buildHarness();
    const { stageIds } = seedPermitWithStages(fakePrisma);

    const outcome = await gate.signOff({
      stageId: stageIds.FOUNDATION,
      result: 'PASS',
      notes: 'Looks good',
      photoUrl: 'https://example.com/photo.jpg',
      gpsLat: -20.15,
      gpsLng: 28.58,
      inspectorId: 'inspector_1',
      actorId: 'inspector_1',
      actorRole: 'INSPECTOR',
    });

    expect(outcome.stage.status).toBe('INSPECTED_PASS');
    expect(outcome.nextStageKey).toBe('DPC');
    expect(outcome.certificate).toBeNull();

    const dpc = fakePrisma.stages.get(stageIds.DPC);
    expect(dpc?.status).toBe('AWAITING_PAYMENT');
  });

  it('refuses to mark a LOCKED stage as paid-awaiting-inspection (a locked stage cannot be paid)', async () => {
    const { fakePrisma, gate } = buildHarness();
    const { stageIds } = seedPermitWithStages(fakePrisma);

    // DPC starts LOCKED; nothing has unlocked it yet, so it cannot transition as if paid.
    await expect(gate.markPaidAwaitingInspection(stageIds.DPC, 'owner_1', 'APPLICANT')).rejects.toThrow(
      BadRequestException,
    );

    const dpc = fakePrisma.stages.get(stageIds.DPC);
    expect(dpc?.status).toBe('LOCKED');
  });

  it('issues a certificate and completes the permit when the FINAL stage PASSes', async () => {
    const { fakePrisma, gate } = buildHarness();
    const { permitId, stageIds } = seedPermitWithStages(fakePrisma);

    // Move FINAL into an inspectable state directly (skipping the intermediate stages,
    // which is fine for this unit — we are testing the FINAL-stage completion behavior only).
    const finalStage = fakePrisma.stages.get(stageIds.FINAL);
    if (!finalStage) throw new Error('seed error');
    fakePrisma.stages.set(stageIds.FINAL, { ...finalStage, status: 'BOOKED' });

    const outcome = await gate.signOff({
      stageId: stageIds.FINAL,
      result: 'PASS',
      notes: 'Final inspection complete',
      photoUrl: 'https://example.com/final.jpg',
      gpsLat: -20.15,
      gpsLng: 28.58,
      inspectorId: 'inspector_2',
      actorId: 'inspector_2',
      actorRole: 'INSPECTOR',
    });

    expect(outcome.stage.status).toBe('INSPECTED_PASS');
    expect(outcome.nextStageKey).toBeNull();
    expect(outcome.certificate).not.toBeNull();
    expect(outcome.certificate?.serial).toBe('CoO-BCC-2026-00001');

    const permit = fakePrisma.permits.get(permitId);
    expect(permit?.status).toBe('COMPLETED');
    expect(fakePrisma.certificates).toHaveLength(1);
  });

  it('returns a FAILed stage to remediation via re-request without re-payment', async () => {
    const { fakePrisma, gate } = buildHarness();
    const { stageIds } = seedPermitWithStages(fakePrisma);

    await gate.signOff({
      stageId: stageIds.FOUNDATION,
      result: 'FAIL',
      notes: 'Footing not compliant',
      photoUrl: 'https://example.com/fail.jpg',
      gpsLat: -20.15,
      gpsLng: 28.58,
      inspectorId: 'inspector_1',
      actorId: 'inspector_1',
      actorRole: 'INSPECTOR',
    });

    let foundation = fakePrisma.stages.get(stageIds.FOUNDATION);
    expect(foundation?.status).toBe('INSPECTED_FAIL');

    await gate.reRequest(stageIds.FOUNDATION, 'owner_1', 'APPLICANT');

    foundation = fakePrisma.stages.get(stageIds.FOUNDATION);
    expect(foundation?.status).toBe('PAID_AWAITING_INSPECTION');
  });
});
