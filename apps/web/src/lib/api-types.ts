/**
 * Shapes returned by the Vaka REST API, mirroring CONTRACT.md "Shared DTO shapes" exactly.
 */
import type {
  BuilderStatus,
  InspectionResult,
  PaymentMethod,
  PaymentStatus,
  PermitStatus,
  Role,
  StageStatus,
} from './domain';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: Role;
  councilId: string | null;
  inspectorId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface StagePaymentDto {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod;
  reference: string;
  paidAt: string | null;
}

export interface StageInspectionDto {
  result: InspectionResult;
  signedAt: string;
  inspectorName: string;
  notes: string | null;
  photoUrl: string | null;
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
  builderName: string | null;
  builderStatus: BuilderStatus;
  status: PermitStatus;
  createdAt: string;
  council: { name: string; code: string };
  stages: StageDto[];
  progress: PermitProgressDto;
  certificate?: PermitCertificateDto;
}

export interface CreatePermitPayload {
  standNumber: string;
  suburb: string;
  projectType: string;
  ownerName: string;
  ownerPhone: string;
  builderRegNumber: string;
}

export interface InitiatePaymentPayload {
  stageId: string;
  method: PaymentMethod;
  payerPhone?: string;
}

export interface InitiatePaymentResponse {
  paymentId: string;
  reference: string;
  status: PaymentStatus;
  instructions: string;
  pollUrl: string;
  /** True in simulation mode (no Paynow credentials) — the demo accelerator is allowed. */
  simulated: boolean;
  /** Present for web/card payments — redirect the payer here to complete on Paynow. */
  redirectUrl?: string;
}

export interface PaymentStatusDto {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amountCents: number;
  reference: string;
  paidAt: string | null;
}

export interface InspectionJobDto {
  stageId: string;
  permitRef: string;
  stageKey: string;
  stageLabel: string;
  suburb: string;
  standNumber: string;
  ownerName: string;
  status: StageStatus;
  bookedFor: string | null;
  amountCents: number;
  gps: { lat: number; lng: number };
  distanceKm: number;
}

export interface BookInspectionPayload {
  stageId: string;
  date: string;
}

export interface SignOffPayload {
  stageId: string;
  result: InspectionResult;
  notes: string;
  photoUrl?: string;
  gpsLat?: number;
  gpsLng?: number;
}

export interface SignOffResponse {
  stage: StageDto;
  nextStageKey?: string;
  certificate?: PermitCertificateDto;
}

export interface RegistryEntryDto {
  regNumber: string;
  found: boolean;
  name?: string;
  category?: string;
  status: BuilderStatus;
  expiresAt?: string;
}

export interface DashboardStageBreakdownDto {
  key: string;
  label: string;
  count: number;
}

export interface DashboardPaymentsByMethodDto {
  method: PaymentMethod;
  count: number;
  amountCents: number;
}

export interface DashboardInspectorLoadDto {
  inspectorName: string;
  jobs: number;
}

export interface AuditDto {
  id: string;
  actorRole: Role;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardOverviewDto {
  feesCollectedTodayCents: number;
  feesCollectedTotalCents: number;
  leakageRecoveredCents: number;
  activePermits: number;
  completedPermits: number;
  inspectionsToday: number;
  awaitingInspection: number;
  stageBreakdown: DashboardStageBreakdownDto[];
  paymentsByMethod: DashboardPaymentsByMethodDto[];
  inspectorLoad: DashboardInspectorLoadDto[];
  recentActivity: AuditDto[];
}

export interface ReconciliationRowDto {
  reference: string;
  permitRef: string;
  stageLabel: string;
  method: PaymentMethod;
  amountCents: number;
  status: PaymentStatus;
  paidAt: string | null;
}

export interface CertificateVerifyDto {
  valid: boolean;
  permitRef?: string;
  ownerName?: string;
  suburb?: string;
  standNumber?: string;
  serial?: string;
  issuedAt?: string;
}
