
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Timestamp } from 'firebase-admin/firestore';
import type { Order } from '@/lib/types';
import admin from 'firebase-admin';

export interface RefundRequest {
  id?: string; // Firestore document ID
  orderId: string;
  productId: string; // ID of the product being refunded
  productName: string; // Denormalized
  productImageUrl?: string; // Denormalized
  dataAiHint?: string; // Denormalized

  userId: string; // Customer's UID
  customerName: string; // Denormalized customer name
  customerEmail: string; // Denormalized customer email

  vendorId?: string; // UID of the vendor if it's a vendor product

  reason: string;
  requestedAmount: number;
  status: 'Pending' | 'Approved' | 'Denied' | 'Processing';
  requestedAt: Date | Timestamp;
  processedAt?: Date | Timestamp;
  adminNotes?: string;
  transactionId?: string; // For refund transaction, if applicable
}

// Helper to map Firestore doc to RefundRequest type for client
function mapRefundDocument(doc: FirebaseFirestore.DocumentSnapshot): RefundRequest {
  const data = doc.data() as Omit<RefundRequest, 'id' | 'requestedAt' | 'processedAt'> & {
    requestedAt: any;
    processedAt?: any;
  };
  
  const toDate = (value: any) => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (value.toDate && typeof value.toDate === 'function') return value.toDate();
    return new Date(value);
  };

  return {
    id: doc.id,
    ...data,
    requestedAt: toDate(data.requestedAt),
    processedAt: toDate(data.processedAt),
  };
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

  const data = await response.json();
  return data.access_token;
}

// Refund PayPal payment
async function refundPayPalPayment(
  captureId: string,
  amount: number,
  currency: string
): Promise<{ refundId: string; status: string }> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `https://api.sandbox.paypal.com/v2/payments/captures/${captureId}/refund`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          value: amount.toFixed(2),
          currency_code: currency,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`PayPal refund failed: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    refundId: data.id,
    status: data.status,
  };
}

// Refund Stripe payment
async function refundStripePayment(
  chargeId: string,
  amount: number
): Promise<{ refundId: string; status: string }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error('Stripe key not configured');
  }

  const params = new URLSearchParams();
  params.append('charge', chargeId);
  if (amount > 0) {
    params.append('amount', (amount * 100).toString()); // Stripe uses cents
  }

  const response = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe refund failed: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    refundId: data.id,
    status: data.status,
  };
}

// POST handler to process refund
async function processRefundHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  if (!authenticatedUser) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json() as { orderId: string; itemId?: string; reason: string };
    const { orderId, itemId, reason } = body;

    if (!orderId || !reason) {
      return NextResponse.json(
        { message: 'Order ID and reason are required' },
        { status: 400 }
      );
    }

    // Fetch order
    const ordersRef = firestoreAdmin.collection('orders');
    const orderDoc = await ordersRef.doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const order = orderDoc.data() as Order;

    // Verify customer owns this order or is admin
    if (order.userId !== authenticatedUser.uid && authenticatedUser.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Check if order is refundable
    const refundableStatuses = ['delivered', 'shipped', 'processing'];
    if (!refundableStatuses.includes(order.status)) {
      return NextResponse.json(
        { message: `Order with status "${order.status}" cannot be refunded` },
        { status: 400 }
      );
    }

    let refundAmount = order.totalAmount;
    if (itemId) {
      const item = order.items.find((i) => i.productId === itemId);
      if (!item) {
        return NextResponse.json({ message: 'Item not found in order' }, { status: 404 });
      }
      refundAmount = item.price * item.quantity;
    }

    let refundResult: any;

    // Process refund based on payment method
    if (order.paymentMethod === 'paypal' && order.paymentDetails?.paypalCaptureId) {
      try {
        const { refundId, status } = await refundPayPalPayment(
          order.paymentDetails.paypalCaptureId,
          refundAmount,
          'USD'
        );

        refundResult = {
          refundId,
          status: status === 'COMPLETED' ? 'completed' : 'pending',
          amount: refundAmount,
          currency: 'USD',
          message: 'PayPal refund processed',
        };
      } catch (err) {
        throw new Error(`PayPal refund error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (order.paymentMethod === 'card' && order.paymentDetails?.stripeChargeId) {
      try {
        const { refundId, status } = await refundStripePayment(
          order.paymentDetails.stripeChargeId,
          refundAmount
        );

        refundResult = {
          refundId,
          status: status === 'succeeded' ? 'completed' : 'pending',
          amount: refundAmount,
          currency: 'KES',
          message: 'Card refund processed',
        };
      } catch (err) {
        throw new Error(`Stripe refund error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (order.paymentMethod === 'mpesa') {
      // M-Pesa requires manual refund
      refundResult = {
        refundId: `mpesa-${Date.now()}`,
        status: 'pending',
        amount: refundAmount,
        currency: 'KES',
        message: 'M-Pesa refund initiated. Admin will process manual return.',
      };
    } else {
      return NextResponse.json(
        { message: 'Payment method does not support refunds' },
        { status: 400 }
      );
    }

    // Update order with refund details
    await ordersRef.doc(orderId).update({
      refundDetails: {
        refundId: refundResult.refundId,
        status: refundResult.status,
        amount: refundAmount,
        reason,
        initiatedAt: new Date(),
        initiatedBy: authenticatedUser.uid,
      },
      status: refundResult.status === 'completed' ? 'refunded' : 'refund_pending',
    });

    return NextResponse.json(refundResult, { status: 200 });
  } catch (error: any) {
    console.error('[Refund] Error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Refund processing failed' },
      { status: 500 }
    );
  }
}

// GET handler to fetch all refund requests (admin only)
async function getAllRefundsHandler(req: AuthenticatedRequest) {
  try {
    const refundsSnapshot = await firestoreAdmin
      .collection('refunds')
      .orderBy('requestedAt', 'desc')
      .get();

    const refunds: RefundRequest[] = refundsSnapshot.docs.map(mapRefundDocument);
    return NextResponse.json(refunds, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching all refund requests for admin:', error);
    return NextResponse.json({ message: 'Internal Server Error while fetching refund requests.' }, { status: 500 });
  }
}

export const POST = withAuth(processRefundHandler);
export const GET = withAuth(getAllRefundsHandler, 'admin');
    