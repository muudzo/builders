import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Stat } from '../../components/ui/Stat';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatMoney, PAYMENT_METHOD_LABELS } from '../../lib/domain';
import { useAuth } from '../auth/AuthContext';
import './dashboard-overview-page.css';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function DashboardOverviewPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.dashboard.overview(),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="vk-container" style={{ paddingTop: '4rem' }}>
        <Spinner label="Loading dashboard" size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="vk-container" style={{ paddingTop: '4rem' }}>
        <EmptyState title="Couldn't load the dashboard" description="Check your connection and try again." />
      </div>
    );
  }

  return (
    <div className="vk-container vk-dashboard">
      <div className="vk-dashboard__header">
        <h1 className="vk-dashboard__title">Council overview</h1>
        {user?.role === 'MINISTRY' && <span className="vk-dashboard__readonly">Read-only super-view</span>}
      </div>

      <div className="vk-dashboard__bento">
        <Stat
          label="Fees collected today"
          value={formatMoney(data.feesCollectedTodayCents)}
          tone="accent"
          icon={<span aria-hidden="true">💰</span>}
        />
        <Stat
          label="Fees collected (all time)"
          value={formatMoney(data.feesCollectedTotalCents)}
          tone="pass"
        />
        <Stat
          label="Leakage recovered"
          value={formatMoney(data.leakageRecoveredCents)}
          trend="Fees now captured digitally"
          tone="pass"
        />
        <Stat label="Active permits" value={String(data.activePermits)} />
        <Stat label="Completed permits" value={String(data.completedPermits)} tone="pass" />
        <Stat label="Inspections today" value={String(data.inspectionsToday)} />
        <Stat label="Awaiting inspection" value={String(data.awaitingInspection)} tone="accent" />
      </div>

      <div className="vk-dashboard__grid">
        <Card elevation="raised">
          <h2 className="vk-dashboard__section-title">Stage breakdown</h2>
          <ul className="vk-dashboard__list">
            {data.stageBreakdown.map((stage) => (
              <li key={stage.key} className="vk-dashboard__list-row">
                <span>{stage.label}</span>
                <strong>{stage.count}</strong>
              </li>
            ))}
          </ul>
        </Card>

        <Card elevation="raised">
          <h2 className="vk-dashboard__section-title">Payments by method</h2>
          <ul className="vk-dashboard__list">
            {data.paymentsByMethod.map((row) => (
              <li key={row.method} className="vk-dashboard__list-row">
                <span>{PAYMENT_METHOD_LABELS[row.method]}</span>
                <strong>
                  {row.count} · {formatMoney(row.amountCents)}
                </strong>
              </li>
            ))}
          </ul>
        </Card>

        <Card elevation="raised">
          <h2 className="vk-dashboard__section-title">Inspector load</h2>
          <ul className="vk-dashboard__list">
            {data.inspectorLoad.map((row) => (
              <li key={row.inspectorName} className="vk-dashboard__list-row">
                <span>{row.inspectorName}</span>
                <strong>{row.jobs} jobs</strong>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card elevation="raised">
        <h2 className="vk-dashboard__section-title">Recent activity</h2>
        {data.recentActivity.length === 0 ? (
          <EmptyState title="No activity yet" description="State changes will appear here as they happen." />
        ) : (
          <ul className="vk-dashboard__activity">
            {data.recentActivity.map((entry) => (
              <li key={entry.id} className="vk-dashboard__activity-row">
                <span className="vk-dashboard__activity-action">{entry.action}</span>
                <span className="vk-dashboard__activity-meta">
                  {entry.actorRole} · {entry.entity} · {timeAgo(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
