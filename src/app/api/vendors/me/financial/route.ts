'use server';

import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireVendor } from '@/lib/authorization';
import type { LedgerEntry, Order } from '@/lib/types';

async function getFinancialReportHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    requireVendor(authenticatedUser);
    let ledgerQuery = firestoreAdmin
      .collection('users')
      .doc(authenticatedUser.uid)
      .collection('ledgerEntries')
      .orderBy('createdAt', 'desc');

    if (startDate) {
      ledgerQuery = ledgerQuery.where('createdAt', '>=', new Date(startDate));
    }
    if (endDate) {
      ledgerQuery = ledgerQuery.where('createdAt', '<=', new Date(endDate));
    }

    const ledgerSnapshot = await ledgerQuery.get();
    const transactions = ledgerSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        vendorId: data.vendorId,
        type: data.type,
        amount: data.amount,
        netAmount: data.netAmount,
        description: data.description,
        commissionAmount: data.commissionAmount,
        createdAt: data.createdAt?.toDate(),
      } as LedgerEntry;
    });

    const summary = transactions.reduce(
      (acc, t) => {
        if (t.type === 'sale_credit') {
          acc.totalSales += t.amount;
          acc.totalCommissions += t.commissionAmount || 0;
          acc.netEarnings += t.netAmount;
        } else if (t.type === 'payout_debit') {
          acc.totalPayouts += Math.abs(t.amount);
        }
        return acc;
      },
      { totalSales: 0, totalCommissions: 0, netEarnings: 0, totalPayouts: 0 }
    );

    const ordersSnapshot = await firestoreAdmin
      .collection('orders')
      .where('vendorIds', 'array-contains', authenticatedUser.uid)
      .where('status', '==', 'delivered')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Order[];

    const salesByCategory = orders.reduce((acc, order) => {
      order.items.forEach(item => {
        if (item.vendorId === authenticatedUser.uid) {
          const category = 'Uncategorized';
          acc[category] = (acc[category] || 0) + item.price * item.quantity;
        }
      });
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({ summary, transactions, salesByCategory });
  } catch (error) {
    console.error('Error fetching financial report:', error);
    return NextResponse.json({ message: 'Failed to fetch financial report' }, { status: 500 });
  }
}

export const GET = withAuth(getFinancialReportHandler, ['vendor', 'admin']);
