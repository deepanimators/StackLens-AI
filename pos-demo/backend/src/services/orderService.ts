import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';
import { getProduct, updateStock } from './productService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const createOrder = async (productId: string, qty: number, userId: string, idempotencyKey?: string) => {
    // 6. DB Connection Error Simulation
    if (userId === 'user_db_fail') {
        throw new AppError('Database connection lost', 'DB_CONNECTION_ERROR', 500, 'Check DB status');
    }

    // 10. Unhandled Exception Simulation
    if (userId === 'user_crash') {
        throw new Error('Random crash occurred');
    }

    const product = await getProduct(productId);
    if (!product) {
        throw new AppError('Product not found', 'DATA_VALIDATION_ERROR', 400, 'Check product ID');
    }

    // 1. Price Missing
    if (product.price === null || product.price === undefined) {
        throw new AppError('Product price is missing', 'PRICE_MISSING', 400, 'Set a valid price');
    }

    // 2. Inventory Unavailable
    if (product.stock < qty) {
        throw new AppError('Insufficient stock', 'INVENTORY_UNAVAILABLE', 400, 'Restock product', { stock_level: product.stock });
    }

    // 5. External Timeout (e.g. Pricing Service)
    if (userId === 'user_timeout') {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
        throw new AppError('Pricing service timed out', 'EXTERNAL_TIMEOUT', 504, 'Retry later', { service: 'pricing' });
    }

    // 8. Tax Calculation Error
    if (userId === 'user_tax_fail') {
        throw new AppError('Invalid tax calculation', 'TAX_CALC_ERROR', 500, 'Check tax service', { tax_amount: -10 });
    }

    // 9. Authorization Failure
    if (userId === 'user_authz_fail') {
        throw new AppError('User not authorized', 'AUTHZ_FAILURE', 403, 'Check permissions', { user_role: 'guest' });
    }

    // 3. Payment Failure
    if (userId === 'user_payment_fail') {
        throw new AppError('Payment gateway rejected transaction', 'PAYMENT_FAILURE', 402, 'Try different card', { gateway: 'stripe', amount: product.price * qty });
    }

    // 7. Duplicate Order (Simulated logic)
    if (idempotencyKey && idempotencyKey.startsWith('dup_')) {
        throw new AppError('Duplicate order detected', 'DUPLICATE_ORDER', 409, 'Do not retry', { duplicate_of: 'existing_id' });
    }

    // Proceed to create order
    await updateStock(productId, qty);

    const orderId = uuidv4();
    const totalAmount = product.price * qty;

    const db = await getDb();
    const stmt = db.prepare(
        'INSERT INTO orders (id, product_id, user_id, qty, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(orderId, productId, userId, qty, totalAmount, 'completed');

    logger.info('Order created successfully', {
        action: 'create_order',
        order_id: orderId,
        amount: totalAmount,
        qty
    });

    return { orderId, status: 'confirmed', totalAmount };
};
