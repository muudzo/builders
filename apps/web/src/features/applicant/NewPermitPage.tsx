import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { BuilderVerificationBadge } from './BuilderVerificationBadge';
import type { CreatePermitPayload } from '../../lib/api-types';
import './new-permit-page.css';

const EMPTY_FORM: CreatePermitPayload = {
  standNumber: '',
  suburb: '',
  projectType: '',
  ownerName: '',
  ownerPhone: '',
  builderRegNumber: '',
};

export function NewPermitPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreatePermitPayload>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const createPermit = useMutation({
    mutationFn: (payload: CreatePermitPayload) => api.permits.create(payload),
    onSuccess: async (permit) => {
      await queryClient.invalidateQueries({ queryKey: ['permits'] });
      navigate(`/permits/${permit.ref}`);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not submit the permit. Try again.');
    },
  });

  function updateField<K extends keyof CreatePermitPayload>(key: K, value: CreatePermitPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    createPermit.mutate(form);
  }

  return (
    <div className="vk-container vk-new-permit">
      <h1 className="vk-new-permit__title">New permit application</h1>
      <p className="vk-new-permit__subtitle">
        Tell us about the site and your builder. We verify the builder's registration instantly.
      </p>

      <Card elevation="raised" className="vk-new-permit__card">
        <form onSubmit={handleSubmit} className="vk-new-permit__form" noValidate>
          <div className="vk-new-permit__row">
            <Input
              label="Stand number"
              required
              value={form.standNumber}
              onChange={(event) => updateField('standNumber', event.target.value)}
            />
            <Input
              label="Suburb"
              required
              value={form.suburb}
              onChange={(event) => updateField('suburb', event.target.value)}
            />
          </div>
          <Input
            label="Project type"
            placeholder="e.g. Single-storey residential"
            required
            value={form.projectType}
            onChange={(event) => updateField('projectType', event.target.value)}
          />
          <div className="vk-new-permit__row">
            <Input
              label="Owner name"
              required
              value={form.ownerName}
              onChange={(event) => updateField('ownerName', event.target.value)}
            />
            <Input
              label="Owner phone"
              type="tel"
              placeholder="077xxxxxxx"
              required
              value={form.ownerPhone}
              onChange={(event) => updateField('ownerPhone', event.target.value)}
            />
          </div>
          <div className="vk-new-permit__builder">
            <Input
              label="Builder registration number"
              required
              value={form.builderRegNumber}
              onChange={(event) => updateField('builderRegNumber', event.target.value)}
            />
            <BuilderVerificationBadge regNumber={form.builderRegNumber} />
          </div>

          {error && (
            <p className="vk-new-permit__error" role="alert">
              {error}
            </p>
          )}

          <div className="vk-new-permit__actions">
            <Button type="submit" variant="primary" size="lg" isLoading={createPermit.isPending}>
              Submit application
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
