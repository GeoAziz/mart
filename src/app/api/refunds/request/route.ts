
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest, type UserProfile } from '@/lib/authMiddleware';
import type { Order, OrderItem } from '@/app/api/orders/route'; // Import Order and OrderItem types
import type { RefundRequest } from '@/app/api/refunds/route'; // Import RefundRequest type
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';

const requestRefundSchema = z.object({
  orderId: z.string().min(1, "Order ID is required."),
  productId: z.string().min(1, "Product ID is required."),
  reason: z.string().min(10, "Reason must be at least 10 characters.").max(500, "Reason cannot exceed 500 characters."),
  // quantityToRefund: z.number().int().positive("Quantity must be a positive integer.").optional(), // For future item-level quantity refund
});

type RequestRefundInput = z.infer<typeof requestRefundSchema>;

const ELIGIBLE_ORDER_STATUSES_FOR_REFUND: Order['status'][] = ['delivered', 'shipped', 'processing'];


async function submitRefundRequestHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    const body = await req.json();
    const validationResult = requestRefundSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: "Validation failed", errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { orderId, productId, reason } = validationResult.data;

    // 1. Fetch the order and verify ownership and status
    const orderDocRef = firestoreAdmin.collection('orders').doc(orderId);
    const orderDocSnap = await orderDocRef.get();

    if (!orderDocSnap.exists) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    const orderData = orderDocSnap.data() as Order;
    if (orderData.userId !== authenticatedUser.uid) {
      return NextResponse.json({ message: 'Forbidden: You do not own this order.' }, { status: 403 });
    }

    if (!ELIGIBLE_ORDER_STATUSES_FOR_REFUND.includes(orderData.status)) {
      return NextResponse.json({ message: `Order status "${orderData.status}" is not eligible for a refund.` }, { status: 400 });
    }

    // 2. Find the specific item in the order
    const orderItem = orderData.items.find(item => item.productId === productId);
    if (!orderItem) {
      return NextResponse.json({ message: `Product with ID ${productId} not found in this order.` }, { status: 404 });
    }

    // 3. Check for existing non-denied refund requests for this order item
    const existingRefundsSnapshot = await firestoreAdmin.collection('refunds')
      .where('orderId', '==', orderId)
      .where('productId', '==', productId)
      .get();

    const nonDeniedExistingRefund = existingRefundsSnapshot.docs.find(doc => doc.data().status !== 'Denied');
    if (nonDeniedExistingRefund) {
      return NextResponse.json({ message: `A refund request for this item already exists with status: ${nonDeniedExistingRefund.data().status}.` }, { status: 409 });
    }

    // 4. Prepare and create the refund request document
    const now = Timestamp.now();
    
    const requestedAmountValue = (Number(orderItem.price) || 0) * (Number(orderItem.quantity) || 0);
    if (isNaN(requestedAmountValue)) {
        console.error(`Calculated requestedAmount is NaN for orderItem: ${JSON.stringify(orderItem)} in order ${orderId}`);
        throw new Error('Invalid price or quantity for order item, resulting in NaN amount.');
    }

    const newRefundRequestData: Omit<RefundRequest, 'id' | 'processedAt' | 'adminNotes' | 'transactionId'> = {
      orderId: orderId,
      productId: productId,
      productName: orderItem.name || 'Unknown Product', // Fallback for productName
      productImageUrl: orderItem.imageUrl,
      dataAiHint: orderItem.dataAiHint,
      userId: authenticatedUser.uid,
      customerName: authenticatedUser.fullName || 'N/A',
      customerEmail: authenticatedUser.email || 'N/A',
      vendorId: orderItem.vendorId,
      reason: reason,
      requestedAmount: requestedAmountValue,
      status: 'Pending',
      requestedAt: now,
    };

    const refundDocRef = await firestoreAdmin.collection('refunds').add(newRefundRequestData);
    
    const createdRefundResponse: RefundRequest = {
      id: refundDocRef.id,
      ...newRefundRequestData,
      requestedAt: newRefundRequestData.requestedAt.toDate(), // Convert to Date for client
    };

    return NextResponse.json(createdRefundResponse, { status: 201 });

  } catch (error: any) {
    console.error(`Error submitting refund request for user ${authenticatedUser.uid}:`, error);
    if (error.type === 'entity.parse.failed') {
      return NextResponse.json({ message: 'Invalid JSON payload for refund request.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error while submitting refund request.' }, { status: 500 });
  }
}

export const POST = withAuth(submitRefundRequestHandler);
    
