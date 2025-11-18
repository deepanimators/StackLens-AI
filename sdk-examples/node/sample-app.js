/**
 * StackLens OTEL Pipeline - Sample Express Application
 *
 * This application demonstrates:
 * - OpenTelemetry SDK integration with auto-instrumentation
 * - Structured logging with request correlation
 * - Error tracking and alerting scenarios
 * - Database operations instrumentation
 * - External API call tracing
 *
 * Run with:
 *   npm install
 *   node sample-app.js
 *
 * Then curl:
 *   curl http://localhost:3000/health
 *   curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" \
 *     -d '{"product_id": "SKU-123", "price": 99.99, "quantity": 1}'
 */

// =====================================================================
// OpenTelemetry Setup (from otel-node-sample.js)
// =====================================================================

const {
  NodeSDK,
  tracing: { getNodeAutoInstrumentations },
} = require('@opentelemetry/sdk-node');

const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { getNodeAutoInstrumentations: getAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { CompositePropagator, W3CTraceContextPropagator } = require('@opentelemetry/core');
const { JaegerPropagator } = require('@opentelemetry/propagator-jaeger');
const { B3Propagator } = require('@opentelemetry/propagator-b3');

// =====================================================================
// Initialize OpenTelemetry SDK
// =====================================================================

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
  headers: {},
  concurrencyLimit: 10,
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
  }),
  intervalMillis: 5000,
});

const sdk = new NodeSDK({
  traceExporter,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-fs': {
        enabled: true,
      },
    }),
  ],
  propagators: [
    new CompositePropagator({
      propagators: [
        new JaegerPropagator(),
        new B3Propagator(),
        new W3CTraceContextPropagator(),
      ],
    }),
  ],
});

sdk.start();

console.log('🔭 OpenTelemetry SDK initialized');

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('✓ OpenTelemetry SDK shut down gracefully'))
    .catch((err) => console.error('Error shutting down SDK:', err));
});

// =====================================================================
// Structured Logger (from otel-node-sample.js)
// =====================================================================

const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const crypto = require('crypto');

class StackLensLogger {
  constructor(serviceName = 'sample-app') {
    this.serviceName = serviceName;
    this.tracer = trace.getTracer('stacklens-sample');
    this.queue = [];
    this.flushInterval = 5000;
    this.batchSize = 50;

    // Start periodic flush
    setInterval(() => this._flush(), this.flushInterval);
  }

  log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      level: level.toUpperCase(),
      message,
      ...meta,
      app_version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      hostname: require('os').hostname(),
    };

    // Add trace/span context if available
    const span = trace.getActiveSpan();
    if (span) {
      logEntry.trace_id = span.spanContext().traceId;
      logEntry.span_id = span.spanContext().spanId;
    }

    this.queue.push(logEntry);

    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      this._flush();
    }
  }

  async _flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);

    try {
      // In production, this would POST to /api/ingest/log
      // For now, we just print to console
      batch.forEach((entry) => {
        console.log(
          `[${entry.timestamp}] [${entry.level}] [${entry.service}] ${entry.message}`,
          Object.keys(entry).length > 5 ? entry : ''
        );
      });
    } catch (err) {
      console.error('Error flushing logs:', err.message);
      // Put logs back in queue on failure
      this.queue.unshift(...batch);
    }
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  error(message, meta) {
    this.log('error', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  debug(message, meta) {
    this.log('debug', message, meta);
  }
}

const logger = new StackLensLogger('stacklens-sample-app');

// =====================================================================
// Express Application Setup
// =====================================================================

const express = require('express');
const app = express();
app.use(express.json());

// Request tracking middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('x-request-id', requestId);

  logger.info(`${req.method} ${req.path}`, {
    request_id: requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error in ${req.path}`, {
    request_id: req.id,
    error_message: err.message,
    error_code: 'INTERNAL_ERROR',
    status: 500,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    request_id: req.id,
  });
});

// =====================================================================
// Simulated Data Store
// =====================================================================

const products = {
  'SKU-001': { id: 'SKU-001', name: 'Widget', price: 29.99 },
  'SKU-002': { id: 'SKU-002', name: 'Gadget', price: 49.99 },
  'SKU-003': { id: 'SKU-003', name: 'Premium Widget', price: 0 }, // Missing price - triggers alert
};

const orders = [];

// =====================================================================
// Routes - Demonstrating Various Scenarios
// =====================================================================

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  const tracer = trace.getTracer('sample-app');
  tracer.startActiveSpan('health-check', (span) => {
    logger.debug('Health check requested');
    span.setStatus({ code: SpanStatusCode.OK });
    res.json({ status: 'healthy', service: 'sample-app' });
    span.end();
  });
});

/**
 * Create Order Endpoint
 * Demonstrates:
 * - Product lookup (with missing price alert scenario)
 * - Database insert
 * - Payment API call
 * - Alert generation
 */
app.post('/orders', (req, res) => {
  const tracer = trace.getTracer('sample-app');

  tracer.startActiveSpan('create-order', async (span) => {
    try {
      const { product_id, quantity = 1 } = req.body;
      const requestId = req.id;

      logger.info('Processing order creation', {
        request_id: requestId,
        product_id,
        quantity,
      });

      // Validate product exists
      const product = products[product_id];
      if (!product) {
        span.recordException(new Error('Product not found'));
        span.setStatus({ code: SpanStatusCode.ERROR });

        logger.error('Product not found', {
          request_id: requestId,
          product_id,
          error_code: 'PRODUCT_NOT_FOUND',
          status: 404,
        });

        return res.status(404).json({
          error: 'Product not found',
          request_id: requestId,
        });
      }

      // Check for PRICE_MISSING alert scenario
      if (!product.price || product.price === 0) {
        span.addEvent('price_missing_detected');

        logger.error('Product price is missing', {
          request_id: requestId,
          product_id,
          error_code: 'PRICE_MISSING',
          severity: 'high',
          automation_action: 'ALERT_ADMIN',
        });
      }

      // Simulate database insert
      const order = {
        id: `ORD-${Date.now()}`,
        product_id,
        quantity,
        total: (product.price || 0) * quantity,
        status: 'created',
        created_at: new Date().toISOString(),
        request_id: requestId,
      };

      orders.push(order);

      span.addEvent('order_created', {
        order_id: order.id,
        total: order.total,
      });

      logger.info('Order created successfully', {
        request_id: requestId,
        order_id: order.id,
        product_id,
        total: order.total,
        action: 'order.created',
      });

      // Simulate payment API call (would use traceApiCall wrapper in production)
      if (order.total > 0) {
        tracer.startActiveSpan('process-payment', (paymentSpan) => {
          // Simulate payment success/failure randomly
          const paymentSuccess = Math.random() > 0.2; // 80% success rate

          if (!paymentSuccess) {
            paymentSpan.recordException(new Error('Payment processing failed'));
            paymentSpan.setStatus({ code: SpanStatusCode.ERROR });

            logger.error('Payment processing failed', {
              request_id: requestId,
              order_id: order.id,
              error_code: 'PAYMENT_FAILURE',
              status: 402,
              severity: 'high',
              automation_action: 'RETRY_PAYMENT',
            });

            order.status = 'payment_failed';
            return res.status(402).json({
              error: 'Payment failed',
              request_id: requestId,
            });
          }

          order.status = 'paid';
          paymentSpan.addEvent('payment_successful', {
            amount: order.total,
          });

          logger.info('Payment processed successfully', {
            request_id: requestId,
            order_id: order.id,
            amount: order.total,
          });

          paymentSpan.end();
        });
      }

      span.setStatus({ code: SpanStatusCode.OK });
      res.json({
        message: 'Order created successfully',
        order,
        request_id: requestId,
      });
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });

      logger.error('Order creation failed', {
        request_id: req.id,
        error_message: err.message,
        error_code: 'ORDER_CREATION_ERROR',
      });

      res.status(500).json({
        error: err.message,
        request_id: req.id,
      });
    } finally {
      span.end();
    }
  });
});

/**
 * Get Orders Endpoint
 */
app.get('/orders', (req, res) => {
  const tracer = trace.getTracer('sample-app');

  tracer.startActiveSpan('list-orders', (span) => {
    logger.debug('Fetching orders list', {
      request_id: req.id,
      count: orders.length,
    });

    span.addEvent('orders_retrieved', {
      count: orders.length,
    });

    span.end();
    res.json({
      orders,
      total: orders.length,
      request_id: req.id,
    });
  });
});

/**
 * Trigger Error Scenario
 * For testing error tracking and alerting
 */
app.post('/test-error', (req, res) => {
  const tracer = trace.getTracer('sample-app');

  tracer.startActiveSpan('test-error', (span) => {
    const { error_type = 'unhandled_exception' } = req.body;

    logger.error(`Test error: ${error_type}`, {
      request_id: req.id,
      error_code: error_type.toUpperCase(),
      severity: 'high',
    });

    span.recordException(new Error(error_type));
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();

    res.json({
      message: 'Test error logged',
      request_id: req.id,
      error_type,
    });
  });
});

// =====================================================================
// Server Startup
// =====================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║ StackLens OTEL Sample App Running         ║
╚═══════════════════════════════════════════╝

Service:  stacklens-sample-app
Port:     ${PORT}
Version:  1.0.0
OTEL:     http://localhost:4318 (traces/logs)

Available Endpoints:
  GET  /health              - Health check
  POST /orders              - Create order (triggers alerts)
  GET  /orders              - List orders
  POST /test-error          - Trigger error scenario

Example Requests:
  # Create order with valid product
  curl -X POST http://localhost:${PORT}/orders \\
    -H "Content-Type: application/json" \\
    -d '{"product_id": "SKU-001", "quantity": 2}'

  # Create order with missing price (triggers PRICE_MISSING alert)
  curl -X POST http://localhost:${PORT}/orders \\
    -H "Content-Type: application/json" \\
    -d '{"product_id": "SKU-003", "quantity": 1}'

  # Trigger error
  curl -X POST http://localhost:${PORT}/test-error \\
    -H "Content-Type: application/json" \\
    -d '{"error_type": "payment_failure"}'

Check logs in Kibana: http://localhost:5601
View traces in Jaeger: http://localhost:16686
  `);

  logger.info('Application started', {
    port: PORT,
    service: 'stacklens-sample-app',
    version: '1.0.0',
  });
});
