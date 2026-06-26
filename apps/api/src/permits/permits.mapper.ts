import type {
  Certificate,
  Council,
  Inspection,
  Inspector,
  Payment,
  Permit,
  Stage,
} from '@prisma/client';
import type { InspectionResult, PaymentMethod, PaymentStatus, StageStatus } from '../common/domain';
import type { PermitDto, StageDto } from './permits.types';

/** A Stage row with its related payments + inspection (+ inspector for the name) loaded. */
export type StageWithRelations = Stage & {
  payments: Payment[];
  inspection: (Inspection & { inspector: Inspector }) | null;
};

/** A Permit row with everything needed to build a full PermitDto. */
export type PermitWithRelations = Permit & {
  council: Council;
  stages: StageWithRelations[];
  certificate: Certificate | null;
};

/** Pick the most relevant payment for a stage: prefer PAID, else the most recent. */
function latestPaymentFor(payments: Payment[]): Payment | undefined {
  if (payments.length === 0) return undefined;
  const paid = payments.find((p) => p.status === 'PAID');
  if (paid) return paid;
  return [...payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export function toStageDto(stage: StageWithRelations): StageDto {
  const payment = latestPaymentFor(stage.payments);
  const inspection = stage.inspection;

  return {
    id: stage.id,
    key: stage.key,
    label: stage.label,
    order: stage.order,
    amountCents: stage.amountCents,
    currency: stage.currency,
    status: stage.status as StageStatus,
    bookedFor: stage.bookedFor ? stage.bookedFor.toISOString() : null,
    ...(payment
      ? {
          payment: {
            id: payment.id,
            status: payment.status as PaymentStatus,
            method: payment.method as PaymentMethod,
            reference: payment.reference,
            paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
          },
        }
      : {}),
    ...(inspection
      ? {
          inspection: {
            result: inspection.result as InspectionResult,
            signedAt: inspection.signedAt.toISOString(),
            inspectorName: inspection.inspector.name,
            notes: inspection.notes,
            photoUrl: inspection.photoUrl,
          },
        }
      : {}),
  };
}

function computeProgress(stages: StageWithRelations[]): PermitDto['progress'] {
  const ordered = [...stages].sort((a, b) => a.order - b.order);
  const passed = ordered.filter((s) => s.status === 'INSPECTED_PASS').length;
  const current = ordered.find((s) => s.status !== 'INSPECTED_PASS');
  return {
    passed,
    total: ordered.length,
    currentStageKey: current ? current.key : null,
    currentStatus: current ? current.status : null,
  };
}

export function toPermitDto(permit: PermitWithRelations): PermitDto {
  const stages = [...permit.stages].sort((a, b) => a.order - b.order);
  return {
    id: permit.id,
    ref: permit.ref,
    standNumber: permit.standNumber,
    suburb: permit.suburb,
    projectType: permit.projectType,
    ownerName: permit.ownerName,
    ownerPhone: permit.ownerPhone,
    builderRegNumber: permit.builderRegNumber,
    builderName: permit.builderName,
    builderStatus: permit.builderStatus,
    status: permit.status,
    createdAt: permit.createdAt.toISOString(),
    council: { name: permit.council.name, code: permit.council.code },
    stages: stages.map(toStageDto),
    progress: computeProgress(stages),
    ...(permit.certificate
      ? {
          certificate: {
            serial: permit.certificate.serial,
            qrToken: permit.certificate.qrToken,
            issuedAt: permit.certificate.issuedAt.toISOString(),
          },
        }
      : {}),
  };
}

/** Standard Prisma `include` shape to fetch everything toPermitDto needs. */
export const PERMIT_INCLUDE = {
  council: true,
  certificate: true,
  stages: {
    include: {
      payments: true,
      inspection: { include: { inspector: true } },
    },
  },
} as const;
