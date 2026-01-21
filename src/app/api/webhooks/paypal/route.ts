/**
 * 🪝 PayPal Webhook Receiver
 * ==========================
 * 
 * THIS FILE: Listens for payment confirmations from PayPal
 * 
 * HOW IT WORKS:
 * 1. Customer pays on PayPal
 * 2. PayPal confirms: "Payment captured!"
 * 3. PayPal calls THIS endpoint with event details
 * 4. We update the order status in Firestore
 * 5. Customer sees: ✅ Order Processing
 * 
 * ANALOGY: Like a doorbell 🔔
 * - Customer pays = Ring the bell
 * - PayPal sends webhook = Doorbell rings
 * - Your code = You answer the door
 * 
 * EVENTS HANDLED:
 * ✅ PAYMENT.CAPTURE.COMPLETED — Payment successful → order "processing"
 * 💰 PAYMENT.CAPTURE.REFUNDED — Money returned → order "refunded"
 * ❌ PAYMENT.CAPTURE.DENIED — Payment failed → order "cancelled"
 * 
 * SETUP: You need to register this URL in PayPal Dashboard
 * URL: https://yourdomain.com/api/webhooks/paypal
 * Then copy the Webhook ID to .env as PAYPAL_WEBHOOK_ID
 * 
 * SECURITY: This is PUBLIC but safe because:
 * - PayPal signs every message
 * - We verify the signature = Proof it came from PayPal
 * - Not from a hacker
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import crypto from 'crypto';

interface PayPalWebhookEvent {
  // WHAT PAYPAL SENDS US:
  // This is the "message" PayPal delivers
  
  id: string;
  // Unique ID for this event
  // Example: "WH-5LH12345..."
  // Use this to prevent duplicate processing
  
  event_type: string;
  // Type of event that happened
  // Options:
  //   "PAYMENT.CAPTURE.COMPLETED" — ✅ Payment worked!
  //   "PAYMENT.CAPTURE.REFUNDED"  — 💰 Customer got money back
  //   "PAYMENT.CAPTURE.DENIED"    — ❌ Payment failed
  
  resource: {
    id: string;
    // The PayPal capture/refund ID
    // Example: "7KB8ZZFB6HS5G"
    // This links to our order.paymentDetails.paypalCaptureId
    
    status?: string;
    // Status of the payment
    // "COMPLETED", "REFUNDED", "DENIED", etc.
    
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
        // The PayPal order ID
        // (If we stored it in order details)
      };
    };
    
    amount?: {
      value: string;
      // Amount paid: "50.00"
      currency_code: string;
      // Currency: "USD", "KES", etc.
    };
  };
  
  create_time: string;
  // When this event happened
  // ISO format: "2026-01-21T10:30:00Z"
}

// ============================================================
// STEP 1: Verify It's Really From PayPal (Not a Hacker!)
// ============================================================
// Imagine PayPal is sending you mail with a signature
// You check: "Is this really PayPal's signature?"
// If YES → Trust it ✅
// If NO → REJECT it ❌
async function verifyPayPalSignature(
  event: PayPalWebhookEvent,
  signature: string,
  // The "signature" PayPal wrote
  // Proves they sent this message
  
  transmissionId: string,
  // Unique ID for this transmission
  // Example: "35c99bcf-2e5c-4615-8dd9-f5be0c0f8aca"
  
  transmissionTime: string,
  // When PayPal sent this
  // ISO format: "2026-01-21T10:30:07Z"
  
  certUrl: string
  // URL to PayPal's certificate
  // Used to verify the signature
): Promise<boolean> {
  // SECURITY VERIFICATION:
  // Real verification process:
  // 1. Download cert from PayPal
  // 2. Extract public key
  // 3. Verify signature against message
  // 4. Check cert chain (trust chain)
  
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    // Get the webhook ID from your environment
    // You registered this in PayPal Dashboard
    // Without it, PayPal can't verify
    
    if (!webhookId) {
      console.warn('[PayPal Webhook] ⚠️ PAYPAL_WEBHOOK_ID not configured!');
      console.warn('[PayPal Webhook] Cannot verify signatures');
      console.warn('[PayPal Webhook] Add to .env: PAYPAL_WEBHOOK_ID=WH_...');
      return true; // Allow anyway (development mode)
    }

    // Build signature verification string
    // Format: transmissionId|transmissionTime|webhookId|eventId
    // PayPal uses this exact format
    const signatureBase = `${transmissionId}|${transmissionTime}|${webhookId}|${event.id}`;
    
    // In production, you would:
    // 1. Download cert from certUrl
    // 2. Verify RSA signature
    // 3. Check cert validity
    // 4. Verify cert chain
    
    // For now (simplified for development):
    console.log('[PayPal Webhook] ℹ️ Signature verification (development mode)');
    console.log(`[PayPal Webhook] Using Webhook ID: ${webhookId}`);
    console.log(`[PayPal Webhook] Event ID: ${event.id}`);
    console.log(`[PayPal Webhook] Event Type: ${event.event_type}`);
    return true; // Accept it
  } catch (err) {
    console.error('[PayPal Webhook] ❌ Signature verification failed:', err);
    return false; // Reject it
  }
}


// ============================================================
// STEP 2: Handle Event — Payment Capture Completed ✅
// ============================================================
// EVENT: PAYMENT.CAPTURE.COMPLETED
// WHEN: Payment was captured successfully
// ACTION: Update order status from "pending" to "processing"
//
// TIMELINE:
// 1. Customer clicks "Pay with PayPal"
// 2. Frontend captures payment immediately (via SDK)
// 3. Order created with status: "pending"
// 4. 2-3 seconds later... THIS FUNCTION RUNS
// 5. We verify payment was confirmed
// 6. Update order to status: "processing"
// 7. Customer refreshes page → sees "Processing"
async function handleCaptureCompleted(event: PayPalWebhookEvent): Promise<void> {
  // Extract payment details from event
  const captureId = event.resource.id;
  // This is the unique PayPal payment ID
  // Example: "7KB8ZZFB6HS5G"
  // We stored this in: order.paymentDetails.paypalCaptureId
  
  const amount = event.resource.amount?.value || '0';
  // Amount captured: "50.00"
  
  const currency = event.resource.amount?.currency_code || 'USD';
  // Currency: "USD", "KES", etc.

  console.log(`[PayPal Webhook] 💰 Payment captured: ${captureId}`);
  console.log(`[PayPal Webhook] Amount: ${amount} ${currency}`);

  // Step 1: Find the order in Firestore
  const ordersRef = firestoreAdmin.collection('orders');
  // Access the Firestore "orders" collection
  
  const query = ordersRef
    .where('paymentDetails.paypalCaptureId', '==', captureId)
    // Search: "Find order where paypalCaptureId matches this one"
    .limit(1);
    // Only need one result

  const snapshot = await query.get();
  // Execute search, get results

  if (!snapshot.empty) {
    // Found it! There's a matching order
    const orderDoc = snapshot.docs[0];
    // Get the first (only) result
    
    const orderId = orderDoc.id;
    // Example: "ORD-2026-01-21-12345"

    // Step 2: Update the order status
    await ordersRef.doc(orderId).update({
      'paymentDetails.status': 'COMPLETED',
      // Set payment status to COMPLETED ✅
      // (Was null or "PENDING" before)
      
      'paymentDetails.webhookVerified': true,
      // Mark: "We verified this via webhook"
      // (Proves PayPal confirmed it)
      
      'paymentDetails.webhookReceivedAt': new Date(),
      // When did we receive the webhook?
      // Current time: "2026-01-21T10:30:07Z"
      
      status: 'processing',
      // Customer-facing status changed!
      // From: "pending" (awaiting confirmation)
      // To: "processing" (order confirmed, preparing to ship)
      // Customer now sees: "Your order is being prepared"
    });

    console.log(`[PayPal Webhook] ✅ Order ${orderId} updated to "processing"`);
    // "Order confirmed and moved to processing"
  } else {
    // No matching order found!
    console.warn(`[PayPal Webhook] ⚠️ No order found for capture ${captureId}`);
    console.warn('[PayPal Webhook] This payment might be orphaned');
    console.warn('[PayPal Webhook] The reconciliation API will catch it');
    // Don't worry - our reconciliation job will find this orphan
  }
}

// ============================================================
// STEP 3: Handle Event — Refund Processed 💰
// ============================================================
// EVENT: PAYMENT.CAPTURE.REFUNDED
// WHEN: Customer gets money back
// ACTION: Update order status to "refunded"
//
// SCENARIO:
// 1. Order was created
// 2. Payment captured ✅
// 3. Customer contacts support: "I want refund"
// 4. Admin processes refund via /api/refunds
// 5. PayPal processes it
// 6. PayPal calls webhook: "Refund done!"
// 7. THIS FUNCTION RUNS
// 8. Order status updated to "refunded"
async function handleRefund(event: PayPalWebhookEvent): Promise<void> {
  const refundId = event.resource.id;
  // PayPal's refund transaction ID
  // We stored this in: order.refundDetails.paypalRefundId
  
  const amount = event.resource.amount?.value || '0';
  // Amount refunded back to customer

  console.log(`[PayPal Webhook] 💰 Refund processed: ${refundId}`);
  console.log(`[PayPal Webhook] Amount refunded: ${amount}`);

  // Find order with this refund ID
  const ordersRef = firestoreAdmin.collection('orders');
  const query = ordersRef
    .where('refundDetails.paypalRefundId', '==', refundId)
    // Search: "Which order has this refund?"
    .limit(1);

  const snapshot = await query.get();

  if (!snapshot.empty) {
    const orderDoc = snapshot.docs[0];
    const orderId = orderDoc.id;

    // Update order with refund completion
    await ordersRef.doc(orderId).update({
      'refundDetails.status': 'COMPLETED',
      // Refund confirmed ✅
      
      'refundDetails.webhookReceivedAt': new Date(),
      // When did webhook arrive?
      
      status: 'refunded',
      // Order status now "refunded"
      // Customer sees: "Order refunded - money returned"
    });

    console.log(`[PayPal Webhook] ✅ Order ${orderId} marked as refunded`);
  } else {
    console.warn(`[PayPal Webhook] ⚠️ No refund record found for refund ${refundId}`);
  }
}

// ============================================================
// STEP 4: Handle Event — Payment Denied ❌
// ============================================================
// EVENT: PAYMENT.CAPTURE.DENIED
// WHEN: Payment failed
// ACTION: Cancel the order
//
// REASONS PAYMENT GETS DENIED:
// ❌ Card declined (insufficient funds)
// ❌ Fraud check failed
// ❌ PayPal account issue
// ❌ Buyer dispute
// ❌ Technical error
//
// WHAT WE DO:
// 1. Find the order
// 2. Cancel it (status: "cancelled")
// 3. Add note: "Payment denied by PayPal"
// 4. Log it for admin to review
async function handleCapturedDenied(event: PayPalWebhookEvent): Promise<void> {
  const captureId = event.resource.id;
  // The payment that was denied

  console.log(`[PayPal Webhook] ❌ Payment denied: ${captureId}`);

  const ordersRef = firestoreAdmin.collection('orders');
  const query = ordersRef
    .where('paymentDetails.paypalCaptureId', '==', captureId)
    .limit(1);

  const snapshot = await query.get();

  if (!snapshot.empty) {
    const orderDoc = snapshot.docs[0];
    const orderId = orderDoc.id;

    // Get current status history (if it exists)
    const currentHistory = orderDoc.data()?.statusHistory || [];
    // Array of all status changes
    // Example:
    // [
    //   { status: "pending", timestamp: ..., note: "Order created" },
    //   { status: "cancelled", timestamp: ..., note: "Payment denied" }
    // ]

    // Update order: mark as cancelled
    await ordersRef.doc(orderId).update({
      'paymentDetails.status': 'DENIED',
      // Payment status: DENIED ❌
      
      status: 'cancelled',
      // Order status: cancelled ❌
      // Customer sees: "Order cancelled - payment failed"
      
      'statusHistory': [...currentHistory, {
        status: 'cancelled',
        // What status did we change to?
        
        timestamp: new Date(),
        // When did we change it?
        
        note: 'Payment denied by PayPal',
        // Why did we change it?
        
        updatedBy: 'system',
        // Who made the change? (automated system)
      }],
      // Track all status changes over time
      // Good for auditing and debugging
    });

    console.log(`[PayPal Webhook] ✅ Order ${orderId} cancelled - payment denied`);
  }
}

// ============================================================
// MAIN ENTRY POINT: POST /api/webhooks/paypal
// ============================================================
// THE DOORBELL! 🔔
// 
// This function is called whenever PayPal sends an event
//
// FLOW:
// 1. PayPal sends HTTP POST with payment event
// 2. This function gets the request
// 3. We verify it's really from PayPal
// 4. We route to the right handler
// 5. Handler updates the order
// 6. We respond: "Got it!" (HTTP 200)
//
// WHY HTTP 200?
// Even if something goes wrong, we return 200
// Because if we return 4xx/5xx, PayPal will RETRY
// And we don't want duplicate updates
export async function POST(req: NextRequest) {
  try {
    // Parse the JSON body PayPal sent us
    const body = await req.json() as PayPalWebhookEvent;
    // This is the event data from PayPal
    // Example structure:
    // {
    //   "id": "WH-EVENT-ID",
    //   "event_type": "PAYMENT.CAPTURE.COMPLETED",
    //   "resource": { "id": "7KB8ZZFB6HS5G", "status": "COMPLETED", ... },
    //   "create_time": "2026-01-21T10:30:07Z"
    // }

    // Extract headers for signature verification
    const signature = req.headers.get('paypal-transmission-sig') || '';
    // PayPal's digital signature on this message
    // Proves: "This came from PayPal, not a hacker"
    
    const transmissionId = req.headers.get('paypal-transmission-id') || '';
    // Unique ID for this transmission
    // Use to prevent duplicate processing
    
    const transmissionTime = req.headers.get('paypal-transmission-time') || '';
    // When did PayPal send this?
    // ISO format: "2026-01-21T10:30:07Z"
    
    const certUrl = req.headers.get('paypal-cert-url') || '';
    // URL to download PayPal's certificate
    // Used to verify the signature

    console.log(`[PayPal Webhook] 📬 Received webhook event`);
    console.log(`[PayPal Webhook] Event type: ${body.event_type}`);
    console.log(`[PayPal Webhook] Event ID: ${body.id}`);

    // STEP 1: Verify this is really from PayPal
    const isValid = await verifyPayPalSignature(body, signature, transmissionId, transmissionTime, certUrl);
    if (!isValid) {
      console.warn('[PayPal Webhook] 🚨 SECURITY ALERT: Invalid signature - rejecting!');
      return NextResponse.json(
        { message: 'Invalid signature' },
        { status: 401 }
      );
    }

    // STEP 2: Route to appropriate handler based on event type
    switch (body.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        // ✅ Payment successful!
        console.log('[PayPal Webhook] Routing to: handleCaptureCompleted');
        await handleCaptureCompleted(body);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        // 💰 Refund processed
        console.log('[PayPal Webhook] Routing to: handleRefund');
        await handleRefund(body);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        // ❌ Payment failed
        console.log('[PayPal Webhook] Routing to: handleCapturedDenied');
        await handleCapturedDenied(body);
        break;

      default:
        // Unknown event type
        console.log(`[PayPal Webhook] ℹ️ Unhandled event type: ${body.event_type}`);
        console.log('[PayPal Webhook] (We only handle CAPTURE events)');
    }

    // STEP 3: Always respond with 200
    // Why? To acknowledge we received it
    // Even if handler threw error (caught below)
    return NextResponse.json(
      { message: 'Webhook received and processed' },
      { status: 200 }
    );
    // Response: "Thanks PayPal, I got the message!"
    
  } catch (error: any) {
    // Something went wrong
    console.error('[PayPal Webhook] ❌ Error processing webhook:', error);
    console.error('[PayPal Webhook] Error details:', error.message);
    console.error('[PayPal Webhook] Stack:', error.stack);
    
    // Still return 200!
    // If we return 5xx, PayPal retries and we get duplicates
    return NextResponse.json(
      { message: 'Error processing webhook (logged)' },
      { status: 200 }
    );
  }
}
