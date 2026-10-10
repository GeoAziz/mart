import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireVendor, requireAdmin } from '@/lib/authorization';
import { formatApiError } from '@/lib/api-errors';

async function getDashboardHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  if (authenticatedUser.role !== 'vendor' && authenticatedUser.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden: Only vendors can access this resource.' }, { status: 403 });
  }

  try {
    requireVendor(authenticatedUser || req.userProfile);
    // Get vendor data
    const vendorId = authenticatedUser.uid;
    const vendorDoc = await firestoreAdmin.collection('vendors').doc(vendorId).get();
    
    if (!vendorDoc.exists) {
      return NextResponse.json({ message: 'Vendor profile not found.' }, { status: 404 });
    }

    // Get orders for this vendor
    const ordersSnapshot = await firestoreAdmin
      .collection('vendorOrders')
      .where('vendorId', '==', vendorId)
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
      .where('vendorId', '==', vendorId)
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
        totalAmount: data.totalAmount || data.total, // Fallback for old orders
        items: data.items || [],
        customerId: data.customerId || null,
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

    // Get ledger entries for accurate financial data
    const ledgerSnapshot = await firestoreAdmin
      .collection('users')
      .doc(vendorId)
      .collection('ledgerEntries')
      .get();
      
    const ledgerEntries = ledgerSnapshot.docs.map(doc => doc.data());

    // Calculate total earnings and other metrics
    let totalAllTimeEarnings = 0;
    let currentBalance = 0;
    const earningsByMonth: Record<string, number> = {};

    ledgerEntries.forEach(entry => {
      currentBalance += entry.netAmount || 0;
      if (entry.type === 'sale_credit') {
        totalAllTimeEarnings += entry.netAmount || 0;
        
        // Calculate earnings by month for the chart
        const date = entry.createdAt?.toDate() || new Date();
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        earningsByMonth[monthKey] = (earningsByMonth[monthKey] || 0) + (entry.netAmount || 0);
      }
    });

    // Get last payout info
    const lastPayoutSnapshot = await firestoreAdmin
      .collection('payouts')
      .where('vendorId', '==', vendorId)
      .orderBy('date', 'desc')
      .limit(1)
      .get();

    const lastPayout = lastPayoutSnapshot.docs[0]?.data();

    // Convert to array and sort by date
    const earningsChartData = Object.entries(earningsByMonth)
      .map(([month, earnings]) => ({ month, earnings }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months

    // Calculate best selling products
    const productSales: Record<string, { id: string; name: string; sales: number; revenue: number }> = {};
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = { id: item.productId, name: item.name || 'Unknown', sales: 0, revenue: 0 };
          }
          productSales[item.productId].sales += item.quantity || 1;
          productSales[item.productId].revenue += (item.price || 0) * (item.quantity || 1);
        });
      }
    });
    const bestSellingProducts = Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // Calculate customer insights
    const uniqueCustomers = new Set();
    let returningCustomers = 0;
    const customerOrderCount: Record<string, number> = {};
    
    orders.forEach(order => {
      if (order.customerId) {
        uniqueCustomers.add(order.customerId);
        customerOrderCount[order.customerId] = (customerOrderCount[order.customerId] || 0) + 1;
      }
    });
    
    Object.values(customerOrderCount).forEach(count => {
      if (count > 1) returningCustomers++;
    });

    const customerInsights = {
      totalCustomers: uniqueCustomers.size,
      newCustomers: uniqueCustomers.size - returningCustomers,
      returningCustomers: returningCustomers
    };

    reviews.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.getTime() : 0;
      return timeB - timeA;
    });

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
      bestSellingProducts,
      customerInsights,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching vendor dashboard data:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getDashboardHandler, ['vendor', 'admin']);
