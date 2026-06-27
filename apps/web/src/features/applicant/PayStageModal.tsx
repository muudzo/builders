import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { formatMoney, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '../../lib/domain';
import type { PaymentMethod } from '../../lib/domain';
import type { StageDto } from '../../lib/api-types';
import './pay-stage-modal.css';

const POLL_INTERVAL_MS = 1500;

type PayStep = 'choose-method' | 'pending' | 'success' | 'error';

interface PayStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: StageDto;
  permitRef: string;
}

const METHOD_ICON: Record<PaymentMethod, string> = {
  ECOCASH: '📱',
  ONEMONEY: '💳',
  CARD: '🏦',
};

/**
 * The hero flow: pay a stage fee in <= 2 taps. Choose method -> confirm -> realistic
 * "check your phone" pending state -> poll for PAID -> success animation. A "simulate
 * confirmation" escape hatch keeps a live demo from ever stalling on the ~5s sim timer.
 */
export function PayStageModal({ isOpen, onClose, stage, permitRef }: PayStageModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<PayStep>('choose-method');
  const [method, setMethod] = useState<PaymentMethod>('ECOCASH');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initiate = useMutation({
    mutationFn: () => api.payments.initiate({ stageId: stage.id, method }),
    onSuccess: (response) => {
      // Web/card payments (live Paynow) hand back a redirect to the Paynow page.
      if (response.redirectUrl) {
        window.location.href = response.redirectUrl;
        return;
      }
      setPaymentId(response.paymentId);
      setIsSimulated(response.simulated);
      setStep('pending');
    },
    onError: (err: unknown) => {
      setErrorMessage(err instanceof ApiError ? err.message : 'Could not start the payment.');
      setStep('error');
    },
  });

  const confirmNow = useMutation({
    mutationFn: (id: string) => api.payments.confirm(id),
  });

  useEffect(() => {
    if (step !== 'pending' || !paymentId) return;

    let isCancelled = false;

    async function poll() {
      try {
        const result = await api.payments.get(paymentId as string);
        if (isCancelled) return;
        if (result.status === 'PAID') {
          setStep('success');
          await queryClient.invalidateQueries({ queryKey: ['permit', permitRef] });
          return;
        }
        if (result.status === 'FAILED' || result.status === 'CANCELLED') {
          setErrorMessage('The payment did not complete. Please try again.');
          setStep('error');
          return;
        }
        pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!isCancelled) {
          pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    }

    void poll();

    return () => {
      isCancelled = true;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [step, paymentId, permitRef, queryClient]);

  function handleClose() {
    setStep('choose-method');
    setPaymentId(null);
    setIsSimulated(false);
    setErrorMessage(null);
    onClose();
  }

  function handleSimulateConfirm() {
    if (!paymentId) return;
    confirmNow.mutate(paymentId);
  }

  const isDismissable = step !== 'pending';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Pay for ${stage.label}`} isDismissable={isDismissable}>
      {step === 'choose-method' && (
        <div className="vk-pay-modal">
          <p className="vk-pay-modal__amount">{formatMoney(stage.amountCents, stage.currency)}</p>
          <p className="vk-pay-modal__hint">Choose how you'd like to pay this stage fee.</p>
          <div className="vk-pay-modal__methods" role="radiogroup" aria-label="Payment method">
            {PAYMENT_METHODS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={method === option}
                className={`vk-pay-modal__method${method === option ? ' is-selected' : ''}`}
                onClick={() => setMethod(option)}
              >
                <span className="vk-pay-modal__method-icon" aria-hidden="true">
                  {METHOD_ICON[option]}
                </span>
                {PAYMENT_METHOD_LABELS[option]}
              </button>
            ))}
          </div>
          <Button
            variant="accent"
            size="lg"
            isLoading={initiate.isPending}
            onClick={() => initiate.mutate()}
            className="vk-pay-modal__cta"
          >
            Confirm — Pay {formatMoney(stage.amountCents, stage.currency)}
          </Button>
        </div>
      )}

      {step === 'pending' && (
        <div className="vk-pay-modal vk-pay-modal--pending">
          <div className="vk-pay-modal__phone-icon" aria-hidden="true">
            {METHOD_ICON[method]}
          </div>
          <p className="vk-pay-modal__pending-title">Check your phone</p>
          <p className="vk-pay-modal__hint">
            Enter your {PAYMENT_METHOD_LABELS[method]} PIN to approve the {formatMoney(stage.amountCents, stage.currency)} payment.
          </p>
          <div className="vk-pay-modal__pulse" aria-hidden="true" />
          {isSimulated && (
            <button type="button" className="vk-pay-modal__simulate-link" onClick={handleSimulateConfirm}>
              Simulate confirmation (demo)
            </button>
          )}
        </div>
      )}

      {step === 'success' && (
        <div className="vk-pay-modal vk-pay-modal--success">
          <div className="vk-pay-modal__success-mark" aria-hidden="true">
            ✓
          </div>
          <p className="vk-pay-modal__pending-title">Payment received</p>
          <p className="vk-pay-modal__hint">{stage.label} is now awaiting inspection. The next gate step has unlocked.</p>
          <Button variant="primary" size="lg" onClick={handleClose}>
            Done
          </Button>
        </div>
      )}

      {step === 'error' && (
        <div className="vk-pay-modal">
          <p className="vk-pay-modal__error" role="alert">
            {errorMessage}
          </p>
          <Button variant="primary" onClick={() => setStep('choose-method')}>
            Try again
          </Button>
        </div>
      )}
    </Modal>
  );
}
