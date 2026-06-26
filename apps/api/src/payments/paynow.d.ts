/**
 * The `paynow` npm package ships no TypeScript declarations (verified: no .d.ts in
 * node_modules/paynow/dist). This module declares the minimal real-SDK surface PaynowService
 * actually touches so the rest of the codebase never needs `any`.
 */
declare module 'paynow' {
  export interface PaynowInitResponse {
    success: boolean;
    status: string;
    hasRedirect: boolean;
    pollUrl?: string;
    redirectUrl?: string;
    instructions?: string;
    error?: string;
  }

  export class Payment {
    constructor(reference: string, authEmail?: string);
    add(title: string, amount: number): void;
  }

  export class Paynow {
    constructor(integrationId: string, integrationKey: string, resultUrl?: string, returnUrl?: string);
    createPayment(reference: string, authEmail?: string): Payment;
    send(payment: Payment): Promise<PaynowInitResponse>;
    sendMobile(payment: Payment, phone: string, method: string): Promise<PaynowInitResponse>;
  }
}
