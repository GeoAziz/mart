export type PaymentProvider = 'stripe' | 'paypal' | 'mpesa';

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface CreatePaymentInput {
  amount: number; // Minor units for stripe, major units for paypal/mpesa
  currency: string; // ISO 4217, e.g. 'KES', 'USD'
  orderId?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  phoneNumber?: string; // Required for M-Pesa STK push (e.g. '254712345678')
}

export interface QueryPaymentStatusInput {
  providerPaymentId: string;
  providerPaymentIdAlt?: string; // Secondary id (e.g. M-Pesa CheckoutRequestID)
}

export interface CapturePaymentInput {
  providerPaymentId: string;
  orderId?: string;
  customerId?: string;
}

export interface RefundPaymentInput {
  providerPaymentId: string; // Stripe PaymentIntent id, PayPal capture id, or M-Pesa txn id
  amount?: number; // Major units; defaults to full amount
  currency?: string;
  reason?: string;
}

export interface PaymentResult {
  provider: PaymentProvider;
  providerPaymentId: string;
  status: PaymentStatus;
  clientSecret?: string; // Stripe
  approvalUrl?: string; // PayPal
  amount?: number;
  currency?: string;
  raw?: Record<string, unknown>;
}

export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  capturePayment?(input: CapturePaymentInput): Promise<PaymentResult>;
  refundPayment(input: RefundPaymentInput): Promise<PaymentResult>;
  queryPaymentStatus?(input: QueryPaymentStatusInput): Promise<PaymentResult>;
}
