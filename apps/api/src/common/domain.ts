/**
 * Vaka domain contract — single source of truth for roles, the inspection stage gate,
 * statuses, and the fee schedule. Shared shape mirrored on the frontend in web/src/lib/domain.ts.
 *
 * Stored as string unions because SQLite has no native enum type.
 */

export const ROLES = ['APPLICANT', 'INSPECTOR', 'COUNCIL', 'MINISTRY'] as const;
export type Role = (typeof ROLES)[number];

export const STAGE_KEYS = [
  'FOUNDATION',
  'DPC',
  'DRAINAGE',
  'SUPERSTRUCTURE',
  'FINAL',
] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export const STAGE_STATUSES = [
  'LOCKED',
  'AWAITING_PAYMENT',
  'PAID_AWAITING_INSPECTION',
  'BOOKED',
  'INSPECTED_PASS',
  'INSPECTED_FAIL',
] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

export const PERMIT_STATUSES = ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type PermitStatus = (typeof PERMIT_STATUSES)[number];

export const PAYMENT_METHODS = ['ECOCASH', 'ONEMONEY', 'CARD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['CREATED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BUILDER_STATUSES = ['VALID', 'EXPIRED', 'SUSPENDED', 'UNREGISTERED'] as const;
export type BuilderStatus = (typeof BUILDER_STATUSES)[number];

export const INSPECTION_RESULTS = ['PASS', 'FAIL'] as const;
export type InspectionResult = (typeof INSPECTION_RESULTS)[number];

/**
 * The five statutory inspection stages, in order, with their fee (USD cents).
 * Fees are placeholders pending the beachhead council's gazetted schedule — see research.md [validate].
 */
export interface StageDefinition {
  key: StageKey;
  label: string;
  order: number;
  amountCents: number;
  /** What the inspector is actually checking on site. */
  inspects: string;
}

export const STAGE_DEFINITIONS: readonly StageDefinition[] = [
  { key: 'FOUNDATION', label: 'Foundation', order: 0, amountCents: 5000, inspects: 'Footing / excavation before concrete pour' },
  { key: 'DPC', label: 'DPC / Slab', order: 1, amountCents: 4000, inspects: 'Damp-proof course at slab level' },
  { key: 'DRAINAGE', label: 'Drainage', order: 2, amountCents: 3000, inspects: 'Drainage installation and falls' },
  { key: 'SUPERSTRUCTURE', label: 'Superstructure', order: 3, amountCents: 6000, inspects: 'Walls and structure to wall-plate' },
  { key: 'FINAL', label: 'Final / Occupation', order: 4, amountCents: 8000, inspects: 'Final inspection for Certificate of Occupation' },
] as const;

export function stageDefByKey(key: string): StageDefinition | undefined {
  return STAGE_DEFINITIONS.find((s) => s.key === key);
}

/** The next stage key in the gate, or null if `key` is the final stage. */
export function nextStageKey(key: StageKey): StageKey | null {
  const def = stageDefByKey(key);
  if (!def) return null;
  const next = STAGE_DEFINITIONS.find((s) => s.order === def.order + 1);
  return next ? next.key : null;
}

export function isFinalStage(key: StageKey): boolean {
  return nextStageKey(key) === null;
}

/** Format USD cents as a display string, e.g. 5000 -> "$50.00". */
export function formatMoney(cents: number, currency = 'USD'): string {
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}
