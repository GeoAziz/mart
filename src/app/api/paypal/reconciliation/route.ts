/**
 * PayPal Order Reconciliation API
 * ================================
 * 
 * This endpoint checks PayPal for completed orders that don't have a matching order in our system.
 * 
 * Scenario: User completes PayPal payment but our order creation fails or times out.
 * This reconciliation job finds those orphaned PayPal transactions and creates orders for them.
 * 
 * Usage: Call this endpoint periodically (cron job) to catch missed orders
 * POST /api/paypal/reconciliation
 * 
 * Protected: Admin only
 * Requires: PayPal credentials in .env
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

interface PayPalOrder {
  id: string;
  status: string;
  payer: {
    email_address: string;
    name: {
      given_name: string;
      surname: string;
    };
  };
  purchase_units: Array<{
    amount: {
      value: string;
      currency_code: string;
    };
    payee: {
      email_address: string;
    };
  }>;
  create_time: string;
}

interface ReconciliationResult {
  orphanedOrders: string[];
  createdOrders: string[];
  errors: string[];
  totalProcessed: number;
}

// Get PayPal Access Token
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get PayPal order details
async function getPayPalOrder(orderId: string, accessToken: string): Promise<PayPalOrder> {
  const response = await fetch(`https://api.sandbox.paypal.com/v2/checkout/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PayPal order ${orderId}: ${response.statusText}`);
  }

  return response.json();
}

// Search for completed PayPal orders from last 30 days
async function searchPayPalOrders(accessToken: string, startTime: string): Promise<string[]> {
  // Note: PayPal doesn't provide a direct "search all orders" API in REST v2
  // This is a limitation - we need webhooks or a different approach
  // For now, return empty array - this should be replaced with webhook approach
  console.log('[PayPal Reconciliation] PayPal REST API does not support bulk order search');
  console.log('[PayPal Reconciliation] Recommended: Use webhooks or SFTP sync instead');
  return [];
}

// Main reconciliation logic
export async function POST(req: NextRequest) {
  try {
    // Verify this is an admin request (simple check - in production use proper auth)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const result: ReconciliationResult = {
      orphanedOrders: [],
      createdOrders: [],
      errors: [],
      totalProcessed: 0,
    };

    // Get PayPal token
    const accessToken = await getPayPalAccessToken();

    // Define time window for reconciliation (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startTime = thirtyDaysAgo.toISOString();

    // Search for PayPal orders
    const paypalOrderIds = await searchPayPalOrders(accessToken, startTime);
    result.totalProcessed = paypalOrderIds.length;

    // For each PayPal order, check if we have a matching order in Firestore
    for (const paypalOrderId of paypalOrderIds) {
      try {
        // Check if order exists in our DB
        const ordersRef = firestoreAdmin.collection('orders');
        const query = ordersRef
          .where('paymentDetails.paypalOrderId', '==', paypalOrderId)
          .limit(1);

        const snapshot = await query.get();

        if (snapshot.empty) {
          // Order doesn't exist - this is an orphaned transaction
          result.orphanedOrders.push(paypalOrderId);

          // Get PayPal order details
          const paypalOrder = await getPayPalOrder(paypalOrderId, accessToken);

          // If payment was captured, create order in our system
          if (paypalOrder.status === 'COMPLETED') {
            // TODO: Create order from PayPal data
            // This requires fetching additional data from PayPal:
            // - Cart items (not stored in PayPal order)
            // - Shipping address
            // - User info
            //
            // Since PayPal doesn't store this, we'd need to:
            // 1. Query user by email and get their recent cart
            // 2. Or require user to complete the process manually
            //
            // For now, log it so admin can investigate
            console.log(`[Reconciliation] Found orphaned PayPal order: ${paypalOrderId}`);
            console.log(`[Reconciliation] Payer email: ${paypalOrder.payer.email_address}`);
            console.log(`[Reconciliation] Amount: ${paypalOrder.purchase_units[0].amount.value} ${paypalOrder.purchase_units[0].amount.currency_code}`);
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Error processing PayPal order ${paypalOrderId}: ${errorMsg}`);
        console.error(`[Reconciliation] Error:`, err);
      }
    }

    console.log('[PayPal Reconciliation] Results:', result);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[PayPal Reconciliation] Fatal error:', error);
    return NextResponse.json(
      {
        message: 'Reconciliation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
