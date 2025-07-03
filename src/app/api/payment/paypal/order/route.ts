
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import * as paypal from '@paypal/checkout-server-sdk';

// List of PayPal supported currencies (major ones)
const SUPPORTED_PAYPAL_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'NZD', 'CHF', 'SGD', 'HKD', 'SEK', 'DKK', 'PLN', 'NOK', 'HUF', 'CZK', 'ILS', 'MXN', 'BRL', 'PHP', 'TWD', 'THB', 'TRY', 'RUB'
];

// POST /api/payment/paypal/order
export async function POST(req: Request) {
  try {


    // Parse and validate input
    const { amount, currency } = await req.json();
    if (typeof amount !== 'number' && typeof amount !== 'string') {
      return NextResponse.json({ message: 'Invalid amount type.' }, { status: 400 });
    }
    if (!currency || typeof currency !== 'string') {
      return NextResponse.json({ message: 'Missing or invalid currency.' }, { status: 400 });
    }

    // Always use a PayPal-supported currency (default to USD if not supported)
    let currencyCode = currency.toUpperCase();
    let amountStr: string;
    let conversionNotice: string | undefined = undefined;

    if (!SUPPORTED_PAYPAL_CURRENCIES.includes(currencyCode)) {
      // If not supported, convert to USD (hardcoded rate for demo, replace with real FX API in production)
      const KES_TO_USD = 1 / 129; // Hardcoded: 129 KES = 1 USD
      if (currencyCode === 'KES') {
        let amountNum = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, '').trim());
        if (isNaN(amountNum)) {
          return NextResponse.json({ message: 'Invalid amount.' }, { status: 400 });
        }
        const usdAmount = amountNum * KES_TO_USD;
        amountStr = usdAmount.toFixed(2);
        currencyCode = 'USD';
        conversionNotice = `Converted from KES to USD at rate 129 KES = 1 USD.`;
      } else {
        // For any other unsupported currency, just force USD and warn
        console.warn(`Currency '${currency}' is not supported by PayPal. Defaulting to USD.`);
        let amountNum = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, '').trim());
        if (isNaN(amountNum)) {
          return NextResponse.json({ message: 'Invalid amount.' }, { status: 400 });
        }
        amountStr = amountNum.toFixed(2);
        currencyCode = 'USD';
        conversionNotice = `Converted from ${currency} to USD. (No FX rate applied)`;
      }
    } else {
      // Supported currency
      if (typeof amount === 'number') {
        amountStr = amount.toFixed(2);
      } else {
        const parsed = parseFloat(String(amount).replace(/,/g, '').trim());
        if (isNaN(parsed)) {
          return NextResponse.json({ message: 'Invalid amount.' }, { status: 400 });
        }
        amountStr = parsed.toFixed(2);
      }
    }

    // --- PayPal SDK Initialization (zizo_Babyverse style) ---
    const environment = env.PAYPAL_MODE === 'live'
      ? new paypal.core.LiveEnvironment(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET)
      : new paypal.core.SandboxEnvironment(env.PAYPAL_CLIENT_ID, env.PAYPAL_CLIENT_SECRET);
    const client = new paypal.core.PayPalHttpClient(environment);

    // Create PayPal order
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currencyCode,
            value: amountStr,
          },
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    });

    // Execute order creation
    let order;
    try {
      order = await client.execute(request);
    } catch (err: any) {
      // If error is CURRENCY_NOT_SUPPORTED, return a clear message
      if (err?.statusCode === 422 && err?.message && err.message.includes('CURRENCY_NOT_SUPPORTED')) {
        return NextResponse.json({
          message: `Currency '${currencyCode}' is not supported by PayPal. Please use one of: ${SUPPORTED_PAYPAL_CURRENCIES.join(', ')}.`
        }, { status: 400 });
      }
      // Log and return generic error
      console.error('PayPal order creation error:', err);
      return NextResponse.json({ message: err?.message || 'PayPal error' }, { status: 500 });
    }
    if (!order?.result?.id) {
      return NextResponse.json({ message: 'Failed to create PayPal order.' }, { status: 500 });
    }
    // Return order id for PayPal Buttons
    return NextResponse.json({ id: order.result.id, currency: currencyCode, conversionNotice }, { status: 200 });
  } catch (error: any) {
    // Log error for debugging
    console.error('PayPal order creation error:', error);
    return NextResponse.json({ message: error?.message || 'PayPal error' }, { status: 500 });
  }
}
