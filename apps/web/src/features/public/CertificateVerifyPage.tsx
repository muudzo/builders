import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import './certificate-verify-page.css';

/** Public certificate authenticity check — `/verify/:qrToken`. No login, no app shell chrome. */
export function CertificateVerifyPage() {
  const { qrToken = '' } = useParams<{ qrToken: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['certificate-verify', qrToken],
    queryFn: () => api.certificates.verify(qrToken),
    enabled: Boolean(qrToken),
    retry: false,
  });

  return (
    <div className="vk-verify-page">
      <div className="vk-verify-page__brand">
        <span className="vk-verify-page__brand-mark">V</span>
        <span>Vaka certificate check</span>
      </div>

      <Card elevation="floating" className="vk-verify-page__card">
        {isLoading && <Spinner label="Checking certificate" size="lg" />}

        {!isLoading && (isError || !data || !data.valid) && (
          <EmptyState
            title="Certificate not recognized"
            description="This QR code does not match a valid Vaka certificate of occupation. If you believe this is an error, contact the issuing council directly."
            icon={<span aria-hidden="true">⚠️</span>}
          />
        )}

        {!isLoading && data?.valid && (
          <div className="vk-verify-page__result">
            <span className="vk-verify-page__badge">Valid certificate</span>
            <h1 className="vk-verify-page__title">Certificate of Occupation</h1>
            <dl className="vk-verify-page__details">
              <div>
                <dt>Permit reference</dt>
                <dd>{data.permitRef}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{data.ownerName}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>
                  Stand {data.standNumber}, {data.suburb}
                </dd>
              </div>
              <div>
                <dt>Certificate serial</dt>
                <dd>{data.serial}</dd>
              </div>
              <div>
                <dt>Issued</dt>
                <dd>{data.issuedAt && new Date(data.issuedAt).toLocaleDateString('en-ZW')}</dd>
              </div>
            </dl>
          </div>
        )}
      </Card>
    </div>
  );
}
