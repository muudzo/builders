export interface AuditDto {
  id: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface StageBreakdownDto {
  key: string;
  label: string;
  count: number;
}

export interface PaymentsByMethodDto {
  method: string;
  count: number;
  amountCents: number;
}

export interface InspectorLoadDto {
  inspectorName: string;
  jobs: number;
}

export interface DashboardOverviewDto {
  feesCollectedTodayCents: number;
  feesCollectedTotalCents: number;
  leakageRecoveredCents: number;
  activePermits: number;
  completedPermits: number;
  inspectionsToday: number;
  awaitingInspection: number;
  stageBreakdown: StageBreakdownDto[];
  paymentsByMethod: PaymentsByMethodDto[];
  inspectorLoad: InspectorLoadDto[];
  recentActivity: AuditDto[];
}

export interface ReconciliationRowDto {
  reference: string;
  permitRef: string;
  stageLabel: string;
  method: string;
  amountCents: number;
  status: string;
  paidAt: string | null;
}
