import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

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

// POST /api/payment/paypal/capture
// Captures a PayPal order after user approval using REST API v2
export async function POST(req: Request) {
  try {
    // Validate PayPal credentials
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
      console.error('❌ PayPal credentials missing from environment');
      return NextResponse.json({ 
        message: 'PayPal configuration error: Missing credentials' 
      }, { status: 500 });
    }

    const { orderId } = await req.json();
    
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ message: 'Missing or invalid orderId.' }, { status: 400 });
    }

    console.log('🚀 PayPal Capture Called (REST API v2) for order:', orderId);

    // Get access token
    console.log('🔐 PayPal: Getting access token...');
    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken();
      console.log('✅ PayPal: Access token obtained');
    } catch (authErr: any) {
      console.error('❌ PayPal authentication error:', authErr.message);
      return NextResponse.json({ 
        success: false,
        message: 'PayPal authentication failed',
        error: 'AUTH_ERROR'
      }, { status: 500 });
    }

    // Capture order using REST API v2
    const mode = env.PAYPAL_MODE || 'sandbox';
    const baseUrl = PAYPAL_API_BASE[mode as keyof typeof PAYPAL_API_BASE];

    console.log('📦 PayPal: Capturing order:', orderId);

    // Add timeout to the fetch request (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let captureResponse;
    try {
      captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const captureData = await captureResponse.json();
    
    console.log('📊 Capture Response Status:', captureResponse.status);
    console.log('📊 Capture Response Data:', JSON.stringify(captureData, null, 2));

    if (!captureResponse.ok) {
      console.error('❌ PayPal capture failed:');
      console.error('   Status:', captureResponse.status);
      console.error('   Full Response:', JSON.stringify(captureData, null, 2));

      // Handle order not found or already captured
      if (captureResponse.status === 404 || captureData?.details?.[0]?.issue === 'INVALID_RESOURCE_ID') {
        return NextResponse.json({ 
          success: false,
          message: 'PayPal order not found or is no longer valid',
          error: 'INVALID_ORDER'
        }, { status: 400 });
      }

      // Handle order already captured
      if (captureData?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
        console.log('⚠️ PayPal: Order was already captured');
        return NextResponse.json({ 
          success: true,
          status: 'COMPLETED',
          orderId: orderId,
          message: 'Payment was already captured'
        }, { status: 200 });
      }

      return NextResponse.json({ 
        success: false,
        message: captureData?.message || 'Failed to capture PayPal payment',
        details: process.env.NODE_ENV === 'development' ? captureData : undefined
      }, { status: captureResponse.status });
    }

    const status = captureData.status;
    console.log('✅ PayPal: Order captured successfully. Status:', status);

    // Check if capture was successful
    if (status === 'COMPLETED') {
      console.log('✅ PayPal: Payment completed for order:', orderId);
      return NextResponse.json({ 
        success: true,
        status: status,
        orderId: orderId,
        message: 'Payment captured successfully'
      }, { status: 200 });
    } else {
      console.warn('⚠️ PayPal: Unexpected status:', status);
      return NextResponse.json({ 
        success: false,
        status: status,
        orderId: orderId,
        message: `Unexpected payment status: ${status}`
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ PayPal capture error:', error);
    
    // Handle network errors
    if (error?.cause?.code === 'ECONNREFUSED' || error?.cause?.code === 'ENOTFOUND') {
      return NextResponse.json({ 
        success: false,
        message: 'Cannot connect to PayPal. Please check your internet connection.',
        error: 'NETWORK_ERROR'
      }, { status: 503 });
    }

    // Handle timeout errors
    if (error?.name === 'AbortError' || error?.cause?.code === 'ETIMEDOUT') {
      return NextResponse.json({ 
        success: false,
        message: 'PayPal request timed out. Please try again.',
        error: 'TIMEOUT_ERROR'
      }, { status: 504 });
    }

    return NextResponse.json({ 
      success: false,
      message: error?.message || 'PayPal error occurred',
      error: 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}
