/**
 * Winston structured JSON logger for POS Demo Service
 * Logs are formatted as JSON with consistent metadata
 */

import winston from 'winston';
import fs from 'fs';
import path from 'path';

const logsDir = path.join(__dirname, '../..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

export const createLogger = () => {
    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
        ),
        defaultMeta: {
            service: 'pos-demo',
            env: process.env.NODE_ENV || 'development',
            app_version: '1.0.0',
        },
        transports: [
            // Error log file
            new winston.transports.File({
                filename: path.join(logsDir, 'error.log'),
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
            // Combined log file
            new winston.transports.File({
                filename: path.join(logsDir, 'combined.log'),
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
            // Console output (filtered by level in production)
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple(),
                ),
            }),
        ],
    });
};

export const logger = createLogger();

/**
 * Log order-related event with structured context
 */
export const logOrder = (
    logLevel: string,
    message: string,
    metadata: {
        request_id: string;
        user_id?: string;
        product_id?: string;
        action: string;
        price?: number | null;
        error_code?: string;
        quantity?: number;
    },
) => {
    logger.log(logLevel, message, {
        ...metadata,
        timestamp: new Date().toISOString(),
    });
};

export default logger;
