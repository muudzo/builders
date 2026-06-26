import type { ReactNode } from 'react';
import type { StageStatus } from '../../lib/domain';
import { formatMoney, STAGE_STATUS_LABELS } from '../../lib/domain';
import type { StageDto } from '../../lib/api-types';
import './stage-timeline.css';

const STATUS_TONE: Record<StageStatus, string> = {
  LOCKED: 'locked',
  AWAITING_PAYMENT: 'awaiting',
  PAID_AWAITING_INSPECTION: 'paid',
  BOOKED: 'booked',
  INSPECTED_PASS: 'pass',
  INSPECTED_FAIL: 'fail',
};

interface StageTimelineProps {
  stages: StageDto[];
  renderAction?: (stage: StageDto, isCurrent: boolean) => ReactNode;
}

/**
 * The 5-stage gate rendered as a color-coded vertical stepper — the visual centerpiece of a
 * permit's detail view. Each node shows the stage label, fee, status, and an optional action
 * slot for the one clear next step (pay / book / view inspection notes).
 */
export function StageTimeline({ stages, renderAction }: StageTimelineProps) {
  const currentIndex = stages.findIndex(
    (stage) => stage.status !== 'INSPECTED_PASS' && stage.status !== 'INSPECTED_FAIL',
  );

  return (
    <ol className="vk-stage-timeline" aria-label="Inspection stage gate">
      {stages.map((stage, index) => {
        const tone = STATUS_TONE[stage.status];
        const isCurrent = index === currentIndex;
        return (
          <li
            key={stage.id}
            className={`vk-stage-timeline__item vk-stage-timeline__item--${tone}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <div className="vk-stage-timeline__rail" aria-hidden="true">
              <span className="vk-stage-timeline__node">{index + 1}</span>
              {index < stages.length - 1 && <span className="vk-stage-timeline__connector" />}
            </div>
            <div className="vk-stage-timeline__body">
              <div className="vk-stage-timeline__heading">
                <h3 className="vk-stage-timeline__label">{stage.label}</h3>
                <span className="vk-stage-timeline__fee">{formatMoney(stage.amountCents, stage.currency)}</span>
              </div>
              <p className="vk-stage-timeline__status">{STAGE_STATUS_LABELS[stage.status]}</p>
              {stage.bookedFor && (
                <p className="vk-stage-timeline__meta">
                  Booked for {new Date(stage.bookedFor).toLocaleDateString('en-ZW', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              )}
              {stage.inspection && (
                <p className="vk-stage-timeline__meta">
                  {stage.inspection.result === 'PASS' ? 'Passed' : 'Failed'} by{' '}
                  {stage.inspection.inspectorName} on{' '}
                  {new Date(stage.inspection.signedAt).toLocaleDateString('en-ZW')}
                  {stage.inspection.notes ? ` — “${stage.inspection.notes}”` : ''}
                </p>
              )}
              {renderAction && <div className="vk-stage-timeline__action">{renderAction(stage, isCurrent)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
