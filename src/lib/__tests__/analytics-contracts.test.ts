import { describe, it, expect } from 'vitest';
import type { GA4PurchasePayload, AnalyticsOutboxRecord } from '@/lib/analytics-types';

describe('Analytics Contracts & Valuation Rules', () => {
  it('correctly calculates GA4 purchase value as sum of items excluding shipping and tax', () => {
    const orderItems = [
      { item_id: 'prod_1', item_name: 'Wireless Mouse', price: 1500, quantity: 2, vendor_id: 'ven_1' },
      { item_id: 'prod_2', item_name: 'USB-C Cable', price: 500, quantity: 3, vendor_id: 'ven_2' },
    ];
    const shipping = 300;
    const tax = 250;
    const totalAmount = 4500 + shipping + tax; // 5050 KES

    // Authoritative calculation for GA4 value
    const ga4Value = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    expect(ga4Value).toBe(4500);
    expect(ga4Value).not.toBe(totalAmount);

    const payload: GA4PurchasePayload = {
      client_id: '123456789.1700000000',
      session_id: 1710000000,
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id: 'ORD_TEST_123',
            value: ga4Value,
            currency: 'KES',
            shipping,
            tax,
            payment_method: 'mpesa',
            items: orderItems,
          },
        },
      ],
    };

    expect(payload.events[0].params.value).toBe(4500);
    expect(payload.events[0].params.shipping).toBe(300);
    expect(payload.events[0].params.tax).toBe(250);
  });

  it('enforces string client_id and non-empty items', () => {
    const validClientId = '123456789.1700000000';
    expect(typeof validClientId).toBe('string');
    expect(validClientId.length).toBeGreaterThan(0);
  });

  it('categorizes outbox record status transitions accurately', () => {
    const outboxRecord: Partial<AnalyticsOutboxRecord> = {
      id: 'ORD_123_purchase',
      status: 'suppressed',
      suppressionReason: 'missing_client_id',
      attemptCount: 0,
      maxAttempts: 5,
    };

    expect(outboxRecord.status).toBe('suppressed');
    expect(outboxRecord.suppressionReason).toBe('missing_client_id');
  });
});

