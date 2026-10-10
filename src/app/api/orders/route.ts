import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import { requireAuthentication, requireCustomerOwnership } from '@/lib/authorization';
import admin from 'firebase-admin';
import type { Order, OrderItem, ShippingAddress, Promotion, Product } from '@/lib/types';
import { sendOrderConfirmation } from '@/lib/email';
import { getIdempotencyResult, storeIdempotencyResult } from '@/lib/idempotency';
import { createOrderSchema } from '@/lib/validation-schemas';
import { formatApiError, createApiError, ErrorCodes } from '@/lib/api-errors';
import { applyRateLimit, rateLimitPresets } from '@/lib/rate-limiter';
import { computeVendorOrderSplits, groupItemsByVendor, type VendorSplitContext } from '@/lib/vendor-order-split';
import { enqueueOrder } from '@/lib/queue-service';
import { publishWSEvent } from '@/lib/ws-events';
import { trackOrderCreated, trackDbQuery } from '@/lib/metrics';

function mapOrderDocument(doc: FirebaseFirestore.DocumentSnapshot): Order {
  const data = doc.data() as Omit<Order, 'id'>;
  if (!data) {
    throw new Error('Order document data is missing.');
  }
  
  return {
    id: doc.id,
    userId: data.userId,
    userFullName: data.userFullName,
    userEmail: data.userEmail,
    items: data.items || [],
    shippingAddress: data.shippingAddress,
    paymentMethod: data.paymentMethod,
    paymentDetails: data.paymentDetails,
    status: data.status,
    statusHistory: data.statusHistory || [],
    subtotal: data.subtotal,
    shippingCost: data.shippingCost,
    taxAmount: data.taxAmount,
    totalAmount: data.totalAmount,
    promotionCode: data.promotionCode,
    discountAmount: data.discountAmount,
    createdAt: safeParseDate(data.createdAt) ?? new Date(0),
    updatedAt: safeParseDate(data.updatedAt) ?? new Date(0),
    vendorIds: data.vendorIds || [],
  };
}

// Robustly convert Firestore Timestamps or other date-like values to a JS Date object.
function safeParseDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (value.toDate && typeof value.toDate === 'function') { // It's a Firestore Timestamp
        return value.toDate();
    }
    const d = new Date(value);
    if (!isNaN(d.getTime())) { // Check if it's a valid date
        return d;
    }
    return undefined;
}


async function createOrderHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;

  const limited = await applyRateLimit(req, rateLimitPresets.orders, authenticatedUser.uid);
  if (limited) return limited;

  try {
    const idempotencyKey = req.headers.get('x-idempotency-key');
    if (idempotencyKey) {
      const cachedResult = await getIdempotencyResult(idempotencyKey);
      if (cachedResult) {
        return NextResponse.json(cachedResult, { status: 201 });
      }
    }

    const body = await req.json();
    const validated = createOrderSchema.parse(body);

    const ordersCollectionRef = firestoreAdmin.collection('orders');
    const productsCollectionRef = firestoreAdmin.collection('products');
    let createdOrder = {} as Order;

    await firestoreAdmin.runTransaction(async (transaction) => {
      const processedOrderItems: OrderItem[] = [];
      let calculatedSubtotal = 0;
      const orderVendorIdsSet = new Set<string>();
      const productStockUpdates: { ref: FirebaseFirestore.DocumentReference, quantityToDecrement: number, currentStock: number }[] = [];

      for (const clientItem of validated.items) {
        const productDocRef = productsCollectionRef.doc(clientItem.productId);
        const productDocSnap = await transaction.get(productDocRef);

        if (!productDocSnap.exists) {
          throw createApiError(
            ErrorCodes.NOT_FOUND,
            `Product with ID ${clientItem.productId} not found`,
            404
          );
        }

        const productData = productDocSnap.data() as Product;

        if (!productData.stock || productData.stock < clientItem.quantity) {
          throw createApiError(
            ErrorCodes.INVENTORY_ERROR,
            `Insufficient stock for ${productData.name}. Available: ${productData.stock ?? 0}, Requested: ${clientItem.quantity}`,
            409
          );
        }

        processedOrderItems.push({
          productId: clientItem.productId,
          name: productData.name,
          quantity: clientItem.quantity,
          price: productData.price,
          imageUrl: productData.imageUrl,
          dataAiHint: productData.dataAiHint,
          vendorId: productData.vendorId,
        });
        calculatedSubtotal += productData.price * clientItem.quantity;
        if (productData.vendorId) orderVendorIdsSet.add(productData.vendorId);
        productStockUpdates.push({ 
          ref: productDocRef, 
          quantityToDecrement: clientItem.quantity,
          currentStock: productData.stock
        });
      }

      let discountAmount = 0;
      let promoDocRef: FirebaseFirestore.DocumentReference | null = null;
      if (validated.promotionCode) {
        const promoQuery = firestoreAdmin.collection('promotions').where('code', '==', validated.promotionCode).limit(1);
        const promoSnapshot = await transaction.get(promoQuery);

        if (!promoSnapshot.empty) {
          const promoDoc = promoSnapshot.docs[0];
          const promotionData = promoDoc.data() as Promotion;

          const now = new Date();
          if (promotionData.isActive &&
            now >= promotionData.startDate &&
            (!promotionData.endDate || now <= promotionData.endDate) &&
            (!promotionData.usageLimit || promotionData.timesUsed < promotionData.usageLimit) &&
            (!promotionData.minPurchaseAmount || calculatedSubtotal >= promotionData.minPurchaseAmount)) {
            if (promotionData.type === 'percentage') {
              discountAmount = calculatedSubtotal * (promotionData.value / 100);
            } else {
              discountAmount = promotionData.value;
            }
            discountAmount = Math.min(discountAmount, calculatedSubtotal);
            promoDocRef = promoDoc.ref;
          }
        }
      }

      // PHASE 2: CALCULATE EVERYTHING
      const subtotalAfterDiscount = calculatedSubtotal - discountAmount;
      const taxRate = 0.16;
      const calculatedTaxAmount = subtotalAfterDiscount * taxRate;
      const shippingCost = subtotalAfterDiscount > 5000 ? 0 : 500;
      const totalAmount = subtotalAfterDiscount + calculatedTaxAmount + shippingCost;

      const newOrderData: Omit<Order, 'id'> = {
        userId: authenticatedUser.uid,
        userFullName: authenticatedUser.fullName,
        userEmail: authenticatedUser.email,
        items: processedOrderItems,
        shippingAddress: validated.shippingAddress as ShippingAddress,
        paymentMethod: validated.paymentMethod,
        status: 'pending',
        statusHistory: [{
          status: 'pending',
          timestamp: new Date(),
          note: 'Order created',
          updatedBy: authenticatedUser.uid
        }],
        subtotal: calculatedSubtotal,
        shippingCost,
        taxAmount: calculatedTaxAmount,
        totalAmount,
        promotionCode: validated.promotionCode,
        discountAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
        vendorIds: Array.from(orderVendorIdsSet),
        estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      // Remove undefined fields to avoid Firestore errors
      const cleanedOrderData = Object.fromEntries(
        Object.entries(newOrderData).filter(([, value]) => value !== undefined)
      ) as Omit<Order, 'id'>;

      // PHASE 3: WRITE ALL DATA
      // Create the order
      const newOrderRef = ordersCollectionRef.doc();

      // Split the order into per-vendor VendorOrders for fulfillment,
      // payouts, and per-vendor analytics.
      const vendorItems = groupItemsByVendor(processedOrderItems);
      const splitContext: VendorSplitContext = {
        orderId: newOrderRef.id,
        customerId: authenticatedUser.uid,
        customerName: authenticatedUser.fullName,
        customerEmail: authenticatedUser.email,
        shippingAddress: validated.shippingAddress as ShippingAddress,
        subtotal: calculatedSubtotal,
        discountAmount,
        taxRate,
        shippingCost,
        estimatedDeliveryDate: newOrderData.estimatedDeliveryDate,
      };
      const vendorOrderDrafts = computeVendorOrderSplits(
        Array.from(vendorItems.entries()).map(([vendorId, items]) => ({
          vendorId,
          items,
        })),
        splitContext
      );

      transaction.set(newOrderRef, cleanedOrderData);

      for (const draft of vendorOrderDrafts) {
        const vendorOrderRef = firestoreAdmin.collection('vendorOrders').doc();
        transaction.set(vendorOrderRef, {
          ...draft,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Update product stock levels
      for (const update of productStockUpdates) {
        const newStock = update.currentStock - update.quantityToDecrement;
        if (newStock < 0) {
          throw new Error(
            `Insufficient stock during write phase. ` +
            `Available: ${update.currentStock}, Requested: ${update.quantityToDecrement}`
          );
        }
        
        transaction.update(update.ref, {
          stock: newStock,
          // Reserve the quantity for this order. Released on payment confirmation
          // (reserved--) or on cancellation/expiry (stock restored + reserved--).
          reserved: admin.firestore.FieldValue.increment(update.quantityToDecrement),
          lastStockUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Update promotion usage if applicable
      if (promoDocRef) {
        transaction.update(promoDocRef, {
          timesUsed: admin.firestore.FieldValue.increment(1)
        });
      }

      createdOrder = { id: newOrderRef.id, ...newOrderData };
    });

    // ── Post-commit side effects (non-blocking) ───────────────────────────────
    // Metrics: one counter per vendor served by this order.
    for (const vendorId of createdOrder.vendorIds) {
      trackOrderCreated(vendorId, createdOrder.status);
    }

    // Realtime: push a live sale event to admins and the affected vendors.
    publishWSEvent({
      type: 'sale',
      payload: {
        orderId: createdOrder.id,
        customerName: createdOrder.userFullName,
        totalAmount: createdOrder.totalAmount,
        itemCount: createdOrder.items.reduce((sum, i) => sum + i.quantity, 0),
        timestamp: new Date().toISOString(),
      },
      roles: ['admin'],
      vendorIds: createdOrder.vendorIds,
    }).catch((err) => console.error('Failed to publish sale event:', err));

    publishWSEvent({
      type: 'notification',
      payload: {
        id: `order-${createdOrder.id}`,
        type: 'order',
        message: `New order #${createdOrder.id.slice(0, 8).toUpperCase()} — KSh ${createdOrder.totalAmount.toLocaleString()}`,
        severity: 'success',
        timestamp: new Date().toISOString(),
        orderId: createdOrder.id,
      },
      vendorIds: createdOrder.vendorIds,
    }).catch((err) => console.error('Failed to publish vendor notification:', err));

    // Async pipeline: enqueue the order for the worker (confirmation email,
    // vendor notifications, analytics). If the queue is unavailable, fall back
    // to sending the confirmation email inline so the customer is never left
    // without an order confirmation.
    enqueueOrder({
      type: 'order.created',
      orderId: createdOrder.id,
      vendorId: createdOrder.vendorIds[0] || 'unknown',
      vendorIds: createdOrder.vendorIds,
      customerId: createdOrder.userId,
      totalAmount: createdOrder.totalAmount,
      timestamp: new Date().toISOString(),
    }).catch((err) => {
      console.error('Failed to enqueue order, sending email inline:', err);
      sendOrderConfirmation(createdOrder).catch((emailErr) => {
        console.error('Failed to send order confirmation email:', emailErr);
      });
    });

    // Ensure dates are properly converted for client response
    const clientSafeOrder = {
        ...(createdOrder as Record<string, any>),
        createdAt: safeParseDate(createdOrder.createdAt),
        updatedAt: safeParseDate(createdOrder.updatedAt),
    };

    // Store result in idempotency cache if key provided
    if (idempotencyKey) {
      await storeIdempotencyResult(idempotencyKey, clientSafeOrder, '/api/orders', 'POST');
    }

    return NextResponse.json(clientSafeOrder, { status: 201 });
  } catch (error) {
    const { response } = formatApiError(error);
    return response;
  }
}

export const POST = withAuth(createOrderHandler);

async function listOrdersHandler(req: AuthenticatedRequest) {
  const authenticatedUser = req.userProfile;
  const ordersCollection = firestoreAdmin.collection('orders');
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  try {
    if (authenticatedUser.role === 'admin') {
      query = ordersCollection.orderBy('createdAt', 'desc');
    } else if (authenticatedUser.role === 'customer') {
      query = ordersCollection.where('userId', '==', authenticatedUser.uid);
    } else if (authenticatedUser.role === 'vendor') {
      query = ordersCollection.where('vendorIds', 'array-contains', authenticatedUser.uid);
    } else {
      throw createApiError(
        ErrorCodes.AUTHORIZATION_ERROR,
        'You do not have permission to view these orders',
        403
      );
    }

    const snapshot = await query.get();
    let orders = snapshot.docs.map(mapOrderDocument);

    if (authenticatedUser.role !== 'admin') {
      orders.sort((a, b) => {
        const dateA = safeParseDate(a.createdAt)?.getTime() ?? 0;
        const dateB = safeParseDate(b.createdAt)?.getTime() ?? 0;
        return dateB - dateA;
      });
    }

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    const { response } = formatApiError(error);
    return response;
  }
}

export const GET = withAuth(listOrdersHandler);
