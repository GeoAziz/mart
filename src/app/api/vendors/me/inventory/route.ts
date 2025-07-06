import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import type { InventoryUpdateItem, InventoryHistory, ProductInventorySettings } from '@/lib/types';

// Handler for getting vendor's inventory settings
async function getInventoryHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    if (!firestoreAdmin) {
      return NextResponse.json(
        { message: 'Firestore is not initialized' },
        { status: 500 }
      );
    }
    const inventoryRef = firestoreAdmin
      .collection('vendors')
      .doc(authenticatedUser.uid)
      .collection('inventory');

    const snapshot = await inventoryRef.get();
    const inventory = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { message: 'Failed to fetch inventory settings' },
      { status: 500 }
    );
  }
}

// Handler for updating inventory settings
async function updateInventoryHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    if (!firestoreAdmin) {
      return NextResponse.json(
        { message: 'Firestore is not initialized' },
        { status: 500 }
      );
    }
    const updates = await req.json() as InventoryUpdateItem[];
    const batch = firestoreAdmin.batch();
    const historyBatch = firestoreAdmin.batch();

    for (const update of updates) {
      // Get product reference
      const productRef = firestoreAdmin.collection('products').doc(update.productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        continue;
      }

      const productData = productDoc.data();
      if (productData?.vendorId !== authenticatedUser.uid) {
        continue; // Skip if product doesn't belong to vendor
      }

      // Update product stock
      batch.update(productRef, { 
        stock: update.stockQuantity,
        updatedAt: new Date()
      });

      // Create inventory history entry
      const historyRef = firestoreAdmin
        .collection('vendors')
        .doc(authenticatedUser.uid)
        .collection('inventoryHistory')
        .doc();

      const historyEntry: InventoryHistory = {
        productId: update.productId,
        productName: productData.name,
        previousStock: productData.stock || 0,
        newStock: update.stockQuantity,
        changeType: update.stockQuantity > (productData.stock || 0) ? 'increase' : 'decrease',
        reason: update.notes,
        updatedBy: authenticatedUser.uid,
        updatedAt: new Date()
      };

      historyBatch.set(historyRef, historyEntry);

      // Update inventory settings
      const settingsRef = firestoreAdmin
        .collection('vendors')
        .doc(authenticatedUser.uid)
        .collection('inventory')
        .doc(update.productId);

      batch.set(settingsRef, {
        productId: update.productId,
        lowStockThreshold: update.lowStockThreshold || 5,
        notificationsEnabled: true,
        lastStockUpdate: new Date()
      }, { merge: true });
    }

    await batch.commit();
    await historyBatch.commit();

    return NextResponse.json({ message: 'Inventory updated successfully' });
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { message: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

// Export the route handlers
export const GET = withAuth(getInventoryHandler);
export const POST = withAuth(updateInventoryHandler);