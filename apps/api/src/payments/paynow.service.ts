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
  /** Present for web/card payments — the page to redirect the payer to. */
  redirectUrl?: string;
  paynowReference?: string;
}

export interface PaynowPollResult {
  paid: boolean;
  /** Lowercased Paynow status, e.g. 'paid' | 'awaiting delivery' | 'cancelled' | 'sent'. */
  status: string;
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

    if (integrationId && integrationKey) {
      this.client = new Paynow(integrationId, integrationKey);
      // Per the SDK, callback URLs are set as instance properties.
      const resultUrl = this.config.get<string>('PAYNOW_RESULT_URL');
      const returnUrl = this.config.get<string>('PAYNOW_RETURN_URL');
      if (resultUrl) this.client.resultUrl = resultUrl;
      if (returnUrl) this.client.returnUrl = returnUrl;
      this.logger.log(`Paynow live mode enabled (integration ${integrationId}).`);
    } else {
      this.client = null;
      this.logger.log('Paynow running in SIMULATION mode (no integration credentials set).');
    }
  }

  isSimulationMode(): boolean {
    return this.client === null;
  }

  async initiate(input: PaynowInitiateInput): Promise<PaynowInitiateResult> {
    if (!this.client) {
      return this.simulateInitiate(input);
    }

    try {
      const payment = this.client.createPayment(input.reference, input.authEmail ?? 'payments@vaka.app');
      payment.add(`Vaka inspection fee (${input.reference})`, input.amountCents / 100);

      const isMobileMoney =
        (input.method === 'ECOCASH' || input.method === 'ONEMONEY') && Boolean(input.payerPhone);

      const response = isMobileMoney
        ? await this.client.sendMobile(payment, input.payerPhone as string, PAYNOW_METHOD[input.method])
        : await this.client.send(payment);

      if (!response.success) {
        this.logger.warn(`Paynow initiate failed for ${input.reference}: ${response.error ?? 'unknown error'}`);
        return this.simulateInitiate(input);
      }

      return {
        simulated: false,
        pollUrl: response.pollUrl ?? '',
        redirectUrl: response.redirectUrl,
        instructions:
          response.instructions ??
          (response.redirectUrl
            ? 'Complete your payment on the Paynow page.'
            : 'Approve the prompt on your phone to complete payment.'),
      };
    } catch (err) {
      this.logger.error('Paynow SDK call threw; falling back to simulation', err as Error);
      return this.simulateInitiate(input);
    }
  }

  /** Poll Paynow for the authoritative status of a transaction. Safe in simulation mode. */
  async pollStatus(pollUrl: string): Promise<PaynowPollResult> {
    if (!this.client || !pollUrl) {
      return { paid: false, status: 'simulated' };
    }
    try {
      const status = await this.client.pollTransaction(pollUrl);
      const paid = typeof status.paid === 'function' ? status.paid() : false;
      return { paid, status: (status.status ?? (paid ? 'paid' : 'unknown')).toLowerCase() };
    } catch (err) {
      this.logger.error(`Paynow pollTransaction threw for ${pollUrl}`, err as Error);
      return { paid: false, status: 'error' };
    }
  }

  private simulateInitiate(input: PaynowInitiateInput): PaynowInitiateResult {
    return {
      simulated: true,
      pollUrl: `/api/payments/${input.reference}/poll`,
      instructions: `Simulated ${input.method} payment — will auto-confirm shortly, or confirm now.`,
      paynowReference: `SIM-${Date.now().toString(36).toUpperCase()}`,
    };
  }
}
