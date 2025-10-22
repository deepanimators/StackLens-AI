import { createHash } from 'crypto';
import { performanceMonitor } from './performance-monitoring';

// Cache interfaces
export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    maxSize?: number; // Maximum cache size
    compress?: boolean; // Enable compression for large values
}

export interface CacheEntry<T = any> {
    value: T;
    expiry: number;
    size: number;
    hits: number;
    lastAccess: number;
    compressed?: boolean;
}

export interface CacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    maxSize: number;
    entries: number;
    memoryUsage: number;
}

// Multi-level caching service
export class CacheService {
    private memoryCache: Map<string, CacheEntry> = new Map();
    private maxSize: number;
    private defaultTTL: number;
    private compressionThreshold: number = 1024; // Compress values larger than 1KB
    private stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0
    };

    constructor(options: CacheOptions = {}) {
        this.maxSize = options.maxSize || 1000;
        this.defaultTTL = options.ttl || 3600; // 1 hour default

        // Start cleanup interval
        this.startCleanupInterval();
    }

    // Get value from cache
    async get<T>(key: string): Promise<T | null> {
        const startTime = performance.now();

        try {
            const entry = this.memoryCache.get(key);

            if (!entry) {
                this.stats.misses++;
                performanceMonitor.recordCacheOperation('get', key, performance.now() - startTime, false);
                return null;
            }

            // Check if expired
            if (entry.expiry < Date.now()) {
                this.memoryCache.delete(key);
                this.stats.misses++;
                performanceMonitor.recordCacheOperation('get', key, performance.now() - startTime, false);
                return null;
            }

            // Update access stats
            entry.hits++;
            entry.lastAccess = Date.now();

            this.stats.hits++;
            performanceMonitor.recordCacheOperation('get', key, performance.now() - startTime, true);

            // Decompress if needed
            let value = entry.value;
            if (entry.compressed && typeof value === 'string') {
                value = JSON.parse(value);
            }

            return value as T;
        } catch (error) {
            console.error('Cache get error:', error);
            this.stats.misses++;
            performanceMonitor.recordCacheOperation('get', key, performance.now() - startTime, false);
            return null;
        }
    }

    // Set value in cache
    async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
        const startTime = performance.now();

        try {
            const effectiveTTL = ttl || this.defaultTTL;
            const expiry = Date.now() + (effectiveTTL * 1000);

            // Calculate size and compress if needed
            let serializedValue = value;
            let size = this.calculateSize(value);
            let compressed = false;

            if (size > this.compressionThreshold && typeof value === 'object') {
                try {
                    const jsonString = JSON.stringify(value);
                    if (jsonString.length > this.compressionThreshold) {
                        serializedValue = jsonString as T;
                        compressed = true;
                        size = jsonString.length;
                    }
                } catch (error) {
                    console.warn('Failed to compress cache value:', error);
                }
            }

            const entry: CacheEntry<T> = {
                value: serializedValue,
                expiry,
                size,
                hits: 0,
                lastAccess: Date.now(),
                compressed
            };

            // Evict entries if cache is full
            await this.evictIfNeeded();

            this.memoryCache.set(key, entry);
            this.stats.sets++;

            performanceMonitor.recordCacheOperation('set', key, performance.now() - startTime, true);
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            performanceMonitor.recordCacheOperation('set', key, performance.now() - startTime, false);
            return false;
        }
    }

    // Delete value from cache
    async delete(key: string): Promise<boolean> {
        const startTime = performance.now();

        try {
            const deleted = this.memoryCache.delete(key);
            if (deleted) {
                this.stats.deletes++;
            }

            performanceMonitor.recordCacheOperation('delete', key, performance.now() - startTime, true);
            return deleted;
        } catch (error) {
            console.error('Cache delete error:', error);
            performanceMonitor.recordCacheOperation('delete', key, performance.now() - startTime, false);
            return false;
        }
    }

    // Check if key exists
    async has(key: string): Promise<boolean> {
        const entry = this.memoryCache.get(key);
        if (!entry) return false;

        // Check if expired
        if (entry.expiry < Date.now()) {
            this.memoryCache.delete(key);
            return false;
        }

        return true;
    }

    // Clear all cache entries
    async clear(): Promise<void> {
        this.memoryCache.clear();
        this.resetStats();
    }

    // Get cache statistics
    getStats(): CacheStats {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

        const memoryUsage = Array.from(this.memoryCache.values())
            .reduce((total, entry) => total + entry.size, 0);

        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: Math.round(hitRate * 100) / 100,
            size: memoryUsage,
            maxSize: this.maxSize,
            entries: this.memoryCache.size,
            memoryUsage
        };
    }

    // Get/Set with function (memoization pattern)
    async memoize<T>(
        key: string,
        fn: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        // Try to get from cache first
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Execute function and cache result
        try {
            const result = await fn();
            await this.set(key, result, ttl);
            return result;
        } catch (error) {
            // Don't cache errors
            throw error;
        }
    }

    // Bulk operations
    async mget(keys: string[]): Promise<Record<string, any>> {
        const results: Record<string, any> = {};

        await Promise.all(
            keys.map(async (key) => {
                const value = await this.get(key);
                if (value !== null) {
                    results[key] = value;
                }
            })
        );

        return results;
    }

    async mset(entries: Record<string, any>, ttl?: number): Promise<boolean[]> {
        return Promise.all(
            Object.entries(entries).map(([key, value]) =>
                this.set(key, value, ttl)
            )
        );
    }

    // Tag-based cache invalidation
    private tags: Map<string, Set<string>> = new Map();

    async setWithTags<T>(key: string, value: T, tags: string[], ttl?: number): Promise<boolean> {
        const success = await this.set(key, value, ttl);

        if (success) {
            // Associate key with tags
            tags.forEach(tag => {
                if (!this.tags.has(tag)) {
                    this.tags.set(tag, new Set());
                }
                this.tags.get(tag)!.add(key);
            });
        }

        return success;
    }

    async invalidateByTag(tag: string): Promise<number> {
        const keys = this.tags.get(tag);
        if (!keys) return 0;

        let invalidated = 0;
        for (const key of keys) {
            if (await this.delete(key)) {
                invalidated++;
            }
        }

        // Clean up tag
        this.tags.delete(tag);

        // Remove keys from other tags
        for (const [otherTag, otherKeys] of this.tags) {
            for (const key of keys) {
                otherKeys.delete(key);
            }
        }

        return invalidated;
    }

    // Cache warming
    async warmup(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
        console.log(`Warming up cache with ${entries.length} entries...`);

        await Promise.all(
            entries.map(({ key, value, ttl }) => this.set(key, value, ttl))
        );

        console.log('Cache warmup completed');
    }

    // Export/Import cache data
    exportData(): any {
        const data: Record<string, any> = {};

        for (const [key, entry] of this.memoryCache) {
            if (entry.expiry > Date.now()) {
                data[key] = {
                    value: entry.value,
                    expiry: entry.expiry,
                    compressed: entry.compressed
                };
            }
        }

        return {
            data,
            timestamp: Date.now(),
            stats: this.stats
        };
    }

    async importData(exportedData: any): Promise<void> {
        const { data, timestamp } = exportedData;
        const now = Date.now();

        let imported = 0;
        let expired = 0;

        for (const [key, entry] of Object.entries(data)) {
            const { value, expiry, compressed } = entry as any;

            // Skip expired entries
            if (expiry <= now) {
                expired++;
                continue;
            }

            const cacheEntry: CacheEntry = {
                value,
                expiry,
                size: this.calculateSize(value),
                hits: 0,
                lastAccess: now,
                compressed
            };

            this.memoryCache.set(key, cacheEntry);
            imported++;
        }

        console.log(`Imported ${imported} cache entries, skipped ${expired} expired entries`);
    }

    // Private methods
    private async evictIfNeeded(): Promise<void> {
        if (this.memoryCache.size < this.maxSize) return;

        // LRU eviction: remove least recently accessed entries
        const entries = Array.from(this.memoryCache.entries());
        entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

        // Remove 20% of entries to make room
        const toRemove = Math.floor(this.maxSize * 0.2);
        for (let i = 0; i < toRemove && entries.length > 0; i++) {
            const [key] = entries.shift()!;
            this.memoryCache.delete(key);
            this.stats.evictions++;
        }
    }

    private calculateSize(value: any): number {
        if (typeof value === 'string') {
            return value.length * 2; // Rough estimate for UTF-16
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return 8;
        }
        if (value === null || value === undefined) {
            return 0;
        }

        try {
            return JSON.stringify(value).length * 2;
        } catch {
            return 1000; // Default estimate for complex objects
        }
    }

    private startCleanupInterval(): void {
        // Clean up expired entries every 5 minutes
        setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.memoryCache) {
            if (entry.expiry < now) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} expired cache entries`);
        }
    }

    private resetStats(): void {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0
        };
    }
}

// Specialized cache services
export class QueryCache extends CacheService {
    constructor() {
        super({
            maxSize: 5000,
            ttl: 300 // 5 minutes for query results
        });
    }

    // Cache database query results
    async cacheQuery<T>(
        sql: string,
        params: any[],
        result: T,
        ttl?: number
    ): Promise<void> {
        const key = this.generateQueryKey(sql, params);
        await this.set(key, result, ttl);
    }

    async getCachedQuery<T>(sql: string, params: any[]): Promise<T | null> {
        const key = this.generateQueryKey(sql, params);
        return this.get<T>(key);
    }

    private generateQueryKey(sql: string, params: any[]): string {
        const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
        const paramString = JSON.stringify(params);
        return `query:${createHash('sha256').update(normalized + paramString).digest('hex')}`;
    }
}

export class SessionCache extends CacheService {
    constructor() {
        super({
            maxSize: 10000,
            ttl: 86400 // 24 hours for sessions
        });
    }

    async setSession(sessionId: string, data: any, ttl?: number): Promise<boolean> {
        return this.set(`session:${sessionId}`, data, ttl);
    }

    async getSession<T>(sessionId: string): Promise<T | null> {
        return this.get<T>(`session:${sessionId}`);
    }

    async deleteSession(sessionId: string): Promise<boolean> {
        return this.delete(`session:${sessionId}`);
    }
}

export class APIResponseCache extends CacheService {
    constructor() {
        super({
            maxSize: 2000,
            ttl: 1800 // 30 minutes for API responses
        });
    }

    async cacheResponse(
        method: string,
        url: string,
        headers: Record<string, string>,
        response: any,
        ttl?: number
    ): Promise<void> {
        const key = this.generateResponseKey(method, url, headers);
        await this.set(key, response, ttl);
    }

    async getCachedResponse<T>(
        method: string,
        url: string,
        headers: Record<string, string>
    ): Promise<T | null> {
        const key = this.generateResponseKey(method, url, headers);
        return this.get<T>(key);
    }

    private generateResponseKey(method: string, url: string, headers: Record<string, string>): string {
        // Only include cache-relevant headers
        const relevantHeaders = {
            'accept': headers.accept,
            'content-type': headers['content-type'],
            'authorization': headers.authorization ? 'present' : 'absent'
        };

        const keyData = `${method}:${url}:${JSON.stringify(relevantHeaders)}`;
        return `response:${createHash('sha256').update(keyData).digest('hex')}`;
    }
}

// Global cache instances
export const globalCache = new CacheService();
export const queryCache = new QueryCache();
export const sessionCache = new SessionCache();
export const apiCache = new APIResponseCache();

// Cache middleware factory
export function cacheMiddleware(cache: CacheService, keyGenerator?: (req: any) => string) {
    return async (req: any, res: any, next: any) => {
        const key = keyGenerator ? keyGenerator(req) : `${req.method}:${req.url}`;

        try {
            const cached = await cache.get(key);
            if (cached) {
                res.setHeader('X-Cache', 'HIT');
                return res.json(cached);
            }
        } catch (error) {
            console.error('Cache middleware error:', error);
        }

        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function (data: any) {
            // Cache successful responses
            if (res.statusCode < 400) {
                cache.set(key, data, 300).catch(console.error); // 5 min cache
            }

            res.setHeader('X-Cache', 'MISS');
            return originalJson.call(this, data);
        };

        next();
    };
}

export default CacheService;