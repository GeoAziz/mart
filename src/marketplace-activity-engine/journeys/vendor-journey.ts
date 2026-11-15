/**
 * Vendor Journey Agent for MAE (v4.1).
 * Executes order processing, status transitions, fulfillment workflows,
 * and initiates domain refund operations upon paid order rejections.
 */

import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import type { SyntheticVendorAccount } from '../population/types';
import { VENDOR_PROFILES, VendorBehaviorProfile } from '../config/behaviour-profiles';
import { EventLedger } from '../ledger/event-ledger';
import { VendorRegistry } from '../population/vendor-registry';
import { SeededPRNG } from '../orchestrator/schedule-resolver';
import { isValidStatusTransition } from '@/lib/order-state-machine';
import type { Order } from '@/lib/types';
import { recordRefundTransaction } from '@/lib/analytics-outbox';

export interface VendorJourneyResult {
  vendorId: string;
  orderId: string;
  status: 'accepted_and_fulfilled' | 'rejected' | 'stockout_rejected';
  acceptDelayMinutes?: number;
  withinSLA?: boolean;
}

export class VendorJourneyAgent {
  private vendor: SyntheticVendorAccount;
  private profile: VendorBehaviorProfile;
  private runId: string;
  private prng: SeededPRNG;
  private environment: 'simulation' | 'emulator';

  constructor(params: {
    vendor: SyntheticVendorAccount;
    runId: string;
    prng: SeededPRNG;
    environment?: 'simulation' | 'emulator';
  }) {
    this.vendor = params.vendor;
    this.profile = VENDOR_PROFILES[params.vendor.profileId] || VENDOR_PROFILES.standard_fulfiller_v1;
    this.runId = params.runId;
    this.prng = params.prng;
    this.environment = params.environment || (process.env.FIRESTORE_EMULATOR_HOST ? 'emulator' : 'simulation');
  }

  /**
   * Processes a single assigned synthetic order.
   */
  async processOrder(orderId: string, dateStr: string): Promise<VendorJourneyResult> {
    const orderRef = db.collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) {
      throw new Error(`Cannot process order ${orderId}: Document not found.`);
    }

    const order = snap.data() as Order;
    const opId = `op_vend_${this.vendor.syntheticId}_${orderId}`;

    // Record order received in vendor stats
    await VendorRegistry.recordVendorActivity({
      syntheticId: this.vendor.syntheticId,
      action: 'received',
      dateStr,
    });

    // ── 1. Acceptance Roll based on Vendor Behavior Profile ──
    const shouldAccept = this.prng.next() < this.profile.acceptanceProbability;

    if (!shouldAccept) {
      // Rejection path: Cancel order
      if (isValidStatusTransition(order.status, 'cancelled')) {
        await orderRef.update({
          status: 'cancelled',
          cancellationReason: 'vendor_rejected_capacity',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Check whether order was paid: If paid, initiate a two-phase refund operation
      const isPaidOrder =
        order.paymentDetails?.status === 'COMPLETED' ||
        order.status === 'confirmed' ||
        order.status === 'processing';

      if (isPaidOrder) {
        const refundId = `ref_${orderId}_vend_reject_${Date.now()}`;
        // Record refund operation in business state
        await db.collection('refund_operations').doc(refundId).set({
          refundId,
          orderId,
          vendorId: this.vendor.syntheticId,
          amount: order.totalAmount,
          currency: (order as any).currency || 'KES',
          status: 'confirmed', // Simulated provider confirms reversal immediately
          reason: 'vendor_capacity_rejection',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Atomic Outbox Write: Enqueue confirmed refund event
        await recordRefundTransaction({
          orderId,
          refundId,
          amount: order.totalAmount,
          currency: (order as any).currency || 'KES',
        });
      }

      await EventLedger.recordEvent({
        eventId: `evt_${orderId}_vend_reject`,
        runId: this.runId,
        journeyId: `jny_vend_${this.vendor.syntheticId}`,
        opId: `${opId}_reject`,
        environment: this.environment,
        provenance: 'synthetic',
        actor: {
          actorId: this.vendor.syntheticId,
          actorType: 'vendor',
          profileId: this.profile.profileId,
        },
        eventName: 'synthetic_order_rejected',
        entity: { entityType: 'order', entityId: orderId },
        payload: {
          orderId,
          vendorId: this.vendor.syntheticId,
          rejectionReason: 'capacity_exceeded',
        },
        occurredAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      await VendorRegistry.recordVendorActivity({
        syntheticId: this.vendor.syntheticId,
        action: 'rejected',
        dateStr,
      });

      return {
        vendorId: this.vendor.syntheticId,
        orderId,
        status: 'rejected',
      };
    }

    // ── 2. Acceptance Path ──
    const [minAcceptDelay, maxAcceptDelay] = this.profile.acceptanceDelayMinutesRange;
    const acceptDelayMinutes = this.prng.nextInt(minAcceptDelay, maxAcceptDelay);

    // Transition to processing
    await orderRef.update({
      status: 'processing',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await EventLedger.recordEvent({
      eventId: `evt_${orderId}_vend_accept`,
      runId: this.runId,
      journeyId: `jny_vend_${this.vendor.syntheticId}`,
      opId: `${opId}_accept`,
      environment: this.environment,
      provenance: 'synthetic',
      actor: {
        actorId: this.vendor.syntheticId,
        actorType: 'vendor',
        profileId: this.profile.profileId,
      },
      eventName: 'synthetic_order_accepted',
      entity: { entityType: 'order', entityId: orderId },
      payload: {
        orderId,
        vendorId: this.vendor.syntheticId,
        acceptDelayMinutes,
      },
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
    });

    // ── 3. Fulfillment Path ──
    const [minFulfillMin, maxFulfillMin] = this.profile.fulfillmentDelayMinutesRange;
    const fulfillDelayHours = Math.round(this.prng.nextInt(minFulfillMin, maxFulfillMin) / 60);
    const withinSLA = fulfillDelayHours <= 48;

    const trackingNumber = `TRK_SIM_${this.vendor.syntheticId.toUpperCase()}_${orderId.slice(-6)}`;

    await orderRef.update({
      status: 'delivered',
      trackingNumber,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await EventLedger.recordEvent({
      eventId: `evt_${orderId}_vend_fulfill`,
      runId: this.runId,
      journeyId: `jny_vend_${this.vendor.syntheticId}`,
      opId: `${opId}_fulfill`,
      environment: this.environment,
      provenance: 'synthetic',
      actor: {
        actorId: this.vendor.syntheticId,
        actorType: 'vendor',
        profileId: this.profile.profileId,
      },
      eventName: 'synthetic_order_fulfilled',
      entity: { entityType: 'order', entityId: orderId },
      payload: {
        orderId,
        vendorId: this.vendor.syntheticId,
        trackingNumber,
        withinSLA,
      },
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
    });

    await VendorRegistry.recordVendorActivity({
      syntheticId: this.vendor.syntheticId,
      action: 'fulfilled',
      dateStr,
    });

    return {
      vendorId: this.vendor.syntheticId,
      orderId,
      status: 'accepted_and_fulfilled',
      acceptDelayMinutes,
      withinSLA,
    };
  }
}
