import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusPill } from '../../components/ui/StatusPill';
import { formatMoney } from '../../lib/domain';
import type { InspectionJobDto } from '../../lib/api-types';
import './inspector-queue-page.css';

function JobCard({ job }: { job: InspectionJobDto }) {
  return (
    <Link to={`/inspect/${job.stageId}`} className="vk-job-card">
      <Card elevation="raised" className="vk-job-card__inner">
        <div className="vk-job-card__top">
          <span className="vk-job-card__distance">{job.distanceKm.toFixed(1)} km away</span>
          <StatusPill status={job.status} />
        </div>
        <h3 className="vk-job-card__stage">{job.stageLabel}</h3>
        <p className="vk-job-card__address">
          Stand {job.standNumber}, {job.suburb}
        </p>
        <p className="vk-job-card__owner">{job.ownerName}</p>
        <div className="vk-job-card__footer">
          <span className="vk-job-card__fee">{formatMoney(job.amountCents)} paid</span>
          {job.bookedFor && (
            <span className="vk-job-card__booked">
              Booked {new Date(job.bookedFor).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

/** `/inspect` — the inspector's job queue, nearest first, one-thumb mobile-first cards. */
export function InspectorQueuePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['inspection-queue'],
    queryFn: () => api.inspections.queue(),
    refetchInterval: 30_000,
  });

  const sortedJobs = data ? [...data].sort((a, b) => a.distanceKm - b.distanceKm) : [];

  return (
    <div className="vk-container vk-inspector-queue">
      <h1 className="vk-inspector-queue__title">Job queue</h1>
      <p className="vk-inspector-queue__subtitle">Nearest sites first. Tap a job to sign off.</p>

      {isLoading && <Spinner label="Loading your jobs" size="lg" />}

      {isError && <EmptyState title="Couldn't load the queue" description="Check your connection and try again." />}

      {!isLoading && !isError && sortedJobs.length === 0 && (
        <EmptyState
          title="No jobs right now"
          description="New bookings and paid stages waiting on inspection will appear here."
        />
      )}

      {!isLoading && !isError && sortedJobs.length > 0 && (
        <div className="vk-inspector-queue__list">
          {sortedJobs.map((job) => (
            <JobCard key={job.stageId} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
