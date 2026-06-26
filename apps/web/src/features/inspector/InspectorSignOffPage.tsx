import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Field';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatMoney } from '../../lib/domain';
import './inspector-sign-off-page.css';

type GpsState =
  | { status: 'idle' }
  | { status: 'capturing' }
  | { status: 'captured'; lat: number; lng: number }
  | { status: 'error'; message: string };

function useGpsCapture() {
  const [gps, setGps] = useState<GpsState>({ status: 'idle' });

  function capture() {
    if (!navigator.geolocation) {
      setGps({ status: 'error', message: 'GPS is not available on this device.' });
      return;
    }
    setGps({ status: 'capturing' });
    navigator.geolocation.getCurrentPosition(
      (position) => setGps({ status: 'captured', lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setGps({ status: 'error', message: 'Could not capture GPS. You can still sign off without it.' }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return { gps, capture };
}

export function InspectorSignOffPage() {
  const { stageId = '' } = useParams<{ stageId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const { gps, capture } = useGpsCapture();

  const { data: queue, isLoading } = useQuery({
    queryKey: ['inspection-queue'],
    queryFn: () => api.inspections.queue(),
  });

  const job = queue?.find((item) => item.stageId === stageId);

  const signOff = useMutation({
    mutationFn: (result: 'PASS' | 'FAIL') =>
      api.inspections.signOff({
        stageId,
        result,
        notes,
        photoUrl: photoUrl ?? undefined,
        gpsLat: gps.status === 'captured' ? gps.lat : undefined,
        gpsLng: gps.status === 'captured' ? gps.lng : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inspection-queue'] });
      navigate('/inspect', { replace: true });
    },
  });

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    // Demo-friendly: a data URL stands in for a real upload pipeline.
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  if (isLoading) {
    return (
      <div className="vk-container" style={{ paddingTop: '4rem' }}>
        <Spinner label="Loading job" size="lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="vk-container" style={{ paddingTop: '4rem' }}>
        <EmptyState
          title="Job not found"
          description="This job may have already been signed off."
          action={
            <Link to="/inspect">
              <Button variant="primary">Back to queue</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="vk-container vk-sign-off">
      <Link to="/inspect" className="vk-sign-off__back">
        ← Job queue
      </Link>

      <Card elevation="raised" className="vk-sign-off__card">
        <h1 className="vk-sign-off__title">{job.stageLabel}</h1>
        <p className="vk-sign-off__address">
          Stand {job.standNumber}, {job.suburb} · {job.permitRef}
        </p>
        <p className="vk-sign-off__owner">Owner: {job.ownerName}</p>
        <p className="vk-sign-off__fee">{formatMoney(job.amountCents)} already paid</p>

        <div className="vk-sign-off__section">
          <span className="vk-sign-off__label">GPS evidence</span>
          {gps.status === 'idle' && (
            <Button variant="secondary" onClick={capture}>
              📍 Capture GPS location
            </Button>
          )}
          {gps.status === 'capturing' && <Spinner label="Capturing GPS" size="sm" />}
          {gps.status === 'captured' && (
            <p className="vk-sign-off__gps-ok">
              ✓ Captured ({gps.lat.toFixed(4)}, {gps.lng.toFixed(4)})
            </p>
          )}
          {gps.status === 'error' && <p className="vk-sign-off__gps-error">{gps.message}</p>}
        </div>

        <div className="vk-sign-off__section">
          <span className="vk-sign-off__label">Photo evidence</span>
          <label className="vk-sign-off__photo-input">
            {photoUrl ? 'Replace photo' : '📷 Attach photo'}
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} />
          </label>
          {photoUrl && <img src={photoUrl} alt="Site evidence" className="vk-sign-off__photo-preview" />}
        </div>

        <Textarea
          label="Notes"
          placeholder="What did you observe on site?"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <div className="vk-sign-off__decision">
          <Button
            variant="danger"
            size="lg"
            isLoading={signOff.isPending && signOff.variables === 'FAIL'}
            onClick={() => signOff.mutate('FAIL')}
          >
            FAIL
          </Button>
          <Button
            variant="primary"
            size="lg"
            isLoading={signOff.isPending && signOff.variables === 'PASS'}
            onClick={() => signOff.mutate('PASS')}
          >
            PASS
          </Button>
        </div>

        {signOff.isError && (
          <p role="alert" className="vk-sign-off__error">
            {signOff.error instanceof ApiError ? signOff.error.message : 'Could not submit sign-off.'}
          </p>
        )}
      </Card>
    </div>
  );
}
