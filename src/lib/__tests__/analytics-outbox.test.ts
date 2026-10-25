import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebase-admin', () => ({
  firestoreAdmin: {},
  db: {},
}));

vi.mock('firebase-admin', () => ({
  default: {
    firestore: {
      Timestamp: {
        now: () => ({ seconds: 1700000000, nanoseconds: 0 }),
      },
      FieldValue: {
        serverTimestamp: () => ({ _methodName: 'serverTimestamp' }),
        arrayUnion: (...args: any[]) => ({ _methodName: 'arrayUnion', args }),
      },
    },
  },
}));

import { buildOutboxRecord } from '@/lib/analytics-outbox';
import type { Order } from '@/lib/types';
import type { VerifiedPaymentResult } from '@/lib/analytics-types';

describe('buildOutboxRecord & Valuation Rules', () => {
  const baseOrder: Order = {
    id: 'ORD_999',
    userId: 'user_123',
    userFullName: 'Alice N',
    userEmail: 'alice@example.com',
    status: 'pending',
    statusHistory: [],
    subtotal: 3000,
    shippingCost: 250,
    taxAmount: 200,
    totalAmount: 3450,
    paymentMethod: 'mpesa',
    createdAt: new Date(),
    updatedAt: new Date(),
    shippingAddress: {
      fullName: 'Alice N',
      address: 'Kenyatta Ave',
      city: 'Nairobi',
      phone: '+254700000000',
    },
    items: [
      { productId: 'p1', name: 'Product A', price: 1000, quantity: 2, vendorId: 'v1' },
      { productId: 'p2', name: 'Product B', price: 1000, quantity: 1, vendorId: 'v2' },
    ],
  };

  const basePayment: VerifiedPaymentResult = {
    provider: 'mpesa',
    paymentId: 'REC_ABC123',
    orderId: 'ORD_999',
    amount: 3450,
    currency: 'KES',
    status: 'COMPLETED',
    verifiedAt: new Date().toISOString(),
  };

  it('sets status to pending when consent is granted and client_id is present', () => {
    const orderWithAttribution: Order = {
      ...baseOrder,
      paymentDetails: {
        attribution: {
          clientId: '78910.1234567890',
          sessionId: 1710000000,
          capturedAt: new Date().toISOString(),
          consentSnapshot: {
            analyticsStorage: 'granted',
            consentTimestamp: new Date().toISOString(),
            policyVersion: '2026.1',
            source: 'cookie_banner',
          },
        },
      },
    };

    const record = buildOutboxRecord('ORD_999', orderWithAttribution, basePayment);

    expect(record.status).toBe('pending');
    expect(record.suppressionReason).toBeUndefined();
    expect(record.payload.value).toBe(3000); // 1000*2 + 1000*1, excluding 250 shipping & 200 tax
    expect(record.payload.shipping).toBe(250);
    expect(record.payload.tax).toBe(200);
    expect(record.payload.currency).toBe('KES');
    expect(record.payload.items).toHaveLength(2);
  });

  it('sets status to suppressed with consent_denied when analyticsStorage is denied', () => {
    const orderWithDeniedConsent: Order = {
      ...baseOrder,
      paymentDetails: {
        attribution: {
          clientId: '78910.1234567890',
          sessionId: 1710000000,
          capturedAt: new Date().toISOString(),
          consentSnapshot: {
            analyticsStorage: 'denied',
            consentTimestamp: new Date().toISOString(),
            policyVersion: '2026.1',
            source: 'cookie_banner',
          },
        },
      },
    };

    const record = buildOutboxRecord('ORD_999', orderWithDeniedConsent, basePayment);

    expect(record.status).toBe('suppressed');
    expect(record.suppressionReason).toBe('consent_denied');
    expect(record.payload.value).toBe(3000);
  });

  it('sets status to suppressed with missing_client_id when clientId is absent', () => {
    const orderWithNoClient: Order = {
      ...baseOrder,
      paymentDetails: {
        attribution: {
          clientId: null,
          sessionId: null,
          capturedAt: new Date().toISOString(),
          consentSnapshot: {
            analyticsStorage: 'granted',
            consentTimestamp: new Date().toISOString(),
            policyVersion: '2026.1',
            source: 'cookie_banner',
          },
        },
      },
    };

    const record = buildOutboxRecord('ORD_999', orderWithNoClient, basePayment);

    expect(record.status).toBe('suppressed');
    expect(record.suppressionReason).toBe('missing_client_id');
  });
});
