import winston from 'winston';
import { context } from './context';

const { combine, timestamp, json, printf } = winston.format;

const logFormat = winston.format((info) => {
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

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp(),
        logFormat(),
        json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/app.log' })
    ],
});
