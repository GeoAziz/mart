import { dispatchGA4EventBatch } from '@/lib/analytics-server';
import { generateWebClientId } from '@/marketplace-activity-engine/contracts/ga4-contracts';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runDiverseMarketplaceSimulation() {
  const measurementId = process.env.GA4_TEST_MEASUREMENT_ID || 'G-YV6C8Q312S';
  const apiSecret = process.env.GA4_TEST_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.error('Missing credentials');
    process.exit(1);
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // 5 Distinct Synthetic Users with Unique Client IDs, Traffic Sources, and Journeys
  const users = [
    {
      actorId: 'cust_sim_0001',
      name: 'Brian (Nairobi Tech Shopper)',
      clientId: generateWebClientId('cust_sim_0001', 1730000001),
      sessionId: nowSec,
      source: 'google',
      medium: 'organic',
      campaign: 'organic_search',
      events: [
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/',
            page_title: 'ZilaCart Kenya - Online Shopping Marketplace',
            page_referrer: 'https://www.google.com/',
            source: 'google',
            medium: 'organic',
            session_id: nowSec,
            engagement_time_msec: 3200,
          },
        },
        {
          name: 'search',
          params: {
            search_term: 'gaming laptop',
            session_id: nowSec,
            engagement_time_msec: 1400,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/categories/electronics',
            page_title: 'Electronics & Computers - ZilaCart',
            page_referrer: 'https://staging.zilacart.io/',
            session_id: nowSec,
            engagement_time_msec: 4100,
          },
        },
        {
          name: 'view_item_list',
          params: {
            item_list_name: 'Electronics Catalog',
            items: [{ item_id: 'prod_lap_01', item_name: 'Sim Laptop Pro 15"', price: 80000, quantity: 1, vendor_id: 'vend_sim_0001' }],
            session_id: nowSec,
            engagement_time_msec: 2000,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/products/prod_lap_01',
            page_title: 'Sim Laptop Pro 15" - Sim Tech Nairobi',
            page_referrer: 'https://staging.zilacart.io/categories/electronics',
            session_id: nowSec,
            engagement_time_msec: 6500,
          },
        },
        {
          name: 'view_item',
          params: {
            currency: 'KES',
            value: 80000,
            items: [{ item_id: 'prod_lap_01', item_name: 'Sim Laptop Pro 15"', price: 80000, quantity: 1, vendor_id: 'vend_sim_0001' }],
            session_id: nowSec,
            engagement_time_msec: 2000,
          },
        },
        {
          name: 'add_to_cart',
          params: {
            currency: 'KES',
            value: 80000,
            items: [{ item_id: 'prod_lap_01', item_name: 'Sim Laptop Pro 15"', price: 80000, quantity: 1, vendor_id: 'vend_sim_0001' }],
            session_id: nowSec,
            engagement_time_msec: 1200,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/checkout',
            page_title: 'Checkout Wizard - ZilaCart',
            page_referrer: 'https://staging.zilacart.io/cart',
            session_id: nowSec,
            engagement_time_msec: 5000,
          },
        },
        {
          name: 'begin_checkout',
          params: {
            currency: 'KES',
            value: 80000,
            items: [{ item_id: 'prod_lap_01', item_name: 'Sim Laptop Pro 15"', price: 80000, quantity: 1, vendor_id: 'vend_sim_0001' }],
            session_id: nowSec,
            engagement_time_msec: 2000,
          },
        },
        {
          name: 'purchase',
          params: {
            transaction_id: 'ORD_NAIROBI_' + nowSec,
            value: 80000,
            currency: 'KES',
            shipping: 500,
            tax: 0,
            payment_method: 'mpesa',
            shipping_county: 'Nairobi',
            items: [{ item_id: 'prod_lap_01', item_name: 'Sim Laptop Pro 15"', price: 80000, quantity: 1, vendor_id: 'vend_sim_0001' }],
            session_id: nowSec,
            engagement_time_msec: 3500,
          },
        },
      ],
    },
    {
      actorId: 'cust_sim_0002',
      name: 'Amina (Mombasa Promotion Shopper)',
      clientId: generateWebClientId('cust_sim_0002', 1730000002),
      sessionId: nowSec + 1,
      source: 'facebook',
      medium: 'cpc',
      campaign: 'nairobi_super_deals',
      events: [
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/?utm_source=facebook&utm_medium=cpc&utm_campaign=nairobi_super_deals',
            page_title: 'ZilaCart - Super Deals Week',
            page_referrer: 'https://m.facebook.com/',
            source: 'facebook',
            medium: 'cpc',
            campaign: 'nairobi_super_deals',
            session_id: nowSec + 1,
            engagement_time_msec: 2800,
          },
        },
        {
          name: 'view_promotion',
          params: {
            promotion_id: 'promo_super_deals',
            promotion_name: 'Nairobi Super Deals Week',
            creative_slot: 'hero_carousel',
            session_id: nowSec + 1,
            engagement_time_msec: 1500,
          },
        },
        {
          name: 'select_promotion',
          params: {
            promotion_id: 'promo_super_deals',
            promotion_name: 'Nairobi Super Deals Week',
            creative_slot: 'hero_carousel',
            session_id: nowSec + 1,
            engagement_time_msec: 900,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/products/prod_ear_02',
            page_title: 'Sim Wireless Earbuds - Sim Rift Audio',
            page_referrer: 'https://staging.zilacart.io/',
            session_id: nowSec + 1,
            engagement_time_msec: 5200,
          },
        },
        {
          name: 'view_item',
          params: {
            currency: 'KES',
            value: 5000,
            items: [{ item_id: 'prod_ear_02', item_name: 'Sim Wireless Earbuds', price: 5000, quantity: 1, vendor_id: 'vend_sim_0002' }],
            session_id: nowSec + 1,
            engagement_time_msec: 2100,
          },
        },
        {
          name: 'add_to_cart',
          params: {
            currency: 'KES',
            value: 5000,
            items: [{ item_id: 'prod_ear_02', item_name: 'Sim Wireless Earbuds', price: 5000, quantity: 1, vendor_id: 'vend_sim_0002' }],
            session_id: nowSec + 1,
            engagement_time_msec: 1400,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/cart',
            page_title: 'Your Shopping Cart - ZilaCart',
            page_referrer: 'https://staging.zilacart.io/products/prod_ear_02',
            session_id: nowSec + 1,
            engagement_time_msec: 3000,
          },
        },
      ],
    },
    {
      actorId: 'cust_sim_0003',
      name: 'Kevin (Kisumu Vendor Explorer)',
      clientId: generateWebClientId('cust_sim_0003', 1730000003),
      sessionId: nowSec + 2,
      source: 'direct',
      medium: 'none',
      campaign: '(direct)',
      events: [
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/store/vend_sim_0001',
            page_title: 'Sim Tech Electronics Nairobi - Official Store',
            page_referrer: 'https://staging.zilacart.io/',
            session_id: nowSec + 2,
            engagement_time_msec: 4500,
          },
        },
        {
          name: 'view_item_list',
          params: {
            item_list_name: 'Vendor Store Catalog',
            items: [{ item_id: 'prod_sim_tv', item_name: 'Sim 4K Smart TV 55"', price: 42000, quantity: 1, vendor_id: 'vend_sim_0001' }],
            session_id: nowSec + 2,
            engagement_time_msec: 2200,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/products/prod_sim_tv',
            page_title: 'Sim 4K Smart TV 55" - ZilaCart',
            page_referrer: 'https://staging.zilacart.io/store/vend_sim_0001',
            session_id: nowSec + 2,
            engagement_time_msec: 6100,
          },
        },
        {
          name: 'add_to_wishlist',
          params: {
            currency: 'KES',
            value: 42000,
            items: [{ item_id: 'prod_sim_tv', item_name: 'Sim 4K Smart TV 55"', price: 42000, quantity: 1, vendor_id: 'vend_sim_0001' }],
            session_id: nowSec + 2,
            engagement_time_msec: 1800,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/account/wishlist',
            page_title: 'My Wishlist - ZilaCart Customer Account',
            page_referrer: 'https://staging.zilacart.io/products/prod_sim_tv',
            session_id: nowSec + 2,
            engagement_time_msec: 3200,
          },
        },
      ],
    },
    {
      actorId: 'cust_sim_0004',
      name: 'Wanjiku (Nakuru Info & Shipping Explorer)',
      clientId: generateWebClientId('cust_sim_0004', 1730000004),
      sessionId: nowSec + 3,
      source: 'twitter',
      medium: 'social',
      campaign: 'community_promo',
      events: [
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/shipping',
            page_title: 'Shipping & Delivery Across Kenya - ZilaCart',
            page_referrer: 'https://t.co/',
            source: 'twitter',
            medium: 'social',
            session_id: nowSec + 3,
            engagement_time_msec: 5400,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/help',
            page_title: 'Help Center & FAQs - ZilaCart',
            page_referrer: 'https://staging.zilacart.io/shipping',
            session_id: nowSec + 3,
            engagement_time_msec: 4200,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/about',
            page_title: 'About ZilaCart Marketplace',
            page_referrer: 'https://staging.zilacart.io/help',
            session_id: nowSec + 3,
            engagement_time_msec: 3800,
          },
        },
      ],
    },
    {
      actorId: 'cust_sim_0005',
      name: 'Dennis (Eldoret Returning Order & History)',
      clientId: generateWebClientId('cust_sim_0005', 1730000005),
      sessionId: nowSec + 4,
      source: 'email',
      medium: 'newsletter',
      campaign: 'weekly_recap',
      events: [
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/account/orders',
            page_title: 'My Orders & Purchase History - ZilaCart',
            page_referrer: 'https://mail.google.com/',
            source: 'email',
            medium: 'newsletter',
            session_id: nowSec + 4,
            engagement_time_msec: 4100,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/products/prod_shoes_01',
            page_title: 'Men Running Shoes - ZilaCart Fashion',
            page_referrer: 'https://staging.zilacart.io/account/orders',
            session_id: nowSec + 4,
            engagement_time_msec: 3900,
          },
        },
        {
          name: 'view_item',
          params: {
            currency: 'KES',
            value: 4500,
            items: [{ item_id: 'prod_shoes_01', item_name: 'Men Running Shoes', price: 4500, quantity: 1, vendor_id: 'vend_sim_0003' }],
            session_id: nowSec + 4,
            engagement_time_msec: 1500,
          },
        },
        {
          name: 'add_to_cart',
          params: {
            currency: 'KES',
            value: 4500,
            items: [{ item_id: 'prod_shoes_01', item_name: 'Men Running Shoes', price: 4500, quantity: 1, vendor_id: 'vend_sim_0003' }],
            session_id: nowSec + 4,
            engagement_time_msec: 1200,
          },
        },
        {
          name: 'page_view',
          params: {
            page_location: 'https://staging.zilacart.io/checkout',
            page_title: 'Checkout - ZilaCart',
            page_referrer: 'https://staging.zilacart.io/cart',
            session_id: nowSec + 4,
            engagement_time_msec: 4800,
          },
        },
        {
          name: 'begin_checkout',
          params: {
            currency: 'KES',
            value: 4500,
            items: [{ item_id: 'prod_shoes_01', item_name: 'Men Running Shoes', price: 4500, quantity: 1, vendor_id: 'vend_sim_0003' }],
            session_id: nowSec + 4,
            engagement_time_msec: 2100,
          },
        },
        {
          name: 'purchase',
          params: {
            transaction_id: 'ORD_ELDORET_' + nowSec,
            value: 4500,
            currency: 'KES',
            shipping: 300,
            tax: 0,
            payment_method: 'card',
            shipping_county: 'Uasin Gishu',
            items: [{ item_id: 'prod_shoes_01', item_name: 'Men Running Shoes', price: 4500, quantity: 1, vendor_id: 'vend_sim_0003' }],
            session_id: nowSec + 4,
            engagement_time_msec: 3200,
          },
        },
      ],
    },
  ];

  console.log(`Dispatching diverse multi-user marketplace simulation (${users.length} distinct users)...`);

  for (const user of users) {
    console.log(`\n--- User: ${user.name} (${user.actorId}) ---`);
    console.log(`Client ID: ${user.clientId} | Channel: ${user.source} / ${user.medium}`);
    console.log(`Events: ${user.events.map((e) => e.name).join(' -> ')}`);

    const payload = {
      client_id: user.clientId,
      user_id: `sim_uid_${user.actorId}`,
      events: user.events,
    };

    const res = await dispatchGA4EventBatch(payload as any, {
      measurementId,
      apiSecret,
      useDebugEndpoint: false,
    });

    console.log(`Result: HTTP ${res.statusCode} ${res.accepted ? 'ACCEPTED' : 'REJECTED'}`);
  }

  console.log('\n======================================================');
  console.log('✅ ALL 5 DISTINCT USERS & ALL PAGES DISPATCHED TO GA4!');
  console.log('======================================================');
}

runDiverseMarketplaceSimulation();
