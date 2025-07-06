import NodeCache from 'node-cache';
import { logger } from './logging-service';

export class CachingService {
  private static instance: CachingService;
  private cache: NodeCache;

  private constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes default TTL
      checkperiod: 120 // Check for expired keys every 2 minutes
    });

    // Listen for cache events
    this.cache.on('expired', (key, value) => {
      logger.info(`Cache key expired: ${key}`);
    });
  }

  static getInstance(): CachingService {
    if (!CachingService.instance) {
      CachingService.instance = new CachingService();
    }
    return CachingService.instance;
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 600
  ): Promise<T> {
    const cachedValue = this.cache.get<T>(key);
    if (cachedValue !== undefined) {
      logger.debug(`Cache hit for key: ${key}`);
      return cachedValue;
    }

    logger.debug(`Cache miss for key: ${key}`);
    const freshValue = await fetchFn();
    this.cache.set(key, freshValue, ttl);
    return freshValue;
  }

  invalidate(key: string): void {
    this.cache.del(key);
    logger.debug(`Cache invalidated for key: ${key}`);
  }

  invalidatePattern(pattern: string): void {
    const keys = this.cache.keys().filter(key => key.includes(pattern));
    keys.forEach(key => this.cache.del(key));
    logger.debug(`Cache invalidated for pattern: ${pattern}, keys: ${keys.join(', ')}`);
  }
}

export const cacheService = CachingService.getInstance();
