import { Pool, PoolConfig, PoolClient, Client } from 'pg';
import { createHash } from 'crypto';
import { performanceMonitor } from './performance-monitoring';
import { queryCache } from './cache';

// Database configuration interfaces
export interface DatabaseConfig extends PoolConfig {
    maxConnections?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    statementTimeoutMillis?: number;
    queryTimeoutMillis?: number;
    slowQueryThreshold?: number;
    enableQueryCache?: boolean;
    enableQueryLogging?: boolean;
    enableSlowQueryLogging?: boolean;
}

export interface QueryOptions {
    timeout?: number;
    cache?: boolean;
    cacheTTL?: number;
    retries?: number;
    transactionId?: string;
}

export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
    command: string;
    duration: number;
    cached: boolean;
}

export interface ConnectionStats {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingCount: number;
    totalQueries: number;
    slowQueries: number;
    failedQueries: number;
    averageQueryTime: number;
    cacheHitRate: number;
}

// Transaction manager
export class TransactionManager {
    private client: PoolClient;
    private id: string;
    private startTime: number;
    private queries: Array<{ sql: string; duration: number }> = [];

    constructor(client: PoolClient) {
        this.client = client;
        this.id = createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').substring(0, 8);
        this.startTime = Date.now();
    }

    getId(): string {
        return this.id;
    }

    async query<T = any>(sql: string, params?: any[], options?: QueryOptions): Promise<QueryResult<T>> {
        const startTime = performance.now();

        try {
            const result = await this.client.query(sql, params);
            const duration = performance.now() - startTime;

            this.queries.push({ sql, duration });

            return {
                rows: result.rows,
                rowCount: result.rowCount || 0,
                command: result.command,
                duration,
                cached: false
            };
        } catch (error) {
            const duration = performance.now() - startTime;
            this.queries.push({ sql, duration });
            throw error;
        }
    }

    async commit(): Promise<void> {
        try {
            await this.client.query('COMMIT');

            const totalDuration = Date.now() - this.startTime;
            console.log(`Transaction ${this.id} committed in ${totalDuration}ms with ${this.queries.length} queries`);

            // Log slow transactions
            if (totalDuration > 1000) {
                console.warn(`Slow transaction detected: ${this.id} took ${totalDuration}ms`);
                this.queries.forEach(query => {
                    if (query.duration > 100) {
                        console.warn(`  Slow query: ${query.sql.substring(0, 100)}... (${query.duration}ms)`);
                    }
                });
            }
        } finally {
            this.client.release();
        }
    }

    async rollback(): Promise<void> {
        try {
            await this.client.query('ROLLBACK');
            console.log(`Transaction ${this.id} rolled back`);
        } finally {
            this.client.release();
        }
    }

    getStats() {
        const totalDuration = Date.now() - this.startTime;
        const queryTimes = this.queries.map(q => q.duration);

        return {
            id: this.id,
            duration: totalDuration,
            queryCount: this.queries.length,
            averageQueryTime: queryTimes.length > 0 ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length : 0,
            slowQueries: this.queries.filter(q => q.duration > 100).length
        };
    }
}

// Main database service
export class DatabaseService {
    private pool: Pool;
    private config: DatabaseConfig;
    private stats = {
        totalQueries: 0,
        slowQueries: 0,
        failedQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        queryTimes: [] as number[]
    };

    constructor(config: DatabaseConfig) {
        this.config = {
            max: config.maxConnections || 20,
            idleTimeoutMillis: config.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
            statement_timeout: config.statementTimeoutMillis || 30000,
            query_timeout: config.queryTimeoutMillis || 30000,
            slowQueryThreshold: config.slowQueryThreshold || 1000,
            enableQueryCache: config.enableQueryCache !== false,
            enableQueryLogging: config.enableQueryLogging || false,
            enableSlowQueryLogging: config.enableSlowQueryLogging !== false,
            ...config
        };

        this.pool = new Pool(this.config);
        this.setupEventHandlers();
        this.startStatsCollection();
    }

    // Execute a query with caching and performance monitoring
    async query<T = any>(sql: string, params?: any[], options: QueryOptions = {}): Promise<QueryResult<T>> {
        const startTime = performance.now();
        const queryId = this.generateQueryId(sql, params);

        this.stats.totalQueries++;

        try {
            // Check cache first if enabled
            if (this.config.enableQueryCache && options.cache !== false && this.isSelectQuery(sql)) {
                const cached = await queryCache.getCachedQuery<T[]>(sql, params || []);
                if (cached) {
                    const duration = performance.now() - startTime;
                    this.stats.cacheHits++;

                    performanceMonitor.recordDatabaseQuery(sql, duration, true, false);

                    return {
                        rows: cached,
                        rowCount: cached.length,
                        command: 'SELECT',
                        duration,
                        cached: true
                    };
                }
                this.stats.cacheMisses++;
            }

            // Execute query with retry logic
            const result = await this.executeWithRetry(sql, params, options);
            const duration = performance.now() - startTime;

            // Update stats
            this.stats.queryTimes.push(duration);
            if (this.stats.queryTimes.length > 1000) {
                this.stats.queryTimes = this.stats.queryTimes.slice(-1000); // Keep last 1000
            }

            // Log slow queries
            if (duration > this.config.slowQueryThreshold!) {
                this.stats.slowQueries++;
                if (this.config.enableSlowQueryLogging) {
                    console.warn(`Slow query detected (${duration}ms):`, {
                        sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
                        params: params ? JSON.stringify(params).substring(0, 100) : undefined,
                        duration
                    });
                }
            }

            // Cache SELECT results
            if (this.config.enableQueryCache && this.isSelectQuery(sql) && options.cache !== false) {
                const cacheTTL = options.cacheTTL || 300; // 5 minutes default
                await queryCache.cacheQuery(sql, params || [], result.rows, cacheTTL);
            }

            // Log query if enabled
            if (this.config.enableQueryLogging) {
                console.log(`Query executed (${duration}ms):`, {
                    sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
                    rowCount: result.rowCount,
                    duration
                });
            }

            performanceMonitor.recordDatabaseQuery(sql, duration, false, duration > this.config.slowQueryThreshold!);

            return {
                rows: result.rows,
                rowCount: result.rowCount || 0,
                command: result.command,
                duration,
                cached: false
            };

        } catch (error) {
            const duration = performance.now() - startTime;
            this.stats.failedQueries++;

            performanceMonitor.recordDatabaseQuery(sql, duration, false, true);

            console.error('Database query error:', {
                sql: sql.substring(0, 200),
                params,
                error: error instanceof Error ? error.message : error,
                duration
            });

            throw error;
        }
    }

    // Start a transaction
    async beginTransaction(): Promise<TransactionManager> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');
            return new TransactionManager(client);
        } catch (error) {
            client.release();
            throw error;
        }
    }

    // Bulk insert with performance optimization
    async bulkInsert<T>(table: string, data: T[], options: {
        batchSize?: number;
        conflictResolution?: 'ignore' | 'update' | 'error';
        updateFields?: string[];
    } = {}): Promise<number> {
        if (data.length === 0) return 0;

        const batchSize = options.batchSize || 1000;
        const conflictResolution = options.conflictResolution || 'error';

        let totalInserted = 0;
        const startTime = performance.now();

        try {
            // Get column names from first row
            const columns = Object.keys(data[0] as object);
            const columnList = columns.join(', ');

            // Process in batches
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);

                // Generate VALUES clause with parameterized queries
                const valuesClauses: string[] = [];
                const params: any[] = [];
                let paramIndex = 1;

                batch.forEach(row => {
                    const rowParams: string[] = [];
                    columns.forEach(col => {
                        params.push((row as any)[col]);
                        rowParams.push(`$${paramIndex++}`);
                    });
                    valuesClauses.push(`(${rowParams.join(', ')})`);
                });

                // Build SQL with conflict resolution
                let sql = `INSERT INTO ${table} (${columnList}) VALUES ${valuesClauses.join(', ')}`;

                if (conflictResolution === 'ignore') {
                    sql += ' ON CONFLICT DO NOTHING';
                } else if (conflictResolution === 'update' && options.updateFields) {
                    const updateClause = options.updateFields
                        .map(field => `${field} = EXCLUDED.${field}`)
                        .join(', ');
                    sql += ` ON CONFLICT DO UPDATE SET ${updateClause}`;
                }

                const result = await this.query(sql, params);
                totalInserted += result.rowCount;
            }

            const duration = performance.now() - startTime;
            console.log(`Bulk insert completed: ${totalInserted} rows in ${duration}ms`);

            return totalInserted;

        } catch (error) {
            console.error('Bulk insert error:', error);
            throw error;
        }
    }

    // Execute raw SQL files
    async executeSQLFile(filePath: string): Promise<void> {
        const fs = await import('fs/promises');
        const sql = await fs.readFile(filePath, 'utf-8');

        // Split by semicolons and execute each statement
        const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
            await this.query(statement);
        }
    }

    // Health check
    async healthCheck(): Promise<{
        healthy: boolean;
        connectionCount: number;
        averageResponseTime: number;
        lastError?: string;
    }> {
        try {
            const startTime = performance.now();
            const result = await this.query('SELECT 1 as health_check');
            const responseTime = performance.now() - startTime;

            const poolStats = this.getConnectionStats();

            return {
                healthy: true,
                connectionCount: poolStats.activeConnections,
                averageResponseTime: responseTime
            };
        } catch (error) {
            return {
                healthy: false,
                connectionCount: 0,
                averageResponseTime: -1,
                lastError: error instanceof Error ? error.message : String(error)
            };
        }
    }

    // Get connection and query statistics
    getConnectionStats(): ConnectionStats {
        const poolStats = {
            totalConnections: this.pool.totalCount,
            activeConnections: this.pool.totalCount - this.pool.idleCount,
            idleConnections: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
            totalQueries: this.stats.totalQueries,
            slowQueries: this.stats.slowQueries,
            failedQueries: this.stats.failedQueries,
            averageQueryTime: this.stats.queryTimes.length > 0
                ? this.stats.queryTimes.reduce((a, b) => a + b, 0) / this.stats.queryTimes.length
                : 0,
            cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0
                ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100
                : 0
        };

        return poolStats;
    }

    // Optimize database performance
    async optimize(): Promise<{
        tablesAnalyzed: number;
        indexesRebuilt: number;
        vacuumCompleted: boolean;
    }> {
        console.log('Starting database optimization...');

        try {
            // Get all user tables
            const tablesResult = await this.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);

            let tablesAnalyzed = 0;
            let indexesRebuilt = 0;

            // Analyze each table
            for (const table of tablesResult.rows) {
                try {
                    await this.query(`ANALYZE ${table.tablename}`);
                    tablesAnalyzed++;
                } catch (error) {
                    console.warn(`Failed to analyze table ${table.tablename}:`, error);
                }
            }

            // Rebuild indexes if needed
            const indexResult = await this.query(`
        SELECT indexname, tablename
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `);

            for (const index of indexResult.rows) {
                try {
                    await this.query(`REINDEX INDEX ${index.indexname}`);
                    indexesRebuilt++;
                } catch (error) {
                    console.warn(`Failed to rebuild index ${index.indexname}:`, error);
                }
            }

            // Run vacuum
            await this.query('VACUUM');

            console.log(`Database optimization completed: ${tablesAnalyzed} tables analyzed, ${indexesRebuilt} indexes rebuilt`);

            return {
                tablesAnalyzed,
                indexesRebuilt,
                vacuumCompleted: true
            };

        } catch (error) {
            console.error('Database optimization failed:', error);
            throw error;
        }
    }

    // Close database connection
    async close(): Promise<void> {
        await this.pool.end();
        console.log('Database connections closed');
    }

    // Private methods
    private async executeWithRetry(sql: string, params?: any[], options: QueryOptions = {}): Promise<any> {
        const maxRetries = options.retries || 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const client = await this.pool.connect();

                try {
                    // Set timeout if specified
                    if (options.timeout) {
                        await client.query(`SET statement_timeout = ${options.timeout}`);
                    }

                    const result = await client.query(sql, params);
                    return result;
                } finally {
                    client.release();
                }
            } catch (error) {
                lastError = error as Error;

                // Don't retry for syntax errors or constraint violations
                if (this.isNonRetryableError(error)) {
                    throw error;
                }

                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
                    console.warn(`Query attempt ${attempt} failed, retrying in ${delay}ms:`, error);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError;
    }

    private isNonRetryableError(error: any): boolean {
        const code = error?.code;
        // PostgreSQL error codes that shouldn't be retried
        const nonRetryableCodes = [
            '42601', // syntax_error
            '42703', // undefined_column
            '42P01', // undefined_table
            '23505', // unique_violation
            '23503', // foreign_key_violation
            '42P07', // duplicate_table
        ];

        return nonRetryableCodes.includes(code);
    }

    private generateQueryId(sql: string, params?: any[]): string {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        const paramString = params ? JSON.stringify(params) : '';
        return createHash('sha256').update(normalized + paramString).digest('hex').substring(0, 16);
    }

    private isSelectQuery(sql: string): boolean {
        return sql.trim().toLowerCase().startsWith('select');
    }

    private setupEventHandlers(): void {
        this.pool.on('connect', (client) => {
            console.log('Database client connected');
        });

        this.pool.on('error', (err) => {
            console.error('Database pool error:', err);
        });

        this.pool.on('remove', (client) => {
            console.log('Database client removed');
        });
    }

    private startStatsCollection(): void {
        // Collect and report stats every minute
        setInterval(() => {
            const stats = this.getConnectionStats();
            performanceMonitor.emit('database-stats', stats);

            // Reset query times to prevent memory growth
            if (this.stats.queryTimes.length > 10000) {
                this.stats.queryTimes = this.stats.queryTimes.slice(-1000);
            }
        }, 60000);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Query builder for common operations
export class QueryBuilder {
    private tableName: string;
    private selectFields: string[] = [];
    private whereConditions: string[] = [];
    private orderByFields: string[] = [];
    private limitCount?: number;
    private offsetCount?: number;
    private joinClauses: string[] = [];
    private groupByFields: string[] = [];
    private havingConditions: string[] = [];
    private params: any[] = [];
    private paramIndex = 1;

    constructor(table: string) {
        this.tableName = table;
    }

    select(fields: string | string[]): this {
        if (typeof fields === 'string') {
            this.selectFields.push(fields);
        } else {
            this.selectFields.push(...fields);
        }
        return this;
    }

    where(condition: string, value?: any): this {
        if (value !== undefined) {
            this.whereConditions.push(condition.replace('?', `$${this.paramIndex++}`));
            this.params.push(value);
        } else {
            this.whereConditions.push(condition);
        }
        return this;
    }

    whereIn(field: string, values: any[]): this {
        const placeholders = values.map(() => `$${this.paramIndex++}`).join(', ');
        this.whereConditions.push(`${field} IN (${placeholders})`);
        this.params.push(...values);
        return this;
    }

    join(table: string, condition: string): this {
        this.joinClauses.push(`JOIN ${table} ON ${condition}`);
        return this;
    }

    leftJoin(table: string, condition: string): this {
        this.joinClauses.push(`LEFT JOIN ${table} ON ${condition}`);
        return this;
    }

    orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
        this.orderByFields.push(`${field} ${direction}`);
        return this;
    }

    groupBy(fields: string | string[]): this {
        if (typeof fields === 'string') {
            this.groupByFields.push(fields);
        } else {
            this.groupByFields.push(...fields);
        }
        return this;
    }

    having(condition: string, value?: any): this {
        if (value !== undefined) {
            this.havingConditions.push(condition.replace('?', `$${this.paramIndex++}`));
            this.params.push(value);
        } else {
            this.havingConditions.push(condition);
        }
        return this;
    }

    limit(count: number): this {
        this.limitCount = count;
        return this;
    }

    offset(count: number): this {
        this.offsetCount = count;
        return this;
    }

    build(): { sql: string; params: any[] } {
        const fields = this.selectFields.length > 0 ? this.selectFields.join(', ') : '*';
        let sql = `SELECT ${fields} FROM ${this.tableName}`;

        if (this.joinClauses.length > 0) {
            sql += ` ${this.joinClauses.join(' ')}`;
        }

        if (this.whereConditions.length > 0) {
            sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
        }

        if (this.groupByFields.length > 0) {
            sql += ` GROUP BY ${this.groupByFields.join(', ')}`;
        }

        if (this.havingConditions.length > 0) {
            sql += ` HAVING ${this.havingConditions.join(' AND ')}`;
        }

        if (this.orderByFields.length > 0) {
            sql += ` ORDER BY ${this.orderByFields.join(', ')}`;
        }

        if (this.limitCount !== undefined) {
            sql += ` LIMIT ${this.limitCount}`;
        }

        if (this.offsetCount !== undefined) {
            sql += ` OFFSET ${this.offsetCount}`;
        }

        return { sql, params: this.params };
    }
}

// Export singleton instance
export const db = new DatabaseService({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'stacklens',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statementTimeoutMillis: 30000,
    enableQueryCache: process.env.NODE_ENV === 'production',
    enableSlowQueryLogging: true,
    slowQueryThreshold: 1000
});

export default db;