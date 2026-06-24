import { firestoreAdmin as db } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

/**
 * Webhook Idempotency Service
 * Ensures webhooks are processed exactly once, even if received multiple times
 * (PayPal and Stripe may retry webhooks)
 */

interface WebhookRecord {
  eventId: string;
  provider: 'stripe' | 'paypal';
  eventType: string;
  processedAt: admin.firestore.Timestamp;
  status: 'success' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
}

const WEBHOOK_COLLECTION = 'webhook_events';

/**
 * Check if webhook has already been processed
 */
export async function getWebhookRecord(
  provider: 'stripe' | 'paypal',
  eventId: string
): Promise<WebhookRecord | null> {
  try {
    const docId = `${provider}_${eventId}`;
    const docSnap = await db.collection(WEBHOOK_COLLECTION).doc(docId).get();

    if (!docSnap.exists) {
      return null;
    }

    return docSnap.data() as WebhookRecord;
  } catch (error) {
    console.error('Failed to check webhook record:', error);
    return null;
  }
}

/**
 * Store webhook event record to prevent duplicate processing
 */
export async function storeWebhookRecord(
  provider: 'stripe' | 'paypal',
  eventId: string,
  eventType: string,
  status: 'success' | 'failed',
  result?: Record<string, unknown>,
  error?: string
): Promise<void> {
  try {
    const docId = `${provider}_${eventId}`;
    const record: WebhookRecord = {
      eventId,
      provider,
      eventType,
      processedAt: admin.firestore.Timestamp.now(),
      status,
      result,
      error,
    };

    await db.collection(WEBHOOK_COLLECTION).doc(docId).set(record, { merge: true });
  } catch (error) {
    console.error('Failed to store webhook record:', error);
    // Don't throw - if we can't store, we'll reprocess (safe but inefficient)
  }
}

/**
 * Check if webhook is duplicate and return cached result if available
 */
export async function checkWebhookIdempotency(
  provider: 'stripe' | 'paypal',
  eventId: string
): Promise<{ isDuplicate: boolean; cachedResult?: WebhookRecord }> {
  const existing = await getWebhookRecord(provider, eventId);

  if (existing) {
    return {
      isDuplicate: true,
      cachedResult: existing,
    };
  }

  return { isDuplicate: false };
}

/**
 * Wrapper function for processing webhooks with idempotency
 */
export async function processWebhookOnce<T>(
  provider: 'stripe' | 'paypal',
  eventId: string,
  eventType: string,
  processor: () => Promise<T>
): Promise<{ isNew: boolean; result: T | undefined }> {
  // Check if already processed
  const existing = await getWebhookRecord(provider, eventId);

  if (existing) {
    console.log(`Webhook ${provider}:${eventId} already processed. Returning cached result.`);
    return {
      isNew: false,
      result: existing.result as T | undefined,
    };
  }

  // Process new webhook
  try {
    const result = await processor();

    // Store success record
    await storeWebhookRecord(
      provider,
      eventId,
      eventType,
      'success',
      result as Record<string, unknown>
    );

    return {
      isNew: true,
      result,
    };
  } catch (error) {
    // Store failure record
    await storeWebhookRecord(
      provider,
      eventId,
      eventType,
      'failed',
      undefined,
      error instanceof Error ? error.message : String(error)
    );

    throw error;
  }
}
