import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import os from 'os';
import { createHash } from 'crypto';

// Performance metrics interface
export interface PerformanceMetric {
    id: string;
    type: 'request' | 'database' | 'cache' | 'ai' | 'system';
    name: string;
    duration: number;
    startTime: number;
    endTime: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
}

export interface SystemMetrics {
    cpu: {
        usage: number;
        cores: number;
        loadAverage: number[];
    };
    memory: {
        used: number;
        free: number;
        total: number;
        percentage: number;
    };
    disk: {
        usage: number;
        free: number;
        total: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        connectionsActive: number;
    };
    uptime: number;
    timestamp: Date;
}

export interface DatabaseMetrics {
    connectionPool: {
        active: number;
        idle: number;
        waiting: number;
        total: number;
    };
    queryPerformance: {
        averageTime: number;
        slowQueries: number;
        totalQueries: number;
    };
    cacheHitRate: number;
    timestamp: Date;
}

// Performance monitoring service
export class PerformanceMonitoringService extends EventEmitter {
    private metrics: PerformanceMetric[] = [];
    private systemMetrics: SystemMetrics[] = [];
    private databaseMetrics: DatabaseMetrics[] = [];
    private activeTimers: Map<string, number> = new Map();
    private alertThresholds: Record<string, number> = {
        requestTime: 1000, // 1 second
        cpuUsage: 80, // 80%
        memoryUsage: 85, // 85%
        diskUsage: 90, // 90%
        errorRate: 5, // 5%
        slowQueryTime: 500 // 500ms
    };

    constructor() {
        super();
        this.startSystemMetricsCollection();
    }

    // Start performance timer
    startTimer(name: string, type: PerformanceMetric['type'] = 'request', metadata?: Record<string, any>): string {
        const id = this.generateId();
        const startTime = performance.now();

        this.activeTimers.set(id, startTime);

        return id;
    }

    // End performance timer and record metric
    endTimer(id: string, success: boolean = true, error?: string, additionalMetadata?: Record<string, any>): PerformanceMetric | null {
        const startTime = this.activeTimers.get(id);
        if (!startTime) {
            console.warn(`Timer with id ${id} not found`);
            return null;
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        const metric: PerformanceMetric = {
            id,
            type: 'request', // Default, should be provided when starting timer
            name: 'unknown',
            duration,
            startTime,
            endTime,
            success,
            error,
            metadata: additionalMetadata,
            timestamp: new Date()
        };

        this.activeTimers.delete(id);
        this.addMetric(metric);

        // Check for performance alerts
        this.checkPerformanceAlerts(metric);

        return metric;
    }

    // Add a performance metric
    addMetric(metric: PerformanceMetric): void {
        this.metrics.push(metric);

        // Keep only last 10000 metrics to prevent memory issues
        if (this.metrics.length > 10000) {
            this.metrics = this.metrics.slice(-5000);
        }

        this.emit('metric-added', metric);
    }

    // Record request performance
    recordRequest(method: string, url: string, statusCode: number, duration: number, requestId?: string): void {
        const metric: PerformanceMetric = {
            id: requestId || this.generateId(),
            type: 'request',
            name: `${method} ${url}`,
            duration,
            startTime: performance.now() - duration,
            endTime: performance.now(),
            success: statusCode < 400,
            metadata: {
                method,
                url,
                statusCode,
                requestId
            },
            timestamp: new Date()
        };

        this.addMetric(metric);
    }

    // Record database query performance
    recordDatabaseQuery(query: string, duration: number, success: boolean = true, error?: string): void {
        const metric: PerformanceMetric = {
            id: this.generateId(),
            type: 'database',
            name: 'Database Query',
            duration,
            startTime: performance.now() - duration,
            endTime: performance.now(),
            success,
            error,
            metadata: {
                query: query.substring(0, 100), // Truncate long queries
                queryHash: createHash('sha256').update(query).digest('hex').substring(0, 16)
            },
            timestamp: new Date()
        };

        this.addMetric(metric);

        // Check for slow queries
        if (duration > this.alertThresholds.slowQueryTime) {
            this.emit('slow-query', metric);
        }
    }

    // Record AI/ML operation performance
    recordAIOperation(operation: string, duration: number, success: boolean = true, tokensUsed?: number, model?: string): void {
        const metric: PerformanceMetric = {
            id: this.generateId(),
            type: 'ai',
            name: operation,
            duration,
            startTime: performance.now() - duration,
            endTime: performance.now(),
            success,
            metadata: {
                operation,
                tokensUsed,
                model,
                costEstimate: tokensUsed ? this.calculateTokenCost(tokensUsed, model) : undefined
            },
            timestamp: new Date()
        };

        this.addMetric(metric);
    }

    // Record cache operation performance
    recordCacheOperation(operation: 'get' | 'set' | 'delete', key: string, duration: number, hit: boolean = false): void {
        const metric: PerformanceMetric = {
            id: this.generateId(),
            type: 'cache',
            name: `Cache ${operation}`,
            duration,
            startTime: performance.now() - duration,
            endTime: performance.now(),
            success: true,
            metadata: {
                operation,
                key: createHash('sha256').update(key).digest('hex').substring(0, 16), // Hash key for privacy
                hit
            },
            timestamp: new Date()
        };

        this.addMetric(metric);
    }

    // Get performance statistics
    getStats(timeRange: { start: Date; end: Date } = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
    }): {
        requests: any;
        database: any;
        ai: any;
        cache: any;
        system: SystemMetrics | null;
    } {
        const filteredMetrics = this.metrics.filter(m =>
            m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        );

        const requestMetrics = filteredMetrics.filter(m => m.type === 'request');
        const dbMetrics = filteredMetrics.filter(m => m.type === 'database');
        const aiMetrics = filteredMetrics.filter(m => m.type === 'ai');
        const cacheMetrics = filteredMetrics.filter(m => m.type === 'cache');

        return {
            requests: this.calculateRequestStats(requestMetrics),
            database: this.calculateDatabaseStats(dbMetrics),
            ai: this.calculateAIStats(aiMetrics),
            cache: this.calculateCacheStats(cacheMetrics),
            system: this.getLatestSystemMetrics()
        };
    }

    // Get slow operations
    getSlowOperations(type?: PerformanceMetric['type'], limit: number = 10): PerformanceMetric[] {
        let metrics = this.metrics;

        if (type) {
            metrics = metrics.filter(m => m.type === type);
        }

        return metrics
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit);
    }

    // Get error rate
    getErrorRate(timeRange: { start: Date; end: Date }): number {
        const filteredMetrics = this.metrics.filter(m =>
            m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        );

        if (filteredMetrics.length === 0) return 0;

        const errorCount = filteredMetrics.filter(m => !m.success).length;
        return (errorCount / filteredMetrics.length) * 100;
    }

    // Clear old metrics
    clearOldMetrics(olderThan: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)): number {
        const initialLength = this.metrics.length;
        this.metrics = this.metrics.filter(m => m.timestamp >= olderThan);

        const removed = initialLength - this.metrics.length;
        console.log(`Cleared ${removed} old performance metrics`);

        return removed;
    }

    // Export metrics for external monitoring systems
    exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
        if (format === 'prometheus') {
            return this.formatPrometheusMetrics();
        }

        return JSON.stringify({
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            systemMetrics: this.systemMetrics.slice(-1)[0],
            summary: this.getStats()
        }, null, 2);
    }

    // Private methods
    private generateId(): string {
        return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private startSystemMetricsCollection(): void {
        const collectMetrics = () => {
            const metrics: SystemMetrics = {
                cpu: this.getCPUMetrics(),
                memory: this.getMemoryMetrics(),
                disk: this.getDiskMetrics(),
                network: this.getNetworkMetrics(),
                uptime: process.uptime(),
                timestamp: new Date()
            };

            this.systemMetrics.push(metrics);

            // Keep only last 1440 entries (24 hours if collected every minute)
            if (this.systemMetrics.length > 1440) {
                this.systemMetrics = this.systemMetrics.slice(-720);
            }

            this.checkSystemAlerts(metrics);
            this.emit('system-metrics', metrics);
        };

        // Collect system metrics every minute
        setInterval(collectMetrics, 60 * 1000);

        // Initial collection
        collectMetrics();
    }

    private getCPUMetrics() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type as keyof typeof cpu.times];
            }
            totalIdle += cpu.times.idle;
        });

        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        const usage = 100 - ~~(100 * idle / total);

        return {
            usage,
            cores: cpus.length,
            loadAverage: os.loadavg()
        };
    }

    private getMemoryMetrics() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;

        return {
            used,
            free,
            total,
            percentage: (used / total) * 100
        };
    }

    private getDiskMetrics() {
        // This would need platform-specific implementation
        // For now, return mock data
        return {
            usage: 0,
            free: 0,
            total: 0
        };
    }

    private getNetworkMetrics() {
        // This would need platform-specific implementation
        // For now, return mock data
        return {
            bytesIn: 0,
            bytesOut: 0,
            connectionsActive: 0
        };
    }

    private calculateRequestStats(metrics: PerformanceMetric[]) {
        if (metrics.length === 0) return null;

        const durations = metrics.map(m => m.duration);
        const successCount = metrics.filter(m => m.success).length;

        return {
            total: metrics.length,
            successRate: (successCount / metrics.length) * 100,
            averageTime: durations.reduce((a, b) => a + b, 0) / durations.length,
            minTime: Math.min(...durations),
            maxTime: Math.max(...durations),
            p95Time: this.calculatePercentile(durations, 95),
            p99Time: this.calculatePercentile(durations, 99)
        };
    }

    private calculateDatabaseStats(metrics: PerformanceMetric[]) {
        if (metrics.length === 0) return null;

        const durations = metrics.map(m => m.duration);
        const successCount = metrics.filter(m => m.success).length;
        const slowQueries = metrics.filter(m => m.duration > this.alertThresholds.slowQueryTime).length;

        return {
            total: metrics.length,
            successRate: (successCount / metrics.length) * 100,
            averageTime: durations.reduce((a, b) => a + b, 0) / durations.length,
            slowQueries,
            slowQueryRate: (slowQueries / metrics.length) * 100
        };
    }

    private calculateAIStats(metrics: PerformanceMetric[]) {
        if (metrics.length === 0) return null;

        const durations = metrics.map(m => m.duration);
        const totalTokens = metrics.reduce((sum, m) => sum + (m.metadata?.tokensUsed || 0), 0);
        const totalCost = metrics.reduce((sum, m) => sum + (m.metadata?.costEstimate || 0), 0);

        return {
            total: metrics.length,
            averageTime: durations.reduce((a, b) => a + b, 0) / durations.length,
            totalTokens,
            totalCost,
            averageCostPerRequest: totalCost / metrics.length
        };
    }

    private calculateCacheStats(metrics: PerformanceMetric[]) {
        if (metrics.length === 0) return null;

        const hits = metrics.filter(m => m.metadata?.hit === true).length;
        const hitRate = (hits / metrics.length) * 100;

        return {
            total: metrics.length,
            hits,
            misses: metrics.length - hits,
            hitRate
        };
    }

    private calculatePercentile(arr: number[], percentile: number): number {
        const sorted = arr.sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);

        if (Math.floor(index) === index) {
            return sorted[index];
        }

        const lower = sorted[Math.floor(index)];
        const upper = sorted[Math.ceil(index)];
        const weight = index % 1;

        return lower * (1 - weight) + upper * weight;
    }

    private calculateTokenCost(tokens: number, model?: string): number {
        // Rough cost estimates (per 1000 tokens)
        const costPer1k = {
            'gpt-4': 0.03,
            'gpt-3.5-turbo': 0.002,
            'gemini-pro': 0.001,
            'default': 0.002
        };

        const rate = costPer1k[model as keyof typeof costPer1k] || costPer1k.default;
        return (tokens / 1000) * rate;
    }

    private checkPerformanceAlerts(metric: PerformanceMetric): void {
        // Check for slow requests
        if (metric.type === 'request' && metric.duration > this.alertThresholds.requestTime) {
            this.emit('slow-request', metric);
        }

        // Check for database slow queries
        if (metric.type === 'database' && metric.duration > this.alertThresholds.slowQueryTime) {
            this.emit('slow-query', metric);
        }

        // Check for errors
        if (!metric.success) {
            this.emit('operation-error', metric);
        }
    }

    private checkSystemAlerts(metrics: SystemMetrics): void {
        // CPU usage alert
        if (metrics.cpu.usage > this.alertThresholds.cpuUsage) {
            this.emit('high-cpu-usage', metrics);
        }

        // Memory usage alert
        if (metrics.memory.percentage > this.alertThresholds.memoryUsage) {
            this.emit('high-memory-usage', metrics);
        }
    }

    private getLatestSystemMetrics(): SystemMetrics | null {
        return this.systemMetrics.length > 0 ? this.systemMetrics[this.systemMetrics.length - 1] : null;
    }

    private formatPrometheusMetrics(): string {
        const latest = this.getLatestSystemMetrics();
        if (!latest) return '';

        return `
# HELP cpu_usage_percent CPU usage percentage
# TYPE cpu_usage_percent gauge
cpu_usage_percent ${latest.cpu.usage}

# HELP memory_usage_percent Memory usage percentage
# TYPE memory_usage_percent gauge
memory_usage_percent ${latest.memory.percentage}

# HELP uptime_seconds Process uptime in seconds
# TYPE uptime_seconds counter
uptime_seconds ${latest.uptime}

# HELP request_duration_seconds Request duration in seconds
# TYPE request_duration_seconds histogram
${this.formatRequestMetrics()}
    `.trim();
    }

    private formatRequestMetrics(): string {
        const recent = this.metrics.filter(m =>
            m.type === 'request' &&
            m.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        );

        if (recent.length === 0) return '';

        const durations = recent.map(m => m.duration / 1000); // Convert to seconds
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

        return `request_duration_seconds_sum ${durations.reduce((a, b) => a + b, 0)}
request_duration_seconds_count ${durations.length}
request_duration_seconds_avg ${avg}`;
    }
}

// Global performance monitoring instance
export const performanceMonitor = new PerformanceMonitoringService();

// Performance decorator for functions
export function measurePerformance(name: string, type: PerformanceMetric['type'] = 'request') {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const timerId = performanceMonitor.startTimer(name, type);

            try {
                const result = await method.apply(this, args);
                performanceMonitor.endTimer(timerId, true);
                return result;
            } catch (error) {
                performanceMonitor.endTimer(timerId, false, error instanceof Error ? error.message : 'Unknown error');
                throw error;
            }
        };
    };
}

export default PerformanceMonitoringService;