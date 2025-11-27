import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { context } from '../utils/context';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    const userId = (req.headers['x-user-id'] as string) || undefined;

    res.setHeader('x-request-id', requestId);

    context.run({ requestId, userId }, () => {
        // Log request
        logger.info('Incoming request', {
            action: 'request_start',
            method: req.method,
            url: req.url,
            user_agent: req.headers['user-agent'],
        });

        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.info('Request completed', {
                action: 'request_end',
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration_ms: duration,
            });
        });

        next();
    });
};
