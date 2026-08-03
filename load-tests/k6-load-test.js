import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const duration = new Trend('http_req_duration', { unit: 'ms' });
const reqRate = new Counter('http_requests_total');
const activeVUs = new Gauge('vus_active');

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 VUs
    { duration: '2m', target: 50 },    // Ramp up to 50 VUs
    { duration: '3m', target: 100 },   // Ramp up to 100 VUs
    { duration: '2m', target: 50 },    // Ramp down
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.1'],
    'errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
};

// Test data generators
function randomProductId() {
  return `prod_${Math.floor(Math.random() * 1000)}`;
}

function randomVendorId() {
  return `vendor_${Math.floor(Math.random() * 100)}`;
}

function randomUserId() {
  return `user_${Math.floor(Math.random() * 500)}`;
}

// Main test scenarios
export default function () {
  activeVUs.add(__VU);

  // Scenario 1: Browse Products (40% of traffic)
  if (__ITER % 10 < 4) {
    browseProducts();
  }
  // Scenario 2: Search Products (30% of traffic)
  else if (__ITER % 10 < 7) {
    searchProducts();
  }
  // Scenario 3: Vendor Upload Product (20% of traffic)
  else if (__ITER % 10 < 9) {
    vendorUploadProduct();
  }
  // Scenario 4: Place Order (10% of traffic)
  else {
    placeOrder();
  }

  sleep(1);
}

function browseProducts() {
  group('Browse Products', () => {
    const res = http.get(`${BASE_URL}/api/products?limit=20&offset=0`, { headers });

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has products': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
    reqRate.add(1);
    if (res.timings.duration) {
      duration.add(res.timings.duration);
    }
  });
}

function searchProducts() {
  group('Search Products', () => {
    const queries = ['laptop', 'phone', 'headphones', 'camera', 'gaming'];
    const query = queries[Math.floor(Math.random() * queries.length)];

    const res = http.get(`${BASE_URL}/api/search?q=${query}&limit=20`, { headers });

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
      'has results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.results !== undefined;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
    reqRate.add(1);
    if (res.timings.duration) {
      duration.add(res.timings.duration);
    }
  });
}

function vendorUploadProduct() {
  group('Vendor Upload Product', () => {
    const productData = {
      name: `Product ${__ITER}`,
      sku: `SKU-${__ITER}-${Date.now()}`,
      description: 'Test product description',
      price: Math.floor(Math.random() * 10000) + 1000,
      stock: Math.floor(Math.random() * 500) + 1,
      category: 'electronics',
      images: ['https://example.com/image.jpg'],
    };

    const res = http.post(
      `${BASE_URL}/api/vendors/me/products`,
      JSON.stringify(productData),
      { headers }
    );

    const success = check(res, {
      'status is 201': (r) => r.status === 201,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
      'has product id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
    reqRate.add(1);
    if (res.timings.duration) {
      duration.add(res.timings.duration);
    }
  });
}

function placeOrder() {
  group('Place Order', () => {
    const orderData = {
      items: [
        {
          productId: randomProductId(),
          quantity: Math.floor(Math.random() * 5) + 1,
          price: Math.floor(Math.random() * 10000) + 1000,
        },
      ],
      shippingAddress: {
        street: '123 Main St',
        city: 'Nairobi',
        state: 'NRB',
        postalCode: '00100',
        country: 'KE',
      },
      paymentMethod: 'stripe',
    };

    const res = http.post(
      `${BASE_URL}/api/orders`,
      JSON.stringify(orderData),
      { headers }
    );

    const success = check(res, {
      'status is 201': (r) => r.status === 201,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
      'has order id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
    reqRate.add(1);
    if (res.timings.duration) {
      duration.add(res.timings.duration);
    }
  });
}

// Teardown - print summary
export function teardown() {
  group('Summary', () => {
    check(true, {
      'Total requests': () => reqRate.value > 0,
      'Error rate < 5%': () => errorRate.value < 0.05,
    });
  });
}
