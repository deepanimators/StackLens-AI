import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const SESSION_ID = uuidv4();

export interface LogEntry {
    level: 'info' | 'warn' | 'error';
    message: string;
    action?: string;
    user_id?: string;
    product_id?: string;
    error_code?: string;
    stack?: string;
    [key: string]: any;
}

const buffer: any[] = [];
const FLUSH_INTERVAL = 5000;
const BATCH_SIZE = 10;

const flushLogs = async () => {
    if (buffer.length === 0) return;

    const logsToSend = [...buffer];
    buffer.length = 0; // Clear buffer

    try {
        await axios.post('/api/logs/ingest', logsToSend);
    } catch (err) {
        console.error('Failed to send logs', err);
        // Optionally put back in buffer or drop
    }
};

setInterval(flushLogs, FLUSH_INTERVAL);

export const logger = {
    log: (entry: LogEntry) => {
        const logObject = {
            timestamp: new Date().toISOString(),
            request_id: SESSION_ID, // Use session ID as request ID for frontend logs context
            service: 'pos-frontend',
            env: import.meta.env.MODE,
            app_version: '0.1.0',
            ...entry
        };

        console.log(`[${entry.level.toUpperCase()}] ${entry.message}`, logObject);
        buffer.push(logObject);

        if (buffer.length >= BATCH_SIZE) {
            flushLogs();
        }
    },
    info: (message: string, context?: Partial<LogEntry>) => logger.log({ level: 'info', message, ...context }),
    warn: (message: string, context?: Partial<LogEntry>) => logger.log({ level: 'warn', message, ...context }),
    error: (message: string, context?: Partial<LogEntry>) => logger.log({ level: 'error', message, ...context }),
    getSessionId: () => SESSION_ID
};
