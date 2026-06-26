import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StageTimeline } from '../../components/ui/StageTimeline';
import { BUILDER_STATUS_LABELS, PERMIT_STATUS_LABELS } from '../../lib/domain';
import { PayStageModal } from './PayStageModal';
import { BookInspectionModal } from './BookInspectionModal';
import type { StageDto } from '../../lib/api-types';
import './permit-detail-page.css';

export function PermitDetailPage() {
  const { ref = '' } = useParams<{ ref: string }>();
  const queryClient = useQueryClient();
  const [payingStage, setPayingStage] = useState<StageDto | null>(null);
  const [bookingStage, setBookingStage] = useState<StageDto | null>(null);

  const { data: permit, isLoading, isError } = useQuery({
    queryKey: ['permit', ref],
    queryFn: () => api.permits.get(ref),
    enabled: Boolean(ref),
  });

  const reRequestInspection = useMutation({
    mutationFn: (stageId: string) => api.inspections.reRequest(stageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permit', ref] }),
  });

  if (isLoading) {
    return (
      <div className="vk-container" style={{ paddingTop: '4rem' }}>
        <Spinner label="Loading permit" size="lg" />
      </div>
    );
  }

  if (isError || !permit) {
    return (
      <div className="vk-container" style={{ paddingTop: '4rem' }}>
        <EmptyState
          title="Permit not found"
          description="This permit doesn't exist or you don't have access to it."
          action={
            <Link to="/permits">
              <Button variant="primary">Back to my permits</Button>
            </Link>
          }
        />
      </div>
    );
  }

  function renderAction(stage: StageDto, isCurrent: boolean) {
    if (!isCurrent) return null;

    if (stage.status === 'AWAITING_PAYMENT') {
      return (
        <Button variant="accent" onClick={() => setPayingStage(stage)}>
          Pay {`$${(stage.amountCents / 100).toFixed(2)}`} with Paynow
        </Button>
      );
    }

    if (stage.status === 'PAID_AWAITING_INSPECTION') {
      return (
        <Button variant="primary" onClick={() => setBookingStage(stage)}>
          Book inspection
        </Button>
      );
    }

    if (stage.status === 'INSPECTED_FAIL') {
      return (
        <div className="vk-permit-detail__fail-action">
          <p className="vk-permit-detail__fail-note">Address the inspector's notes, then request another visit.</p>
          <Button
            variant="secondary"
            isLoading={reRequestInspection.isPending}
            onClick={() => reRequestInspection.mutate(stage.id)}
          >
            Request re-inspection
          </Button>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="vk-container vk-permit-detail">
      <Link to="/permits" className="vk-permit-detail__back">
        ← My permits
      </Link>

      <div className="vk-permit-detail__header">
        <div>
          <p className="vk-permit-detail__ref">{permit.ref}</p>
          <h1 className="vk-permit-detail__title">
            Stand {permit.standNumber}, {permit.suburb}
          </h1>
          <p className="vk-permit-detail__meta">
            {permit.projectType} · {permit.council.name} · {PERMIT_STATUS_LABELS[permit.status]}
          </p>
        </div>
        {permit.certificate && (
          <a
            className="vk-permit-detail__certificate-link"
            href={`/verify/${permit.certificate.qrToken}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download / view certificate
          </a>
        )}
      </div>

      <div className="vk-permit-detail__grid">
        <Card elevation="raised" className="vk-permit-detail__timeline-card">
          <h2 className="vk-permit-detail__section-title">Inspection gate</h2>
          <StageTimeline stages={permit.stages} renderAction={renderAction} />
        </Card>

        <div className="vk-permit-detail__side">
          <Card elevation="flat">
            <h2 className="vk-permit-detail__section-title">Builder</h2>
            <p className="vk-permit-detail__builder-name">{permit.builderName ?? permit.builderRegNumber}</p>
            <p className="vk-permit-detail__builder-status">{BUILDER_STATUS_LABELS[permit.builderStatus]}</p>
          </Card>
          <Card elevation="flat">
            <h2 className="vk-permit-detail__section-title">Owner</h2>
            <p>{permit.ownerName}</p>
            <p className="vk-permit-detail__builder-status">{permit.ownerPhone}</p>
          </Card>
        </div>
      </div>

      {payingStage && (
        <PayStageModal
          isOpen
          onClose={() => setPayingStage(null)}
          stage={payingStage}
          permitRef={permit.ref}
        />
      )}
      {bookingStage && (
        <BookInspectionModal
          isOpen
          onClose={() => setBookingStage(null)}
          stage={bookingStage}
          permitRef={permit.ref}
        />
      )}
    </div>
  );
}
