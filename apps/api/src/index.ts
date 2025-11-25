import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { registerRoutes } from "./routes/main-routes.js";
import enhancedMlRoutes from "./routes/enhanced-ml-training.js";
import { setupVite, serveStatic, log } from "./vite.js";

// CRITICAL: Import sqlite-db to initialize database tables on startup
import "./database/sqlite-db.js";

const app = express();

// Health check endpoint for Playwright
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// CORS configuration for development
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Configure multer for file uploads (used only for fallback, main routes handle uploads)
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// CRITICAL: Only register body parsers for routes that are NOT file uploads
// This prevents express.json() from trying to parse multipart form data
// Routes with multer will handle their own body parsing

// Don't register global body parsers - they interfere with multipart handling
// Instead, parsers will be applied selectively by routes that need them

// Rate limiting for API routes (disabled in test environment)
const apiLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 60 * 1000, // 1s for tests, 1m for prod
  limit: (req: any) => {
    if (process.env.NODE_ENV === 'test' && req.headers['x-test-force-ratelimit']) return 100;
    return process.env.NODE_ENV === 'test' ? 10000 : 100;
  },
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-force-ratelimit'], // Skip rate limiting in test mode unless forced
});

// Apply rate limiter to all API routes
app.use("/api/", apiLimiter);

// CRITICAL: Conditional body parsing middleware
// This applies body parsing to ALL routes EXCEPT file upload routes
// This prevents body-parser from interfering with multer
app.use((req: any, res: any, next: any) => {
  // Skip body parsing for file upload endpoints - multer will handle them
  if (req.path === '/api/upload' || req.path.startsWith('/api/files')) {
    console.log('Skipping body parsing for:', req.path);
    return next();
  }

  // For all other routes, apply body parsers
  express.json({ limit: '50mb' })(req, res, (err: any) => {
    if (err) return next(err);
    express.urlencoded({ extended: false, limit: '50mb' })(req, res, next);
  });
}); app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log("🔄 Starting server initialization...");
    console.log("✅ Database tables initialized");
    const server = await registerRoutes(app);
    app.use(enhancedMlRoutes);
    console.log("✅ Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      // Handle Zod validation errors
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: err.errors,
        });
      }

      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error("❌ Server error:", err);
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
    });
  } catch (error) {
    console.error("❌ Fatal server startup error:", error);
    console.error("Stack trace:", (error as Error).stack);
    // Don't exit, just log the error
    console.log("🔄 Server will continue running in limited mode...");
  }
})();
