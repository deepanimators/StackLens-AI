import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';
import { performance } from 'perf_hooks';

// Rate limiting configurations for different endpoints
export const createRateLimiters = () => {
    // General API rate limiter
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // 1000 requests per window per IP
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Remove custom keyGenerator to use default IPv6-safe implementation
        // The default keyGenerator already handles IPv6 properly
    });

    // Stricter rate limiter for authentication endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 login attempts per window per IP
        message: {
            error: 'Too many authentication attempts, please try again later.',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // Don't count successful requests
        // Use default keyGenerator for IPv6 safety
    });

    // Upload rate limiter
    const uploadLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 10, // 10 uploads per minute per IP
        message: {
            error: 'Upload limit exceeded, please wait before uploading again.',
            retryAfter: '1 minute'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

    // AI/ML analysis rate limiter
    const aiLimiter = rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 50, // 50 AI requests per 5 minutes per IP
        message: {
            error: 'AI analysis rate limit exceeded, please wait before making more requests.',
            retryAfter: '5 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

    return { apiLimiter, authLimiter, uploadLimiter, aiLimiter };
};

// Security headers middleware
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-eval'"], // unsafe-eval needed for dev
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://api.openai.com", "https://generativelanguage.googleapis.com"],
            workerSrc: ["'self'", "blob:"],
            manifestSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Disable for compatibility
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

// Input validation middleware
export const validateInput = (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate body, query, and params
            if (req.body && Object.keys(req.body).length > 0) {
                req.body = schema.parse(req.body);
            }
            if (req.query && Object.keys(req.query).length > 0) {
                req.query = schema.parse(req.query);
            }
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
};

// SQL injection prevention
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
        /(\'|\"|;|--|\*|\/\*|\*\/)/g,
        /(\b(OR|AND)\b.*=.*\b(OR|AND)\b)/i
    ];

    const checkForSQLInjection = (obj: any): boolean => {
        if (typeof obj === 'string') {
            return sqlPatterns.some(pattern => pattern.test(obj));
        }
        if (typeof obj === 'object' && obj !== null) {
            return Object.values(obj).some(value => checkForSQLInjection(value));
        }
        return false;
    };

    if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query) || checkForSQLInjection(req.params)) {
        return res.status(400).json({
            error: 'Invalid input detected',
            message: 'Request contains potentially harmful content'
        });
    }

    next();
};

// Request size limiting middleware
export const requestSizeLimit = (maxSize: number = 50 * 1024 * 1024) => { // 50MB default
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);

        if (contentLength > maxSize) {
            return res.status(413).json({
                error: 'Request too large',
                maxSize: `${maxSize / (1024 * 1024)}MB`,
                receivedSize: `${contentLength / (1024 * 1024)}MB`
            });
        }

        next();
    };
};

// CORS configuration with dynamic origins
export const corsConfig = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Production allowed origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://stacklens-ai.vercel.app',
            'https://stacklens-ai.netlify.app'
        ];

        // Add environment-specific origins
        if (process.env.NODE_ENV === 'development') {
            allowedOrigins.push('http://127.0.0.1:3000', 'http://127.0.0.1:5173');
        }

        if (process.env.FRONTEND_URL) {
            allowedOrigins.push(process.env.FRONTEND_URL);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS policy'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-Client-Version',
        'X-Request-ID'
    ],
    exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Response-Time'
    ]
};

// Request ID middleware for tracing
export const requestId = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || randomBytes(16).toString('hex');
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};

// Performance monitoring middleware
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function (this: Response, ...args: any[]) {
        const duration = performance.now() - start;

        // Set response time header
        res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);

        // Log performance metrics
        if (duration > 1000) { // Log slow requests (>1s)
            console.warn(`Slow request detected: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
        }

        // Store metrics for monitoring
        try {
            if ((global as any).performanceMetrics) {
                (global as any).performanceMetrics.push({
                    method: req.method,
                    url: req.url,
                    duration,
                    statusCode: res.statusCode,
                    timestamp: new Date(),
                    requestId: (req as any).requestId
                });
            }
        } catch (error) {
            // Ignore metrics storage errors
        }

        return originalEnd.apply(this, args as any);
    };

    next();
};

// Error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
    // Log error with request context
    console.error('Request Error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    });

    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: isDevelopment ? error.message : 'Invalid input provided'
        });
    }

    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }

    if (error.name === 'ForbiddenError') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions'
        });
    }

    // Default error response
    res.status(500).json({
        error: 'Internal Server Error',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        requestId: req.requestId,
        ...(isDevelopment && { stack: error.stack })
    });
};

// API key validation middleware
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        return res.status(401).json({
            error: 'API Key Required',
            message: 'Please provide a valid API key in the X-API-Key header'
        });
    }

    // Hash the provided key for comparison
    const hashedKey = createHash('sha256').update(apiKey).digest('hex');
    const validKeys = process.env.API_KEYS?.split(',').map(key =>
        createHash('sha256').update(key).digest('hex')
    ) || [];

    if (!validKeys.includes(hashedKey)) {
        return res.status(401).json({
            error: 'Invalid API Key',
            message: 'The provided API key is not valid'
        });
    }

    next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    console.log(`${timestamp} - ${method} ${url} - IP: ${ip} - UA: ${userAgent}`);

    next();
};

// Health check endpoint security
export const healthCheckSecurity = (req: Request, res: Response, next: NextFunction) => {
    // Only allow health checks from localhost or internal networks
    const clientIP = req.ip;
    const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

    // Add internal network ranges if needed
    const internalRanges = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./
    ];

    const isInternal = clientIP ? (
        allowedIPs.includes(clientIP) ||
        internalRanges.some(range => range.test(clientIP))
    ) : false;

    if (!isInternal && req.path === '/health') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Health check endpoint not accessible from external sources'
        });
    }

    next();
};

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}

export {
    helmet,
    rateLimit
};