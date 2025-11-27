import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    let statusCode = 500;
    let errorCode = 'UNHANDLED_EXCEPTION';
    let message = 'Internal Server Error';
    let suggestedFix = undefined;
    let contextData = {};

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        errorCode = err.errorCode;
        message = err.message;
        suggestedFix = err.suggestedFix;
        contextData = err.context || {};
    }

    logger.error(message, {
        action: 'error_handler',
        error_code: errorCode,
        status: 'failed',
        stack: err.stack,
        suggested_fix: suggestedFix,
        ...contextData
    });

    res.status(statusCode).json({
        error: errorCode,
        message,
        suggested_fix: suggestedFix,
        request_id: res.getHeader('x-request-id')
    });
};
