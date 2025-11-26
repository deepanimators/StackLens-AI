import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { logger } from './logger';

// OTel collector endpoint - accessible from host machine
// Docker compose exposes it on localhost:4318
const otelCollectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const sdk = new NodeSDK({
    serviceName: 'pos-backend',
    serviceVersion: process.env.APP_VERSION || '0.1.0',
    traceExporter: new OTLPTraceExporter({
        url: `${otelCollectorUrl}/v1/traces`,
    }),
    logRecordProcessor: new BatchLogRecordProcessor(
        new OTLPLogExporter({
            url: `${otelCollectorUrl}/v1/logs`,
        })
    ),
    instrumentations: [getNodeAutoInstrumentations()],
});

export const startTelemetry = () => {
    sdk.start();
    logger.info('OpenTelemetry initialized', {
        tracesEndpoint: `${otelCollectorUrl}/v1/traces`,
        logsEndpoint: `${otelCollectorUrl}/v1/logs`,
    });
};

export const shutdownTelemetry = () => {
    sdk.shutdown()
        .then(() => logger.info('OpenTelemetry SDK shut down successfully'))
        .catch((error: any) => logger.error('Error shutting down OpenTelemetry SDK', { error }));
};
