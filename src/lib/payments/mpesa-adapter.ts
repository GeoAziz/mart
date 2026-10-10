import { fetchWithRetry } from '@/lib/fetch-with-retry';
import type {
  PaymentAdapter,
  CreatePaymentInput,
  RefundPaymentInput,
  QueryPaymentStatusInput,
  PaymentResult,
} from '@/lib/payments/types';

const MPESA_API_BASE = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
};

interface DarajaTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface StkPushResponse {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
}

/**
 * M-Pesa Daraja API adapter (Lipa Na M-Pesa Online / STK Push).
 *
 * Environment variables:
 *   MPESA_ENV               sandbox | production (default sandbox)
 *   MPESA_CONSUMER_KEY      Daraja app consumer key
 *   MPESA_CONSUMER_SECRET   Daraja app consumer secret
 *   MPESA_SHORTCODE         Paybill/Till shortcode (BusinessShortCode)
 *   MPESA_PASSKEY           Lipa Na M-Pesa Online passkey
 *   MPESA_CALLBACK_URL      HTTPS callback that receives STK push results
 */
export class MpesaAdapter implements PaymentAdapter {
  readonly provider = 'mpesa' as const;

  private get baseUrl(): string {
    const env = process.env.MPESA_ENV || 'sandbox';
    return MPESA_API_BASE[env as keyof typeof MPESA_API_BASE];
  }

  private assertConfigured(): void {
    const required = [
      'MPESA_CONSUMER_KEY',
      'MPESA_CONSUMER_SECRET',
      'MPESA_SHORTCODE',
      'MPESA_PASSKEY',
      'MPESA_CALLBACK_URL',
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`M-Pesa configuration error: missing ${missing.join(', ')}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    this.assertConfigured();

    const response = await fetchWithRetry(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
          ).toString('base64')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`M-Pesa OAuth failed: ${response.status}`);
    }

    const data = (await response.json()) as DarajaTokenResponse;
    if (!data.access_token) {
      throw new Error('M-Pesa OAuth returned no access token');
    }
    return data.access_token;
  }

  private buildPassword(): string {
    const shortcode = process.env.MPESA_SHORTCODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const timestamp = this.buildTimestamp();
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  }

  private buildTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    );
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    if (input.currency !== 'KES') {
      throw new Error('M-Pesa only supports KES currency');
    }
    if (!input.phoneNumber) {
      throw new Error('M-Pesa requires a phoneNumber in international format (e.g. 254712345678)');
    }

    const token = await this.getAccessToken();
    const shortcode = process.env.MPESA_SHORTCODE!;
    const amount = Math.round(input.amount);

    const payload = {
      BusinessShortCode: shortcode,
      Password: this.buildPassword(),
      Timestamp: this.buildTimestamp(),
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: input.phoneNumber,
      PartyB: shortcode,
      PhoneNumber: input.phoneNumber,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: input.orderId || `zilacart-${Date.now()}`,
      TransactionDesc: input.description || 'ZilaCart purchase',
    };

    const response = await fetchWithRetry(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as StkPushResponse;

    if (!response.ok || (data.ResponseCode && data.ResponseCode !== '0')) {
      throw new Error(`M-Pesa STK push failed: ${data.ResponseDescription || response.statusText}`);
    }

    return {
      provider: this.provider,
      providerPaymentId: data.MerchantRequestID || `mpesa-${Date.now()}`,
      status: 'pending',
      amount,
      currency: 'KES',
      raw: { ...data },
    };
  }

  async queryPaymentStatus(input: QueryPaymentStatusInput): Promise<PaymentResult> {
    if (!input.providerPaymentIdAlt) {
      throw new Error('M-Pesa status query requires the CheckoutRequestID');
    }

    const token = await this.getAccessToken();
    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE!,
      Password: this.buildPassword(),
      Timestamp: this.buildTimestamp(),
      CheckoutRequestID: input.providerPaymentIdAlt,
    };

    const response = await fetchWithRetry(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as StkPushResponse & { ResultCode?: string; ResultDesc?: string };

    if (!response.ok) {
      throw new Error(`M-Pesa status query failed: ${response.status}`);
    }

    const succeeded = data.ResultCode === '0' || data.ResponseCode === '0';
    const failed =
      data.ResultCode && data.ResultCode !== '0' && data.ResultCode !== '1032'; // 1032 = awaiting user input

    return {
      provider: this.provider,
      providerPaymentId: input.providerPaymentId,
      status: succeeded ? 'completed' : failed ? 'failed' : 'pending',
      raw: { ...data },
    };
  }

  async refundPayment(_input: RefundPaymentInput): Promise<PaymentResult> {
    // Daraja exposes reversal (transaction reversal API); until the merchant
    // account is enabled for it, surface a clear, actionable error.
    throw new Error(
      'M-Pesa refunds require the Transaction Reversal API which is not enabled ' +
      'on this merchant account. Process refunds manually via the merchant portal.'
    );
  }
}
