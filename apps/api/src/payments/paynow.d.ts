/**
 * The `paynow` npm package ships no TypeScript declarations (verified: no .d.ts in
 * node_modules/paynow/dist). This module declares the minimal real-SDK surface PaynowService
 * actually touches so the rest of the codebase never needs `any`.
 *
 * Surface mirrors the official Node SDK: https://developers.paynow.co.zw
 */
declare module 'paynow' {
  export interface PaynowInitResponse {
    success: boolean;
    status?: string;
    hasRedirect?: boolean;
    pollUrl?: string;
    redirectUrl?: string;
    instructions?: string;
    error?: string;
  }

  /** Returned by pollTransaction(); `paid()` is the authoritative completion check. */
  export interface PaynowStatusResponse {
    reference?: string;
    paynowReference?: string;
    amount?: number;
    status: string;
    pollUrl?: string;
    paid(): boolean;
  }

  export class Payment {
    constructor(reference: string, authEmail?: string);
    add(title: string, amount: number): Payment;
  }

  export class Paynow {
    constructor(integrationId: string, integrationKey: string, resultUrl?: string, returnUrl?: string);
    resultUrl: string;
    returnUrl: string;
    createPayment(reference: string, authEmail?: string): Payment;
    /** Web/card payment — response carries `redirectUrl`. */
    send(payment: Payment): Promise<PaynowInitResponse>;
    /** Mobile money — method is 'ecocash' | 'onemoney'; response carries `instructions`. */
    sendMobile(payment: Payment, phone: string, method: string): Promise<PaynowInitResponse>;
    /** Poll a transaction's pollUrl for its current status. */
    pollTransaction(pollUrl: string): Promise<PaynowStatusResponse>;
  }
}
