import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { dispatchGA4Purchase, dispatchGA4Refund } from '@/lib/analytics-server';
import type { AnalyticsOutboxRecord, GA4PurchasePayload, GA4RefundPayload } from '@/lib/analytics-types';

export interface ProcessOutboxOptions {
  batchSize?: number;
  workerId?: string;
  leaseDurationMs?: number;
}

/**
 * Checks whether the analytics outbox processor has been paused via emergency kill-switch.
 * Controlled via environment variable ANALYTICS_WORKER_PAUSED or Firestore config.
 */
export async function isOutboxProcessingPaused(): Promise<boolean> {
  if (process.env.ANALYTICS_WORKER_PAUSED === 'true') {
    return true;
  }
  try {
    const configDoc = await db.collection('system_config').doc('analytics_settings').get();
    if (configDoc.exists && configDoc.data()?.isPaused === true) {
      return true;
    }
  } catch (err) {
    // If config fetch fails, fail open and proceed with normal processing
  }
  return false;
}

/**
 * Claims and processes eligible pending or stale-lease outbox records.
 * Uses atomic lease fencing to prevent concurrent worker collisions.
 */
export async function processOutboxBatch(
  options: ProcessOutboxOptions = {}
): Promise<{ processed: number; sent: number; failed: number; deadLetter: number }> {
  // Emergency Kill-Switch Check
  if (await isOutboxProcessingPaused()) {
    console.warn('[AnalyticsWorker] Processing cycle paused by emergency stop switch');
    return { processed: 0, sent: 0, failed: 0, deadLetter: 0 };
  }

  const batchSize = options.batchSize ?? 10;
  const workerId = options.workerId ?? `worker_${process.pid}_${Math.random().toString(36).substring(2, 7)}`;
  const leaseDurationMs = options.leaseDurationMs ?? 60000; // 60 seconds lease
  const now = admin.firestore.Timestamp.now();

  const outboxCol = db.collection('analytics_outbox');

  // Query eligible records: status 'pending'
  // Note: Filter nextAttemptAt in memory to avoid requiring a composite index on (status, nextAttemptAt)
  const pendingSnap = await outboxCol
    .where('status', '==', 'pending')
    .limit(batchSize * 3)
    .get();

  const nowMillis = now.toMillis();
  const eligiblePendingDocs = pendingSnap.docs.filter((doc) => {
    const data = doc.data() as AnalyticsOutboxRecord;
    return !data.nextAttemptAt || data.nextAttemptAt.toMillis() <= nowMillis;
  }).slice(0, batchSize);

  const candidateDocs = [...eligiblePendingDocs];

  // Also query stale processing records whose lease has expired
  if (candidateDocs.length < batchSize) {
    const staleSnap = await outboxCol
      .where('status', '==', 'processing')
      .limit(batchSize * 3)
      .get();

    const eligibleStaleDocs = staleSnap.docs.filter((doc) => {
      const data = doc.data() as AnalyticsOutboxRecord;
      return data.leaseExpiresAt && data.leaseExpiresAt.toMillis() <= nowMillis;
    }).slice(0, batchSize - candidateDocs.length);

    candidateDocs.push(...eligibleStaleDocs);
  }

  let sent = 0;
  let failed = 0;
  let deadLetter = 0;

  for (const doc of candidateDocs) {
    const leaseId = `lease_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const recordRef = doc.ref;

    // ── Phase 1: Atomic Claim with Lease Fencing ──
    const claimed = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(recordRef);
      if (!snap.exists) return null;
      const rec = snap.data() as AnalyticsOutboxRecord;

      // Ensure still claimable
      const isClaimable =
        rec.status === 'pending' ||
        (rec.status === 'processing' && rec.leaseExpiresAt && rec.leaseExpiresAt.toMillis() <= Date.now());

      if (!isClaimable) return null;

      const leaseExpiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + leaseDurationMs);

      transaction.update(recordRef, {
        status: 'processing',
        lockedBy: workerId,
        lockedAt: admin.firestore.FieldValue.serverTimestamp(),
        leaseExpiresAt,
        leaseId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ...rec, leaseId };
    });

    if (!claimed) continue;

    // ── Phase 2: Check Suppression Eligibility ──
    if (claimed.status === 'suppressed') {
      continue;
    }

    const payload = claimed.payload;
    const clientId = payload.attribution?.clientId;

    if (!clientId) {
      await recordRef.update({
        status: 'suppressed',
        suppressionReason: 'missing_client_id',
        lockedBy: null,
        lockedAt: null,
        leaseExpiresAt: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      continue;
    }

    // ── Phase 3: Increment Attempt Count & Dispatch ──
    const nextAttemptCount = (claimed.attemptCount || 0) + 1;

    let result;
    if (claimed.eventType === 'refund') {
      const ga4RefundPayload: GA4RefundPayload = {
        client_id: clientId,
        session_id: payload.attribution?.sessionId ?? undefined,
        events: [
          {
            name: 'refund',
            params: {
              transaction_id: payload.transaction_id,
              value: payload.value,
              currency: payload.currency,
              shipping: payload.shipping,
              tax: payload.tax,
              items: payload.items,
              is_synthetic: payload.is_synthetic,
              traffic_type: payload.traffic_type,
            },
          },
        ],
      };
      result = await dispatchGA4Refund(ga4RefundPayload);
    } else {
      const ga4Payload: GA4PurchasePayload = {
        client_id: clientId,
        session_id: payload.attribution?.sessionId ?? undefined,
        events: [
          {
            name: 'purchase',
            params: {
              transaction_id: payload.transaction_id,
              value: payload.value,
              currency: payload.currency,
              shipping: payload.shipping,
              tax: payload.tax,
              payment_method: payload.payment_method,
              shipping_county: payload.shipping_county,
              items: payload.items,
              is_synthetic: payload.is_synthetic,
              traffic_type: payload.traffic_type,
            },
          },
        ],
      };
      result = await dispatchGA4Purchase(ga4Payload);
    }

    // ── Phase 4: Atomic Fenced Resolution ──
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(recordRef);
      if (!snap.exists) return;
      const current = snap.data() as AnalyticsOutboxRecord;

      // Fencing check: verify leaseId still matches
      if (current.leaseId !== leaseId) {
        console.warn(`[OutboxWorker] Lease lost for ${doc.id}; discarding resolution`);
        return;
      }

      if (result.accepted) {
        sent++;
        transaction.update(recordRef, {
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          attemptCount: nextAttemptCount,
          lockedBy: null,
          lockedAt: null,
          leaseExpiresAt: null,
          leaseId: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        const isExhausted = nextAttemptCount >= (claimed.maxAttempts || 5);
        if (isExhausted || !result.isTransient) {
          deadLetter++;
          transaction.update(recordRef, {
            status: 'dead_letter',
            attemptCount: nextAttemptCount,
            lastErrorCode: String(result.statusCode),
            lastErrorMessage: result.errorMessage,
            lockedBy: null,
            lockedAt: null,
            leaseExpiresAt: null,
            leaseId: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          failed++;
          // Exponential backoff with jitter: 2^attempt * 1000ms + random(0, 1000ms)
          const backoffMs = Math.pow(2, nextAttemptCount) * 1000 + Math.floor(Math.random() * 1000);
          const nextAttemptAt = admin.firestore.Timestamp.fromMillis(Date.now() + backoffMs);

          transaction.update(recordRef, {
            status: 'pending',
            attemptCount: nextAttemptCount,
            nextAttemptAt,
            lastErrorCode: String(result.statusCode),
            lastErrorMessage: result.errorMessage,
            lockedBy: null,
            lockedAt: null,
            leaseExpiresAt: null,
            leaseId: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    });
  }

  return {
    processed: candidateDocs.length,
    sent,
    failed,
    deadLetter,
  };
}

/**
 * Starts a recurring background worker loop that drains the analytics outbox.
 * Designed to run continuously alongside order and payment workers.
 */
export async function startAnalyticsOutboxWorker(intervalMs = 30000): Promise<void> {
  console.log(`[AnalyticsWorker] Starting background outbox processor (interval: ${intervalMs / 1000}s)...`);

  const runTick = async () => {
    try {
      const res = await processOutboxBatch({
        batchSize: 20,
        workerId: `worker_loop_${process.pid}`,
      });
      if (res.processed > 0) {
        console.log(`[AnalyticsWorker] Processed batch: ${res.sent} sent, ${res.failed} retrying, ${res.deadLetter} dead-lettered`);
      }
    } catch (err) {
      console.error('[AnalyticsWorker] Error during outbox processing cycle:', err);
    }
  };

  // Run initial cycle immediately
  await runTick();

  // Schedule recurring loop
  setInterval(runTick, intervalMs);
}


