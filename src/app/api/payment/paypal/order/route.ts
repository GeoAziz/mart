import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

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
    // Validate PayPal credentials are configured
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
      console.error('❌ PayPal credentials missing from environment');
      return NextResponse.json({ 
        message: 'PayPal configuration error: Missing credentials. Please ensure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are set.' 
      }, { status: 500 });
    }

    // Validate credentials are not empty strings
    if (env.PAYPAL_CLIENT_ID.trim() === '' || env.PAYPAL_CLIENT_SECRET.trim() === '') {
      console.error('❌ PayPal credentials are empty strings');
      return NextResponse.json({ 
        message: 'PayPal configuration error: Credentials are empty' 
      }, { status: 500 });
    }

    console.log('🚀 PayPal API Route Called (REST API v2)');
    console.log('   Client ID available:', !!env.PAYPAL_CLIENT_ID);
    console.log('   Client ID length:', env.PAYPAL_CLIENT_ID.length);
    console.log('   Client Secret available:', !!env.PAYPAL_CLIENT_SECRET);
    console.log('   Mode:', env.PAYPAL_MODE || 'sandbox');

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
        
        // PayPal requires minimum $0.01
        const minAmount = parseFloat(amountStr);
        if (minAmount < 0.01) {
          console.warn('❌ Amount too small for PayPal:', amountStr);
          return NextResponse.json({ 
            message: 'Order total too small (minimum is 1.29 KES)',
            minAmount: '1.29'
          }, { status: 400 });
        }
        
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

    // Validate minimum amount for PayPal (minimum $0.01)
    const finalAmount = parseFloat(amountStr);
    if (finalAmount < 0.01) {
      console.error('❌ Amount too small for PayPal:', amountStr);
      return NextResponse.json({ 
        message: 'Order total too small for PayPal (minimum $0.01)',
        amount: amountStr,
        currency: currencyCode
      }, { status: 400 });
    }

    console.log('📦 Final PayPal order amount:', amountStr, currencyCode);

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
      console.error('❌ PayPal order creation failed:');
      console.error('   Status:', orderResponse.status);
      console.error('   Response:', JSON.stringify(orderData, null, 2));

      // Handle specific error cases
      if (orderData?.details?.[0]?.issue === 'CURRENCY_NOT_SUPPORTED') {
        return NextResponse.json({
          message: `Currency '${currencyCode}' is not supported by PayPal.`
        }, { status: 400 });
      }

      return NextResponse.json({ 
        message: orderData?.message || 'Failed to create PayPal order',
        details: process.env.NODE_ENV === 'development' ? orderData : undefined
      }, { status: orderResponse.status });
    }

    if (!orderData.id) {
      console.error('❌ PayPal response missing order ID:', orderData);
      return NextResponse.json({ 
        message: 'PayPal returned invalid response (no order ID)',
        details: process.env.NODE_ENV === 'development' ? orderData : undefined
      }, { status: 500 });
    }

    console.log('✅ PayPal: Order created successfully:', orderData.id);
    console.log('   Amount:', amountStr, currencyCode);
    console.log('   Status:', orderData.status);

    // Return order id for PayPal Buttons
    return NextResponse.json({ 
      id: orderData.id, 
      currency: currencyCode, 
      amount: amountStr,
      conversionNotice 
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ PayPal order creation error:', error);
    
    // Handle network/timeout errors
    if (error?.cause?.code === 'ECONNREFUSED' || error?.cause?.code === 'ENOTFOUND') {
      return NextResponse.json({ 
        message: 'Cannot connect to PayPal. Please check your internet connection.',
        error: 'NETWORK_ERROR'
      }, { status: 503 });
    }

    return NextResponse.json({ 
      message: error?.message || 'PayPal error' 
    }, { status: 500 });
  }
}
