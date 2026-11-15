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
import { SimulatedPaymentAdapter } from '@/lib/payments/simulated-adapter';
import { SecurityIsolationError } from '@/marketplace-activity-engine/safety/environment-guard';
import { createApiError, ErrorCodes } from '@/lib/api-errors';

/**
 * Central payment facade. Application code never talks to a payment provider
 * directly — it calls PaymentService, which routes to the right adapter.
 *
 * Enforces domain self-defense:
 * - Rejects live payment providers (Stripe, PayPal, M-Pesa) for synthetic transactions.
 * - Restricts SimulatedPaymentAdapter to non-production environments.
 */
export class PaymentService {
  private readonly adapters: Partial<Record<PaymentProvider, PaymentAdapter>>;

  constructor(adapters: Partial<Record<PaymentProvider, PaymentAdapter>>) {
    this.adapters = adapters;
  }

  private adapter(provider: PaymentProvider, isSynthetic = false): PaymentAdapter {
    // 1. Guard against synthetic executions routing to live banking/gateway providers
    if (isSynthetic && provider !== 'simulated') {
      throw new SecurityIsolationError(
        `Domain Self-Defense: Synthetic transactions cannot execute against live provider '${provider}'. Must use 'simulated'.`
      );
    }

    // 2. Guard against simulated provider in production
    if (provider === 'simulated' && process.env.NODE_ENV === 'production') {
      throw new SecurityIsolationError(
        `Domain Self-Defense: Simulated payment adapter cannot be invoked in production.`
      );
    }

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
    const isSynthetic =
      input.metadata?.provenance === 'synthetic' ||
      input.metadata?.synthetic === 'true';

    return this.adapter(provider, isSynthetic).createPayment(input);
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
    const isProd = process.env.NODE_ENV === 'production';
    const adapters: Partial<Record<PaymentProvider, PaymentAdapter>> = {
      stripe: new StripeAdapter(),
      paypal: new PayPalAdapter(),
      mpesa: new MpesaAdapter(),
    };

    if (!isProd) {
      adapters.simulated = new SimulatedPaymentAdapter();
    }

    cachedService = new PaymentService(adapters);
  }
  return cachedService;
}
