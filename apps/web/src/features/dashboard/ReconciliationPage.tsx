import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Table } from '../../components/ui/Table';
import type { TableColumn } from '../../components/ui/Table';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusPill } from '../../components/ui/StatusPill';
import { formatMoney, PAYMENT_METHOD_LABELS } from '../../lib/domain';
import type { PaymentStatus } from '../../lib/domain';
import type { ReconciliationRowDto } from '../../lib/api-types';
import './reconciliation-page.css';

/** Reuses the stage-status visual language for payment status, since both share semantic tones. */
const PAYMENT_STATUS_TO_STAGE_STATUS: Record<PaymentStatus, 'INSPECTED_PASS' | 'INSPECTED_FAIL' | 'AWAITING_PAYMENT' | 'LOCKED'> = {
  PAID: 'INSPECTED_PASS',
  FAILED: 'INSPECTED_FAIL',
  CANCELLED: 'INSPECTED_FAIL',
  PENDING: 'AWAITING_PAYMENT',
  CREATED: 'LOCKED',
};

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusPill status={PAYMENT_STATUS_TO_STAGE_STATUS[status]} label={status} />;
}

const columns: TableColumn<ReconciliationRowDto>[] = [
  { key: 'reference', header: 'Reference', render: (row) => row.reference },
  { key: 'permitRef', header: 'Permit', render: (row) => row.permitRef },
  { key: 'stageLabel', header: 'Stage', render: (row) => row.stageLabel },
  { key: 'method', header: 'Method', render: (row) => PAYMENT_METHOD_LABELS[row.method] },
  { key: 'amount', header: 'Amount', render: (row) => formatMoney(row.amountCents), align: 'end' },
  { key: 'status', header: 'Status', render: (row) => <PaymentStatusBadge status={row.status} /> },
  {
    key: 'paidAt',
    header: 'Paid at',
    render: (row) => (row.paidAt ? new Date(row.paidAt).toLocaleString('en-ZW') : '—'),
  },
];

/** `/dashboard/reconciliation` — every fee, traceable, no cash touching an inspector. */
export function ReconciliationPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reconciliation'],
    queryFn: () => api.dashboard.reconciliation(),
  });

  return (
    <div className="vk-container vk-reconciliation">
      <h1 className="vk-reconciliation__title">Reconciliation</h1>
      <p className="vk-reconciliation__subtitle">Every fee collected, traceable end to end.</p>

      {isLoading && <Spinner label="Loading payments" size="lg" />}
      {isError && <EmptyState title="Couldn't load reconciliation data" description="Try again shortly." />}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState title="No payments yet" description="Payments will appear here as fees are collected." />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <Table columns={columns} rows={data} getRowKey={(row) => row.reference} caption="Payment reconciliation" />
      )}
    </div>
  );
}
