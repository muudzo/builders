import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/StatusPill';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import type { PermitDto } from '../../lib/api-types';
import './permits-list-page.css';

function PermitCard({ permit }: { permit: PermitDto }) {
  const currentStage = permit.stages.find((stage) => stage.key === permit.progress.currentStageKey);
  const progressPercent = Math.round((permit.progress.passed / permit.progress.total) * 100);

  return (
    <Link to={`/permits/${permit.ref}`} className="vk-permit-card">
      <Card elevation="raised" className="vk-permit-card__inner">
        <div className="vk-permit-card__top">
          <div>
            <p className="vk-permit-card__ref">{permit.ref}</p>
            <h3 className="vk-permit-card__title">
              Stand {permit.standNumber}, {permit.suburb}
            </h3>
          </div>
          {currentStage && <StatusPill status={currentStage.status} />}
        </div>
        <p className="vk-permit-card__type">{permit.projectType}</p>
        <div className="vk-permit-card__progress">
          <div className="vk-permit-card__progress-track">
            <div className="vk-permit-card__progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="vk-permit-card__progress-label">
            {permit.progress.passed} of {permit.progress.total} stages passed
          </span>
        </div>
        {currentStage && (
          <p className="vk-permit-card__next">
            Next: <strong>{currentStage.label}</strong>
          </p>
        )}
      </Card>
    </Link>
  );
}

export function PermitsListPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['permits'],
    queryFn: () => api.permits.list(),
  });

  return (
    <div className="vk-container vk-permits-list">
      <div className="vk-permits-list__header">
        <div>
          <h1 className="vk-permits-list__title">My permits</h1>
          <p className="vk-permits-list__subtitle">Track every stage, pay fees, and book inspections.</p>
        </div>
        <Link to="/permits/new">
          <Button variant="accent" size="lg">
            + New permit
          </Button>
        </Link>
      </div>

      {isLoading && <Spinner label="Loading permits" size="lg" />}

      {isError && (
        <EmptyState
          title="Couldn't load your permits"
          description="Check your connection and try again."
        />
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          title="No permits yet"
          description="Submit your first building permit application to get started."
          action={
            <Link to="/permits/new">
              <Button variant="primary">Create your first permit</Button>
            </Link>
          }
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="vk-permits-list__grid">
          {data.map((permit) => (
            <PermitCard key={permit.id} permit={permit} />
          ))}
        </div>
      )}
    </div>
  );
}
