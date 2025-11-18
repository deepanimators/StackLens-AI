const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const winston = require('winston');
const http = require('http');

// Setup OTel SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'node-sample-service',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Setup Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'node-sample-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.Http({
      host: 'localhost',
      port: 4318,
      path: '/v1/logs',
      ssl: false
    })
  ],
});

// Sample App
const server = http.createServer((req, res) => {
  if (req.url === '/error') {
    logger.error('Something went wrong', { 
      error_code: 'PRICE_MISSING', 
      user_id: 'u_123',
      request_id: 'req_abc' 
    });
    res.statusCode = 500;
    res.end('Error triggered');
  } else {
    logger.info('Request received', { path: req.url });
    res.end('Hello World');
  }
});

server.listen(8080, () => {
  console.log('Node Sample App listening on port 8080');
  console.log('Trigger error: curl http://localhost:8080/error');
});
