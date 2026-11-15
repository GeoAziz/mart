/**
 * Canonical Event Ledger for MAE.
 *
 * Implements immutable create-only event recording with typed discriminated union payloads.
 * Stored at: simulation/events/{eventId}
 */

import { firestoreAdmin as db } from '@/lib/firebase-admin';

export type SimulationEventName =
  | 'synthetic_browse'
  | 'synthetic_item_view'
  | 'synthetic_cart_add'
  | 'synthetic_cart_abandon'
  | 'synthetic_checkout_begin'
  | 'synthetic_payment_failure'
  | 'synthetic_order_placed'
  | 'synthetic_order_accepted'
  | 'synthetic_order_rejected'
  | 'synthetic_order_fulfilled';

export type EventPayloadMap = {
  synthetic_browse: { category: string; durationSeconds: number };
  synthetic_item_view: { productId: string; vendorId: string; price: number };
  synthetic_cart_add: { productId: string; quantity: number; unitPrice: number };
  synthetic_cart_abandon: {
    cartItemCount: number;
    cartTotal: number;
    reason: 'profile_abandonment' | 'item_stockout';
  };
  synthetic_checkout_begin: { orderTotal: number; itemCount: number; shippingCounty: string };
  synthetic_payment_failure: {
    attemptedAmount: number;
    failureCode: 'SIM_CARD_DECLINED' | 'SIM_INSUFFICIENT_FUNDS';
  };
  synthetic_order_placed: { orderId: string; vendorIds: string[]; totalAmount: number; opId: string };
  synthetic_order_accepted: { orderId: string; vendorId: string; acceptDelayMinutes: number };
  synthetic_order_rejected: {
    orderId: string;
    vendorId: string;
    rejectionReason: 'out_of_stock' | 'capacity_exceeded';
  };
  synthetic_order_fulfilled: {
    orderId: string;
    vendorId: string;
    trackingNumber: string;
    withinSLA: boolean;
  };
};

export interface GenericSimulationEvent<K extends SimulationEventName> {
  eventId: string; // evt_{runId}_{step}_{hash}
  runId: string;
  journeyId: string;
  opId: string; // Deterministic idempotency key
  environment: 'simulation' | 'emulator';
  provenance: 'synthetic';
  actor: {
    actorId: string; // cust_sim_0001 or vend_sim_0001
    actorType: 'customer' | 'vendor';
    profileId: string;
  };
  eventName: K;
  entity: {
    entityType: 'product' | 'order' | 'cart';
    entityId: string;
  };
  payload: EventPayloadMap[K];
  occurredAt: string; // ISO 8601
  schemaVersion: 1;
}

/**
 * Distributed discriminated union over simulation event types.
 */
export type CanonicalSimulationEvent<E extends SimulationEventName = SimulationEventName> =
  E extends any ? GenericSimulationEvent<E> : never;

export class EventLedger {
  private static readonly COLLECTION = 'simulation';
  private static readonly EVENTS = 'events';

  private static getEventsRef() {
    return db
      .collection(EventLedger.COLLECTION)
      .doc('ledger')
      .collection(EventLedger.EVENTS);
  }

  /**
   * Appends an immutable simulation event to the canonical ledger.
   * Idempotent on eventId.
   */
  static async recordEvent(event: CanonicalSimulationEvent): Promise<void> {
    const docRef = EventLedger.getEventsRef().doc(event.eventId);
    const existing = await docRef.get();
    if (existing.exists) {
      // Event already recorded (idempotent no-op)
      return;
    }
    await docRef.set(event);
  }

  /**
   * Queries events for a specific journey.
   */
  static async queryEventsByJourney(journeyId: string): Promise<CanonicalSimulationEvent[]> {
    const snap = await EventLedger.getEventsRef()
      .where('journeyId', '==', journeyId)
      .get();
    return snap.docs.map((doc) => doc.data() as CanonicalSimulationEvent);
  }

  /**
   * Queries events for a specific run.
   */
  static async queryEventsByRun(runId: string): Promise<CanonicalSimulationEvent[]> {
    const snap = await EventLedger.getEventsRef()
      .where('runId', '==', runId)
      .get();
    return snap.docs.map((doc) => doc.data() as CanonicalSimulationEvent);
  }
}
