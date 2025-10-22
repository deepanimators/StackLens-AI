import { createClient, RedisClientType } from 'redis';
import { db } from '../../database/db.js';

/**
 * Redis Cache Service for v0.9.5 Advanced Search & Analytics
 * Provides high-performance caching for search results, analytics data, and more
 */
export class RedisCacheService {
    private client: RedisClientType | null = null;
    private isConnected = false;
    private fallbackToDatabase = true;
    private connectionRetries = 0;
    private maxRetries = 3;

    constructor(
        private config: {
            host?: string;
            port?: number;
            password?: string;
            database?: number;
            keyPrefix?: string;
            defaultTTL?: number;
            enableFallback?: boolean;
        } = {}
    ) {
        this.config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            database: parseInt(process.env.REDIS_DB || '0'),
            keyPrefix: 'stacklens:',
            defaultTTL: 300, // 5 minutes
            enableFallback: true,
            ...this.config
        };

        this.fallbackToDatabase = this.config.enableFallback!;
        this.initializeRedis();
    }

    /**
     * Initialize Redis connection with retry logic
     */
    private async initializeRedis(): Promise<void> {
        try {
            this.client = createClient({
                socket: {
                    host: this.config.host,
                    port: this.config.port
                },
                password: this.config.password,
                database: this.config.database
            });

            this.client.on('error', (err) => {
                console.error('❌ Redis connection error:', err);
                this.isConnected = false;

                if (this.connectionRetries < this.maxRetries) {
                    this.connectionRetries++;
                    console.log(`🔄 Retrying Redis connection (attempt ${this.connectionRetries}/${this.maxRetries})...`);
                    setTimeout(() => this.initializeRedis(), 5000 * this.connectionRetries);
                }
            });

            this.client.on('connect', () => {
                console.log('✅ Redis connected successfully');
                this.isConnected = true;
                this.connectionRetries = 0;
            });

            this.client.on('ready', () => {
                console.log('🚀 Redis client ready');
            });

            await this.client.connect();
        } catch (error) {
            console.error('❌ Failed to initialize Redis:', error);
            this.isConnected = false;

            if (this.fallbackToDatabase) {
                console.log('📦 Falling back to database caching');
            }
        }
    }

    /**
     * Generate cache key with prefix
     */
    private getKey(key: string): string {
        return `${this.config.keyPrefix}${key}`;
    }

    /**
     * Set cache value with TTL
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
        const finalTTL = ttl || this.config.defaultTTL!;
        const serializedValue = JSON.stringify(value);

        try {
            if (this.isConnected && this.client) {
                await this.client.setEx(this.getKey(key), finalTTL, serializedValue);
                console.log(`💾 Cached to Redis: ${key} (TTL: ${finalTTL}s)`);
                return true;
            } else if (this.fallbackToDatabase) {
                return await this.setInDatabase(key, serializedValue, finalTTL);
            }
        } catch (error) {
            console.error(`❌ Failed to set cache for key ${key}:`, error);

            if (this.fallbackToDatabase) {
                return await this.setInDatabase(key, serializedValue, finalTTL);
            }
        }

        return false;
    }

    /**
     * Get cache value
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            if (this.isConnected && this.client) {
                const value = await this.client.get(this.getKey(key));
                if (value) {
                    console.log(`🎯 Cache hit (Redis): ${key}`);
                    return JSON.parse(value) as T;
                }
            } else if (this.fallbackToDatabase) {
                return await this.getFromDatabase<T>(key);
            }
        } catch (error) {
            console.error(`❌ Failed to get cache for key ${key}:`, error);

            if (this.fallbackToDatabase) {
                return await this.getFromDatabase<T>(key);
            }
        }

        return null;
    }

    /**
     * Get or set pattern - execute factory function if cache miss
     */
    async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
        const cached = await this.get<T>(key);

        if (cached !== null) {
            return cached;
        }

        console.log(`🔄 Cache miss: ${key}, executing factory function`);
        const value = await factory();
        await this.set(key, value, ttl);

        return value;
    }

    /**
     * Delete cache key
     */
    async delete(key: string): Promise<boolean> {
        try {
            if (this.isConnected && this.client) {
                await this.client.del(this.getKey(key));
                console.log(`🗑️ Deleted from Redis cache: ${key}`);
            }

            if (this.fallbackToDatabase) {
                await this.deleteFromDatabase(key);
            }

            return true;
        } catch (error) {
            console.error(`❌ Failed to delete cache key ${key}:`, error);
            return false;
        }
    }

    /**
     * Delete multiple keys by pattern
     */
    async deletePattern(pattern: string): Promise<number> {
        let deletedCount = 0;

        try {
            if (this.isConnected && this.client) {
                const keys = await this.client.keys(this.getKey(pattern));
                if (keys.length > 0) {
                    await this.client.del(keys);
                    deletedCount = keys.length;
                    console.log(`🗑️ Deleted ${deletedCount} keys matching pattern: ${pattern}`);
                }
            }

            if (this.fallbackToDatabase) {
                deletedCount += await this.deletePatternFromDatabase(pattern);
            }
        } catch (error) {
            console.error(`❌ Failed to delete pattern ${pattern}:`, error);
        }

        return deletedCount;
    }

    /**
     * Check if key exists
     */
    async exists(key: string): Promise<boolean> {
        try {
            if (this.isConnected && this.client) {
                const exists = await this.client.exists(this.getKey(key));
                return exists === 1;
            } else if (this.fallbackToDatabase) {
                return await this.existsInDatabase(key);
            }
        } catch (error) {
            console.error(`❌ Failed to check existence of key ${key}:`, error);
        }

        return false;
    }

    /**
     * Set expiration for existing key
     */
    async expire(key: string, ttl: number): Promise<boolean> {
        try {
            if (this.isConnected && this.client) {
                await this.client.expire(this.getKey(key), ttl);
                return true;
            }
        } catch (error) {
            console.error(`❌ Failed to set expiration for key ${key}:`, error);
        }

        return false;
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        isRedisConnected: boolean;
        redisInfo?: any;
        databaseCacheSize?: number;
        totalMemoryUsage?: string;
    }> {
        const stats: any = {
            isRedisConnected: this.isConnected
        };

        if (this.isConnected && this.client) {
            try {
                const info = await this.client.info('memory');
                stats.redisInfo = info;

                const memoryUsage = await this.client.info('memory');
                stats.totalMemoryUsage = memoryUsage;
            } catch (error) {
                console.error('❌ Failed to get Redis stats:', error);
            }
        }

        if (this.fallbackToDatabase) {
            stats.databaseCacheSize = await this.getDatabaseCacheSize();
        }

        return stats;
    }

    /**
     * Clear all cache (use with caution)
     */
    async clearAll(): Promise<boolean> {
        try {
            if (this.isConnected && this.client) {
                await this.client.flushDb();
                console.log('🧹 Cleared all Redis cache');
            }

            if (this.fallbackToDatabase) {
                await this.clearDatabaseCache();
            }

            return true;
        } catch (error) {
            console.error('❌ Failed to clear cache:', error);
            return false;
        }
    }

    /**
     * Database fallback methods
     */
    private async setInDatabase(key: string, value: string, ttl: number): Promise<boolean> {
        try {
            const expiresAt = new Date(Date.now() + ttl * 1000);

            await db.execute(`
        INSERT INTO search_cache (cache_key, search_query, search_results, execution_time_ms, expires_at, created_at)
        VALUES (?, '', ?, 0, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          search_results = VALUES(search_results),
          expires_at = VALUES(expires_at),
          access_count = access_count + 1,
          last_accessed = NOW()
      `, [key, value, expiresAt]);

            console.log(`💾 Cached to database: ${key} (TTL: ${ttl}s)`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to cache to database: ${key}`, error);
            return false;
        }
    }

    private async getFromDatabase<T>(key: string): Promise<T | null> {
        try {
            const result = await db.execute(`
        SELECT search_results 
        FROM search_cache 
        WHERE cache_key = ? AND expires_at > NOW()
      `, [key]);

            if (result.rows && result.rows.length > 0) {
                // Update access count
                await db.execute(`
          UPDATE search_cache 
          SET access_count = access_count + 1, last_accessed = NOW()
          WHERE cache_key = ?
        `, [key]);

                console.log(`🎯 Cache hit (Database): ${key}`);
                return JSON.parse((result.rows[0] as any).search_results) as T;
            }
        } catch (error) {
            console.error(`❌ Failed to get from database cache: ${key}`, error);
        }

        return null;
    }

    private async deleteFromDatabase(key: string): Promise<void> {
        try {
            await db.execute('DELETE FROM search_cache WHERE cache_key = ?', [key]);
            console.log(`🗑️ Deleted from database cache: ${key}`);
        } catch (error) {
            console.error(`❌ Failed to delete from database cache: ${key}`, error);
        }
    }

    private async deletePatternFromDatabase(pattern: string): Promise<number> {
        try {
            const result = await db.execute(
                'DELETE FROM search_cache WHERE cache_key LIKE ?',
                [pattern.replace('*', '%')]
            );

            const deletedCount = result.rowCount || 0;
            console.log(`🗑️ Deleted ${deletedCount} keys from database cache matching pattern: ${pattern}`);
            return deletedCount;
        } catch (error) {
            console.error(`❌ Failed to delete pattern from database cache: ${pattern}`, error);
            return 0;
        }
    }

    private async existsInDatabase(key: string): Promise<boolean> {
        try {
            const result = await db.execute(`
        SELECT 1 FROM search_cache 
        WHERE cache_key = ? AND expires_at > NOW()
        LIMIT 1
      `, [key]);

            return result.rows && result.rows.length > 0;
        } catch (error) {
            console.error(`❌ Failed to check existence in database cache: ${key}`, error);
            return false;
        }
    }

    private async getDatabaseCacheSize(): Promise<number> {
        try {
            const result = await db.execute('SELECT COUNT(*) as count FROM search_cache WHERE expires_at > NOW()');
            return result.rows && result.rows.length > 0 ? (result.rows[0] as any).count : 0;
        } catch (error) {
            console.error('❌ Failed to get database cache size:', error);
            return 0;
        }
    }

    private async clearDatabaseCache(): Promise<void> {
        try {
            await db.execute('DELETE FROM search_cache');
            console.log('🧹 Cleared all database cache');
        } catch (error) {
            console.error('❌ Failed to clear database cache:', error);
        }
    }

    /**
     * Cleanup expired entries (maintenance task)
     */
    async cleanupExpired(): Promise<number> {
        let cleanedCount = 0;

        try {
            if (this.fallbackToDatabase) {
                const result = await db.execute('DELETE FROM search_cache WHERE expires_at <= NOW()');
                cleanedCount = result.rowCount || 0;
                console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
            }
        } catch (error) {
            console.error('❌ Failed to cleanup expired cache:', error);
        }

        return cleanedCount;
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<{
        redis: boolean;
        database: boolean;
        latency?: number;
    }> {
        const startTime = Date.now();

        const health = {
            redis: false,
            database: false,
            latency: 0
        };

        // Test Redis
        if (this.isConnected && this.client) {
            try {
                await this.client.ping();
                health.redis = true;
            } catch (error) {
                console.error('❌ Redis health check failed:', error);
            }
        }

        // Test Database
        if (this.fallbackToDatabase) {
            try {
                await db.execute('SELECT 1');
                health.database = true;
            } catch (error) {
                console.error('❌ Database health check failed:', error);
            }
        }

        health.latency = Date.now() - startTime;
        return health;
    }

    /**
     * Close connections
     */
    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.isConnected = false;
            console.log('👋 Redis connection closed');
        }
    }
}

// Export singleton instance
export const cacheService = new RedisCacheService();

// Specific cache managers for different features
export class SearchCacheManager {
    constructor(private cache: RedisCacheService) { }

    async cacheSearchResults(query: string, filters: any, results: any, ttl = 300): Promise<void> {
        const key = this.generateSearchKey(query, filters);
        await this.cache.set(key, results, ttl);
    }

    async getCachedSearchResults(query: string, filters: any): Promise<any | null> {
        const key = this.generateSearchKey(query, filters);
        return await this.cache.get(key);
    }

    async invalidateSearchCache(pattern?: string): Promise<number> {
        return await this.cache.deletePattern(pattern || 'search:*');
    }

    private generateSearchKey(query: string, filters: any): string {
        const filterHash = Buffer.from(JSON.stringify(filters)).toString('base64');
        const queryHash = Buffer.from(query).toString('base64');
        return `search:${queryHash}:${filterHash}`;
    }
}

export class AnalyticsCacheManager {
    constructor(private cache: RedisCacheService) { }

    async cacheAnalyticsData(key: string, data: any, ttl = 600): Promise<void> {
        await this.cache.set(`analytics:${key}`, data, ttl);
    }

    async getCachedAnalyticsData(key: string): Promise<any | null> {
        return await this.cache.get(`analytics:${key}`);
    }

    async invalidateAnalyticsCache(): Promise<number> {
        return await this.cache.deletePattern('analytics:*');
    }
}

// Export cache managers
export const searchCache = new SearchCacheManager(cacheService);
export const analyticsCache = new AnalyticsCacheManager(cacheService);