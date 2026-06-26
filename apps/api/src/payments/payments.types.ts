import type { PaymentMethod, PaymentStatus } from '../common/domain';

export interface InitiatePaymentResult {
  paymentId: string;
  reference: string;
  status: PaymentStatus;
  instructions: string;
  pollUrl: string;
}

export interface PaymentStatusDto {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amountCents: number;
  reference: string;
  paidAt: string | null;
}
