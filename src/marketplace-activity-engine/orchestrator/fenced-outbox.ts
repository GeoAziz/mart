/**
 * Fenced Analytics Outbox Engine (v1.2).
 * Provides atomic dual-write helpers, monotonic lease claims, fenced commits,
 * aggregate version ordering, and dead-letter queue management.
 */

import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import {
  AllGA4EventName,
  StandardGA4EcommerceEventName,
  GA4LeadEventName,
  GA4UserAuthEventName,
  GA4StreamEventPayload
} from '../contracts/ga4-contracts';
import { GA4UserLocation } from '../adapters/ga4-location-adapter';

export interface AnalyticsOutboxEvent {
  eventId: string;             // Deterministic UUID / event key
  idempotencyKey: string;      // `${aggregateType}:${aggregateId}:${aggregateVersion}:${eventName}`

  aggregateType: 'vendor' | 'customer' | 'lead';
  aggregateId: string;         // e.g. 'lead_vnd_0104'
  aggregateVersion: number;    // Monotonically increasing version: 1, 2, 3...

  eventName: AllGA4EventName | string;
  eventPayload: Record<string, unknown>;
  userLocation?: GA4UserLocation;

  occurredAt: string;          // ISO-8601 business occurrence timestamp
  createdAt: string;           // ISO-8601 outbox insertion timestamp

  delivery: {
    status: 'pending' | 'leased' | 'delivered' | 'retryable_failure' | 'dead_letter';
    attemptCount: number;
    leaseOwner?: string;
    leaseExpiresAt?: string;
    fencingToken: number;      // Monotonically increasing fencing token
    lastAttemptAt?: string;
    deliveredAt?: string;
    lastError?: string;
  };
}

export interface FencedOutboxRecord {
  id: string;
  idempotencyKey: string;
  eventType: string;
  status: 'pending' | 'leased' | 'accepted_by_endpoint' | 'delivered' | 'dead_letter';

  provenance: 'synthetic';
  runId: string;
  actorId: string;
  orderId?: string;
  refundId?: string;
  aggregateId?: string;
  aggregateVersion?: number;
  schemaVersion: 1;

  leaseOwner: string | null;
  leaseId: string | null;
  fencingToken: number;
  leaseExpiresAt: admin.firestore.Timestamp | null;

  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: admin.firestore.Timestamp;

  payload: GA4StreamEventPayload;
  endpointResult?: {
    statusCode: number;
    accepted: boolean;
    dispatchTimestamp: string;
  };

  createdAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
}

export class FencedOutboxManager {
  /**
   * Builds an outbox record with deterministic idempotency.
   */
  static buildRecord(params: {
    eventType: string;
    idempotencyKey: string;
    actorId: string;
    runId: string;
    payload: GA4StreamEventPayload;
    orderId?: string;
    refundId?: string;
    aggregateId?: string;
    aggregateVersion?: number;
  }): FencedOutboxRecord {
    const sanitizedKey = params.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const id = `${params.eventType}_${sanitizedKey}`;

    return {
      id,
      idempotencyKey: params.idempotencyKey,
      eventType: params.eventType,
      status: 'pending',
      provenance: 'synthetic',
      runId: params.runId,
      actorId: params.actorId,
      orderId: params.orderId,
      refundId: params.refundId,
      aggregateId: params.aggregateId,
      aggregateVersion: params.aggregateVersion || 1,
      schemaVersion: 1,

      leaseOwner: null,
      leaseId: null,
      fencingToken: 0,
      leaseExpiresAt: null,

      attemptCount: 0,
      maxAttempts: 5,
      nextAttemptAt: admin.firestore.Timestamp.now(),

      payload: params.payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  /**
   * Atomically claims an eligible pending or expired outbox record using monotonic fencing.
   */
  static async claimLease(
    recordRef: admin.firestore.DocumentReference,
    workerId: string,
    leaseDurationMs = 60000
  ): Promise<{ claimed: boolean; leaseId: string; fencingToken: number }> {
    return db.runTransaction(async (transaction) => {
      const snap = await transaction.get(recordRef);
      if (!snap.exists) {
        return { claimed: false, leaseId: '', fencingToken: 0 };
      }

      const data = snap.data() as FencedOutboxRecord;
      const now = Date.now();
      const isPending = data.status === 'pending';
      const isExpiredLease =
        data.status === 'leased' &&
        data.leaseExpiresAt &&
        data.leaseExpiresAt.toMillis() < now;

      const backoffReady = !data.nextAttemptAt || data.nextAttemptAt.toMillis() <= now;

      if ((isPending || isExpiredLease) && backoffReady && data.attemptCount < (data.maxAttempts || 5)) {
        const nextToken = (data.fencingToken || 0) + 1;
        const newLeaseId = `lease_${workerId}_${Date.now()}`;
        const expiresAt = admin.firestore.Timestamp.fromMillis(now + leaseDurationMs);

        transaction.update(recordRef, {
          status: 'leased',
          leaseOwner: workerId,
          leaseId: newLeaseId,
          fencingToken: nextToken,
          leaseExpiresAt: expiresAt,
          attemptCount: (data.attemptCount || 0) + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { claimed: true, leaseId: newLeaseId, fencingToken: nextToken };
      }

      return { claimed: false, leaseId: '', fencingToken: 0 };
    });
  }

  /**
   * Commits the external dispatch result verifying that the worker still holds the active lease.
   */
  static async commitDispatch(
    recordRef: admin.firestore.DocumentReference,
    leaseId: string,
    fencingToken: number,
    result: { statusCode: number; accepted: boolean }
  ): Promise<boolean> {
    return db.runTransaction(async (transaction) => {
      const snap = await transaction.get(recordRef);
      if (!snap.exists) return false;

      const data = snap.data() as FencedOutboxRecord;

      // Monotonic Fencing Check: Discard stale worker updates
      if (data.leaseId !== leaseId || data.fencingToken !== fencingToken) {
        return false;
      }

      const maxAttempts = data.maxAttempts || 5;
      const nextStatus = result.accepted
        ? 'accepted_by_endpoint'
        : data.attemptCount >= maxAttempts
        ? 'dead_letter'
        : 'pending';

      const backoffMs = result.accepted ? 0 : Math.pow(2, data.attemptCount) * 1000;

      transaction.update(recordRef, {
        status: nextStatus,
        leaseOwner: null,
        leaseId: null,
        leaseExpiresAt: null,
        nextAttemptAt: admin.firestore.Timestamp.fromMillis(Date.now() + backoffMs),
        endpointResult: {
          statusCode: result.statusCode,
          accepted: result.accepted,
          dispatchTimestamp: new Date().toISOString(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return true;
    });
  }
}
