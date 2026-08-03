/**
 * Unified Caching Service
 * Provides both node-cache (in-memory) and Redis caching with automatic fallback
 */

import NodeCache from 'node-cache';
import { createClient, type RedisClientType } from 'redis';

type CacheValue = string | object | null | undefined;

let redisClient: RedisClientType | null = null;
let isRedisConnected = false;

export const nodeCache = new NodeCache({
  stdTTL: 300, // 5 minute default TTL
  checkperiod: 60,
  useClones: false,
});

/**
 * Initialize Redis connection (optional, falls back to node-cache)
 */
export async function initializeRedis(): Promise<void> {
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.log('[Cache] Redis not configured, using node-cache');
    return;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 
      `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
    
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      console.error('[Cache] Redis error:', err);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Cache] Redis connected');
      isRedisConnected = true;
    });

    await redisClient.connect();
  } catch (error) {
    console.warn('[Cache] Failed to connect to Redis, falling back to node-cache:', error);
    isRedisConnected = false;
  }
}

/**
 * Get value from cache
 */
export async function cacheGet<T = CacheValue>(key: string): Promise<T | null> {
  try {
    if (isRedisConnected && redisClient) {
      const value = await redisClient.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
    } else {
      const value = nodeCache.get<T>(key);
      if (value !== undefined) {
        return value;
      }
    }
    return null;
  } catch (error) {
    console.warn(`[Cache] Error getting key "${key}":`, error);
    return null;
  }
}

/**
 * Set value in cache with optional TTL (in seconds)
 */
export async function cacheSet<T = CacheValue>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } else {
      nodeCache.set(key, value, ttlSeconds);
    }
  } catch (error) {
    console.warn(`[Cache] Error setting key "${key}":`, error);
  }
}

/**
 * Delete value from cache
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.del(key);
    } else {
      nodeCache.del(key);
    }
  } catch (error) {
    console.warn(`[Cache] Error deleting key "${key}":`, error);
  }
}

/**
 * Clear all cache entries matching a pattern
 */
export async function cacheClearPattern(pattern: string): Promise<void> {
  try {
    if (isRedisConnected && redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      const keys = nodeCache.keys();
      keys.forEach((key) => {
        if (key.includes(pattern)) {
          nodeCache.del(key);
        }
      });
    }
  } catch (error) {
    console.warn(`[Cache] Error clearing pattern "${pattern}":`, error);
  }
}

/**
 * Check if cache is using Redis
 */
export function isUsingRedis(): boolean {
  return isRedisConnected;
}

/**
 * Disconnect Redis client (cleanup on server shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (isRedisConnected && redisClient) {
    await redisClient.quit();
    isRedisConnected = false;
  }
}

/**
 * Atomic sliding-window counter for rate limiting.
 * Returns the new count after incrementing. Uses Redis INCR+EXPIRE when Redis
 * is available, otherwise falls back to nodeCache (in-process only).
 *
 * @param key   Unique rate-limit bucket key (e.g. "rl:uid:xyz")
 * @param ttlMs Window size in milliseconds
 */
export async function rateLimitIncr(key: string, ttlMs: number): Promise<number> {
  const ttlSec = Math.ceil(ttlMs / 1000);
  try {
    if (isRedisConnected && redisClient) {
      const count = await redisClient.incr(key);
      if (count === 1) {
        // First request in this window — set TTL atomically
        await redisClient.expire(key, ttlSec);
      }
      return count;
    }
  } catch (err) {
    console.warn('[Cache] Redis rateLimitIncr error, falling back to nodeCache:', err);
  }

  // nodeCache fallback (per-process only)
  const entry = nodeCache.get<number>(key);
  if (entry === undefined) {
    nodeCache.set(key, 1, ttlSec);
    return 1;
  }
  const next = entry + 1;
  nodeCache.set(key, next, ttlSec);
  return next;
}

/**
 * Synchronous helpers that always hit the in-process NodeCache.
 * Use these when you need sync access and Redis latency is unacceptable
 * (e.g. inside ML inference hot-paths).
 */
export const syncCache = {
  get: <T>(key: string): T | undefined => nodeCache.get<T>(key),
  set: <T>(key: string, value: T, ttlSeconds = 300): void => { nodeCache.set(key, value, ttlSeconds); },
  del: (key: string): void => { nodeCache.del(key); },
  /** Alias for del — matches the CachingService.invalidate() API */
  invalidate: (key: string): void => { nodeCache.del(key); },
  keys: (): string[] => nodeCache.keys(),
  delPattern: (pattern: string): void => {
    nodeCache.keys().filter(k => k.includes(pattern)).forEach(k => nodeCache.del(k));
  },
  /** Alias for delPattern — matches the CachingService.invalidatePattern() API */
  invalidatePattern: (pattern: string): void => {
    nodeCache.keys().filter(k => k.includes(pattern)).forEach(k => nodeCache.del(k));
  },
  getOrSet: async <T>(key: string, fetchFn: () => Promise<T>, ttlSeconds = 300): Promise<T> => {
    const cached = nodeCache.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await fetchFn();
    nodeCache.set(key, value, ttlSeconds);
    return value;
  },
};

/**
 * Cache-aside pattern helper
 * Automatically fetches from cache or calls fetcher if cache miss
 */
export async function cacheAside<T = CacheValue>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T | null> {
  try {
    // Try cache first
    const cached = await cacheGet<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss: fetch data
    const data = await fetcher();

    // Store in cache
    if (data !== null && data !== undefined) {
      await cacheSet(key, data, ttlSeconds);
    }

    return data;
  } catch (error) {
    console.error(`[Cache] Error in cache-aside for key "${key}":`, error);
    return null;
  }
}
