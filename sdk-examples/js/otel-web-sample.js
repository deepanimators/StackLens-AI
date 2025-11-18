/**
 * StackLens OTel Web SDK - Browser Example
 * 
 * This example demonstrates how to instrument a web application with OpenTelemetry,
 * send logs and traces to StackLens OTLP Collector, with a JSON fallback for unsupported browsers.
 * 
 * Usage:
 *   <script src="otel-web-sample.js"></script>
 *   
 * Environment Variables:
 *   OTEL_COLLECTOR_URL - OTLP HTTP endpoint (default: http://localhost:4318)
 *   OTEL_SERVICE_NAME - Service name (default: web-app)
 *   OTEL_LOG_LEVEL - Log level (default: info)
 */

// ============================================================================
// 1. Initialize OpenTelemetry Web Tracer Provider
// ============================================================================

import { WebTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerContextManager } from "@opentelemetry/api";
import { ZoneContextManager } from "@opentelemetry/context-zone";

// Use ZoneContextManager for async context propagation
registerContextManager(new ZoneContextManager());

const collectorUrl = process.env.OTEL_COLLECTOR_URL || "http://localhost:4318";
const serviceName = process.env.OTEL_SERVICE_NAME || "web-app";
const logLevel = process.env.OTEL_LOG_LEVEL || "info";

// Create OTLP exporter
const otlpExporter = new OTLPTraceExporter({
  url: `${collectorUrl}/v1/traces`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Create tracer provider
const tracerProvider = new WebTracerProvider({
  resource: {
    attributes: {
      "service.name": serviceName,
      "service.version": "1.0.0",
      "telemetry.sdk.language": "javascript",
      "deployment.environment": window.location.hostname === "localhost" ? "dev" : "prod",
    },
  },
});

// Add span processors
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(otlpExporter));

// For debugging in development, also log to console
if (logLevel === "debug") {
  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
}

// Register the tracer provider
tracerProvider.register();

// ============================================================================
// 2. Auto-Instrument Fetch and XMLHttpRequest
// ============================================================================

import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";

new FetchInstrumentation({
  requestHook: (span, request) => {
    span.setAttribute("http.url", request.url);
    span.setAttribute("http.method", request.method);
  },
  responseHook: (span, response) => {
    span.setAttribute("http.status_code", response.status);
  },
}).setTracerProvider(tracerProvider);

new XMLHttpRequestInstrumentation({
  requestHook: (span, request) => {
    span.setAttribute("http.url", request.url);
  },
  responseHook: (span, xhr) => {
    span.setAttribute("http.status_code", xhr.status);
  },
}).setTracerProvider(tracerProvider);

// ============================================================================
// 3. Create a Logger Wrapper for Structured Logging
// ============================================================================

class StackLensLogger {
  constructor(tracerProvider) {
    this.tracer = tracerProvider.getTracer("web-logger", "1.0.0");
    this.collectorUrl = collectorUrl;
    this.requestQueue = [];
    this.flushInterval = 5000; // Flush every 5 seconds
    this.batchSize = 10; // Or when batch is full
    
    // Auto-flush periodically
    setInterval(() => this.flush(), this.flushInterval);
    
    // Flush on page unload
    window.addEventListener("beforeunload", () => {
      this.flush(true);
    });
  }

  /**
   * Log a message with structured data
   */
  log(level, message, context = {}) {
    const span = this.tracer.startSpan(`log.${level}`);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: serviceName,
      level: level,
      message: message,
      trace_id: span.spanContext().traceId,
      span_id: span.spanContext().spanId,
      request_id: this.getOrCreateRequestId(),
      app_version: "1.0.0",
      env: window.location.hostname === "localhost" ? "dev" : "prod",
      attrs: context,
      source_file: this._getSourceFile(),
      line_number: this._getLineNumber(),
      user_agent: navigator.userAgent,
      ip_address: context.ip_address || null,
      http_url: window.location.href,
    };

    span.addEvent("log_created", logEntry);
    span.end();

    // Queue for batch sending
    this.requestQueue.push(logEntry);

    // Flush if batch is full
    if (this.requestQueue.length >= this.batchSize) {
      this.flush();
    }

    // Also log to console in debug mode
    if (logLevel === "debug") {
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    }
  }

  debug(message, context = {}) {
    this.log("debug", message, context);
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

  /**
   * Send batched logs to StackLens via JSON fallback endpoint
   */
  async flush(wait = false) {
    if (this.requestQueue.length === 0) return;

    const batch = this.requestQueue.splice(0, this.batchSize);
    
    try {
      const response = await fetch(`${this.collectorUrl.replace("/v1/traces", "")}/api/ingest/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
        keepalive: wait, // Use keepalive on page unload
      });

      if (!response.ok) {
        console.error(`Failed to send logs: ${response.status}`, response.statusText);
        // Re-queue failed logs
        this.requestQueue.unshift(...batch);
      }
    } catch (error) {
      console.error("Failed to flush logs:", error);
      // Re-queue failed logs
      this.requestQueue.unshift(...batch);
    }
  }

  /**
   * Get or create a request ID for correlation
   */
  getOrCreateRequestId() {
    if (!window.__requestId) {
      window.__requestId = this._generateUUID();
    }
    return window.__requestId;
  }

  _getSourceFile() {
    // Try to extract from stack trace
    const stack = new Error().stack;
    if (stack) {
      const match = stack.match(/\((.*?):\d+:\d+\)/);
      return match ? match[1] : "unknown";
    }
    return "unknown";
  }

  _getLineNumber() {
    const stack = new Error().stack;
    if (stack) {
      const match = stack.match(/:(\d+):/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }

  _generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// ============================================================================
// 4. Create Global Logger Instance
// ============================================================================

const logger = new StackLensLogger(tracerProvider);

// Expose globally
window.logger = logger;
window.otelTracerProvider = tracerProvider;

// ============================================================================
// 5. Auto-Log Unhandled Errors and Rejected Promises
// ============================================================================

window.addEventListener("error", (event) => {
  logger.error("Unhandled Error", {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error?.stack,
    error_code: "UNHANDLED_EXCEPTION",
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logger.error("Unhandled Promise Rejection", {
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
    error_code: "UNHANDLED_EXCEPTION",
  });
});

// ============================================================================
// 6. Helper: Wrap API Calls with Tracing
// ============================================================================

export function traceHttpCall(spanName, fetchPromise) {
  const span = tracerProvider.getTracer("web-app").startSpan(spanName);
  
  return fetchPromise
    .then((response) => {
      span.setAttribute("http.status_code", response.status);
      return response;
    })
    .catch((error) => {
      span.recordException(error);
      span.setAttribute("error", true);
      throw error;
    })
    .finally(() => {
      span.end();
    });
}

// ============================================================================
// 7. Example Usage
// ============================================================================

// Log page load
logger.info("Page loaded", {
  url: window.location.href,
  referrer: document.referrer,
  userAgent: navigator.userAgent,
  action: "page_load",
  status: "success",
});

// Example: Trace a fetch call
export function fetchUserData(userId) {
  return traceHttpCall(`fetch_user_${userId}`, 
    fetch(`/api/users/${userId}`)
      .then((r) => {
        if (!r.ok) {
          logger.error("Failed to fetch user data", {
            user_id: userId,
            http_status_code: r.status,
            error_code: "API_ERROR",
            action: "fetch_user",
            status: "failure",
          });
          throw new Error(`HTTP ${r.status}`);
        }
        logger.debug("User data fetched successfully", {
          user_id: userId,
          action: "fetch_user",
          status: "success",
        });
        return r.json();
      })
  );
}

// Example: Trace a form submission
export function submitForm(formData) {
  const span = tracerProvider.getTracer("web-app").startSpan("form_submit");
  
  try {
    span.setAttribute("form_fields", Object.keys(formData).length);
    
    return fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((r) => {
        if (!r.ok) {
          logger.error("Form submission failed", {
            status_code: r.status,
            error_code: "FORM_SUBMIT_ERROR",
            action: "form_submit",
            status: "failure",
          });
          throw new Error(`HTTP ${r.status}`);
        }
        logger.info("Form submitted successfully", {
          action: "form_submit",
          status: "success",
        });
        return r.json();
      })
      .finally(() => span.end());
  } catch (error) {
    span.recordException(error);
    span.setAttribute("error", true);
    span.end();
    throw error;
  }
}

// ============================================================================
// 8. Export for Testing and Integration
// ============================================================================

export { logger, tracerProvider };
