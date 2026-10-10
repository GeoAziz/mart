import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireVendor } from '@/lib/authorization';

export interface VendorCustomer {
  id: string;
  name: string;
  email: string;
  orders: number;
  lifetimeValue: number;
  lastOrder: string;
  status: 'active' | 'inactive';
}

async function getVendorCustomersHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const vendorId = authenticatedUser.uid;

  try {
    requireVendor(authenticatedUser);

    const vendorOrdersSnap = await firestoreAdmin
      .collection('vendorOrders')
      .where('vendorId', '==', vendorId)
      .get();

    const customerMap = new Map<string, VendorCustomer>();

    vendorOrdersSnap.docs.forEach(doc => {
      const data = doc.data();
      const customerId = data.customerId;
      if (!customerId) return;

      const orderTotal = data.totalAmount ?? (data.subtotal + (data.shippingCost ?? 0));
      const orderDate = data.createdAt ? data.createdAt.toDate() : new Date();

      if (customerMap.has(customerId)) {
        const existing = customerMap.get(customerId)!;
        existing.orders += 1;
        existing.lifetimeValue += orderTotal;
        if (orderDate > new Date(existing.lastOrder)) {
          existing.lastOrder = orderDate.toISOString();
        }
      } else {
        customerMap.set(customerId, {
          id: customerId,
          name: data.customerName || 'Unknown Customer',
          email: data.customerEmail || 'No Email',
          orders: 1,
          lifetimeValue: orderTotal,
          lastOrder: orderDate.toISOString(),
          status: 'active' // We can logic this later
        });
      }
    });

    const customers = Array.from(customerMap.values());
    
    // Sort by most recent order
    customers.sort((a, b) => new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime());

    return NextResponse.json(customers, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching customers for vendor ${vendorId}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withAuth(getVendorCustomersHandler, ['vendor', 'admin']);

