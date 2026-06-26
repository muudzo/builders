import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Field';
import { BUILDER_STATUS_LABELS } from '../../lib/domain';
import type { RegistryEntryDto } from '../../lib/api-types';
import { useDebounce } from '../../hooks/useDebounce';
import './registry-page.css';

const VERIFY_DEBOUNCE_MS = 400;
const MIN_LOOKUP_LENGTH = 3;

const columns: TableColumn<RegistryEntryDto>[] = [
  { key: 'regNumber', header: 'Reg. number', render: (row) => row.regNumber },
  { key: 'name', header: 'Builder', render: (row) => row.name ?? '—' },
  { key: 'category', header: 'Category', render: (row) => row.category ?? '—' },
  { key: 'status', header: 'Status', render: (row) => BUILDER_STATUS_LABELS[row.status] },
  {
    key: 'expiresAt',
    header: 'Expires',
    render: (row) => (row.expiresAt ? new Date(row.expiresAt).toLocaleDateString('en-ZW') : '—'),
  },
];

function LookupTool() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query.trim(), VERIFY_DEBOUNCE_MS);
  const isEligible = debouncedQuery.length >= MIN_LOOKUP_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: ['registry-lookup', debouncedQuery],
    queryFn: () => api.registry.verify(debouncedQuery),
    enabled: isEligible,
  });

  return (
    <Card elevation="raised" className="vk-registry-lookup">
      <h2 className="vk-registry-lookup__title">Quick lookup</h2>
      <Input
        label="Registration number"
        placeholder="e.g. CIFOZ-2024-118"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {isEligible && isFetching && <Spinner label="Looking up" size="sm" />}
      {isEligible && !isFetching && data && (
        <p className={`vk-registry-lookup__result vk-registry-lookup__result--${data.found ? 'found' : 'missing'}`}>
          {data.found ? (
            <>
              <strong>{data.name}</strong> — {BUILDER_STATUS_LABELS[data.status]}
            </>
          ) : (
            BUILDER_STATUS_LABELS[data.status]
          )}
        </p>
      )}
    </Card>
  );
}

/** `/dashboard/registry` — builder verification for council/ministry. */
export function RegistryPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['registry'],
    queryFn: () => api.registry.list(),
  });

  return (
    <div className="vk-container vk-registry">
      <h1 className="vk-registry__title">Builder registry</h1>
      <p className="vk-registry__subtitle">Verify a builder's registration before approving a permit.</p>

      <LookupTool />

      {isLoading && <Spinner label="Loading registry" size="lg" />}
      {isError && <EmptyState title="Couldn't load the registry" description="Try again shortly." />}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState title="Registry is empty" description="No builder records are available yet." />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <Table columns={columns} rows={data} getRowKey={(row) => row.regNumber} caption="Builder registry" />
      )}
    </div>
  );
}
