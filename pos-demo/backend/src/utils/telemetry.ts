import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { logger } from './logger';

// OTel collector endpoint - accessible from host machine
// Docker compose exposes it on localhost:4318
const otelCollectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

// Note: We're using winston HTTP transport for logs (see logger.ts)
// This setup focuses on trace export via OTLP for distributed tracing
const sdk = new NodeSDK({
    serviceName: 'pos-backend',
    traceExporter: new OTLPTraceExporter({
        url: `${otelCollectorUrl}/v1/traces`,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

export const startTelemetry = () => {
    sdk.start();
    logger.info('OpenTelemetry initialized', {
        tracesEndpoint: `${otelCollectorUrl}/v1/traces`,
        logsVia: 'winston-http-transport',
    });
};

export const shutdownTelemetry = () => {
    sdk.shutdown()
        .then(() => logger.info('OpenTelemetry SDK shut down successfully'))
        .catch((error: any) => logger.error('Error shutting down OpenTelemetry SDK', { error }));
};
