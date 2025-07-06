'use server';

import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { Order } from '@/lib/types';

async function getVendorOrdersHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    const ordersSnapshot = await firestoreAdmin
      .collection('orders')
      .where('vendorIds', 'array-contains', authenticatedUser.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Order[];

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    return NextResponse.json(
      { message: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

async function updateOrderStatusHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    const { orderId, status, note } = await req.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { message: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    const orderRef = firestoreAdmin.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data() as Order;
    if (!orderData.vendorIds?.includes(authenticatedUser.uid)) {
      return NextResponse.json(
        { message: 'Unauthorized to update this order' },
        { status: 403 }
      );
    }

    await orderRef.update({
      status,
      updatedAt: new Date(),
      statusHistory: [
        ...(orderData.statusHistory || []),
        {
          status,
          timestamp: new Date(),
          note: note || `Status updated to ${status}`,
          updatedBy: authenticatedUser.uid
        }
      ]
    });

    return NextResponse.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { message: 'Failed to update order status' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getVendorOrdersHandler);
export const PUT = withAuth(updateOrderStatusHandler);