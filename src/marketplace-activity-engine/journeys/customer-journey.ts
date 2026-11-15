/**
 * Customer Journey Agent for MAE (v4.1).
 * Executes realistic shopping journeys exercising real marketplace domain services.
 * Dispatches behavioral events through MAEAnalyticsGateway and transactional events
 * via authoritative domain order confirmation.
 */

import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import type { SyntheticCustomerAccount } from '../population/types';
import { CUSTOMER_PROFILES, CustomerBehaviorProfile } from '../config/behaviour-profiles';
import { EventLedger } from '../ledger/event-ledger';
import { CustomerRegistry } from '../population/customer-registry';
import { SeededPRNG } from '../orchestrator/schedule-resolver';
import type { Order, OrderItem } from '@/lib/types';
import { confirmOrderAndRecordPurchaseTransaction } from '@/lib/analytics-outbox';
import type { VerifiedPaymentResult } from '@/lib/analytics-types';
import { generateWebClientId, GA4StandardItem } from '../contracts/ga4-contracts';
import { MAEAnalyticsGateway } from './analytics-gateway';

export interface CatalogItemPreview {
  id: string;
  name: string;
  price: number;
  vendorId: string;
  stock: number;
  category?: string;
  brand?: string;
}

export interface CustomerJourneyResult {
  journeyId: string;
  customerId: string;
  status: 'completed_order' | 'abandoned_cart' | 'payment_failed' | 'stockout_abandoned';
  orderId?: string;
  totalAmount?: number;
}

export class CustomerJourneyAgent {
  private customer: SyntheticCustomerAccount;
  private profile: CustomerBehaviorProfile;
  private runId: string;
  private journeyId: string;
  private prng: SeededPRNG;
  private environment: 'simulation' | 'emulator';
  private clientId: string;
  private sessionId: number;

  constructor(params: {
    customer: SyntheticCustomerAccount;
    runId: string;
    journeyId: string;
    prng: SeededPRNG;
    environment?: 'simulation' | 'emulator';
  }) {
    this.customer = params.customer;
    this.profile = CUSTOMER_PROFILES[params.customer.profileId] || CUSTOMER_PROFILES.regular_shopper_v1;
    this.runId = params.runId;
    this.journeyId = params.journeyId;
    this.prng = params.prng;
    this.environment = params.environment || (process.env.FIRESTORE_EMULATOR_HOST ? 'emulator' : 'simulation');

    // Standard Google Web Measurement Protocol client_id: <uint32>.<initial_epoch>
    this.clientId = generateWebClientId(this.customer.syntheticId);
    this.sessionId = Math.floor(Date.now() / 1000);
  }

  /**
   * Executes the multi-step full-funnel customer journey.
   */
  async execute(catalog: CatalogItemPreview[], dateStr: string): Promise<CustomerJourneyResult> {
    if (!catalog || catalog.length === 0) {
      throw new Error(`Cannot execute customer journey ${this.journeyId}: Catalog is empty.`);
    }

    const selectedProduct = this.prng.pick(catalog);
    const opId = `op_${this.journeyId}_${Date.now()}`;

    const standardItem: GA4StandardItem = {
      item_id: selectedProduct.id,
      item_name: selectedProduct.name,
      price: selectedProduct.price,
      quantity: 1,
      item_category: selectedProduct.category || 'general',
      item_brand: selectedProduct.brand || 'ZilaCart Marketplace',
      vendor_id: selectedProduct.vendorId,
      affiliation: `Vendor ${selectedProduct.vendorId}`,
    };

    // ── 1. Catalog Merchandising: page_view & view_item_list ──
    const categorySlug = selectedProduct.category || 'electronics';
    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'page_view' as any,
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        page_location: `https://staging.zilacart.io/categories/${categorySlug}`,
        page_title: `${categorySlug.toUpperCase()} - ZilaCart Kenya`,
        page_referrer: 'https://staging.zilacart.io/',
      },
      environment: this.environment,
    });

    const catalogSlice: GA4StandardItem[] = catalog.slice(0, 5).map((p, idx) => ({
      item_id: p.id,
      item_name: p.name,
      price: p.price,
      quantity: 1,
      item_category: p.category || 'general',
      vendor_id: p.vendorId,
      index: idx + 1,
    }));

    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'view_item_list',
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        item_list_id: 'featured_catalog',
        item_list_name: 'Marketplace Featured Products',
        items: catalogSlice,
      },
      environment: this.environment,
    });

    // ── 2. Promotion Engagement (Optional Roll) ──
    if (this.prng.next() < 0.4) {
      await MAEAnalyticsGateway.recordBehavioralEvent({
        runId: this.runId,
        journeyId: this.journeyId,
        actorId: this.customer.syntheticId,
        eventName: 'view_promotion',
        clientId: this.clientId,
        userId: `sim_uid_${this.customer.syntheticId}`,
        sessionId: this.sessionId,
        eventParams: {
          promotion_id: 'promo_nairobi_tech_2026',
          promotion_name: 'Nairobi Super Deals Week',
          creative_slot: 'hero_banner',
        },
        environment: this.environment,
      });

      if (this.prng.next() < 0.5) {
        await MAEAnalyticsGateway.recordBehavioralEvent({
          runId: this.runId,
          journeyId: this.journeyId,
          actorId: this.customer.syntheticId,
          eventName: 'select_promotion',
          clientId: this.clientId,
          userId: `sim_uid_${this.customer.syntheticId}`,
          sessionId: this.sessionId,
          eventParams: {
            promotion_id: 'promo_nairobi_tech_2026',
            promotion_name: 'Nairobi Super Deals Week',
            creative_slot: 'hero_banner',
          },
          environment: this.environment,
        });
      }
    }

    // ── 3. Product Detail View: page_view & view_item ──
    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'page_view' as any,
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        page_location: `https://staging.zilacart.io/products/${selectedProduct.id}`,
        page_title: `${selectedProduct.name} - ZilaCart Kenya`,
        page_referrer: `https://staging.zilacart.io/categories/${categorySlug}`,
      },
      environment: this.environment,
    });

    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'view_item',
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        currency: 'KES',
        value: selectedProduct.price,
        items: [standardItem],
      },
      environment: this.environment,
    });

    // ── 4. Stockout Check (Targeted Depletion Scenario) ──
    if (selectedProduct.stock <= 0) {
      await EventLedger.recordEvent({
        eventId: `evt_${this.journeyId}_stockout`,
        runId: this.runId,
        journeyId: this.journeyId,
        opId: `${opId}_stockout`,
        environment: this.environment,
        provenance: 'synthetic',
        actor: {
          actorId: this.customer.syntheticId,
          actorType: 'customer',
          profileId: this.profile.profileId,
        },
        eventName: 'synthetic_cart_abandon',
        entity: { entityType: 'product', entityId: selectedProduct.id },
        payload: {
          cartItemCount: 1,
          cartTotal: selectedProduct.price,
          reason: 'item_stockout',
        },
        occurredAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      await CustomerRegistry.recordCustomerActivity({
        syntheticId: this.customer.syntheticId,
        dateStr,
        orderPlaced: false,
      });

      return {
        journeyId: this.journeyId,
        customerId: this.customer.syntheticId,
        status: 'stockout_abandoned',
      };
    }

    // ── 5. Add to Cart: add_to_cart ──
    const quantity = 1;
    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'add_to_cart',
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        currency: 'KES',
        value: selectedProduct.price * quantity,
        items: [{ ...standardItem, quantity }],
      },
      environment: this.environment,
    });

    // ── 6. Cart Review: page_view & view_cart ──
    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'page_view' as any,
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        page_location: 'https://staging.zilacart.io/cart',
        page_title: 'Your Shopping Cart - ZilaCart',
        page_referrer: `https://staging.zilacart.io/products/${selectedProduct.id}`,
      },
      environment: this.environment,
    });

    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'view_cart',
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        currency: 'KES',
        value: selectedProduct.price * quantity,
        items: [{ ...standardItem, quantity }],
      },
      environment: this.environment,
    });

    // ── 7. Cart Abandonment Roll ──
    const shouldAbandonCart = this.prng.next() < this.profile.cartAbandonmentProbability;
    if (shouldAbandonCart) {
      await EventLedger.recordEvent({
        eventId: `evt_${this.journeyId}_abandon`,
        runId: this.runId,
        journeyId: this.journeyId,
        opId: `${opId}_abandon`,
        environment: this.environment,
        provenance: 'synthetic',
        actor: {
          actorId: this.customer.syntheticId,
          actorType: 'customer',
          profileId: this.profile.profileId,
        },
        eventName: 'synthetic_cart_abandon',
        entity: { entityType: 'cart', entityId: `cart_${this.journeyId}` },
        payload: {
          cartItemCount: quantity,
          cartTotal: selectedProduct.price * quantity,
          reason: 'profile_abandonment',
        },
        occurredAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      await CustomerRegistry.recordCustomerActivity({
        syntheticId: this.customer.syntheticId,
        dateStr,
        orderPlaced: false,
      });

      return {
        journeyId: this.journeyId,
        customerId: this.customer.syntheticId,
        status: 'abandoned_cart',
      };
    }

    // ── 8. Multi-Step Checkout: page_view & begin_checkout ──
    const totalAmount = selectedProduct.price * quantity;
    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'page_view' as any,
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        page_location: 'https://staging.zilacart.io/checkout',
        page_title: 'Checkout Wizard - ZilaCart',
        page_referrer: 'https://staging.zilacart.io/cart',
      },
      environment: this.environment,
    });

    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'begin_checkout',
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        currency: 'KES',
        value: totalAmount,
        items: [{ ...standardItem, quantity }],
      },
      environment: this.environment,
    });

    // ── 9. Checkout: add_shipping_info ──
    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'add_shipping_info',
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        currency: 'KES',
        value: totalAmount,
        shipping_tier: 'standard_courier',
        shipping_county: 'Nairobi',
        items: [{ ...standardItem, quantity }],
      },
      environment: this.environment,
    });

    // ── 10. Checkout: add_payment_info ──
    await MAEAnalyticsGateway.recordBehavioralEvent({
      runId: this.runId,
      journeyId: this.journeyId,
      actorId: this.customer.syntheticId,
      eventName: 'add_payment_info',
      clientId: this.clientId,
      userId: `sim_uid_${this.customer.syntheticId}`,
      sessionId: this.sessionId,
      eventParams: {
        currency: 'KES',
        value: totalAmount,
        payment_method: 'simulated_mpesa',
        items: [{ ...standardItem, quantity }],
      },
      environment: this.environment,
    });

    // ── 11. Payment Failure Roll ──
    const shouldFailPayment = this.prng.next() < this.profile.paymentFailureProbability;
    if (shouldFailPayment) {
      await EventLedger.recordEvent({
        eventId: `evt_${this.journeyId}_payfail`,
        runId: this.runId,
        journeyId: this.journeyId,
        opId: `${opId}_payfail`,
        environment: this.environment,
        provenance: 'synthetic',
        actor: {
          actorId: this.customer.syntheticId,
          actorType: 'customer',
          profileId: this.profile.profileId,
        },
        eventName: 'synthetic_payment_failure',
        entity: { entityType: 'order', entityId: `ord_fail_${this.journeyId}` },
        payload: {
          attemptedAmount: totalAmount,
          failureCode: 'SIM_CARD_DECLINED',
        },
        occurredAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      await CustomerRegistry.recordCustomerActivity({
        syntheticId: this.customer.syntheticId,
        dateStr,
        orderPlaced: false,
      });

      return {
        journeyId: this.journeyId,
        customerId: this.customer.syntheticId,
        status: 'payment_failed',
      };
    }

    // ── 12. Authoritative Domain Order Creation & Verified Payment ──
    const orderId = `sim_ord_${this.journeyId}`;
    const orderItem: OrderItem = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      quantity,
      vendorId: selectedProduct.vendorId,
    };

    const newOrder: any = {
      id: orderId,
      userId: this.customer.authUid,
      customerEmail: this.customer.email,
      items: [orderItem],
      totalAmount,
      currency: 'KES',
      status: 'pending',
      synthetic: true,
      provenance: 'synthetic',
      paymentDetails: {
        provider: 'simulated',
        paymentId: `sim_pay_${orderId}`,
        amount: totalAmount,
        currency: 'KES',
        status: 'PENDING',
        attribution: {
          clientId: this.clientId,
          sessionId: this.sessionId,
          capturedAt: new Date().toISOString(),
          consentSnapshot: {
            analyticsStorage: 'granted',
            consentTimestamp: new Date().toISOString(),
            policyVersion: '2026.1',
            source: 'cookie_banner',
          },
        },
      },
      shippingAddress: {
        fullName: 'Synthetic Shopper',
        city: 'Nairobi',
        county: 'Nairobi',
        streetAddress: 'Sim Street 1',
        postalCode: '00100',
        phoneNumber: '0700000000',
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const orderRef = db.collection('orders').doc(orderId);
    await orderRef.set(newOrder);

    // Atomic Dual-Write in Domain Service: Updates order status to 'confirmed' and writes Outbox 'purchase'
    const verifiedPayment: VerifiedPaymentResult = {
      provider: 'simulated',
      paymentId: `sim_pay_${orderId}`,
      orderId,
      amount: totalAmount,
      currency: 'KES',
      status: 'COMPLETED',
      verifiedAt: new Date().toISOString(),
    };

    await confirmOrderAndRecordPurchaseTransaction(verifiedPayment);

    // Record in internal MAE event ledger
    await EventLedger.recordEvent({
      eventId: `evt_${this.journeyId}_placed`,
      runId: this.runId,
      journeyId: this.journeyId,
      opId: `${opId}_placed`,
      environment: this.environment,
      provenance: 'synthetic',
      actor: {
        actorId: this.customer.syntheticId,
        actorType: 'customer',
        profileId: this.profile.profileId,
      },
      eventName: 'synthetic_order_placed',
      entity: { entityType: 'order', entityId: orderId },
      payload: {
        orderId,
        vendorIds: [selectedProduct.vendorId],
        totalAmount,
        opId: `${opId}_placed`,
      },
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
    });

    await CustomerRegistry.recordCustomerActivity({
      syntheticId: this.customer.syntheticId,
      dateStr,
      orderPlaced: true,
    });

    return {
      journeyId: this.journeyId,
      customerId: this.customer.syntheticId,
      status: 'completed_order',
      orderId,
      totalAmount,
    };
  }
}
