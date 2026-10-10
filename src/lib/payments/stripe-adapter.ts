import Stripe from 'stripe';
import {
  getStripeClient,
  requireStripeClient,
} from '@/lib/stripe';
import type {
  PaymentAdapter,
  CreatePaymentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  PaymentResult,
} from '@/lib/payments/types';

export class StripeAdapter implements PaymentAdapter {
  readonly provider = 'stripe' as const;

  private client(): Stripe {
    const stripe = getStripeClient();
    if (!stripe) {
      requireStripeClient();
    }
    return getStripeClient() as Stripe;
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const stripe = this.client();
    const amountInCents = Math.round(input.amount * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: input.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        ...input.metadata,
        ...(input.orderId ? { orderId: input.orderId } : {}),
        ...(input.customerId ? { customerId: input.customerId } : {}),
      },
      description: input.description,
    });

    return {
      provider: this.provider,
      providerPaymentId: paymentIntent.id,
      status: 'pending',
      clientSecret: paymentIntent.client_secret ?? undefined,
      amount: input.amount,
      currency: input.currency,
      raw: { status: paymentIntent.status },
    };
  }

  async capturePayment(input: CapturePaymentInput): Promise<PaymentResult> {
    const stripe = this.client();
    const intent = await stripe.paymentIntents.retrieve(input.providerPaymentId);

    if (intent.status === 'succeeded') {
      return {
        provider: this.provider,
        providerPaymentId: intent.id,
        status: 'completed',
        raw: { status: intent.status },
      };
    }

    if (intent.status !== 'requires_capture') {
      throw new Error(`Stripe payment intent cannot be captured (status: ${intent.status})`);
    }

    const captured = await stripe.paymentIntents.capture(input.providerPaymentId);
    return {
      provider: this.provider,
      providerPaymentId: captured.id,
      status: captured.status === 'succeeded' ? 'completed' : 'pending',
      raw: { status: captured.status },
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<PaymentResult> {
    const stripe = this.client();
    const refund = await stripe.refunds.create({
      payment_intent: input.providerPaymentId,
      ...(input.amount ? { amount: Math.round(input.amount * 100) } : {}),
      ...(input.reason ? { reason: input.reason as Stripe.RefundCreateParams['reason'] } : {}),
    });

    return {
      provider: this.provider,
      providerPaymentId: refund.id,
      status: refund.status === 'succeeded' ? 'completed' : 'pending',
      raw: { status: refund.status },
    };
  }
}
