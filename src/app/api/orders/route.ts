import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import admin from 'firebase-admin';
import type { Order, OrderItem, ShippingAddress, Promotion, Product } from '@/lib/types';
import { sendOrderConfirmation } from '@/lib/email';

interface ClientCartItem {
  productId: string;
  quantity: number;
}

interface CreateOrderInput {
  items: ClientCartItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  promotionCode?: string;
  clientSubtotal?: number;
  clientShippingCost?: number;
  clientTaxAmount?: number;
  clientTotalAmount?: number;
}

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

  try {
    const body = await req.json() as CreateOrderInput;

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ message: 'Order must contain at least one item.' }, { status: 400 });
    }
    if (!body.shippingAddress || !body.shippingAddress.fullName || !body.shippingAddress.address) {
      return NextResponse.json({ message: 'Incomplete shipping address.' }, { status: 400 });
    }
    if (!body.paymentMethod) {
      return NextResponse.json({ message: 'Payment method is required.' }, { status: 400 });
    }

    const ordersCollectionRef = firestoreAdmin.collection('orders');
    const productsCollectionRef = firestoreAdmin.collection('products');
    let createdOrder = {} as Order;

    await firestoreAdmin.runTransaction(async (transaction) => {
      const processedOrderItems: OrderItem[] = [];
      let calculatedSubtotal = 0;
      const orderVendorIdsSet = new Set<string>();
      const productStockUpdates: { ref: FirebaseFirestore.DocumentReference, quantityToDecrement: number }[] = [];

      for (const clientItem of body.items) {
        if (clientItem.quantity <= 0) {
          throw new Error(`Invalid quantity for product ID ${clientItem.productId}.`);
        }
        const productDocRef = productsCollectionRef.doc(clientItem.productId);
        const productDocSnap = await transaction.get(productDocRef);

        if (!productDocSnap.exists) {
          throw new Error(`Product with ID ${clientItem.productId} not found.`);
        }
        
        const productData = productDocSnap.data() as Product;

        if (productData.stock === undefined || productData.stock < clientItem.quantity) {
          throw new Error(`Insufficient stock for ${productData.name}. Available: ${productData.stock ?? 0}, Requested: ${clientItem.quantity}.`);
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
        productStockUpdates.push({ ref: productDocRef, quantityToDecrement: clientItem.quantity });
      }

      // Handle promotion code if provided
      let discountAmount = 0;
      if (body.promotionCode) {
        const promoQuery = firestoreAdmin.collection('promotions').where('code', '==', body.promotionCode).limit(1);
        const promoSnapshot = await transaction.get(promoQuery);
        
        if (!promoSnapshot.empty) {
          const promoDoc = promoSnapshot.docs[0];
          const promotionData = promoDoc.data() as Promotion;
          
          const now = new Date();
          if (promotionData.isActive && 
              now >= promotionData.startDate && 
              (!promotionData.endDate || now <= promotionData.endDate) &&
              (!promotionData.usageLimit || promotionData.timesUsed < promotionData.usageLimit) &&
              (!promotionData.minPurchaseAmount || calculatedSubtotal >= promotionData.minPurchaseAmount))
          {
              if (promotionData.type === 'percentage') {
                  discountAmount = calculatedSubtotal * (promotionData.value / 100);
              } else {
                  discountAmount = promotionData.value;
              }
              discountAmount = Math.min(discountAmount, calculatedSubtotal);
              
              // Update promotion usage count
              transaction.update(promoDoc.ref, {
                  timesUsed: admin.firestore.FieldValue.increment(1)
              });
          }
        }
      }

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
        shippingAddress: body.shippingAddress,
        paymentMethod: body.paymentMethod,
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
        promotionCode: body.promotionCode,
        discountAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
        vendorIds: Array.from(orderVendorIdsSet),
        estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      // Create the order
      const newOrderRef = ordersCollectionRef.doc();
      transaction.set(newOrderRef, newOrderData);

      // Update product stock levels with validation
      for (const update of productStockUpdates) {
        const productDoc = await transaction.get(update.ref);
        const productData = productDoc.data();
        const currentStock = productData?.stock || 0;
        
        if (currentStock < update.quantityToDecrement) {
          throw new Error(
            `Insufficient stock for product "${productData?.name || update.ref.id}". ` +
            `Available: ${currentStock}, Requested: ${update.quantityToDecrement}`
          );
        }
        
        transaction.update(update.ref, {
          stock: admin.firestore.FieldValue.increment(-update.quantityToDecrement),
          lastStockUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      createdOrder = { id: newOrderRef.id, ...newOrderData };
    });

    // Send confirmation email (don't await to avoid blocking response)
    sendOrderConfirmation(createdOrder).catch(err => {
      console.error('Failed to send order confirmation email:', err);
      // Log to error tracking service in production
    });

    // Ensure dates are properly converted for client response
    const clientSafeOrder = {
        ...(createdOrder as Record<string, any>),
        createdAt: safeParseDate(createdOrder.createdAt),
        updatedAt: safeParseDate(createdOrder.updatedAt),
    };
    return NextResponse.json(clientSafeOrder, { status: 201 });

  } catch (error: any) {
    console.error('Error creating order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error while creating order.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
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
      return NextResponse.json({ message: 'Forbidden: You do not have permission to view these orders.' }, { status: 403 });
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

  } catch (error: any) {
    console.error('Error listing orders:', error);
    if (error.code === 'failed-precondition') {
        console.error('Firestore query failed, likely due to a missing index.');
    }
    return NextResponse.json({ message: 'Internal Server Error while listing orders.' }, { status: 500 });
  }
}

export const GET = withAuth(listOrdersHandler);
