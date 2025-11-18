/**
 * StackLens OTel Node.js SDK - Server Example
 * 
 * This example demonstrates how to instrument a Node.js application with OpenTelemetry,
 * auto-instrument popular libraries, and send traces/logs to StackLens.
 * 
 * Installation:
 *   npm install @opentelemetry/sdk-node @opentelemetry/auto \
 *     @opentelemetry/sdk-trace-node @opentelemetry/exporter-trace-otlp-http \
 *     @opentelemetry/instrumentation-http @opentelemetry/instrumentation-express \
 *     @opentelemetry/instrumentation-pg @opentelemetry/instrumentation-mysql \
 *     @opentelemetry/instrumentation-redis @opentelemetry/instrumentation-fs \
 *     @opentelemetry/propagator-b3 @opentelemetry/propagator-jaeger \
 *     @opentelemetry/resources @opentelemetry/semantic-conventions
 * 
 * Usage:
 *   import './otel-node-sample.js'; // Must be first import
 *   import express from 'express';
 *   // ... rest of app
 * 
 * Environment Variables:
 *   OTEL_COLLECTOR_URL - OTLP HTTP endpoint (default: http://localhost:4318)
 *   OTEL_SERVICE_NAME - Service name (default: node-app)
 *   OTEL_LOG_LEVEL - Log level (default: info)
 *   NODE_ENV - Environment (dev, staging, prod)
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import {
  SemanticResourceAttributes,
  TelemetrySDKLanguageValues,
} from "@opentelemetry/semantic-conventions";
import { B3Propagator } from "@opentelemetry/propagator-b3";
import { JaegerPropagator } from "@opentelemetry/propagator-jaeger";
import { CompositePropagator } from "@opentelemetry/core";

const collectorUrl = process.env.OTEL_COLLECTOR_URL || "http://localhost:4318";
const serviceName = process.env.OTEL_SERVICE_NAME || "node-app";
const logLevel = process.env.OTEL_LOG_LEVEL || "info";
const environment = process.env.NODE_ENV || "dev";

// ============================================================================
// 1. Setup OpenTelemetry SDK
// ============================================================================

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
    [SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE]: TelemetrySDKLanguageValues.NODEJS,
    "deployment.environment": environment,
    "process.pid": process.pid,
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${collectorUrl}/v1/traces`,
    headers: {
      "Content-Type": "application/json",
    },
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": {
        enabled: true,
        requestHook: (span, request) => {
          span.setAttribute("http.request.path", request.path);
          span.setAttribute("http.request.method", request.method);
        },
        responseHook: (span, response) => {
          span.setAttribute("http.status_code", response.statusCode);
        },
      },
      "@opentelemetry/instrumentation-express": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-pg": {
        enabled: true,
        responseHook: (span, response) => {
          span.setAttribute("db.rows_returned", response?.rowCount || 0);
        },
      },
      "@opentelemetry/instrumentation-mysql": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-redis": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-fs": {
        enabled: true,
      },
    }),
  ],
  propagators: [
    new CompositePropagator({
      propagators: [
        new JaegerPropagator(),
        new B3Propagator(),
      ],
    }),
  ],
});

// Start SDK
sdk.start();

if (logLevel === "debug") {
  console.log(`✓ OpenTelemetry initialized for ${serviceName}`);
  console.log(`  Collector: ${collectorUrl}`);
  console.log(`  Environment: ${environment}`);
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  try {
    await sdk.shutdown();
    if (logLevel === "debug") {
      console.log("✓ OpenTelemetry shut down gracefully");
    }
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

// ============================================================================
// 2. Create a Structured Logger
// ============================================================================

import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer(serviceName, "1.0.0");

class StackLensLogger {
  constructor() {
    this.requestIdMap = new WeakMap();
  }

  /**
   * Log a structured message
   */
  log(level, message, context = {}) {
    const span = tracer.startSpan(`log.${level}`);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: serviceName,
      level: level,
      message: message,
      trace_id: span.spanContext().traceId,
      span_id: span.spanContext().spanId,
      request_id: context.request_id || null,
      app_version: "1.0.0",
      env: environment,
      attrs: context,
      source_file: this._getSourceFile(),
      line_number: this._getLineNumber(),
    };

    span.addEvent("log", logEntry);
    span.end();

    // Log to console
    console.log(JSON.stringify(logEntry));
  }

  debug(message, context = {}) {
    if (logLevel === "debug" || logLevel === "trace") {
      this.log("debug", message, context);
    }
  }

  info(message, context = {}) {
    this.log("info", message, context);
  }

  warn(message, context = {}) {
    this.log("warn", message, context);
  }

  error(message, context = {}) {
    this.log("error", message, context);
  }

  fatal(message, context = {}) {
    this.log("fatal", message, context);
  }

  _getSourceFile() {
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split("\n");
      // Skip first 2 lines (Error and this function)
      const line = lines[3] || "";
      const match = line.match(/\((.*?):\d+:\d+\)/);
      return match ? match[1] : "unknown";
    }
    return "unknown";
  }

  _getLineNumber() {
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split("\n");
      const line = lines[3] || "";
      const match = line.match(/:(\d+):/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }
}

const logger = new StackLensLogger();

// ============================================================================
// 3. Express Middleware for Request Tracking
// ============================================================================

/**
 * Middleware to add request_id and trace context to each request
 */
export function requestTracingMiddleware(req, res, next) {
  // Generate or use existing request ID
  req.request_id = req.headers["x-request-id"] || generateUUID();
  
  // Log request
  logger.info("HTTP request received", {
    request_id: req.request_id,
    http_method: req.method,
    http_url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
    ip_address: req.ip,
    user_agent: req.get("user-agent"),
    action: "http_request",
    status: "pending",
  });

  // Capture response end
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - res.locals.startTime;
    
    logger.info("HTTP response sent", {
      request_id: req.request_id,
      http_method: req.method,
      http_url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      http_status_code: res.statusCode,
      duration_ms: duration,
      action: "http_response",
      status: res.statusCode >= 400 ? "failure" : "success",
    });

    originalEnd.apply(res, args);
  };

  res.locals.startTime = Date.now();
  next();
}

// ============================================================================
// 4. Error Handler Middleware
// ============================================================================

/**
 * Express error handling middleware
 */
export function errorHandlingMiddleware(err, req, res, next) {
  const span = tracer.startSpan("error_handler");
  
  logger.error("Request error", {
    request_id: req?.request_id,
    message: err.message,
    error_code: err.code || "UNHANDLED_EXCEPTION",
    stack: err.stack,
    http_method: req?.method,
    http_url: req?.originalUrl,
    http_status_code: err.status || 500,
    action: "error_handling",
    status: "failure",
  });

  span.recordException(err);
  span.end();

  res.status(err.status || 500).json({
    error: err.message,
    request_id: req?.request_id,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// 5. Database Query Wrapper
// ============================================================================

/**
 * Wrap database queries with tracing
 */
export async function traceDbQuery(queryFn, queryName, context = {}) {
  const span = tracer.startSpan(`db.${queryName}`);
  
  try {
    const startTime = Date.now();
    const result = await queryFn();
    const duration = Date.now() - startTime;

    logger.debug(`Database query: ${queryName}`, {
      query_name: queryName,
      duration_ms: duration,
      ...context,
      action: "db_query",
      status: "success",
    });

    span.setAttribute("db.operation", queryName);
    span.setAttribute("duration_ms", duration);
    
    return result;
  } catch (error) {
    logger.error(`Database query failed: ${queryName}`, {
      query_name: queryName,
      message: error.message,
      error_code: "DB_ERROR",
      ...context,
      action: "db_query",
      status: "failure",
    });

    span.recordException(error);
    span.setAttribute("error", true);
    throw error;
  } finally {
    span.end();
  }
}

// ============================================================================
// 6. External API Call Wrapper
// ============================================================================

/**
 * Wrap external API calls with tracing
 */
export async function traceApiCall(callFn, apiName, context = {}) {
  const span = tracer.startSpan(`api.${apiName}`);
  
  try {
    const startTime = Date.now();
    const result = await callFn();
    const duration = Date.now() - startTime;

    logger.debug(`External API call: ${apiName}`, {
      api_name: apiName,
      duration_ms: duration,
      ...context,
      action: "api_call",
      status: "success",
    });

    span.setAttribute("api.name", apiName);
    span.setAttribute("duration_ms", duration);
    
    return result;
  } catch (error) {
    logger.error(`External API call failed: ${apiName}`, {
      api_name: apiName,
      message: error.message,
      error_code: "EXTERNAL_API_ERROR",
      ...context,
      action: "api_call",
      status: "failure",
    });

    span.recordException(error);
    span.setAttribute("error", true);
    throw error;
  } finally {
    span.end();
  }
}

// ============================================================================
// 7. Utility Functions
// ============================================================================

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// 8. Export Everything
// ============================================================================

export { logger, tracer, generateUUID };

// ============================================================================
// 9. Example Usage (for testing)
// ============================================================================

if (process.env.NODE_ENV === "test") {
  logger.info("StackLens OTel Node SDK initialized", {
    service: serviceName,
    environment: environment,
    collector: collectorUrl,
  });

  // Example: Simulate an order processing
  setTimeout(async () => {
    const span = tracer.startSpan("process_order");
    
    try {
      span.setAttribute("order_id", "order-123");
      span.setAttribute("user_id", "user-456");

      logger.info("Processing order", {
        order_id: "order-123",
        user_id: "user-456",
        action: "process_order",
        status: "pending",
      });

      // Simulate database query
      await traceDbQuery(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { id: "order-123", status: "processing" };
        },
        "insert_order",
        { order_id: "order-123" }
      );

      // Simulate external API call
      await traceApiCall(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return { payment_id: "pay-789", status: "approved" };
        },
        "process_payment",
        { order_id: "order-123", amount: 99.99 }
      );

      logger.info("Order processed successfully", {
        order_id: "order-123",
        action: "process_order",
        status: "success",
        duration_ms: 300,
      });

      span.end();
    } catch (error) {
      logger.error("Order processing failed", {
        message: error.message,
        error_code: "ORDER_PROCESSING_ERROR",
        action: "process_order",
        status: "failure",
      });

      span.recordException(error);
      span.end();
    }
  }, 1000);
}
