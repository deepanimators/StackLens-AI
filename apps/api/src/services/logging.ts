import { createWriteStream, WriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { performanceMonitor } from './performance-monitoring';

// Log level definitions
export enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5
}

// Log interfaces
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    requestId?: string;
    userId?: string;
    sessionId?: string;
    ip?: string;
    userAgent?: string;
    stack?: string;
    duration?: number;
    component?: string;
    action?: string;
    tags?: string[];
}

export interface LoggerConfig {
    level: LogLevel;
    console: boolean;
    file: boolean;
    filePath?: string;
    maxFileSize?: number; // in bytes
    maxFiles?: number;
    structured: boolean;
    includeStackTrace: boolean;
    sensitiveFields?: string[];
    filters?: LogFilter[];
}

export interface LogFilter {
    level?: LogLevel;
    component?: string;
    action?: string;
    condition?: (entry: LogEntry) => boolean;
}

export interface LogStats {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    errorRate: number;
    averageLogsPerMinute: number;
    topErrors: Array<{ message: string; count: number }>;
    topComponents: Array<{ component: string; count: number }>;
}

// Structured logger implementation
export class Logger {
    private config: LoggerConfig;
    private writeStreams: Map<string, WriteStream> = new Map();
    private stats: LogStats = {
        totalLogs: 0,
        logsByLevel: {
            [LogLevel.TRACE]: 0,
            [LogLevel.DEBUG]: 0,
            [LogLevel.INFO]: 0,
            [LogLevel.WARN]: 0,
            [LogLevel.ERROR]: 0,
            [LogLevel.FATAL]: 0
        },
        errorRate: 0,
        averageLogsPerMinute: 0,
        topErrors: [],
        topComponents: []
    };
    private recentLogs: LogEntry[] = [];
    private errorCounts: Map<string, number> = new Map();
    private componentCounts: Map<string, number> = new Map();

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = {
            level: config.level ?? LogLevel.INFO,
            console: config.console ?? true,
            file: config.file ?? process.env.NODE_ENV === 'production',
            filePath: config.filePath ?? './logs',
            maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024, // 10MB
            maxFiles: config.maxFiles ?? 10,
            structured: config.structured ?? true,
            includeStackTrace: config.includeStackTrace ?? process.env.NODE_ENV !== 'production',
            sensitiveFields: config.sensitiveFields ?? ['password', 'token', 'apiKey', 'secret', 'authorization'],
            filters: config.filters ?? []
        };

        this.initializeFileStreams();
        this.startStatsCollection();
    }

    // Core logging methods
    trace(message: string, context?: Record<string, any>): void {
        this.log(LogLevel.TRACE, message, context);
    }

    debug(message: string, context?: Record<string, any>): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    info(message: string, context?: Record<string, any>): void {
        this.log(LogLevel.INFO, message, context);
    }

    warn(message: string, context?: Record<string, any>): void {
        this.log(LogLevel.WARN, message, context);
    }

    error(message: string, error?: Error | Record<string, any>, context?: Record<string, any>): void {
        let finalContext = context || {};

        if (error instanceof Error) {
            finalContext = {
                ...finalContext,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: this.config.includeStackTrace ? error.stack : undefined
                }
            };
        } else if (error && typeof error === 'object') {
            finalContext = { ...finalContext, ...error };
        }

        this.log(LogLevel.ERROR, message, finalContext);
    }

    fatal(message: string, error?: Error | Record<string, any>, context?: Record<string, any>): void {
        let finalContext = context || {};

        if (error instanceof Error) {
            finalContext = {
                ...finalContext,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            };
        } else if (error && typeof error === 'object') {
            finalContext = { ...finalContext, ...error };
        }

        this.log(LogLevel.FATAL, message, finalContext);
    }

    // Specialized logging methods
    request(req: any, res: any, duration?: number): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.INFO,
            message: `${req.method} ${req.originalUrl || req.url}`,
            context: {
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                contentLength: res.get('content-length'),
                referrer: req.get('referrer'),
                responseTime: duration
            },
            requestId: req.requestId,
            userId: req.user?.id,
            sessionId: req.sessionID,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            duration,
            component: 'http',
            action: 'request'
        };

        this.processLogEntry(entry);
    }

    query(sql: string, params: any[], duration: number, error?: Error): void {
        const level = error ? LogLevel.ERROR : (duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG);

        const context: Record<string, any> = {
            sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
            paramCount: params?.length || 0,
            duration
        };

        if (error) {
            context.error = {
                name: error.name,
                message: error.message,
                code: (error as any).code
            };
        }

        this.log(level, `Database query ${error ? 'failed' : 'completed'}`, context, {
            component: 'database',
            action: 'query'
        });
    }

    security(event: string, details: Record<string, any>, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
        const level = severity === 'critical' ? LogLevel.FATAL :
            severity === 'high' ? LogLevel.ERROR :
                severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;

        this.log(level, `Security event: ${event}`, {
            ...details,
            severity,
            securityEvent: true
        }, {
            component: 'security',
            action: event,
            tags: ['security', severity]
        });
    }

    performance(operation: string, duration: number, details?: Record<string, any>): void {
        const level = duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG;

        this.log(level, `Performance: ${operation}`, {
            ...details,
            duration,
            performanceEvent: true
        }, {
            component: 'performance',
            action: operation,
            tags: ['performance']
        });
    }

    audit(action: string, resource: string, userId?: string, details?: Record<string, any>): void {
        this.log(LogLevel.INFO, `Audit: ${action} on ${resource}`, {
            ...details,
            action,
            resource,
            userId,
            auditEvent: true
        }, {
            component: 'audit',
            action,
            tags: ['audit']
        });
    }

    // Core logging implementation
    private log(
        level: LogLevel,
        message: string,
        context?: Record<string, any>,
        metadata?: Partial<LogEntry>
    ): void {
        if (level < this.config.level) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: this.sanitizeContext(context),
            ...metadata
        };

        // Apply filters
        if (!this.shouldLog(entry)) return;

        this.processLogEntry(entry);
    }

    private processLogEntry(entry: LogEntry): void {
        // Update statistics
        this.updateStats(entry);

        // Console output
        if (this.config.console) {
            this.writeToConsole(entry);
        }

        // File output
        if (this.config.file) {
            this.writeToFile(entry);
        }

        // Keep recent logs for analysis
        this.recentLogs.push(entry);
        if (this.recentLogs.length > 10000) {
            this.recentLogs = this.recentLogs.slice(-5000);
        }

        // Emit performance events for monitoring
        if (entry.component && entry.duration) {
            performanceMonitor.emit('log-event', {
                component: entry.component,
                action: entry.action,
                duration: entry.duration,
                level: entry.level
            });
        }
    }

    private writeToConsole(entry: LogEntry): void {
        const levelNames = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
        const colors = {
            [LogLevel.TRACE]: '\x1b[37m',   // white
            [LogLevel.DEBUG]: '\x1b[36m',   // cyan
            [LogLevel.INFO]: '\x1b[32m',    // green
            [LogLevel.WARN]: '\x1b[33m',    // yellow
            [LogLevel.ERROR]: '\x1b[31m',   // red
            [LogLevel.FATAL]: '\x1b[35m'    // magenta
        };
        const reset = '\x1b[0m';

        if (this.config.structured) {
            console.log(JSON.stringify(entry, null, 2));
        } else {
            const color = colors[entry.level];
            const level = levelNames[entry.level];
            const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

            console.log(`${color}[${entry.timestamp}] ${level}: ${entry.message}${context}${reset}`);
        }
    }

    private async writeToFile(entry: LogEntry): Promise<void> {
        const fileName = this.getLogFileName(entry);
        const stream = await this.getWriteStream(fileName);

        if (stream) {
            const logLine = this.config.structured
                ? JSON.stringify(entry) + '\n'
                : this.formatLogLine(entry) + '\n';

            stream.write(logLine);
        }
    }

    private formatLogLine(entry: LogEntry): string {
        const levelNames = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
        const level = levelNames[entry.level];
        const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

        return `[${entry.timestamp}] ${level}: ${entry.message}${context}`;
    }

    private getLogFileName(entry: LogEntry): string {
        const date = new Date().toISOString().split('T')[0];
        const component = entry.component || 'general';

        if (entry.level >= LogLevel.ERROR) {
            return `error-${date}.log`;
        } else if (entry.tags?.includes('security')) {
            return `security-${date}.log`;
        } else if (entry.tags?.includes('audit')) {
            return `audit-${date}.log`;
        } else if (entry.tags?.includes('performance')) {
            return `performance-${date}.log`;
        } else {
            return `${component}-${date}.log`;
        }
    }

    private async getWriteStream(fileName: string): Promise<WriteStream | null> {
        if (this.writeStreams.has(fileName)) {
            return this.writeStreams.get(fileName)!;
        }

        try {
            const filePath = join(this.config.filePath!, fileName);
            await mkdir(dirname(filePath), { recursive: true });

            const stream = createWriteStream(filePath, { flags: 'a' });
            this.writeStreams.set(fileName, stream);

            return stream;
        } catch (error) {
            console.error('Failed to create log file stream:', error);
            return null;
        }
    }

    private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
        if (!context) return undefined;

        const sanitized = { ...context };

        this.config.sensitiveFields?.forEach(field => {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    private shouldLog(entry: LogEntry): boolean {
        return this.config.filters?.every(filter => {
            if (filter.level !== undefined && entry.level < filter.level) return false;
            if (filter.component && entry.component !== filter.component) return false;
            if (filter.action && entry.action !== filter.action) return false;
            if (filter.condition && !filter.condition(entry)) return false;
            return true;
        }) ?? true;
    }

    private updateStats(entry: LogEntry): void {
        this.stats.totalLogs++;
        this.stats.logsByLevel[entry.level]++;

        // Track error counts
        if (entry.level >= LogLevel.ERROR) {
            const errorKey = entry.message.substring(0, 100);
            this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
        }

        // Track component counts
        if (entry.component) {
            this.componentCounts.set(entry.component, (this.componentCounts.get(entry.component) || 0) + 1);
        }

        // Calculate error rate
        const totalErrors = this.stats.logsByLevel[LogLevel.ERROR] + this.stats.logsByLevel[LogLevel.FATAL];
        this.stats.errorRate = this.stats.totalLogs > 0 ? (totalErrors / this.stats.totalLogs) * 100 : 0;
    }

    private async initializeFileStreams(): Promise<void> {
        if (this.config.file && this.config.filePath) {
            try {
                await mkdir(this.config.filePath, { recursive: true });
            } catch (error) {
                console.error('Failed to create log directory:', error);
            }
        }
    }

    private startStatsCollection(): void {
        setInterval(() => {
            // Update top errors and components
            this.stats.topErrors = Array.from(this.errorCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([message, count]) => ({ message, count }));

            this.stats.topComponents = Array.from(this.componentCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([component, count]) => ({ component, count }));

            // Calculate logs per minute
            const recentLogsCount = this.recentLogs.filter(
                log => Date.now() - new Date(log.timestamp).getTime() < 60000
            ).length;
            this.stats.averageLogsPerMinute = recentLogsCount;

            // Emit stats for monitoring
            performanceMonitor.emit('logging-stats', this.stats);
        }, 60000); // Every minute
    }

    // Public methods for log analysis
    getStats(): LogStats {
        return { ...this.stats };
    }

    getRecentLogs(count: number = 100): LogEntry[] {
        return this.recentLogs.slice(-count);
    }

    searchLogs(criteria: {
        level?: LogLevel;
        component?: string;
        message?: string;
        timeRange?: { start: Date; end: Date };
        limit?: number;
    }): LogEntry[] {
        let filtered = this.recentLogs;

        if (criteria.level !== undefined) {
            filtered = filtered.filter(log => log.level >= criteria.level!);
        }

        if (criteria.component) {
            filtered = filtered.filter(log => log.component === criteria.component);
        }

        if (criteria.message) {
            const searchTerm = criteria.message.toLowerCase();
            filtered = filtered.filter(log => log.message.toLowerCase().includes(searchTerm));
        }

        if (criteria.timeRange) {
            const { start, end } = criteria.timeRange;
            filtered = filtered.filter(log => {
                const logTime = new Date(log.timestamp);
                return logTime >= start && logTime <= end;
            });
        }

        const limit = criteria.limit || 100;
        return filtered.slice(-limit);
    }

    // Child logger for component-specific logging
    child(component: string, defaultContext?: Record<string, any>): Logger {
        const childLogger = Object.create(this);
        childLogger.defaultComponent = component;
        childLogger.defaultContext = defaultContext;

        const originalLog = this.log.bind(this);
        childLogger.log = (level: LogLevel, message: string, context?: Record<string, any>, metadata?: Partial<LogEntry>) => {
            const finalContext = { ...defaultContext, ...context };
            const finalMetadata = { component, ...metadata };
            return originalLog(level, message, finalContext, finalMetadata);
        };

        return childLogger;
    }

    // Cleanup resources
    async close(): Promise<void> {
        const closePromises = Array.from(this.writeStreams.values()).map(stream =>
            new Promise<void>((resolve) => {
                stream.end(() => resolve());
            })
        );

        await Promise.all(closePromises);
        this.writeStreams.clear();
    }
}

// Request logging middleware
export function requestLoggingMiddleware(logger: Logger) {
    return (req: any, res: any, next: any) => {
        const startTime = Date.now();

        // Generate request ID if not present
        if (!req.requestId) {
            req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Override res.end to log response
        const originalEnd = res.end;
        res.end = function (chunk?: any, encoding?: any) {
            const duration = Date.now() - startTime;

            // Log the request
            logger.request(req, res, duration);

            // Log slow requests
            if (duration > 1000) {
                logger.performance('slow_request', duration, {
                    method: req.method,
                    url: req.originalUrl || req.url,
                    statusCode: res.statusCode
                });
            }

            return originalEnd.call(this, chunk, encoding);
        };

        next();
    };
}

// Error logging middleware
export function errorLoggingMiddleware(logger: Logger) {
    return (error: Error, req: any, res: any, next: any) => {
        logger.error('Request error', error, {
            method: req.method,
            url: req.originalUrl || req.url,
            params: req.params,
            query: req.query,
            body: req.body,
            requestId: req.requestId,
            userId: req.user?.id,
            ip: req.ip
        });

        next(error);
    };
}

// Global logger instances
export const logger = new Logger({
    level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
    console: true,
    file: process.env.NODE_ENV === 'production',
    filePath: process.env.LOG_PATH || './logs',
    structured: process.env.LOG_FORMAT === 'json',
    includeStackTrace: process.env.NODE_ENV !== 'production'
});

export const securityLogger = logger.child('security');
export const performanceLogger = logger.child('performance');
export const auditLogger = logger.child('audit');
export const databaseLogger = logger.child('database');

export default logger;