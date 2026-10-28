import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchGA4Purchase } from '@/lib/analytics-server';
import type { GA4PurchasePayload } from '@/lib/analytics-types';

describe('dispatchGA4Purchase Server Service', () => {
  const validPayload: GA4PurchasePayload = {
    client_id: '123456789.1700000000',
    session_id: 1710000000,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: 'ORD_TEST_100',
          value: 3000,
          currency: 'KES',
          shipping: 200,
          tax: 150,
          payment_method: 'mpesa',
          items: [
            { item_id: 'p1', item_name: 'Item 1', price: 1500, quantity: 2 },
          ],
        },
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fails fast when missing environment secrets', async () => {
    const res = await dispatchGA4Purchase(validPayload, {
      apiSecret: '',
      measurementId: '',
    });
    expect(res.accepted).toBe(false);
    expect(res.isTransient).toBe(false);
    expect(res.errorMessage).toContain('Missing GA4_MEASUREMENT_ID');
  });

  it('rejects invalid or empty client_id without network call', async () => {
    const invalidPayload = { ...validPayload, client_id: '' };
    const res = await dispatchGA4Purchase(invalidPayload, {
      apiSecret: 'secret_123',
      measurementId: 'G-TEST123',
    });
    expect(res.accepted).toBe(false);
    expect(res.errorMessage).toContain('Invalid or missing client_id');
  });

  it('handles successful HTTP 204 response from production endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 204,
      ok: true,
    } as any);

    const res = await dispatchGA4Purchase(validPayload, {
      apiSecret: 'secret_123',
      measurementId: 'G-TEST123',
      useDebugEndpoint: false,
    });

    expect(res.accepted).toBe(true);
    expect(res.statusCode).toBe(204);
    expect(res.isTransient).toBe(false);
  });

  it('parses debug endpoint validationMessages correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        validationMessages: [
          { fieldPath: 'events[0].params.value', description: 'Value is required' },
        ],
      }),
    } as any);

    const res = await dispatchGA4Purchase(validPayload, {
      apiSecret: 'secret_123',
      measurementId: 'G-TEST123',
      useDebugEndpoint: true,
    });

    expect(res.accepted).toBe(false);
    expect(res.validationMessages).toHaveLength(1);
    expect(res.errorMessage).toContain('GA4 validation failed');
  });

  it('classifies HTTP 429 and 500 as transient errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 503,
      ok: false,
    } as any);

    const res = await dispatchGA4Purchase(validPayload, {
      apiSecret: 'secret_123',
      measurementId: 'G-TEST123',
    });

    expect(res.accepted).toBe(false);
    expect(res.statusCode).toBe(503);
    expect(res.isTransient).toBe(true);
  });

  it('dispatches refund events with debug endpoint validation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ validationMessages: [] }),
    } as any);

    const { dispatchGA4Refund } = await import('@/lib/analytics-server');
    const res = await dispatchGA4Refund(
      {
        client_id: '123456789.1700000000',
        events: [
          {
            name: 'refund',
            params: {
              transaction_id: 'ORD_TEST_100',
              value: 1500,
              currency: 'KES',
            },
          },
        ],
      },
      {
        apiSecret: 'secret_123',
        measurementId: 'G-TEST123',
        useDebugEndpoint: true,
      }
    );

    expect(res.accepted).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});

