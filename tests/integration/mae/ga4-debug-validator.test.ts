import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchGA4EventBatch } from '@/lib/analytics-server';
import {
  generateWebClientId,
  GA4StandardItem,
} from '@/marketplace-activity-engine/contracts/ga4-contracts';

describe('Google Analytics 4 Debug API Validation Suite (Layer 2 / Gate D)', () => {
  const measurementId = process.env.GA4_TEST_MEASUREMENT_ID || 'G-YV6C8Q312S';
  const apiSecret = process.env.GA4_TEST_API_SECRET || 'V2OdEtT8TEio0mnlh3p-Iw';
  const validClientId = generateWebClientId('test_cust_debug_01');

  it('validates a complete full-funnel e-commerce payload through Google debug endpoint with zero errors', async () => {
    const testItems: GA4StandardItem[] = [
      {
        item_id: 'prod_test_01',
        item_name: 'Sim Wireless Earbuds',
        price: 2500,
        quantity: 1,
        item_category: 'audio',
        vendor_id: 'vend_sim_0001',
        affiliation: 'Sim Audio Mombasa',
      },
    ];

    const payload = {
      client_id: validClientId,
      user_id: 'sim_uid_debug_01',
      events: [
        {
          name: 'view_item_list',
          params: {
            item_list_name: 'Marketplace Deals',
            items: testItems,
          },
        },
        {
          name: 'view_item',
          params: {
            currency: 'KES',
            value: 2500,
            items: testItems,
          },
        },
        {
          name: 'add_to_cart',
          params: {
            currency: 'KES',
            value: 2500,
            items: testItems,
          },
        },
        {
          name: 'begin_checkout',
          params: {
            currency: 'KES',
            value: 2500,
            items: testItems,
          },
        },
        {
          name: 'purchase',
          params: {
            transaction_id: 'TX_DEBUG_KAT_' + Date.now(),
            value: 2500,
            currency: 'KES',
            items: testItems,
          },
        },
      ],
    };

    // Dispatch to official debug validator
    const result = await dispatchGA4EventBatch(payload as any, {
      measurementId,
      apiSecret,
      useDebugEndpoint: true,
    });

    expect(result.statusCode).toBe(200);
    expect(result.accepted).toBe(true);
    expect(result.validationMessages || []).toHaveLength(0);
  });

  it('validates partial refund payload with Google debug validator', async () => {
    const refundPayload = {
      client_id: validClientId,
      user_id: 'sim_uid_debug_01',
      events: [
        {
          name: 'refund',
          params: {
            transaction_id: 'TX_DEBUG_KAT_PARENT',
            value: 2500,
            currency: 'KES',
            items: [
              {
                item_id: 'prod_test_01',
                item_name: 'Sim Wireless Earbuds',
                price: 2500,
                quantity: 1,
                vendor_id: 'vend_sim_0001',
              },
            ],
          },
        },
      ],
    };

    const result = await dispatchGA4EventBatch(refundPayload as any, {
      measurementId,
      apiSecret,
      useDebugEndpoint: true,
    });

    expect(result.statusCode).toBe(200);
    expect(result.accepted).toBe(true);
    expect(result.validationMessages || []).toHaveLength(0);
  });
});
