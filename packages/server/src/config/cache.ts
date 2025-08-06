import { logger } from '../utils/logger';

interface CacheItem<T> {
  value: T;
  expiresAt?: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout;
  private stats: CacheStats = {
    totalItems: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
  };

  // Configuration
  private readonly maxItems: number;
  private readonly maxMemoryMB: number;
  private readonly cleanupIntervalMs: number;

  constructor(
    options: {
      maxItems?: number;
      maxMemoryMB?: number;
      cleanupIntervalMs?: number;
    } = {}
  ) {
    this.maxItems = options.maxItems || 10000;
    this.maxMemoryMB = options.maxMemoryMB || 100;
    this.cleanupIntervalMs = options.cleanupIntervalMs || 5 * 60 * 1000; // 5 minutes

    // Clean up expired items periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);

    logger.info(
      `🚀 In-memory cache initialized - Max Items: ${this.maxItems}, Max Memory: ${this.maxMemoryMB}MB`
    );
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedItems = 0;
    let reclaimedSize = 0;

    // Remove expired items
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        reclaimedSize += item.size;
        this.cache.delete(key);
        cleanedItems++;
        this.stats.evictionCount++;
      }
    }

    // Update stats
    this.stats.totalItems = this.cache.size;
    this.stats.totalSize -= reclaimedSize;

    // If we're still over limits, perform LRU eviction
    this.performLRUEviction();

    if (cleanedItems > 0) {
      logger.debug(
        `Cache cleanup: removed ${cleanedItems} expired items, reclaimed ${this.formatBytes(reclaimedSize)}`
      );
    }
  }

  private performLRUEviction(): void {
    const maxSizeBytes = this.maxMemoryMB * 1024 * 1024;

    // Check if we need to evict based on size or count
    if (
      this.stats.totalSize <= maxSizeBytes &&
      this.cache.size <= this.maxItems
    ) {
      return;
    }

    // Sort by last accessed time (oldest first)
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    );

    let evictedSize = 0;
    let evictedCount = 0;

    // Evict oldest items until we're under limits
    for (const [key, item] of entries) {
      if (
        this.stats.totalSize - evictedSize <= maxSizeBytes &&
        this.cache.size - evictedCount <= this.maxItems
      ) {
        break;
      }

      evictedSize += item.size;
      evictedCount++;
      this.cache.delete(key);
      this.stats.evictionCount++;
    }

    this.stats.totalItems = this.cache.size;
    this.stats.totalSize -= evictedSize;

    if (evictedCount > 0) {
      logger.debug(
        `LRU eviction: removed ${evictedCount} items, reclaimed ${this.formatBytes(evictedSize)}`
      );
    }
  }

  private calculateSize(value: any): number {
    // Rough estimation of object size in bytes
    const jsonString = JSON.stringify(value);
    return Buffer.byteLength(jsonString, 'utf8');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);
      if (!item) {
        this.stats.missCount++;
        return null;
      }

      // Check if expired
      if (item.expiresAt && item.expiresAt < Date.now()) {
        this.cache.delete(key);
        this.stats.totalItems--;
        this.stats.totalSize -= item.size;
        this.stats.missCount++;
        return null;
      }

      // Update access tracking
      item.accessCount++;
      item.lastAccessed = Date.now();
      this.stats.hitCount++;

      return item.value;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      this.stats.missCount++;
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const now = Date.now();
      const size = this.calculateSize(value);

      // Check if item already exists to update stats correctly
      const existingItem = this.cache.get(key);
      if (existingItem) {
        this.stats.totalSize -= existingItem.size;
      } else {
        this.stats.totalItems++;
      }

      const item: CacheItem<any> = {
        value,
        expiresAt: ttlSeconds ? now + ttlSeconds * 1000 : undefined,
        accessCount: 1,
        lastAccessed: now,
        size,
      };

      this.cache.set(key, item);
      this.stats.totalSize += size;

      // Check if we need immediate cleanup
      const maxSizeBytes = this.maxMemoryMB * 1024 * 1024;
      if (
        this.stats.totalSize > maxSizeBytes ||
        this.cache.size > this.maxItems
      ) {
        this.performLRUEviction();
      }

      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const item = this.cache.get(key);
      if (item) {
        this.stats.totalItems--;
        this.stats.totalSize -= item.size;
      }
      this.cache.delete(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const item = this.cache.get(key);
      if (!item) {
        return false;
      }

      // Check if expired
      if (item.expiresAt && item.expiresAt < Date.now()) {
        this.cache.delete(key);
        this.stats.totalItems--;
        this.stats.totalSize -= item.size;
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      this.cache.clear();
      this.stats = {
        totalItems: 0,
        totalSize: 0,
        hitCount: 0,
        missCount: 0,
        evictionCount: 0,
      };
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  getStats(): CacheStats & {
    hitRate: number;
    formattedSize: string;
    maxItems: number;
    maxMemoryMB: number;
  } {
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    const hitRate =
      totalRequests > 0 ? (this.stats.hitCount / totalRequests) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      formattedSize: this.formatBytes(this.stats.totalSize),
      maxItems: this.maxItems,
      maxMemoryMB: this.maxMemoryMB,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.stats = {
      totalItems: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
    };
    logger.info('In-memory cache destroyed');
  }
}

// Create a singleton instance with production-ready configuration
const cacheInstance = new InMemoryCache({
  maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '10000'),
  maxMemoryMB: parseInt(process.env.CACHE_MAX_MEMORY_MB || '100'),
  cleanupIntervalMs: parseInt(
    process.env.CACHE_CLEANUP_INTERVAL_MS || '300000'
  ), // 5 minutes
});

export class CacheService {
  async get<T = any>(key: string): Promise<T | null> {
    return cacheInstance.get<T>(key);
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    return cacheInstance.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<boolean> {
    return cacheInstance.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return cacheInstance.exists(key);
  }

  async flushAll(): Promise<boolean> {
    return cacheInstance.flushAll();
  }

  getStats() {
    return cacheInstance.getStats();
  }
}

export async function connectCache(): Promise<void> {
  const stats = cacheInstance.getStats();
  logger.info(`✅ In-memory cache initialized successfully`);
  logger.info(
    `📊 Cache limits: ${stats.maxItems} items, ${stats.maxMemoryMB}MB memory`
  );
}

export async function disconnectCache(): Promise<void> {
  const stats = cacheInstance.getStats();
  logger.info(
    `📊 Final cache stats: ${stats.totalItems} items, ${stats.formattedSize}, ${stats.hitRate}% hit rate`
  );
  cacheInstance.destroy();
  logger.info('In-memory cache disconnected');
}
