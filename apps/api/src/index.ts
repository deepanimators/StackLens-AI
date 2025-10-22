import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes/main-routes.js";
import { setupVite, serveStatic, log } from "./vite";

// Import Phase 5 Advanced Security & Performance services
import {
  createRateLimiters,
  securityHeaders,
  corsConfig,
  requestId,
  performanceMonitoring,
  errorHandler,
  requestLogger,
  healthCheckSecurity
} from "./middleware/security.js";
import { performanceMonitor } from "./services/performance-monitoring.js";
import { globalCache, cacheMiddleware } from "./services/cache.js";
import { logger, requestLoggingMiddleware, errorLoggingMiddleware } from "./services/logging.js";
import { db } from "./services/database.js";

const app = express();

// Phase 5: Initialize Performance Monitoring
console.log("🔄 Initializing Phase 5: Advanced Security & Performance...");

// Phase 5: Enhanced Security Headers
app.use(securityHeaders);

// Phase 5: Advanced CORS Configuration (using cors middleware)
import cors from "cors";
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.CLIENT_URL
    ].filter(Boolean);

    // Allow requests without origin (e.g., curl, Postman, server-to-server)
    if (!origin) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-ID"]
}));

// Phase 5: Response compression for better performance  
app.use(compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Good balance between speed and compression ratio
  threshold: 1024 // Only compress responses larger than 1KB
}));

// Phase 5: Request ID generation for tracing
app.use(requestId);

// Phase 5: Request logging middleware
app.use(requestLoggingMiddleware(logger));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Phase 5: Advanced Rate Limiting
const rateLimiters = createRateLimiters();
app.use("/api/", rateLimiters.apiLimiter);
app.use("/api/auth/", rateLimiters.authLimiter);
app.use("/api/upload/", rateLimiters.uploadLimiter);
app.use("/api/ai/", rateLimiters.aiLimiter);

// Phase 5: Performance Monitoring Middleware
app.use(performanceMonitoring);

// Phase 5: API Response Caching for frequently accessed endpoints
app.use("/api/health", cacheMiddleware(globalCache, (req) => `health-check`));
app.use("/api/stats", cacheMiddleware(globalCache, (req) => `stats-${req.query.period || 'default'}`));

(async () => {
  try {
    console.log("🔄 Starting server initialization...");

    // Phase 5: Initialize database and caching
    console.log("🔄 Initializing database connection...");
    const dbHealth = await db.healthCheck();
    if (dbHealth.healthy) {
      console.log("✅ Database connection established");
    } else {
      console.warn("⚠️ Database connection issues:", dbHealth.lastError);
    }

    // Phase 5: Warm up cache
    console.log("🔄 Initializing cache services...");
    await globalCache.warmup([
      { key: 'app-version', value: '0.9.5', ttl: 3600 },
      { key: 'health-status', value: { status: 'ok', timestamp: Date.now() }, ttl: 300 }
    ]);
    console.log("✅ Cache services initialized");

    const server = await registerRoutes(app);
    console.log("✅ Routes registered successfully");

    // Phase 5: Enhanced Error Handling
    app.use(errorLoggingMiddleware(logger));
    app.use(errorHandler);

    // Phase 5: Health Check Endpoint
    app.get('/api/health', healthCheckSecurity, async (req, res) => {
      try {
        const [dbHealth, cacheStats, performanceStats] = await Promise.all([
          db.healthCheck(),
          globalCache.getStats(),
          Promise.resolve(performanceMonitor.getStats())
        ]);

        const health = {
          status: dbHealth.healthy ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          version: '0.9.5',
          uptime: process.uptime(),
          database: {
            healthy: dbHealth.healthy,
            responseTime: dbHealth.averageResponseTime,
            connections: dbHealth.connectionCount
          },
          cache: {
            hitRate: cacheStats.hitRate,
            entries: cacheStats.entries,
            memoryUsage: cacheStats.memoryUsage
          },
          performance: {
            requestsPerSecond: performanceStats.requests?.requestsPerSecond || 0,
            averageResponseTime: performanceStats.requests?.averageResponseTime || 0,
            errorRate: performanceStats.requests?.errorRate || 0
          },
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        };

        res.json(health);
        logger.info('Health check completed', { health });
      } catch (error) {
        logger.error('Health check failed', error as Error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        });
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log("🔄 Setting up Vite...");
      await setupVite(app, server);
      console.log("✅ Vite setup complete");
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 4000
    // this serves both the API and the client.
    const port = Number(process.env.PORT || 4000);
    server.listen(port, () => {
      log(`serving on port ${port}`);
      logger.info(`🚀 StackLens v0.9.5 server started on port ${port}`, {
        port,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });

      // Phase 5: Log startup performance metrics
      setTimeout(() => {
        const stats = performanceMonitor.getStats();
        logger.info('Server startup performance', { stats });
      }, 5000);
    });

    // Phase 5: Graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('🔄 Received SIGTERM, shutting down gracefully...');
      logger.info('Server shutdown initiated');

      try {
        await Promise.all([
          db.close(),
          globalCache.clear(),
          logger.close()
        ]);
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error("❌ Fatal server startup error:", error);
    logger.fatal('Server startup failed', error as Error);
    console.error("Stack trace:", (error as Error).stack);

    // Don't exit completely, but log the critical error
    console.log("🔄 Server will continue running in limited mode...");
  }
})();
