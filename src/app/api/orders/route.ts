
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { withAuth, type AuthenticatedRequest } from '@/lib/authMiddleware';
import admin from 'firebase-admin';
import type { Order, OrderItem, ShippingAddress, Promotion, Product } from '@/lib/types';

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
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
    items: data.items || [],
    vendorIds: data.vendorIds || [],
  };
}

// Robustly convert Firestore Timestamps or other date-like values to a JS Date object.
function safeParseDate(value: any): Date | undefined {
    if (!value) return undefined;
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

    if (!body.items || body.items.length === 0) return NextResponse.json({ message: 'Order must contain at least one item.' }, { status: 400 });
    if (!body.shippingAddress || !body.shippingAddress.fullName || !body.shippingAddress.address) return NextResponse.json({ message: 'Incomplete shipping address.' }, { status: 400 });
    if (!body.paymentMethod) return NextResponse.json({ message: 'Payment method is required.' }, { status: 400 });

    const ordersCollectionRef = firestoreAdmin.collection('orders');
    const productsCollectionRef = firestoreAdmin.collection('products');
    let createdOrder: Order | null = null;

    await firestoreAdmin.runTransaction(async (transaction) => {
      const processedOrderItems: OrderItem[] = [];
      let calculatedSubtotal = 0;
      const orderVendorIdsSet = new Set<string>();
      const productStockUpdates: { ref: FirebaseFirestore.DocumentReference, quantityToDecrement: number }[] = [];

      for (const clientItem of body.items) {
        if (clientItem.quantity <= 0) throw new Error(`Invalid quantity for product ID ${clientItem.productId}.`);
        const productDocRef = productsCollectionRef.doc(clientItem.productId);
        const productDocSnap = await transaction.get(productDocRef);

        if (!productDocSnap.exists) throw new Error(`Product with ID ${clientItem.productId} not found.`);
        
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

      let discountAmount = 0;
      let promotionDocRef: FirebaseFirestore.DocumentReference | null = null;
      if (body.promotionCode) {
        const promoQuery = firestoreAdmin.collection('promotions').where('code', '==', body.promotionCode).limit(1);
        const promoSnapshot = await transaction.get(promoQuery);

        if (promoSnapshot.empty) {
            throw new Error('Invalid promotion code provided.');
        }
        
        const promoDoc = promoSnapshot.docs[0];
        const promotionData = promoDoc.data() as Promotion;
        promotionDocRef = promoDoc.ref;
        
        const now = new Date();
        const startDate = safeParseDate(promotionData.startDate);
        const endDate = safeParseDate(promotionData.endDate);

        if (!startDate) {
            throw new Error("Promotion data is invalid: missing start date.");
        }
        if (isNaN(startDate.getTime()) || (endDate && isNaN(endDate.getTime()))) {
            throw new Error("Promotion has an invalid date format.");
        }

        const isDateValid = startDate <= now && (!endDate || endDate > now);

        if (promotionData.isActive && 
            isDateValid &&
            (promotionData.usageLimit === undefined || promotionData.timesUsed < promotionData.usageLimit) &&
            (promotionData.minPurchaseAmount === undefined || calculatedSubtotal >= promotionData.minPurchaseAmount))
        {
            if (promotionData.type === 'percentage') {
                discountAmount = calculatedSubtotal * (promotionData.value / 100);
            } else {
                discountAmount = promotionData.value;
            }
            discountAmount = Math.min(discountAmount, calculatedSubtotal);
        } else {
            throw new Error('The provided promotion code is not valid or has expired.');
        }
      }

      const subtotalAfterDiscount = calculatedSubtotal - discountAmount;
      const taxRate = 0.16;
      const calculatedTaxAmount = subtotalAfterDiscount * taxRate;
      const calculatedShippingCost = body.clientShippingCost !== undefined ? body.clientShippingCost : (calculatedSubtotal > 5000 ? 0 : 500);
      const calculatedTotalAmount = subtotalAfterDiscount + calculatedTaxAmount + calculatedShippingCost;

      const newOrderData: Omit<Order, 'id'> = {
        userId: authenticatedUser.uid,
        userFullName: authenticatedUser.fullName,
        userEmail: authenticatedUser.email,
        items: processedOrderItems,
        shippingAddress: body.shippingAddress,
        paymentMethod: body.paymentMethod,
        status: 'pending',
        subtotal: calculatedSubtotal,
        shippingCost: calculatedShippingCost,
        taxAmount: calculatedTaxAmount,
        totalAmount: calculatedTotalAmount,
        ...(body.promotionCode && { promotionCode: body.promotionCode }),
        discountAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
        vendorIds: Array.from(orderVendorIdsSet),
      };
      
      const newOrderRef = ordersCollectionRef.doc();
      transaction.set(newOrderRef, newOrderData);

      for (const update of productStockUpdates) {
        transaction.update(update.ref, { stock: admin.firestore.FieldValue.increment(-update.quantityToDecrement) });
      }

      if (promotionDocRef) {
          transaction.update(promotionDocRef, { timesUsed: admin.firestore.FieldValue.increment(1) });
      }
      
      createdOrder = { id: newOrderRef.id, ...newOrderData };
    });

    if (!createdOrder) {
        throw new Error("Order creation failed despite transaction appearing successful.");
    }
    
    const clientSafeOrder = {
        ...createdOrder,
        createdAt: createdOrder.createdAt,
        updatedAt: createdOrder.updatedAt,
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
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
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
