import { describe, it, expect } from 'vitest';
import {
  generateWebClientId,
  isValidWebClientId,
  GA4StandardItem,
  GA4PurchaseParams,
} from '@/marketplace-activity-engine/contracts/ga4-contracts';

describe('GA4 Contracts & Identity Specification (v4.1)', () => {
  it('generates compliant Web client_id format (<uint32>.<epoch>)', () => {
    const clientId = generateWebClientId('cust_sim_0001', 1730000000);
    expect(isValidWebClientId(clientId)).toBe(true);

    const parts = clientId.split('.');
    expect(parts).toHaveLength(2);
    const [uint32Str, epochStr] = parts;
    const uint32 = Number(uint32Str);
    const epoch = Number(epochStr);

    expect(uint32).toBeGreaterThanOrEqual(0);
    expect(uint32).toBeLessThanOrEqual(4294967295);
    expect(epoch).toBe(1730000000);
  });

  it('rejects malformed client_id formats', () => {
    expect(isValidWebClientId('sim_client_9b8a7c1e.1730000000')).toBe(false);
    expect(isValidWebClientId('')).toBe(false);
    expect(isValidWebClientId('12345')).toBe(false);
    expect(isValidWebClientId('abc.def')).toBe(false);
  });

  it('validates multi-vendor purchase payload structures', () => {
    const items: GA4StandardItem[] = [
      {
        item_id: 'prod_sim_001',
        item_name: 'Sim Laptop Pro',
        price: 80000,
        quantity: 1,
        vendor_id: 'vend_sim_0001',
        affiliation: 'Sim Tech Nairobi',
      },
      {
        item_id: 'prod_sim_002',
        item_name: 'Sim Earbuds',
        price: 5000,
        quantity: 2,
        vendor_id: 'vend_sim_0002',
        affiliation: 'Sim Audio Mombasa',
      },
    ];

    const purchase: GA4PurchaseParams = {
      transaction_id: 'ord_multivendor_01',
      value: 80000 * 1 + 5000 * 2, // 90000
      currency: 'KES',
      shipping: 500,
      tax: 0,
      items,
      is_synthetic: 1,
    };

    expect(purchase.value).toBe(90000);
    expect(purchase.currency).toBe('KES');
    expect(purchase.items).toHaveLength(2);
    expect(purchase.items[0].vendor_id).toBe('vend_sim_0001');
    expect(purchase.items[1].vendor_id).toBe('vend_sim_0002');
  });
});
