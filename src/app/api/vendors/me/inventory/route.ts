import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireVendor } from '@/lib/authorization';
import { formatApiError } from '@/lib/api-errors';
import type { InventoryUpdateItem, InventoryHistory, ProductInventorySettings } from '@/lib/types';

// Handler for getting vendor's inventory settings
async function getInventoryHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    requireVendor(authenticatedUser);
    if (!firestoreAdmin) {
      return NextResponse.json(
        { message: 'Firestore is not initialized' },
        { status: 500 }
      );
    }
    // 1. Fetch all products for this vendor
    const productsSnapshot = await firestoreAdmin
      .collection('products')
      .where('vendorId', '==', authenticatedUser.uid)
      .get();
      
    // 2. Fetch inventory settings for this vendor
    const inventorySettingsRef = firestoreAdmin
      .collection('vendors')
      .doc(authenticatedUser.uid)
      .collection('inventory');
    const settingsSnapshot = await inventorySettingsRef.get();
    
    const settingsMap = new Map();
    settingsSnapshot.docs.forEach(doc => {
      settingsMap.set(doc.id, doc.data());
    });

    // 3. Merge them together
    const inventory = productsSnapshot.docs.map(doc => {
      const productData = doc.data();
      const settings = settingsMap.get(doc.id) || {};
      
      return {
        id: doc.id,
        productId: doc.id,
        name: productData.name,
        imageUrl: productData.imageUrl,
        category: productData.category,
        sku: productData.sku,
        stock: productData.stock || 0,
        lowStockThreshold: settings.lowStockThreshold || 10,
        notificationsEnabled: settings.notificationsEnabled ?? true,
        lastStockUpdate: settings.lastStockUpdate || productData.createdAt
      };
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    const { response } = formatApiError(error);
    return response;
  }
}

// Handler for updating inventory settings
async function updateInventoryHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  try {
    requireVendor(authenticatedUser);
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