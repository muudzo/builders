import type { PaymentMethod, PaymentStatus } from '../common/domain';

export interface InitiatePaymentResult {
  paymentId: string;
  reference: string;
  status: PaymentStatus;
  instructions: string;
  pollUrl: string;
  /** True when no Paynow credentials are configured — the demo accelerator is allowed. */
  simulated: boolean;
  /** Present for web/card payments — redirect the payer here to complete on Paynow. */
  redirectUrl?: string;
}

export interface PaymentStatusDto {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amountCents: number;
  reference: string;
  paidAt: string | null;
}
