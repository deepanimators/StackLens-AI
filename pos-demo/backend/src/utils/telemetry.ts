import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { logger } from './logger';

const otelCollectorUrl = process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces';

const sdk = new NodeSDK({
    serviceName: 'pos-backend',
    traceExporter: new OTLPTraceExporter({
        url: otelCollectorUrl,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

export const startTelemetry = () => {
    sdk.start();
    logger.info('OpenTelemetry initialized');
};

export const shutdownTelemetry = () => {
    sdk.shutdown()
        .then(() => logger.info('OpenTelemetry SDK shut down successfully'))
        .catch((error: any) => logger.error('Error shutting down OpenTelemetry SDK', { error }));
};
