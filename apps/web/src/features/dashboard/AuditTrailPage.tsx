import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import type { AuditDto } from '../../lib/api-types';
import './audit-trail-page.css';

const columns: TableColumn<AuditDto>[] = [
  { key: 'createdAt', header: 'When', render: (row) => new Date(row.createdAt).toLocaleString('en-ZW') },
  { key: 'actorRole', header: 'Actor', render: (row) => row.actorRole },
  { key: 'action', header: 'Action', render: (row) => row.action },
  { key: 'entity', header: 'Entity', render: (row) => `${row.entity} · ${row.entityId}` },
];

/** `/dashboard/audit` — append-only audit trail, most recent first. */
export function AuditTrailPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-trail'],
    queryFn: () => api.audit.list(),
    refetchInterval: 20_000,
  });

  return (
    <div className="vk-container vk-audit">
      <h1 className="vk-audit__title">Audit trail</h1>
      <p className="vk-audit__subtitle">Every money and state transition, recorded and append-only.</p>

      {isLoading && <Spinner label="Loading audit log" size="lg" />}
      {isError && <EmptyState title="Couldn't load the audit trail" description="Try again shortly." />}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState title="No activity recorded yet" description="Audit entries will appear here as the system is used." />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <Table columns={columns} rows={data} getRowKey={(row) => row.id} caption="Audit log" />
      )}
    </div>
  );
}
