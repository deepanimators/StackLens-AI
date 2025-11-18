import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logger } from './logger';

const otelCollectorUrl = process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces';

const sdk = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'pos-backend',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '0.1.0',
    }),
    traceExporter: new OTLPTraceExporter({
        url: otelCollectorUrl,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

export const startTelemetry = () => {
    sdk.start();
    logger.info('OpenTelemetry SDK started');
};

export const shutdownTelemetry = () => {
    sdk.shutdown()
        .then(() => logger.info('OpenTelemetry SDK shut down'))
        .catch((error) => logger.error('Error shutting down OpenTelemetry SDK', { error }));
};
