import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createPaypalOrderSchema } from '@/lib/validation-schemas';
import { formatApiError, createApiError, ErrorCodes } from '@/lib/api-errors';

// List of PayPal supported currencies (major ones)
const SUPPORTED_PAYPAL_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'NZD', 'CHF', 'SGD', 'HKD', 'SEK', 'DKK', 'PLN', 'NOK', 'HUF', 'CZK', 'ILS', 'MXN', 'BRL', 'PHP', 'TWD', 'THB', 'TRY', 'RUB'
];

// PayPal API base URLs
const PAYPAL_API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com'
};

// Get PayPal access token using OAuth2
async function getPayPalAccessToken(): Promise<string> {
  const mode = env.PAYPAL_MODE || 'sandbox';
  const baseUrl = PAYPAL_API_BASE[mode as keyof typeof PAYPAL_API_BASE];
  
  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ PayPal OAuth failed:', response.status, errorText);
    throw new Error(`PayPal authentication failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// POST /api/payment/paypal/order
// Creates a PayPal order using REST API v2 (no deprecated SDK)
export async function POST(req: Request) {
  try {
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
      throw createApiError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'PayPal configuration error: Missing credentials',
        500
      );
    }

    if (env.PAYPAL_CLIENT_ID.trim() === '' || env.PAYPAL_CLIENT_SECRET.trim() === '') {
      throw createApiError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'PayPal configuration error: Credentials are empty',
        500
      );
    }

    const body = await req.json();
    const validated = createPaypalOrderSchema.parse(body);

    let currencyCode = validated.currency;
    let amountStr: string;
    let conversionNotice: string | undefined = undefined;

    if (!SUPPORTED_PAYPAL_CURRENCIES.includes(currencyCode)) {
      const KES_TO_USD = 1 / 129;
      if (currencyCode === 'KES') {
        const usdAmount = validated.amount * KES_TO_USD;
        amountStr = usdAmount.toFixed(2);

        const minAmount = parseFloat(amountStr);
        if (minAmount < 0.01) {
          throw createApiError(
            ErrorCodes.PAYMENT_ERROR,
            'Order total too small (minimum is 1.29 KES)',
            400
          );
        }

        currencyCode = 'USD';
        conversionNotice = 'Converted from KES to USD at rate 129 KES = 1 USD';
      } else {
        amountStr = validated.amount.toFixed(2);
        currencyCode = 'USD';
        conversionNotice = `Converted from ${validated.currency} to USD`;
      }
    } else {
      amountStr = validated.amount.toFixed(2);
    }

    const finalAmount = parseFloat(amountStr);
    if (finalAmount < 0.01) {
      throw createApiError(
        ErrorCodes.PAYMENT_ERROR,
        'Order total too small for PayPal (minimum $0.01)',
        400
      );
    }

    // Get access token
    console.log('🔐 PayPal: Getting access token...');
    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken();
      console.log('✅ PayPal: Access token obtained');
    } catch (authErr: any) {
      console.error('❌ PayPal authentication error:', authErr.message);
      return NextResponse.json({ 
        message: 'PayPal authentication failed. Please check credentials.',
        error: 'AUTH_ERROR'
      }, { status: 500 });
    }

    // Create order using REST API v2
    const mode = env.PAYPAL_MODE || 'sandbox';
    const baseUrl = PAYPAL_API_BASE[mode as keyof typeof PAYPAL_API_BASE];
    
    // Simple payload for JS SDK PayPalButtons integration
    // The JS SDK handles the approval flow via popup/modal
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `zilacart_${Date.now()}`,
          description: 'ZilaCart Purchase',
          amount: {
            currency_code: currencyCode,
            value: amountStr,
          },
        },
      ],
    };

    console.log('📦 PayPal: Creating order with amount:', amountStr, 'currency:', currencyCode);

    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      if (orderData?.details?.[0]?.issue === 'CURRENCY_NOT_SUPPORTED') {
        throw createApiError(
          ErrorCodes.PAYMENT_ERROR,
          `Currency '${currencyCode}' is not supported by PayPal`,
          400
        );
      }

      throw createApiError(
        ErrorCodes.PAYMENT_ERROR,
        orderData?.message || 'Failed to create PayPal order',
        orderResponse.status
      );
    }

    if (!orderData.id) {
      throw createApiError(
        ErrorCodes.PAYMENT_ERROR,
        'PayPal returned invalid response (no order ID)',
        500
      );
    }

    return NextResponse.json(
      {
        id: orderData.id,
        currency: currencyCode,
        amount: amountStr,
        conversionNotice,
      },
      { status: 200 }
    );
  } catch (error) {
    const { response } = formatApiError(error);
    return response;
  }
}
