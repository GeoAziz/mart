import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';

async function getDashboardHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  if (authenticatedUser.role !== 'vendor' && authenticatedUser.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden: Only vendors can access this resource.' }, { status: 403 });
  }

  try {
    // Get vendor data
    const vendorId = authenticatedUser.uid;
    const vendorDoc = await firestoreAdmin.collection('vendors').doc(vendorId).get();
    
    if (!vendorDoc.exists) {
      return NextResponse.json({ message: 'Vendor profile not found.' }, { status: 404 });
    }

    // Get orders for this vendor
    const ordersSnapshot = await firestoreAdmin
      .collection('orders')
      .where('vendorIds', 'array-contains', vendorId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    // Get reviews for this vendor's products
    const productsSnapshot = await firestoreAdmin
      .collection('products')
      .where('vendorId', '==', vendorId)
      .get();

    const productIds = productsSnapshot.docs.map(doc => doc.id);

    const reviewsSnapshot = await firestoreAdmin
      .collection('reviews')
      .where('productId', 'in', productIds.length > 0 ? productIds : ['none'])
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    // Calculate earnings and other metrics
    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        status: data.status,
        payoutProcessed: data.payoutProcessed,
        createdAt: data.createdAt?.toDate(),
        total: data.total, // Ensure 'total' is included
      };
    });

    const reviews = reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      rating: doc.data().rating,
    }));

    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate total earnings and other metrics
    const totalAllTimeEarnings = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const currentBalance = orders
      .filter(order => order.status === 'delivered' && !order.payoutProcessed)
      .reduce((sum, order) => sum + (order.total || 0), 0);

    // Get last payout info
    const lastPayoutSnapshot = await firestoreAdmin
      .collection('payouts')
      .where('vendorId', '==', vendorId)
      .orderBy('date', 'desc')
      .limit(1)
      .get();

    const lastPayout = lastPayoutSnapshot.docs[0]?.data();

    // Calculate earnings by month for the chart
    const earningsByMonth = orders.reduce((acc, order) => {
      const date = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      acc[monthKey] = (acc[monthKey] || 0) + (order.total || 0);
      return acc;
    }, {} as Record<string, number>);

    // Convert to array and sort by date
    const earningsChartData = Object.entries(earningsByMonth)
      .map(([month, earnings]) => ({ month, earnings }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months

    const dashboardData = {
      totalAllTimeEarnings,
      currentBalance,
      lastPayoutAmount: lastPayout?.amount || null,
      lastPayoutDate: lastPayout?.date?.toDate?.() || null,
      earningsChartData,
      totalOrders: orders.length,
      totalProducts: products.length,
      totalReviews: reviews.length,
      avgRating: reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length 
        : 0,
      recentOrders: orders.slice(0, 5),
      recentReviews: reviews.slice(0, 5),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching vendor dashboard data:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getDashboardHandler, ['vendor', 'admin']);
