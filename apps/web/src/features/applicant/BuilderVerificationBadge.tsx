import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import { BUILDER_STATUS_LABELS } from '../../lib/domain';
import { Spinner } from '../../components/ui/Spinner';
import './builder-verification-badge.css';

const VERIFY_DEBOUNCE_MS = 400;
const MIN_REG_NUMBER_LENGTH = 4;

interface BuilderVerificationBadgeProps {
  regNumber: string;
}

/**
 * Live builder verification — calls GET /registry/verify/:regNumber as the applicant types
 * (debounced) so trust signal appears before submit, removing a round-trip of friction.
 */
export function BuilderVerificationBadge({ regNumber }: BuilderVerificationBadgeProps) {
  const debouncedRegNumber = useDebounce(regNumber.trim(), VERIFY_DEBOUNCE_MS);
  const isEligible = debouncedRegNumber.length >= MIN_REG_NUMBER_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: ['registry-verify', debouncedRegNumber],
    queryFn: () => api.registry.verify(debouncedRegNumber),
    enabled: isEligible,
  });

  if (!isEligible) {
    return <p className="vk-builder-badge vk-builder-badge--idle">Enter a registration number to verify.</p>;
  }

  if (isFetching) {
    return (
      <p className="vk-builder-badge vk-builder-badge--idle">
        <Spinner size="sm" label="Verifying builder" /> Verifying…
      </p>
    );
  }

  if (!data) return null;

  const tone = data.found && data.status === 'VALID' ? 'valid' : data.found ? 'warn' : 'unregistered';

  return (
    <p className={`vk-builder-badge vk-builder-badge--${tone}`} role="status">
      {data.found ? (
        <>
          <strong>{data.name}</strong> — {BUILDER_STATUS_LABELS[data.status]}
        </>
      ) : (
        BUILDER_STATUS_LABELS[data.status]
      )}
    </p>
  );
}
