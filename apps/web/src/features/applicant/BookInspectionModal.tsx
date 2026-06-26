import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import type { StageDto } from '../../lib/api-types';

interface BookInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: StageDto;
  permitRef: string;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookInspectionModal({ isOpen, onClose, stage, permitRef }: BookInspectionModalProps) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIsoDate());
  const [error, setError] = useState<string | null>(null);

  const bookInspection = useMutation({
    mutationFn: () => api.inspections.book({ stageId: stage.id, date }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['permit', permitRef] });
      onClose();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not book the inspection.');
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    bookInspection.mutate();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Book inspection — ${stage.label}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label="Preferred date"
          type="date"
          required
          min={todayIsoDate()}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        {error && (
          <p role="alert" style={{ color: 'var(--vk-status-fail)', fontWeight: 600, fontSize: 'var(--vk-text-sm)' }}>
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" isLoading={bookInspection.isPending}>
          Book inspection
        </Button>
      </form>
    </Modal>
  );
}
