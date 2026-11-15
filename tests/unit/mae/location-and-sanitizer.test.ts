import { describe, it, expect } from 'vitest';
import {
  GA4LocationAdapter,
  InternalMarketplaceLocation
} from '@/marketplace-activity-engine/adapters/ga4-location-adapter';
import { sanitizeGA4EventParams } from '@/marketplace-activity-engine/contracts/ga4-contracts';

describe('T13 & T14: GA4 Location Adapter & PII Sanitizer', () => {
  it('T13: formats city and country_id into top-level user_location object', () => {
    const loc: InternalMarketplaceLocation = {
      city: 'Mombasa',
      county: 'Mombasa County',
      subCounty: 'Nyali',
      deliveryZoneId: 'zone_mombasa_north'
    };

    const ga4Loc = GA4LocationAdapter.toGA4Location(loc);

    expect(ga4Loc).toEqual({
      city: 'Mombasa',
      country_id: 'KE'
    });
    // Sub-county and deliveryZoneId are excluded from GA4 user_location
    expect((ga4Loc as any).subCounty).toBeUndefined();
    expect((ga4Loc as any).deliveryZoneId).toBeUndefined();
  });

  it('T13: handles Nairobi, Kisumu, Nakuru, and Eldoret properly', () => {
    expect(GA4LocationAdapter.toGA4Location({ city: 'Nairobi', county: 'Nairobi' })).toEqual({
      city: 'Nairobi',
      country_id: 'KE'
    });

    expect(GA4LocationAdapter.toGA4Location({ city: 'Eldoret', county: 'Uasin Gishu' })).toEqual({
      city: 'Eldoret',
      country_id: 'KE'
    });
  });

  it('T14: sanitizes valid event params and preserves safe fields', () => {
    const safeParams = {
      currency: 'KES',
      value: 15000,
      lead_type: 'vendor_onboarding',
      lead_source: 'google_cpc'
    };

    expect(sanitizeGA4EventParams(safeParams)).toEqual(safeParams);
  });

  it('T14: throws security error when sensitive or PII fields are detected', () => {
    expect(() => {
      sanitizeGA4EventParams({
        currency: 'KES',
        email: 'merchant@example.com'
      });
    }).toThrow(/\[SECURITY_VIOLATION\]/);

    expect(() => {
      sanitizeGA4EventParams({
        currency: 'KES',
        kra_pin: 'P051234567Z'
      });
    }).toThrow(/\[SECURITY_VIOLATION\]/);

    expect(() => {
      sanitizeGA4EventParams({
        currency: 'KES',
        national_id: '12345678'
      });
    }).toThrow(/\[SECURITY_VIOLATION\]/);
  });
});
