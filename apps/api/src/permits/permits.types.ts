import type { InspectionResult, PaymentMethod, PaymentStatus, StageStatus } from '../common/domain';

/** Stage payment summary embedded in StageDto. */
export interface StagePaymentDto {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod;
  reference: string;
  paidAt: string | null;
}

/** Stage inspection summary embedded in StageDto. */
export interface StageInspectionDto {
  result: InspectionResult;
  signedAt: string;
  inspectorName: string;
  notes: string;
  photoUrl: string;
}

export interface StageDto {
  id: string;
  key: string;
  label: string;
  order: number;
  amountCents: number;
  currency: string;
  status: StageStatus;
  bookedFor: string | null;
  payment?: StagePaymentDto;
  inspection?: StageInspectionDto;
}

export interface PermitProgressDto {
  passed: number;
  total: number;
  currentStageKey: string | null;
  currentStatus: string | null;
}

export interface PermitCertificateDto {
  serial: string;
  qrToken: string;
  issuedAt: string;
}

export interface PermitDto {
  id: string;
  ref: string;
  standNumber: string;
  suburb: string;
  projectType: string;
  ownerName: string;
  ownerPhone: string;
  builderRegNumber: string;
  builderName: string;
  builderStatus: string;
  status: string;
  createdAt: string;
  council: { name: string; code: string };
  stages: StageDto[];
  progress: PermitProgressDto;
  certificate?: PermitCertificateDto;
}
