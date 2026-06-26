import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Paynow } from 'paynow';
import type { PaymentMethod } from '../common/domain';

export interface PaynowInitiateInput {
  reference: string;
  amountCents: number;
  method: PaymentMethod;
  payerPhone?: string;
  authEmail?: string;
}

export interface PaynowInitiateResult {
  simulated: boolean;
  /** Paynow's own poll URL when real; a synthetic local one in simulation mode. */
  pollUrl: string;
  instructions: string;
  paynowReference?: string;
}

const PAYNOW_METHOD: Record<PaymentMethod, string> = {
  ECOCASH: 'ecocash',
  ONEMONEY: 'onemoney',
  CARD: 'card',
};

/**
 * Thin wrapper around the Paynow Node SDK with a simulation seam so the demo runs with zero
 * credentials. Real mode activates only when both PAYNOW_INTEGRATION_ID and
 * PAYNOW_INTEGRATION_KEY are configured; otherwise every call simulates.
 */
@Injectable()
export class PaynowService {
  private readonly logger = new Logger(PaynowService.name);
  private readonly client: Paynow | null;

  constructor(private readonly config: ConfigService) {
    const integrationId = this.config.get<string>('PAYNOW_INTEGRATION_ID');
    const integrationKey = this.config.get<string>('PAYNOW_INTEGRATION_KEY');

    this.client =
      integrationId && integrationKey
        ? new Paynow(
            integrationId,
            integrationKey,
            this.config.get<string>('PAYNOW_RESULT_URL'),
            this.config.get<string>('PAYNOW_RETURN_URL'),
          )
        : null;
  }

  isSimulationMode(): boolean {
    return this.client === null;
  }

  async initiate(input: PaynowInitiateInput): Promise<PaynowInitiateResult> {
    if (this.isSimulationMode() || !this.client) {
      return this.simulateInitiate(input);
    }

    try {
      const payment = this.client.createPayment(
        input.reference,
        input.authEmail ?? 'demo@vaka.app',
      );
      payment.add(`Vaka stage fee (${input.reference})`, input.amountCents / 100);

      const response = input.payerPhone
        ? await this.client.sendMobile(payment, input.payerPhone, PAYNOW_METHOD[input.method])
        : await this.client.send(payment);

      if (!response.success) {
        this.logger.warn(`Paynow initiate failed for ${input.reference}: ${response.error ?? 'unknown error'}`);
        return this.simulateInitiate(input);
      }

      return {
        simulated: false,
        pollUrl: response.pollUrl ?? '',
        instructions: response.instructions ?? 'Approve the prompt on your phone to complete payment.',
      };
    } catch (err) {
      this.logger.error('Paynow SDK call threw; falling back to simulation', err as Error);
      return this.simulateInitiate(input);
    }
  }

  private simulateInitiate(input: PaynowInitiateInput): PaynowInitiateResult {
    return {
      simulated: true,
      pollUrl: `/api/payments/${input.reference}/poll`,
      instructions: `Simulated ${input.method} payment — will auto-confirm shortly, or call confirm now.`,
      paynowReference: `SIM-${Date.now().toString(36).toUpperCase()}`,
    };
  }
}
