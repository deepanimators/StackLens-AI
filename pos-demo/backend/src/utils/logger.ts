import winston from 'winston';
import Transport from 'winston-transport';
import { context } from './context';

const { combine, timestamp, json, printf } = winston.format;

const logFormat = winston.format((info: any) => {
    const store = context.getStore();
    if (store) {
        info.request_id = store.requestId;
        if (store.userId) info.user_id = store.userId;
        if (store.productId) info.product_id = store.productId;
    }

    // Ensure required fields are present or default
    info.service = 'pos-backend';
    info.env = process.env.NODE_ENV || 'development';
    info.app_version = process.env.APP_VERSION || '0.1.0';

    return info;
});

// Custom transport to send logs to StackLens Analytics
class StackLensTransport extends Transport {
    constructor(opts?: Transport.TransportStreamOptions) {
        super(opts);
    }

    log(info: any, callback: () => void) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        // Send log to StackLens analytics endpoint
        const analyticsUrl = process.env.ANALYTICS_URL || 'http://localhost:4000/api/analytics/events';

        // Determine event type based on log level
        let eventType: 'info' | 'error' | 'checkout' | 'log' = 'log';
        if (info.level === 'error') {
            eventType = 'error';
        } else if (info.level === 'info') {
            // Check if it's a checkout event from the message or metadata
            if (info.message?.includes('checkout') || info.type === 'checkout') {
                eventType = 'checkout';
            } else {
                eventType = 'info';
            }
        }

        const payload = {
            type: eventType,
            message: info.message || '',
            timestamp: info.timestamp || new Date().toISOString(),
            source: info.source || 'pos-backend',
            level: info.level,
            service: info.service,
            env: info.env,
            app_version: info.app_version,
            request_id: info.request_id,
            user_id: info.user_id,
            product_id: info.product_id,
            stack: info.stack,
            ...info
        };

        // Send async without blocking
        fetch(analyticsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => {
            // Silently fail - don't let analytics failure break the app
            // Only log to console in development
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to send log to StackLens:', err.message);
            }
        });

        callback();
    }
}

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp(),
        logFormat(),
        json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/app.log' }),
        new StackLensTransport()
    ],
});
