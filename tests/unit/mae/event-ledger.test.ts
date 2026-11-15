import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventLedger, CanonicalSimulationEvent } from '@/marketplace-activity-engine/ledger/event-ledger';
import { firestoreAdmin as db } from '@/lib/firebase-admin';

vi.mock('@/lib/firebase-admin', () => {
  let mockEvents: Record<string, any> = {};

  return {
    firestoreAdmin: {
      collection: (col: string) => ({
        doc: (d1: string) => ({
          collection: (subCol: string) => ({
            doc: (docId: string) => ({
              get: vi.fn(async () => ({
                exists: Boolean(mockEvents[docId]),
                data: () => mockEvents[docId],
              })),
              set: vi.fn(async (data: any) => {
                mockEvents[docId] = { ...data };
              }),
            }),
            where: (field: string, op: string, value: any) => ({
              get: vi.fn(async () => {
                const docs = Object.values(mockEvents)
                  .filter((item) => item[field] === value)
                  .map((item) => ({ data: () => item }));
                return { docs };
              }),
            }),
          }),
        }),
      }),
      __resetMockEvents: () => {
        mockEvents = {};
      },
    },
  };
});

describe('EventLedger', () => {
  beforeEach(() => {
    (db as any).__resetMockEvents();
  });

  it('records an immutable simulation event with discriminated payload', async () => {
    const event: CanonicalSimulationEvent<'synthetic_order_placed'> = {
      eventId: 'evt_run1_001_abc',
      runId: 'run_001',
      journeyId: 'jny_001',
      opId: 'op_order_123',
      environment: 'emulator',
      provenance: 'synthetic',
      actor: {
        actorId: 'cust_sim_0001',
        actorType: 'customer',
        profileId: 'regular_shopper_v1',
      },
      eventName: 'synthetic_order_placed',
      entity: {
        entityType: 'order',
        entityId: 'ord_sim_999',
      },
      payload: {
        orderId: 'ord_sim_999',
        vendorIds: ['vend_sim_0001'],
        totalAmount: 4500,
        opId: 'op_order_123',
      },
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
    };

    await EventLedger.recordEvent(event);

    const journeyEvents = await EventLedger.queryEventsByJourney('jny_001');
    expect(journeyEvents.length).toBe(1);
    const firstEvent = journeyEvents[0];
    expect(firstEvent.eventName).toBe('synthetic_order_placed');
    if (firstEvent.eventName === 'synthetic_order_placed') {
      expect(firstEvent.payload.totalAmount).toBe(4500);
    }
  });

  it('is idempotent on duplicate eventId', async () => {
    const event: CanonicalSimulationEvent<'synthetic_browse'> = {
      eventId: 'evt_run1_browse_01',
      runId: 'run_001',
      journeyId: 'jny_001',
      opId: 'op_browse_01',
      environment: 'emulator',
      provenance: 'synthetic',
      actor: {
        actorId: 'cust_sim_0001',
        actorType: 'customer',
        profileId: 'regular_shopper_v1',
      },
      eventName: 'synthetic_browse',
      entity: {
        entityType: 'product',
        entityId: 'cat_electronics',
      },
      payload: {
        category: 'electronics',
        durationSeconds: 45,
      },
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
    };

    await EventLedger.recordEvent(event);
    await EventLedger.recordEvent(event); // Replay

    const runEvents = await EventLedger.queryEventsByRun('run_001');
    expect(runEvents.length).toBe(1);
  });
});
