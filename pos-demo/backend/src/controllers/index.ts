import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/productService';
import * as orderService from '../services/orderService';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { getRandomError, getErrorById, POS_ERROR_SCENARIOS } from '../utils/pos-errors';
import { v4 as uuidv4 } from 'uuid';

// Helper function to send event to StackLens analytics
async function sendToAnalytics(type: 'info' | 'error' | 'checkout' | 'log', message: string, metadata: any = {}) {
    try {
        const analyticsUrl = process.env.ANALYTICS_URL || 'http://localhost:4000/api/analytics/events';
        const response = await fetch(analyticsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                message,
                timestamp: new Date().toISOString(),
                source: 'pos-backend',
                ...metadata
            })
        });
        if (!response.ok) {
            logger.warn(`Failed to send analytics event: ${response.statusText}`);
        }
    } catch (err) {
        logger.warn('Failed to send analytics event:', err);
        // Don't throw - analytics failure shouldn't break the main operation
    }
}

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const products = await productService.listProducts();
        res.json(products);
    } catch (err) {
        next(err);
    }
};

export const seedProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id, name, sku, price, stock } = req.body;
        await productService.seedProduct({ id, name, sku, price, stock });
        res.status(201).json({ message: 'Product seeded' });
    } catch (err) {
        next(err);
    }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productId, qty, userId, idempotencyKey } = req.body;
        if (!productId || !qty || !userId) {
            throw new AppError('Missing required fields', 'DATA_VALIDATION_ERROR', 400, 'Provide productId, qty, userId');
        }
        const result = await orderService.createOrder(productId, qty, userId, idempotencyKey);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const ingestLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const logs = req.body; // Expecting array of log objects
        if (Array.isArray(logs)) {
            logs.forEach(log => {
                // Re-log frontend logs to our backend log stream
                // We might want to tag them as frontend
                logger.info(log.message, { ...log, service: 'pos-frontend', ingested: true });
            });
        }
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        next(err);
    }
};

export const healthCheck = (req: Request, res: Response) => {
    res.json({ status: 'ok', version: process.env.APP_VERSION || '0.1.0' });
};

// Manual log trigger endpoints for POS demo UI
export const logInfo = (req: Request, res: Response, next: NextFunction) => {
    try {
        const message = 'POS Demo: Item scan initiated';
        logger.info(message, {
            source: 'pos-frontend',
            type: 'info',
            timestamp: new Date().toISOString(),
            userAgent: req.get('user-agent'),
        });

        // Send to analytics
        sendToAnalytics('info', message, {
            userAgent: req.get('user-agent'),
        });

        res.json({ status: 'logged', type: 'info' });
    } catch (err) {
        next(err);
    }
};

export const logError = (req: Request, res: Response, next: NextFunction) => {
    try {
        const message = 'POS Demo: Payment error simulated';
        logger.error(message, {
            source: 'pos-frontend',
            type: 'error',
            timestamp: new Date().toISOString(),
            userAgent: req.get('user-agent'),
        });

        // Send to analytics
        sendToAnalytics('error', message, {
            userAgent: req.get('user-agent'),
        });

        res.json({ status: 'logged', type: 'error' });
    } catch (err) {
        next(err);
    }
};

export const logCheckout = (req: Request, res: Response, next: NextFunction) => {
    try {
        const message = 'POS Demo: Checkout simulation';
        logger.info(message, {
            source: 'pos-frontend',
            type: 'checkout',
            timestamp: new Date().toISOString(),
            userAgent: req.get('user-agent'),
        });

        // Send to analytics
        sendToAnalytics('checkout', message, {
            userAgent: req.get('user-agent'),
        });

        res.json({ status: 'logged', type: 'checkout' });
    } catch (err) {
        next(err);
    }
};

export const logCustom = (req: Request, res: Response, next: NextFunction) => {
    try {
        const { message = 'POS Demo: Custom event', type = 'log' } = req.body;

        logger.info(message, {
            source: 'pos-frontend',
            type,
            timestamp: new Date().toISOString(),
            userAgent: req.get('user-agent'),
            customData: req.body,
        });

        // Send to analytics
        sendToAnalytics(type as any, message, {
            userAgent: req.get('user-agent'),
            customData: req.body,
        });

        res.json({ status: 'logged', type, message });
    } catch (err) {
        next(err);
    }
};

// 🎯 NEW: Trigger a specific error scenario
export const simulateError = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { errorId } = req.params;
        const scenario = getErrorById(errorId);

        if (!scenario) {
            return res.status(404).json({ error: 'Error scenario not found' });
        }

        const errorLog = {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: scenario.message,
            errorCode: scenario.errorCode,
            category: scenario.category,
            severity: scenario.severity,
            component: scenario.affectedComponents[0],
            stackTrace: `Error: ${scenario.message}\n    at ${scenario.affectedComponents[0]} (src/components/${scenario.category}.ts:42:15)\n    at processTransaction (src/core/transaction.ts:128:10)`,
            metadata: {
                scenarioId: scenario.id,
                symptoms: scenario.symptoms,
                businessImpact: scenario.businessImpact,
                user: 'cashier_01',
                terminalId: 'TERM-001'
            }
        };

        // Log to local logger
        logger.error(scenario.message, errorLog);

        // Send to Analytics API
        await sendToAnalytics('error', scenario.message, errorLog);

        res.json({
            success: true,
            message: `Simulated error: ${scenario.name}`,
            scenario
        });
    } catch (err) {
        next(err);
    }
};

// 🎯 NEW: Trigger a random error
export const simulateRandomError = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const scenario = getRandomError();

        const errorLog = {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: scenario.message,
            errorCode: scenario.errorCode,
            category: scenario.category,
            severity: scenario.severity,
            component: scenario.affectedComponents[0],
            stackTrace: `Error: ${scenario.message}\n    at ${scenario.affectedComponents[0]} (src/components/${scenario.category}.ts:42:15)\n    at processTransaction (src/core/transaction.ts:128:10)`,
            metadata: {
                scenarioId: scenario.id,
                symptoms: scenario.symptoms,
                businessImpact: scenario.businessImpact,
                user: 'cashier_02',
                terminalId: 'TERM-005'
            }
        };

        // Log to local logger
        logger.error(scenario.message, errorLog);

        // Send to Analytics API
        await sendToAnalytics('error', scenario.message, errorLog);

        res.json({
            success: true,
            message: `Simulated random error: ${scenario.name}`,
            scenario
        });
    } catch (err) {
        next(err);
    }
};

// 🎯 NEW: Trigger multiple errors (stress test)
export const simulateBatchErrors = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { count = 5 } = req.body;
        const results = [];

        for (let i = 0; i < Math.min(count, 20); i++) {
            const scenario = getRandomError();

            const errorLog = {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: scenario.message,
                errorCode: scenario.errorCode,
                category: scenario.category,
                severity: scenario.severity,
                component: scenario.affectedComponents[0],
                metadata: {
                    scenarioId: scenario.id,
                    batchId: uuidv4(),
                    iteration: i
                }
            };

            logger.error(scenario.message, errorLog);
            await sendToAnalytics('error', scenario.message, errorLog);
            results.push(scenario.id);
        }

        res.json({
            success: true,
            message: `Simulated ${results.length} errors`,
            scenarios: results
        });
    } catch (err) {
        next(err);
    }
};


