import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/productService';
import * as orderService from '../services/orderService';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

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
