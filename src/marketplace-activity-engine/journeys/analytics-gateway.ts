/**
 * MAE Behavioral Analytics Gateway (Observer).
 * Routes discovery, merchandising, and cart events to the fenced outbox and audit ledger.
 * Does NOT own order or refund state transitions.
 */

import { firestoreAdmin as db } from '@/lib/firebase-admin';
import { FencedOutboxManager } from '../orchestrator/fenced-outbox';
import { EventLedger } from '../ledger/event-ledger';
import {
  GA4StandardItem,
  GA4StreamEventPayload,
  StandardGA4EventName,
} from '../contracts/ga4-contracts';

export class MAEAnalyticsGateway {
  /**
   * Records a behavioral event into the outbox and internal ledger.
   */
  static async recordBehavioralEvent(params: {
    runId: string;
    journeyId: string;
    actorId: string;
    eventName: StandardGA4EventName;
    clientId: string;
    userId?: string;
    sessionId: number;
    eventParams: Record<string, any>;
    environment?: 'simulation' | 'emulator';
  }): Promise<string> {
    const environment = params.environment || (process.env.FIRESTORE_EMULATOR_HOST ? 'emulator' : 'simulation');
    const idempotencyKey = `${params.journeyId}:${params.eventName}:${Date.now()}`;

    const streamPayload: GA4StreamEventPayload = {
      client_id: params.clientId,
      user_id: params.userId,
      events: [
        {
          name: params.eventName,
          params: {
            ...params.eventParams,
            session_id: params.sessionId,
            engagement_time_msec: 1000,
          },
        },
      ],
    };

    const outboxRecord = FencedOutboxManager.buildRecord({
      eventType: params.eventName,
      idempotencyKey,
      actorId: params.actorId,
      runId: params.runId,
      payload: streamPayload,
    });

    const docRef = db.collection('analytics_outbox').doc(outboxRecord.id);
    await docRef.set(outboxRecord);

    // Also persist to append-only operational ledger
    await EventLedger.recordEvent({
      eventId: `evt_${outboxRecord.id}`,
      runId: params.runId,
      journeyId: params.journeyId,
      opId: `op_${params.journeyId}_${params.eventName}`,
      environment,
      provenance: 'synthetic',
      actor: {
        actorId: params.actorId,
        actorType: 'customer',
        profileId: 'synthetic_profile',
      },
      eventName: 'synthetic_item_view',
      entity: { entityType: 'cart', entityId: params.journeyId },
      payload: {
        productId: params.eventParams.items?.[0]?.item_id || 'prod_sim_item',
        vendorId: params.eventParams.items?.[0]?.vendor_id || 'vend_sim_0001',
        price: Number(params.eventParams.value || 1000),
      },
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
    });

    return outboxRecord.id;
  }
}
