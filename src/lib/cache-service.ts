/**
 * Unified Caching Service
 * Provides both node-cache (in-memory) and Redis caching with automatic fallback
 */

import NodeCache from 'node-cache';
import { createClient, type RedisClientType } from 'redis';

type CacheValue = string | object | null | undefined;

let redisClient: RedisClientType | null = null;
let isRedisConnected = false;

const nodeCache = new NodeCache({
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
