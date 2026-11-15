import { dispatchGA4EventBatch } from '@/lib/analytics-server';
import { generateWebClientId } from '@/marketplace-activity-engine/contracts/ga4-contracts';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function backfillHistoricalDriveSales() {
  const measurementId = process.env.GA4_TEST_MEASUREMENT_ID || 'G-YV6C8Q312S';
  const apiSecret = process.env.GA4_TEST_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.error('Missing credentials');
    process.exit(1);
  }

  const nowMs = Date.now();
  console.log('======================================================');
  console.log('Backfilling GA4 Drive Sales & E-Commerce Revenue');
  console.log('Target Stream:', measurementId);
  console.log('Time Horizon: Past 48-72 hours within Google MP limits');
  console.log('======================================================');

  // We backfill 3 distinct historical days:
  // Day 1: 48 hours ago
  // Day 2: 24 hours ago
  // Day 3: 6 hours ago
  const days = [
    {
      label: '48 Hours Ago (Day -2)',
      offsetHours: 48,
      orders: [
        {
          customerId: 'cust_sim_0001',
          source: 'google',
          medium: 'organic',
          txId: 'ORD_HIST_D2_001',
          items: [
            { item_id: 'prod_lap_01', item_name: 'Sim Laptop Pro 15"', price: 80000, quantity: 1, item_category: 'electronics', affiliation: 'Sim Tech Nairobi', vendor_id: 'vend_sim_0001' },
          ],
          value: 80000,
          shipping: 500,
        },
        {
          customerId: 'cust_sim_0002',
          source: 'facebook',
          medium: 'cpc',
          txId: 'ORD_HIST_D2_002',
          items: [
            { item_id: 'prod_ear_02', item_name: 'Sim Wireless Earbuds', price: 5000, quantity: 2, item_category: 'audio', affiliation: 'Sim Audio Mombasa', vendor_id: 'vend_sim_0002' },
          ],
          value: 10000,
          shipping: 300,
        },
      ],
    },
    {
      label: '24 Hours Ago (Day -1)',
      offsetHours: 24,
      orders: [
        {
          customerId: 'cust_sim_0003',
          source: 'direct',
          medium: 'none',
          txId: 'ORD_HIST_D1_001',
          items: [
            { item_id: 'prod_sim_tv', item_name: 'Sim 4K Smart TV 55"', price: 42000, quantity: 1, item_category: 'electronics', affiliation: 'Sim Tech Nairobi', vendor_id: 'vend_sim_0001' },
            { item_id: 'prod_ear_02', item_name: 'Sim Wireless Earbuds', price: 5000, quantity: 1, item_category: 'audio', affiliation: 'Sim Audio Mombasa', vendor_id: 'vend_sim_0002' },
          ],
          value: 47000,
          shipping: 600,
        },
        {
          customerId: 'cust_sim_0004',
          source: 'google',
          medium: 'cpc',
          txId: 'ORD_HIST_D1_002',
          items: [
            { item_id: 'prod_shoes_01', item_name: 'Men Running Shoes', price: 4500, quantity: 2, item_category: 'fashion', affiliation: 'Sim Coastal Fashion', vendor_id: 'vend_sim_0003' },
          ],
          value: 9000,
          shipping: 350,
        },
      ],
    },
    {
      label: '6 Hours Ago (Today)',
      offsetHours: 6,
      orders: [
        {
          customerId: 'cust_sim_0005',
          source: 'email',
          medium: 'newsletter',
          txId: 'ORD_HIST_D0_001',
          items: [
            { item_id: 'prod_lap_01', item_name: 'Sim Laptop Pro 15"', price: 80000, quantity: 1, item_category: 'electronics', affiliation: 'Sim Tech Nairobi', vendor_id: 'vend_sim_0001' },
            { item_id: 'prod_sim_tv', item_name: 'Sim 4K Smart TV 55"', price: 42000, quantity: 1, item_category: 'electronics', affiliation: 'Sim Tech Nairobi', vendor_id: 'vend_sim_0001' },
          ],
          value: 122000,
          shipping: 800,
        },
      ],
    },
  ];

  for (const day of days) {
    const historicalTimeMs = nowMs - day.offsetHours * 3600 * 1000;
    const historicalTimeMicros = historicalTimeMs * 1000;
    const historicalSessionSec = Math.floor(historicalTimeMs / 1000);

    console.log(`\n--- Dispatching: ${day.label} (${new Date(historicalTimeMs).toISOString()}) ---`);

    for (const order of day.orders) {
      const clientId = generateWebClientId(order.customerId, historicalSessionSec);

      const payload = {
        client_id: clientId,
        user_id: `sim_uid_${order.customerId}`,
        timestamp_micros: historicalTimeMicros,
        events: [
          {
            name: 'page_view',
            params: {
              page_location: 'https://staging.zilacart.io/products/' + order.items[0].item_id,
              page_title: order.items[0].item_name + ' - ZilaCart',
              page_referrer: 'https://staging.zilacart.io/',
              source: order.source,
              medium: order.medium,
              session_id: historicalSessionSec,
              engagement_time_msec: 4500,
            },
          },
          {
            name: 'view_item',
            params: {
              currency: 'KES',
              value: order.items[0].price,
              items: [order.items[0]],
              session_id: historicalSessionSec,
              engagement_time_msec: 2000,
            },
          },
          {
            name: 'add_to_cart',
            params: {
              currency: 'KES',
              value: order.value,
              items: order.items,
              session_id: historicalSessionSec,
              engagement_time_msec: 1200,
            },
          },
          {
            name: 'begin_checkout',
            params: {
              currency: 'KES',
              value: order.value,
              items: order.items,
              session_id: historicalSessionSec,
              engagement_time_msec: 2800,
            },
          },
          {
            name: 'purchase',
            params: {
              transaction_id: order.txId,
              value: order.value,
              currency: 'KES',
              shipping: order.shipping,
              tax: 0,
              payment_method: 'simulated_mpesa',
              shipping_county: 'Nairobi',
              items: order.items,
              is_synthetic: 1,
              session_id: historicalSessionSec,
              engagement_time_msec: 4000,
            },
          },
        ],
      };

      const res = await dispatchGA4EventBatch(payload as any, {
        measurementId,
        apiSecret,
        useDebugEndpoint: false,
      });

      console.log(`Order ${order.txId}: KES ${order.value.toLocaleString()} [${order.source}/${order.medium}] -> HTTP ${res.statusCode} ${res.accepted ? 'ACCEPTED' : 'REJECTED'}`);
    }
  }

  console.log('\n======================================================');
  console.log('HISTORICAL BACKFILL DISPATCHED SUCCESSFULLY');
  console.log('======================================================');
}

backfillHistoricalDriveSales();
