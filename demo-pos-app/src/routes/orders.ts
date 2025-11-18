/**
 * Orders API route handlers
 * POST /order - Create an order
 * Logs structured JSON events, triggers PRICE_MISSING alert if product has null price
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logOrder } from '../logger';
import { getProductById } from '../db/seed';
import { OrderRequest, OrderResponse, ErrorResponse } from '../types';

export const createOrdersRouter = () => {
  const router = Router();

  /**
   * POST /order
   * Create new order from product
   * Validates product exists and has price
   * Returns 201 if successful, 400/404 if validation fails
   */
  router.post('/order', (req: Request, res: Response) => {
    const requestId = uuidv4();
    const { product_id, user_id = 'anonymous', quantity = 1 }: OrderRequest = req.body;

    // Validate inputs
    if (!product_id) {
      logOrder('error', 'Order creation failed: missing product_id', {
        request_id: requestId,
        user_id,
        action: 'create_order',
        error_code: 'INVALID_REQUEST',
      });

      return res.status(400).json({
        error: 'product_id is required',
        error_code: 'INVALID_REQUEST',
        request_id: requestId,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    if (quantity < 1) {
      logOrder('error', 'Order creation failed: invalid quantity', {
        request_id: requestId,
        user_id,
        product_id,
        action: 'create_order',
        quantity,
        error_code: 'INVALID_QUANTITY',
      });

      return res.status(400).json({
        error: 'quantity must be >= 1',
        error_code: 'INVALID_QUANTITY',
        request_id: requestId,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    // Check product exists
    const product = getProductById(product_id);

    if (!product) {
      logOrder('warn', 'Order creation failed: product not found', {
        request_id: requestId,
        user_id,
        product_id,
        action: 'create_order',
        error_code: 'PRODUCT_NOT_FOUND',
      });

      return res.status(404).json({
        error: 'Product not found',
        error_code: 'PRODUCT_NOT_FOUND',
        request_id: requestId,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    // Check price is not null - THIS IS THE KEY VALIDATION FOR PRICE_MISSING ALERT
    if (product.price === null) {
      logOrder('error', 'Order creation failed: product has null price', {
        request_id: requestId,
        user_id,
        product_id,
        action: 'create_order',
        price: null,
        quantity,
        error_code: 'PRICE_MISSING',
      });

      return res.status(400).json({
        error: 'Product price is not available',
        error_code: 'PRICE_MISSING',
        request_id: requestId,
        timestamp: new Date().toISOString(),
      } as ErrorResponse);
    }

    // Calculate order total
    const total = product.price * quantity;

    // Log successful order creation
    logOrder('info', 'Order created successfully', {
      request_id: requestId,
      user_id,
      product_id,
      action: 'create_order',
      price: product.price,
      quantity,
    });

    // Return success response
    const response: OrderResponse = {
      order_id: uuidv4(),
      product_id,
      price: product.price,
      quantity,
      total,
      created_at: new Date().toISOString(),
    };

    return res.status(201).json({
      success: true,
      data: response,
    });
  });

  return router;
};
