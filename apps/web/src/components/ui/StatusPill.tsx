import type { StageStatus } from '../../lib/domain';
import { STAGE_STATUS_LABELS } from '../../lib/domain';
import './status-pill.css';

const STATUS_TONE: Record<StageStatus, string> = {
  LOCKED: 'locked',
  AWAITING_PAYMENT: 'awaiting',
  PAID_AWAITING_INSPECTION: 'paid',
  BOOKED: 'booked',
  INSPECTED_PASS: 'pass',
  INSPECTED_FAIL: 'fail',
};

interface StatusPillProps {
  status: StageStatus;
  label?: string;
}

export function StatusPill({ status, label }: StatusPillProps) {
  const tone = STATUS_TONE[status];
  return (
    <span className={`vk-status-pill vk-status-pill--${tone}`}>
      <span className="vk-status-pill__dot" aria-hidden="true" />
      {label ?? STAGE_STATUS_LABELS[status]}
    </span>
  );
}
