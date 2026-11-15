import { describe, it, expect } from 'vitest';
import {
  GA4StreamEventPayload,
  generateWebClientId
} from '@/marketplace-activity-engine/contracts/ga4-contracts';
import { GA4LocationAdapter } from '@/marketplace-activity-engine/adapters/ga4-location-adapter';

describe('T22: Google Analytics 4 Measurement Protocol Debug API Lead Validation', () => {
  const measurementId = process.env.GA4_TEST_MEASUREMENT_ID || 'G-YV6C8Q312S';
  const apiSecret = process.env.GA4_TEST_API_SECRET;

  it('validates 6 canonical lead events and user_location against Google Debug API', async () => {
    if (!apiSecret) {
      console.warn('Skipping Google Debug API live test: GA4_TEST_API_SECRET not present in env');
      return;
    }

    const testClientId = generateWebClientId('test_lead_merchant_01', 1730000000);
    const userLocation = GA4LocationAdapter.toGA4Location({
      city: 'Mombasa',
      county: 'Mombasa County'
    });

    const payload: GA4StreamEventPayload = {
      client_id: testClientId,
      user_location: userLocation,
      events: [
        {
          name: 'generate_lead',
          params: {
            currency: 'KES',
            value: 15000,
            lead_source: 'facebook_cpc',
            lead_type: 'vendor_onboarding',
            is_synthetic: 1
          }
        },
        {
          name: 'working_lead',
          params: {
            currency: 'KES',
            value: 15000,
            is_synthetic: 1
          }
        },
        {
          name: 'qualify_lead',
          params: {
            currency: 'KES',
            value: 15000,
            lead_status: 'verified_merchant',
            is_synthetic: 1
          }
        },
        {
          name: 'close_convert_lead',
          params: {
            currency: 'KES',
            value: 50000,
            is_synthetic: 1
          }
        }
      ]
    };

    const debugUrl = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
    const response = await fetch(debugUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.validationMessages).toBeDefined();
    // Invariant: 0 validation messages from Google
    expect(data.validationMessages.length).toBe(0);
  });

  it('validates disqualify_lead with standard reason against Google Debug API', async () => {
    if (!apiSecret) {
      console.warn('Skipping Google Debug API live test: GA4_TEST_API_SECRET not present in env');
      return;
    }

    const testClientId = generateWebClientId('test_disq_merchant_02', 1730000000);
    const userLocation = GA4LocationAdapter.toGA4Location({
      city: 'Nairobi',
      county: 'Nairobi County'
    });

    const payload: GA4StreamEventPayload = {
      client_id: testClientId,
      user_location: userLocation,
      events: [
        {
          name: 'disqualify_lead',
          params: {
            disqualified_lead_reason: 'failed_business_kyc',
            lead_source: 'google_cpc',
            is_synthetic: 1
          }
        }
      ]
    };

    const debugUrl = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
    const response = await fetch(debugUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.validationMessages.length).toBe(0);
  });
});
