/**
 * Vaka seed — realistic Bulawayo City Council demo dataset.
 * Idempotent: wipes and rebuilds so `npm run db:seed` always yields the same demo state.
 *
 * Demo login password for every seeded user: "password123".
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { STAGE_DEFINITIONS, nextStageKey, type StageKey } from '../src/common/domain';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'password123';
const BCC_LAT = -20.15;
const BCC_LNG = 28.58;
const PHOTO = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=640&q=60';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function jitter(base: number, spread = 0.05): number {
  return base + (Math.random() - 0.5) * spread;
}

/** How far a seeded permit has progressed through the gate. */
type Progress =
  | { passed: number; currentState: 'AWAITING_PAYMENT' | 'PAID_AWAITING_INSPECTION' | 'BOOKED' }
  | { passed: number; currentState: 'INSPECTED_FAIL' }
  | { passed: 5; currentState: 'COMPLETED' };

interface PermitSpec {
  ref: string;
  standNumber: string;
  suburb: string;
  projectType: string;
  ownerName: string;
  ownerPhone: string;
  builderRegNumber: string;
  builderName: string;
  builderStatus: string;
  progress: Progress;
  createdDaysAgo: number;
}

async function main(): Promise<void> {
  // Clean (respect FK order)
  await prisma.auditLog.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.permit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.inspector.deleteMany();
  await prisma.builderRegistry.deleteMany();
  await prisma.council.deleteMany();

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  // --- Council ---------------------------------------------------------------
  const council = await prisma.council.create({
    data: { name: 'Bulawayo City Council', code: 'BCC', region: 'Bulawayo Metropolitan' },
  });

  // --- Builder registry ------------------------------------------------------
  const builders = await Promise.all([
    prisma.builderRegistry.create({
      data: { regNumber: 'BCC/2021/0412', name: 'Sibanda Construction (Pvt) Ltd', category: 'Category A', status: 'VALID', expiresAt: daysAgo(-400) },
    }),
    prisma.builderRegistry.create({
      data: { regNumber: 'CIFOZ-3389', name: 'Mthwakazi Builders', category: 'Category B', status: 'VALID', expiresAt: daysAgo(-220) },
    }),
    prisma.builderRegistry.create({
      data: { regNumber: 'BCC/2019/0088', name: 'Ndlovu & Sons', category: 'Category C', status: 'EXPIRED', expiresAt: daysAgo(180) },
    }),
    prisma.builderRegistry.create({
      data: { regNumber: 'CIFOZ-1204', name: 'Highveld Contractors', category: 'Category B', status: 'SUSPENDED', expiresAt: daysAgo(-90) },
    }),
  ]);

  // --- Inspectors + their user logins ---------------------------------------
  const moyo = await prisma.inspector.create({
    data: { name: 'Eng. T. Moyo', phone: '+263772000111', region: 'Western suburbs', baseLat: jitter(BCC_LAT), baseLng: jitter(BCC_LNG), councilId: council.id },
  });
  const ncube = await prisma.inspector.create({
    data: { name: 'Insp. R. Ncube', phone: '+263772000222', region: 'Eastern suburbs', baseLat: jitter(BCC_LAT), baseLng: jitter(BCC_LNG), councilId: council.id },
  });

  await prisma.user.createMany({
    data: [
      { email: 'owner1@demo.vaka', passwordHash, name: 'Thabo Dube', phone: '+263771111001', role: 'APPLICANT' },
      { email: 'owner2@demo.vaka', passwordHash, name: 'Nomsa Khumalo', phone: '+263771111002', role: 'APPLICANT' },
      { email: 'clerk@bcc.gov.zw', passwordHash, name: 'BCC Town Clerk Office', role: 'COUNCIL', councilId: council.id },
      { email: 'ps@mlgpw.gov.zw', passwordHash, name: 'Ministry (MLGPW)', role: 'MINISTRY' },
    ],
  });
  await prisma.user.create({ data: { email: 'moyo@bcc.gov.zw', passwordHash, name: moyo.name, role: 'INSPECTOR', councilId: council.id, inspectorId: moyo.id } });
  await prisma.user.create({ data: { email: 'ncube@bcc.gov.zw', passwordHash, name: ncube.name, role: 'INSPECTOR', councilId: council.id, inspectorId: ncube.id } });

  const inspectorIds = [moyo.id, ncube.id];

  // Map applicant users to the permits they own (by display name) for data-isolation scoping.
  const applicantUsers = await prisma.user.findMany({ where: { role: 'APPLICANT' } });
  const ownerIdByName = new Map(applicantUsers.map((u) => [u.name, u.id]));

  // --- Permits ---------------------------------------------------------------
  const specs: PermitSpec[] = [
    { ref: 'BCC-2026-00118', standNumber: 'Stand 4821 Hillside', suburb: 'Hillside', projectType: 'Single residential', ownerName: 'Thabo Dube', ownerPhone: '+263771111001', builderRegNumber: 'BCC/2021/0412', builderName: 'Sibanda Construction (Pvt) Ltd', builderStatus: 'VALID', progress: { passed: 0, currentState: 'AWAITING_PAYMENT' }, createdDaysAgo: 2 },
    { ref: 'BCC-2026-00121', standNumber: 'Stand 1190 Bradfield', suburb: 'Bradfield', projectType: 'Double-storey residential', ownerName: 'Nomsa Khumalo', ownerPhone: '+263771111002', builderRegNumber: 'CIFOZ-3389', builderName: 'Mthwakazi Builders', builderStatus: 'VALID', progress: { passed: 1, currentState: 'AWAITING_PAYMENT' }, createdDaysAgo: 9 },
    { ref: 'BCC-2026-00104', standNumber: 'Stand 88 Burnside', suburb: 'Burnside', projectType: 'Cluster homes (4 units)', ownerName: 'Greenline Developments', ownerPhone: '+263772333004', builderRegNumber: 'BCC/2021/0412', builderName: 'Sibanda Construction (Pvt) Ltd', builderStatus: 'VALID', progress: { passed: 4, currentState: 'AWAITING_PAYMENT' }, createdDaysAgo: 41 },
    { ref: 'BCC-2025-00097', standNumber: 'Stand 2204 Famona', suburb: 'Famona', projectType: 'Single residential', ownerName: 'Sipho Moyo', ownerPhone: '+263772333005', builderRegNumber: 'CIFOZ-3389', builderName: 'Mthwakazi Builders', builderStatus: 'VALID', progress: { passed: 5, currentState: 'COMPLETED' }, createdDaysAgo: 120 },
    { ref: 'BCC-2026-00125', standNumber: 'Stand 7710 Nketa', suburb: 'Nketa', projectType: 'Single residential', ownerName: 'Lungile Sibanda', ownerPhone: '+263772333006', builderRegNumber: 'BCC/2021/0412', builderName: 'Sibanda Construction (Pvt) Ltd', builderStatus: 'VALID', progress: { passed: 0, currentState: 'PAID_AWAITING_INSPECTION' }, createdDaysAgo: 4 },
    { ref: 'BCC-2026-00126', standNumber: 'Stand 305 Riverside', suburb: 'Riverside', projectType: 'Boundary wall & cottage', ownerName: 'Brian Ndlovu', ownerPhone: '+263772333007', builderRegNumber: 'CIFOZ-3389', builderName: 'Mthwakazi Builders', builderStatus: 'VALID', progress: { passed: 1, currentState: 'BOOKED' }, createdDaysAgo: 14 },
    { ref: 'BCC-2026-00112', standNumber: 'Stand 990 Pumula', suburb: 'Pumula', projectType: 'Single residential', ownerName: 'Tendai Moyo', ownerPhone: '+263772333008', builderRegNumber: 'BCC/2021/0412', builderName: 'Sibanda Construction (Pvt) Ltd', builderStatus: 'VALID', progress: { passed: 2, currentState: 'INSPECTED_FAIL' }, createdDaysAgo: 23 },
  ];

  for (const spec of specs) {
    await createPermit(council.id, inspectorIds, spec, ownerIdByName.get(spec.ownerName) ?? null);
  }

  const counts = {
    councils: await prisma.council.count(),
    users: await prisma.user.count(),
    permits: await prisma.permit.count(),
    payments: await prisma.payment.count(),
    inspections: await prisma.inspection.count(),
  };
  // eslint-disable-next-line no-console
  console.log('Seed complete:', counts);
}

async function createPermit(
  councilId: string,
  inspectorIds: string[],
  spec: PermitSpec,
  ownerUserId: string | null,
): Promise<void> {
  const permit = await prisma.permit.create({
    data: {
      ref: spec.ref,
      standNumber: spec.standNumber,
      suburb: spec.suburb,
      projectType: spec.projectType,
      ownerName: spec.ownerName,
      ownerPhone: spec.ownerPhone,
      ownerUserId,
      builderRegNumber: spec.builderRegNumber,
      builderName: spec.builderName,
      builderStatus: spec.builderStatus,
      status: spec.progress.currentState === 'COMPLETED' ? 'COMPLETED' : spec.progress.passed > 0 ? 'IN_PROGRESS' : 'APPROVED',
      councilId,
      createdAt: daysAgo(spec.createdDaysAgo),
    },
  });

  const passed = spec.progress.passed;
  for (const def of STAGE_DEFINITIONS) {
    const status = stageStatusFor(def.order, passed, spec.progress.currentState);
    const stage = await prisma.stage.create({
      data: {
        permitId: permit.id,
        key: def.key,
        label: def.label,
        order: def.order,
        amountCents: def.amountCents,
        status,
        bookedFor: status === 'BOOKED' ? daysAgo(-1) : null,
      },
    });

    // Passed stages get a paid payment + a PASS inspection.
    if (def.order < passed) {
      const when = daysAgo(spec.createdDaysAgo - (def.order + 1) * 3);
      await createPaidPayment(permit.id, stage.id, def.amountCents, when);
      await createInspection(permit.id, stage.id, pick(inspectorIds), 'PASS', when, def.label);
      await audit('SYSTEM', 'STAGE_PASSED', 'Stage', stage.id, { permit: permit.ref, stage: def.key });
    }

    // The current stage may already be paid (awaiting inspection / booked) -> record the payment.
    if (
      def.order === passed &&
      (spec.progress.currentState === 'PAID_AWAITING_INSPECTION' || spec.progress.currentState === 'BOOKED')
    ) {
      await createPaidPayment(permit.id, stage.id, def.amountCents, daysAgo(1));
    }

    // A failed current stage: paid + an inspection with result FAIL.
    if (def.order === passed && spec.progress.currentState === 'INSPECTED_FAIL') {
      const when = daysAgo(2);
      await createPaidPayment(permit.id, stage.id, def.amountCents, when);
      await createInspection(permit.id, stage.id, pick(inspectorIds), 'FAIL', when, def.label);
      await audit('INSPECTOR', 'INSPECTION_FAILED', 'Stage', stage.id, { permit: permit.ref, stage: def.key });
    }
  }

  // Completed permit -> issue certificate.
  if (spec.progress.currentState === 'COMPLETED') {
    await prisma.certificate.create({
      data: {
        permitId: permit.id,
        serial: `CoO-${permit.ref}`,
        qrToken: `vaka_${permit.ref.replace(/-/g, '').toLowerCase()}`,
      },
    });
    await audit('SYSTEM', 'CERTIFICATE_ISSUED', 'Permit', permit.id, { permit: permit.ref });
  }

  await audit('COUNCIL', 'PERMIT_APPROVED', 'Permit', permit.id, { permit: permit.ref, suburb: spec.suburb });
}

function stageStatusFor(order: number, passed: number, current: Progress['currentState']): string {
  if (order < passed) return 'INSPECTED_PASS';
  if (order > passed) return 'LOCKED';
  // order === passed (the current/active stage)
  switch (current) {
    case 'COMPLETED':
      return 'INSPECTED_PASS';
    case 'AWAITING_PAYMENT':
      return 'AWAITING_PAYMENT';
    case 'PAID_AWAITING_INSPECTION':
      return 'PAID_AWAITING_INSPECTION';
    case 'BOOKED':
      return 'BOOKED';
    case 'INSPECTED_FAIL':
      return 'INSPECTED_FAIL';
    default:
      return 'LOCKED';
  }
}

async function createPaidPayment(permitId: string, stageId: string, amountCents: number, when: Date): Promise<void> {
  const methods = ['ECOCASH', 'ONEMONEY', 'CARD'];
  await prisma.payment.create({
    data: {
      reference: `VAKA-${stageId.slice(-6)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      permitId,
      stageId,
      method: pick(methods),
      payerPhone: '+26377' + Math.floor(1000000 + Math.random() * 8999999),
      amountCents,
      status: 'PAID',
      simulated: true,
      paynowReference: `PN${Math.floor(100000 + Math.random() * 899999)}`,
      paidAt: when,
      createdAt: when,
    },
  });
}

async function createInspection(permitId: string, stageId: string, inspectorId: string, result: string, when: Date, label: string): Promise<void> {
  await prisma.inspection.create({
    data: {
      permitId,
      stageId,
      inspectorId,
      result,
      notes: result === 'PASS' ? `${label} inspected and compliant with approved plans.` : `${label} not compliant — see remediation notes. Re-inspection required.`,
      photoUrl: PHOTO,
      gpsLat: jitter(BCC_LAT),
      gpsLng: jitter(BCC_LNG),
      signedAt: when,
    },
  });
}

async function audit(actorRole: string, action: string, entity: string, entityId: string, metadata: Record<string, unknown>): Promise<void> {
  await prisma.auditLog.create({
    data: { actorRole, action, entity, entityId, metadata: JSON.stringify(metadata) },
  });
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Touch nextStageKey so the import is used as a documented part of the gate model.
void nextStageKey;

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
