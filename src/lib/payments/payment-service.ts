import type {
  PaymentProvider,
  PaymentAdapter,
  CreatePaymentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  QueryPaymentStatusInput,
  PaymentResult,
} from '@/lib/payments/types';
import { StripeAdapter } from '@/lib/payments/stripe-adapter';
import { PayPalAdapter } from '@/lib/payments/paypal-adapter';
import { MpesaAdapter } from '@/lib/payments/mpesa-adapter';
import { createApiError, ErrorCodes } from '@/lib/api-errors';

/**
 * Central payment facade. Application code never talks to a payment provider
 * directly — it calls PaymentService, which routes to the right adapter.
 *
 * Adding a provider = add an adapter implementing PaymentAdapter and register
 * it in getPaymentService().
 */
export class PaymentService {
  private readonly adapters: Record<PaymentProvider, PaymentAdapter>;

  constructor(adapters: Record<PaymentProvider, PaymentAdapter>) {
    this.adapters = adapters;
  }

  private adapter(provider: PaymentProvider): PaymentAdapter {
    const adapter = this.adapters[provider];
    if (!adapter) {
      throw createApiError(
        ErrorCodes.PAYMENT_ERROR,
        `Payment provider "${provider}" is not configured`,
        400
      );
    }
    return adapter;
  }

  async createPayment(provider: PaymentProvider, input: CreatePaymentInput): Promise<PaymentResult> {
    return this.adapter(provider).createPayment(input);
  }

  async capturePayment(provider: PaymentProvider, input: CapturePaymentInput): Promise<PaymentResult> {
    const adapter = this.adapter(provider);
    if (!adapter.capturePayment) {
      throw createApiError(
        ErrorCodes.PAYMENT_ERROR,
        `Payment provider "${provider}" does not support explicit capture`,
        400
      );
    }
    return adapter.capturePayment(input);
  }

  async refundPayment(provider: PaymentProvider, input: RefundPaymentInput): Promise<PaymentResult> {
    return this.adapter(provider).refundPayment(input);
  }

  async queryPaymentStatus(provider: PaymentProvider, input: QueryPaymentStatusInput): Promise<PaymentResult> {
    const adapter = this.adapter(provider);
    if (!adapter.queryPaymentStatus) {
      throw createApiError(
        ErrorCodes.PAYMENT_ERROR,
        `Payment provider "${provider}" does not support status queries`,
        400
      );
    }
    return adapter.queryPaymentStatus(input);
  }
}

let cachedService: PaymentService | undefined;

export function getPaymentService(): PaymentService {
  if (!cachedService) {
    cachedService = new PaymentService({
      stripe: new StripeAdapter(),
      paypal: new PayPalAdapter(),
      mpesa: new MpesaAdapter(),
    });
  }
  return cachedService;
}
