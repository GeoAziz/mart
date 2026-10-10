import { env } from '@/lib/env';
import { fetchWithRetry } from '@/lib/fetch-with-retry';
import type {
  PaymentAdapter,
  CreatePaymentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  PaymentResult,
} from '@/lib/payments/types';

const PAYPAL_API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

const SUPPORTED_PAYPAL_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'NZD', 'CHF', 'SGD', 'HKD',
  'SEK', 'DKK', 'PLN', 'NOK', 'HUF', 'CZK', 'ILS', 'MXN', 'BRL', 'PHP',
  'TWD', 'THB', 'TRY', 'RUB',
];

const KES_TO_USD_RATE = 1 / 129;

export class PayPalAdapter implements PaymentAdapter {
  readonly provider = 'paypal' as const;

  private get baseUrl(): string {
    const mode = env.PAYPAL_MODE || 'sandbox';
    return PAYPAL_API_BASE[mode as keyof typeof PAYPAL_API_BASE];
  }

  private assertConfigured(): void {
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal configuration error: Missing credentials');
    }
  }

  private async getAccessToken(): Promise<string> {
    this.assertConfigured();
    const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');

    const response = await fetchWithRetry(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`PayPal authentication failed: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  private convertCurrency(amount: number, currency: string): { amountStr: string; currencyCode: string; conversionNotice?: string } {
    if (SUPPORTED_PAYPAL_CURRENCIES.includes(currency)) {
      return { amountStr: amount.toFixed(2), currencyCode: currency };
    }

    if (currency === 'KES') {
      const usdAmount = amount * KES_TO_USD_RATE;
      if (usdAmount < 0.01) {
        throw new Error('Order total too small (minimum is 1.29 KES)');
      }
      return {
        amountStr: usdAmount.toFixed(2),
        currencyCode: 'USD',
        conversionNotice: 'Converted from KES to USD at rate 129 KES = 1 USD',
      };
    }

    return {
      amountStr: amount.toFixed(2),
      currencyCode: 'USD',
      conversionNotice: `Converted from ${currency} to USD`,
    };
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    this.assertConfigured();
    const accessToken = await this.getAccessToken();
    const { amountStr, currencyCode, conversionNotice } = this.convertCurrency(input.amount, input.currency);

    if (parseFloat(amountStr) < 0.01) {
      throw new Error('Order total too small for PayPal (minimum $0.01)');
    }

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `zilacart_${Date.now()}`,
          description: input.description || 'ZilaCart Purchase',
          amount: {
            currency_code: currencyCode,
            value: amountStr,
          },
        },
      ],
    };

    const response = await fetchWithRetry(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await response.json();

    if (!response.ok) {
      throw new Error(orderData?.message || 'Failed to create PayPal order');
    }
    if (!orderData.id) {
      throw new Error('PayPal returned invalid response (no order ID)');
    }

    return {
      provider: this.provider,
      providerPaymentId: orderData.id,
      status: 'pending',
      amount: parseFloat(amountStr),
      currency: currencyCode,
      raw: { ...orderData, conversionNotice },
    };
  }

  async capturePayment(input: CapturePaymentInput): Promise<PaymentResult> {
    this.assertConfigured();
    const accessToken = await this.getAccessToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let captureResponse: Response;
    try {
      captureResponse = await fetchWithRetry(
        `${this.baseUrl}/v2/checkout/orders/${input.providerPaymentId}/capture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const captureData = await captureResponse.json();

    if (captureData?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
      return {
        provider: this.provider,
        providerPaymentId: input.providerPaymentId,
        status: 'completed',
        raw: captureData,
      };
    }

    if (!captureResponse.ok) {
      throw new Error(captureData?.message || 'Failed to capture PayPal payment');
    }

    return {
      provider: this.provider,
      providerPaymentId: input.providerPaymentId,
      status: captureData.status === 'COMPLETED' ? 'completed' : 'pending',
      raw: captureData,
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<PaymentResult> {
    this.assertConfigured();
    const accessToken = await this.getAccessToken();

    const body: Record<string, unknown> = {};
    if (input.amount) {
      body.amount = {
        value: input.amount.toFixed(2),
        currency_code: input.currency || 'KES',
      };
    }

    const response = await fetchWithRetry(
      `${this.baseUrl}/v2/payments/captures/${input.providerPaymentId}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`PayPal refund failed: ${data?.message || response.statusText}`);
    }

    return {
      provider: this.provider,
      providerPaymentId: data.id,
      status: data.status === 'COMPLETED' ? 'completed' : 'pending',
      raw: data,
    };
  }
}
