import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { firestoreAdmin } from '@/lib/firebase-admin';
import type { Product, InventoryHistory } from '@/lib/types';

async function updateInventoryHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  
  if (authenticatedUser.role !== 'vendor') {
    return NextResponse.json({ message: 'Only vendors can update inventory' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { productId, newStock, reason } = body;

    if (typeof newStock !== 'number' || newStock < 0) {
      return NextResponse.json({ message: 'Invalid stock value' }, { status: 400 });
    }

    const productRef = firestoreAdmin.collection('products').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const productData = productDoc.data() as Product;
    if (productData.vendorId !== authenticatedUser.uid) {
      return NextResponse.json({ message: 'Unauthorized to update this product' }, { status: 403 });
    }

    const previousStock = productData.stock || 0;

    // Run update in transaction
    await firestoreAdmin.runTransaction(async (transaction) => {
      // Update product stock
      transaction.update(productRef, { 
        stock: newStock,
        updatedAt: new Date()
      });

      // Create inventory history entry
      const historyEntry: Omit<InventoryHistory, 'id'> = {
        productId,
        productName: productData.name,
        previousStock,
        newStock,
        changeType: newStock > previousStock ? 'increase' : 'decrease',
        reason: reason || `Stock updated from ${previousStock} to ${newStock}`,
        updatedBy: authenticatedUser.uid,
        updatedAt: new Date()
      };

      const historyRef = firestoreAdmin
        .collection('products')
        .doc(productId)
        .collection('inventoryHistory')
        .doc();

      transaction.set(historyRef, historyEntry);
    });

    return NextResponse.json({ 
      message: 'Inventory updated successfully',
      newStock,
      productId
    });

  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { message: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

async function getInventoryHistoryHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  
  if (authenticatedUser.role !== 'vendor') {
    return NextResponse.json({ message: 'Only vendors can view inventory history' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ message: 'Product ID is required' }, { status: 400 });
    }

    const productRef = firestoreAdmin.collection('products').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    const productData = productDoc.data() as Product;
    if (productData.vendorId !== authenticatedUser.uid) {
      return NextResponse.json({ message: 'Unauthorized to view this product\'s history' }, { status: 403 });
    }

    const historySnapshot = await productRef
      .collection('inventoryHistory')
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();

    const history = historySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(history);

  } catch (error) {
    console.error('Error fetching inventory history:', error);
    return NextResponse.json(
      { message: 'Failed to fetch inventory history' },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(updateInventoryHandler);
export const GET = withAuth(getInventoryHistoryHandler);