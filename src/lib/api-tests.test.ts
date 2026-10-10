import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  paginateQuery,
  countDocuments,
  encodeCursor,
  decodeCursor,
} from '@/lib/pagination';
import type { WhereFilterOp } from 'firebase-admin/firestore';
import {
  isValidStatusTransition,
  validateStatusTransition,
  StatusTransitionError,
  getValidNextStatuses,
} from '@/lib/order-state-machine';
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheClearPattern,
  isUsingRedis,
  nodeCache,
} from '@/lib/cache-service';
import { withRequestMetrics } from '@/lib/api-metrics';
import { trackRequestMetrics } from '@/lib/metrics';

vi.mock('@/lib/metrics', () => ({
  trackRequestMetrics: vi.fn(),
  trackCacheHit: vi.fn(),
  trackCacheMiss: vi.fn(),
}));

const paginationMock = vi.hoisted(() => {
  type MockDocData = { id: string; data: Record<string, unknown> };

  const collections: Record<string, MockDocData[]> = {};

  const makeQuery = (collectionPath: string) => {
    const state: {
      constraints: Array<{ field: string; operator: string; value: unknown }>;
      orderBy: { field: string; direction: 'asc' | 'desc' } | null;
      cursor: { id: string; before: boolean } | null;
      limitCount: number | null;
    } = { constraints: [], orderBy: null, cursor: null, limitCount: null };

    const chain = {
      where(field: string, operator: string, value: unknown) {
        state.constraints.push({ field, operator, value });
        return chain;
      },
      orderBy(field: string, direction: 'asc' | 'desc') {
        state.orderBy = { field, direction };
        return chain;
      },
      startAfter(ref: { id: string }) {
        state.cursor = { id: ref.id, before: false };
        return chain;
      },
      endBefore(ref: { id: string }) {
        state.cursor = { id: ref.id, before: true };
        return chain;
      },
      limit(count: number) {
        state.limitCount = count;
        return chain;
      },
      count() {
        return {
          get: async () => {
            let docs = [...(collections[collectionPath] || [])];
            for (const constraint of state.constraints) {
              docs = docs.filter(
                (doc) => doc.data[constraint.field] === constraint.value
              );
            }
            return { data: () => ({ count: docs.length }) };
          },
        };
      },
      async get() {
        let docs = [...(collections[collectionPath] || [])];
        for (const constraint of state.constraints) {
          docs = docs.filter((doc) => doc.data[constraint.field] === constraint.value);
        }
        if (state.orderBy) {
          const { field, direction } = state.orderBy;
          docs.sort((a, b) => {
            const left = a.data[field] as string | number;
            const right = b.data[field] as string | number;
            const comparison = left < right ? -1 : left > right ? 1 : 0;
            return direction === 'asc' ? comparison : -comparison;
          });
        }
        if (state.cursor) {
          const index = docs.findIndex((doc) => doc.id === state.cursor!.id);
          if (index >= 0) {
            docs = state.cursor.before ? docs.slice(0, index) : docs.slice(index + 1);
          }
        }
        if (state.limitCount !== null) {
          docs = docs.slice(0, state.limitCount);
        }
        return {
          docs: docs.map((doc) => ({
            id: doc.id,
            exists: true,
            data: () => doc.data,
            get: (field: string) => doc.data[field],
          })),
        };
      },
    };
    return chain;
  };

  const firestoreAdmin = {
    collection(collectionPath: string) {
      const chain = makeQuery(collectionPath);
      return {
        ...chain,
        doc(docId: string) {
          return {
            get: async () => ({
              id: docId,
              exists: true,
              data: () => ({}),
              get: () => undefined,
            }),
          };
        },
      };
    },
  };

  return {
    firestoreAdmin,
    db: firestoreAdmin,
    seedCollection(collectionPath: string, docs: MockDocData[]) {
      collections[collectionPath] = docs;
    },
    reset() {
      Object.keys(collections).forEach((key) => delete collections[key]);
    },
  };
});

vi.mock('@/lib/firebase-admin', () => ({
  firestoreAdmin: paginationMock.firestoreAdmin,
  db: paginationMock.firestoreAdmin,
}));

describe('pagination', () => {
  beforeEach(() => {
    paginationMock.reset();
  });

  describe('cursor encoding/decoding', () => {
    it('round-trips a cursor', () => {
      const cursor = encodeCursor('doc-123', 'widget');
      expect(decodeCursor(cursor)).toEqual({ docId: 'doc-123', sortValue: 'widget' });
    });

    it('stringifies non-string sort values', () => {
      const cursor = encodeCursor('doc-42', 42);
      expect(decodeCursor(cursor).sortValue).toBe('42');
    });

    it('encodes dates as ISO strings', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const cursor = encodeCursor('doc-1', date);
      expect(decodeCursor(cursor).sortValue).toBe(date.toISOString());
    });
  });

  describe('paginateQuery', () => {
    const activeConstraint: Array<{ field: string; operator: WhereFilterOp; value: unknown }> = [{ field: 'status', operator: '==', value: 'active' }];

    beforeEach(() => {
      paginationMock.seedCollection('products', [
        { id: 'p1', data: { name: 'Alpha', price: 10, status: 'active' } },
        { id: 'p2', data: { name: 'Beta', price: 20, status: 'active' } },
        { id: 'p3', data: { name: 'Gamma', price: 30, status: 'active' } },
        { id: 'p4', data: { name: 'Delta', price: 40, status: 'active' } },
        { id: 'p5', data: { name: 'Epsilon', price: 50, status: 'active' } },
      ]);
    });

    it('returns the first page with pagination metadata', async () => {
      const result = await paginateQuery('products', activeConstraint, 'name', 'asc', {
        pageSize: 2,
      });
      expect(result.items.map((item) => item.id)).toEqual(['p1', 'p2']);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
      expect(result.prevCursor).toBeUndefined();
    });

    it('resumes from the next cursor without skipping records', async () => {
      const first = await paginateQuery('products', activeConstraint, 'name', 'asc', {
        pageSize: 2,
      });
      const second = await paginateQuery('products', activeConstraint, 'name', 'asc', {
        pageSize: 2,
        cursor: first.nextCursor,
      });
      expect(second.items.map((item) => item.id)).toEqual(['p4', 'p5']);
      expect(second.hasMore).toBe(true);
      expect(second.prevCursor).toBe(first.nextCursor);

      const third = await paginateQuery('products', activeConstraint, 'name', 'asc', {
        pageSize: 2,
        cursor: second.nextCursor,
      });
      expect(third.items.map((item) => item.id)).toEqual(['p3']);
      expect(third.hasMore).toBe(false);
      expect(third.nextCursor).toBeUndefined();
    });

    it('reports hasMore=false and no nextCursor on the final page', async () => {
      const result = await paginateQuery('products', activeConstraint, 'name', 'asc', {
        pageSize: 10,
      });
      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('applies constraints before paginating', async () => {
      paginationMock.seedCollection('products', [
        { id: 'p1', data: { name: 'Alpha', status: 'active' } },
        { id: 'p2', data: { name: 'Beta', status: 'inactive' } },
      ]);
      const result = await paginateQuery('products', activeConstraint, 'name', 'asc', {
        pageSize: 10,
      });
      expect(result.items.map((item) => item.id)).toEqual(['p1']);
    });

    it('supports descending order', async () => {
      const result = await paginateQuery('products', activeConstraint, 'name', 'desc', {
        pageSize: 2,
      });
      expect(result.items.map((item) => item.id)).toEqual(['p3', 'p5']);
    });

    it('rejects page sizes outside 1-100', async () => {
      await expect(
        paginateQuery('products', [], 'name', 'asc', { pageSize: 0 })
      ).rejects.toThrow('pageSize must be between 1 and 100');
      await expect(
        paginateQuery('products', [], 'name', 'asc', { pageSize: 101 })
      ).rejects.toThrow('pageSize must be between 1 and 100');
    });
  });

  describe('countDocuments', () => {
    it('counts documents matching constraints', async () => {
      paginationMock.seedCollection('products', [
        { id: 'p1', data: { status: 'active' } },
        { id: 'p2', data: { status: 'active' } },
        { id: 'p3', data: { status: 'inactive' } },
      ]);
      const count = await countDocuments('products', [
        { field: 'status', operator: '==', value: 'active' },
      ]);
      expect(count).toBe(2);
    });
  });
});

describe('order state machine', () => {
  it('allows valid transitions', () => {
    expect(isValidStatusTransition('pending', 'confirmed')).toBe(true);
    expect(isValidStatusTransition('confirmed', 'processing')).toBe(true);
    expect(isValidStatusTransition('shipped', 'delivered')).toBe(true);
  });

  it('allows idempotent same-status updates', () => {
    expect(isValidStatusTransition('confirmed', 'confirmed')).toBe(true);
    expect(isValidStatusTransition('refunded', 'refunded')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(isValidStatusTransition('pending', 'delivered')).toBe(false);
    expect(isValidStatusTransition('delivered', 'processing')).toBe(false);
    expect(isValidStatusTransition('cancelled', 'confirmed')).toBe(false);
  });

  it('validates vendor status transitions', () => {
    expect(isValidStatusTransition('pending', 'processing')).toBe(true);
    expect(isValidStatusTransition('pending', 'shipped')).toBe(false);
  });

  it('validateStatusTransition throws for invalid transitions', () => {
    expect(() => validateStatusTransition('pending', 'delivered')).toThrow(StatusTransitionError);
    expect(() => validateStatusTransition('pending', 'delivered')).toThrow(/Invalid status transition/);
  });

  it('validateStatusTransition does not throw for valid transitions', () => {
    expect(() => validateStatusTransition('processing', 'shipped')).not.toThrow();
  });

  it('getValidNextStatuses returns the allowed transitions', () => {
    const next = getValidNextStatuses('pending');
    expect(next).toContain('confirmed');
    expect(next).toContain('cancelled');
    expect(next).not.toContain('delivered');
  });

  it('getValidNextStatuses returns an empty list for terminal states', () => {
    expect(getValidNextStatuses('cancelled')).toEqual([]);
    expect(getValidNextStatuses('refunded')).toEqual([]);
  });
});

describe('cache-service', () => {
  beforeEach(() => {
    nodeCache.flushAll();
  });

  it('starts disconnected from redis', () => {
    expect(isUsingRedis()).toBe(false);
  });

  it('sets and gets object values through nodeCache', async () => {
    await cacheSet('test:user:1', { id: 1, name: 'Ada' }, 60);
    await expect(cacheGet<{ id: number; name: string }>('test:user:1')).resolves.toEqual({
      id: 1,
      name: 'Ada',
    });
  });

  it('returns null on a cache miss', async () => {
    await expect(cacheGet('test:missing')).resolves.toBeNull();
  });

  it('deletes a cached value', async () => {
    await cacheSet('test:delete-me', 'value', 60);
    await cacheDelete('test:delete-me');
    await expect(cacheGet('test:delete-me')).resolves.toBeNull();
  });

  it('clears keys matching a pattern', async () => {
    await cacheSet('test:a:1', 1, 60);
    await cacheSet('test:a:2', 2, 60);
    await cacheSet('test:b:1', 3, 60);
    await cacheClearPattern('test:a');
    await expect(cacheGet('test:a:1')).resolves.toBeNull();
    await expect(cacheGet('test:a:2')).resolves.toBeNull();
    await expect(cacheGet('test:b:1')).resolves.toBe(3);
  });

  it('expires entries after their TTL', async () => {
    await cacheSet('test:ttl', 'short-lived', 1);
    await expect(cacheGet('test:ttl')).resolves.toBe('short-lived');
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await expect(cacheGet('test:ttl')).resolves.toBeNull();
  }, 5000);
});

describe('withRequestMetrics', () => {
  const mockedTrackRequestMetrics = vi.mocked(trackRequestMetrics);

  const makeRequest = (overrides: { route?: string | null; pathname?: string }) => ({
    method: 'GET',
    headers: { get: () => overrides.route ?? null },
    nextUrl: { pathname: overrides.pathname ?? '/api/products' },
  });

  beforeEach(() => {
    mockedTrackRequestMetrics.mockClear();
  });

  it('records metrics for a successful handler call', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    const wrapped = withRequestMetrics(handler as any);
    const request = makeRequest({ route: 'products' });

    await wrapped(request as any, undefined);

    expect(handler).toHaveBeenCalledWith(request, undefined);
    expect(mockedTrackRequestMetrics).toHaveBeenCalledTimes(1);
    const [method, route, status, duration] = mockedTrackRequestMetrics.mock.calls[0];
    expect(method).toBe('GET');
    expect(route).toBe('products');
    expect(status).toBe(200);
    expect(duration).toEqual(expect.any(Number));
  });

  it('falls back to the request pathname when no route header is present', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 202 }));
    const wrapped = withRequestMetrics(handler as any);

    await wrapped(makeRequest({ route: null, pathname: '/api/products' }) as any, undefined);

    const [method, route, status] = mockedTrackRequestMetrics.mock.calls[0];
    expect(method).toBe('GET');
    expect(route).toBe('/api/products');
    expect(status).toBe(202);
  });

  it('records a 500 and rethrows when the handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const wrapped = withRequestMetrics(handler as any);

    await expect(
      wrapped(makeRequest({ route: 'products' }) as any, undefined)
    ).rejects.toThrow('boom');

    const [method, route, status] = mockedTrackRequestMetrics.mock.calls[0];
    expect(method).toBe('GET');
    expect(route).toBe('products');
    expect(status).toBe(500);
  });
});
