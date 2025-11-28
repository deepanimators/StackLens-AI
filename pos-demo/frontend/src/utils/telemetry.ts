import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// Get OTEL URL from environment or use default
const getOtelUrl = (): string => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.VITE_OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces';
    }
    return 'http://localhost:4318/v1/traces';
};

const exporter = new OTLPTraceExporter({
    url: getOtelUrl(),
});

const resource = new Resource({
    [ATTR_SERVICE_NAME]: 'pos-frontend',
    [ATTR_SERVICE_VERSION]: '0.1.0',
});

const provider = new WebTracerProvider({
    resource: resource,
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));

provider.register();

registerInstrumentations({
    instrumentations: [
        getWebAutoInstrumentations({
            // load custom configuration for xml-http-request instrumentation
            '@opentelemetry/instrumentation-xml-http-request': {
                propagateTraceHeaderCorsUrls: [
                    /.+/g, // Propagate to all urls
                ],
            },
            '@opentelemetry/instrumentation-fetch': {
                propagateTraceHeaderCorsUrls: [
                    /.+/g, // Propagate to all urls
                ],
            },
        }),
    ],
});

export const initTelemetry = () => {
    console.log('Telemetry initialized');
};
