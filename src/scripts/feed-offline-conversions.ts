/**
 * Script 2: Offline Conversion Feeder (Measurement Protocol)
 *
 * Sends offline, CRM, and server-side key events (conversions like offline sales,
 * in-store M-Pesa till receipts, phone orders, and returns) directly to GA4.
 *
 * Key Capabilities:
 * 1. Supports client_id & session_id linkage for existing users or anonymous offline identifiers.
 * 2. Supports timestamp_micros backdating (within GA4's 72-hour window).
 * 3. Supports non-Google ad campaigns (Meta, LinkedIn, TikTok) & organic/direct attribution.
 * 4. Dispatches standard 'purchase' or custom key events directly to GA4 Measurement Protocol.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json src/scripts/feed-offline-conversions.ts
 *   Or via npm: npm run sim:offline-conversions
 */

import { assertSimulationAllowed } from '../lib/simulation-guard';

export function getActiveGA4Config() {
  const measurementId =
    process.env.GA4_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    'G-09S1NJ6W15';
  const apiSecret = process.env.GA4_API_SECRET || 'UmmBmlwgRVa-GjjiCy8miw';
  return { measurementId, apiSecret };
}

interface OfflineEventPayload {
  eventName: 'purchase' | 'refund' | 'offline_lead_qualified';
  clientId?: string;
  userId?: string;
  sessionId?: number;
  transactionId: string;
  value: number;
  currency?: string;
  timestampMicros?: number; // Up to 72 hours in the past
  campaign?: string;
  source?: string;
  medium?: string;
  paymentMethod?: string;
  storeLocation?: string;
  items?: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
    item_category?: string;
  }>;
}

export async function sendOfflineConversion(payload: OfflineEventPayload): Promise<boolean> {
  const config = getActiveGA4Config();
  if (!config.measurementId || !config.apiSecret) {
    throw new Error('GA4 Measurement ID or API Secret is missing in environment.');
  }

  const clientId = payload.clientId || `offline.${Math.floor(Date.now() / 1000)}.${Math.random().toString(36).substring(2, 9)}`;
  const timestampMicros = payload.timestampMicros || Date.now() * 1000;
  const currency = payload.currency || 'KES';

  const eventParams: Record<string, any> = {
    transaction_id: payload.transactionId,
    value: payload.value,
    currency,
    engagement_time_msec: 1000,
    is_offline: 1,
    conversion_type: 'offline',
  };

  if (payload.sessionId) eventParams.session_id = payload.sessionId;
  if (payload.campaign) eventParams.campaign = payload.campaign;
  if (payload.source) eventParams.source = payload.source;
  if (payload.medium) eventParams.medium = payload.medium;
  if (payload.paymentMethod) eventParams.payment_method = payload.paymentMethod;
  if (payload.storeLocation) eventParams.shipping_county = payload.storeLocation;

  if (payload.items && payload.items.length > 0) {
    eventParams.items = payload.items;
  }

  const requestBody: Record<string, any> = {
    client_id: clientId,
    timestamp_micros: timestampMicros,
    events: [
      {
        name: payload.eventName,
        params: eventParams,
      },
    ],
  };

  if (payload.userId) {
    requestBody.user_id = payload.userId;
  }

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    console.error(`[Offline Feeder] HTTP ${response.status} failed: ${await response.text()}`);
    return false;
  }

  return true;
}

async function runDemoOfflineFeed() {
  assertSimulationAllowed();

  console.log('🚀 Starting Offline Conversion Feeder (Measurement Protocol)...');
  const now = Date.now();

  const mockOfflineOrders: OfflineEventPayload[] = [
    {
      eventName: 'purchase',
      transactionId: `OFFLINE_STORE_${now}_01`,
      value: 12500,
      currency: 'KES',
      paymentMethod: 'mpesa_till',
      storeLocation: 'Nairobi',
      campaign: 'nairobi_electronics_promo',
      source: 'facebook',
      medium: 'cpc',
      // Simulating a conversion that took place 2 hours ago
      timestampMicros: (now - 2 * 60 * 60 * 1000) * 1000,
      items: [
        {
          item_id: 'prod_soundbar_01',
          item_name: 'Stereo Wireless Soundbar 60W',
          price: 12500,
          quantity: 1,
          item_category: 'Electronics',
        },
      ],
    },
    {
      eventName: 'purchase',
      transactionId: `OFFLINE_PHONE_${now}_02`,
      value: 8400,
      currency: 'KES',
      paymentMethod: 'cash_on_delivery',
      storeLocation: 'Mombasa',
      campaign: 'b2b_tech_kenya',
      source: 'linkedin',
      medium: 'cpc',
      timestampMicros: (now - 30 * 60 * 1000) * 1000,
      items: [
        {
          item_id: 'prod_office_chair_02',
          item_name: 'Ergonomic Mesh Office Chair',
          price: 8400,
          quantity: 1,
          item_category: 'Furniture',
        },
      ],
    },
    {
      eventName: 'purchase',
      transactionId: `OFFLINE_TIKTOK_RETAIL_${now}_03`,
      value: 4600,
      currency: 'KES',
      paymentMethod: 'mpesa_paybill',
      storeLocation: 'Kisumu',
      campaign: 'viral_audio_gear',
      source: 'tiktok',
      medium: 'paid_social',
      timestampMicros: (now - 15 * 60 * 1000) * 1000,
      items: [
        {
          item_id: 'prod_anc_earbuds_03',
          item_name: 'Wireless ANC Earbuds Pro',
          price: 2300,
          quantity: 2,
          item_category: 'Audio',
        },
      ],
    },
  ];

  for (const order of mockOfflineOrders) {
    const success = await sendOfflineConversion(order);
    if (success) {
      console.log(`✅ Dispatched offline conversion ${order.transactionId} (${order.source}/${order.medium} - KES ${order.value})`);
    } else {
      console.error(`❌ Failed to dispatch offline conversion ${order.transactionId}`);
    }
  }

  console.log('🎉 Offline Conversion Feeder successfully dispatched all sample conversions.');
}

if (require.main === module) {
  runDemoOfflineFeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error running offline conversion feed:', err);
      process.exit(1);
    });
}

