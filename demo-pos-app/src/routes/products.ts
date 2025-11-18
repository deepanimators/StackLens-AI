/**
 * Products API route handlers
 * GET /products - List all products
 * GET /products/:id - Get single product
 */

import { Router, Request, Response } from 'express';
import { getAllProducts, getProductById } from '../db/seed';
import { logger } from '../logger';
import { v4 as uuidv4 } from 'uuid';

export const createProductsRouter = () => {
  const router = Router();

  /**
   * GET /products
   * Returns list of all available products
   */
  router.get('/products', (req: Request, res: Response) => {
    const requestId = uuidv4();
    try {
      const products = getAllProducts();
      
      logger.info('Products listed', {
        request_id: requestId,
        action: 'list_products',
        product_count: products.length,
      });

      return res.status(200).json({
        success: true,
        count: products.length,
        data: products,
      });
    } catch (error) {
      logger.error('Error listing products', {
        request_id: requestId,
        action: 'list_products',
        error: error instanceof Error ? error.message : 'Unknown error',
        error_code: 'LIST_PRODUCTS_ERROR',
      });

      return res.status(500).json({
        error: 'Failed to list products',
        error_code: 'LIST_PRODUCTS_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /products/:id
   * Returns a single product by ID
   */
  router.get('/products/:id', (req: Request, res: Response) => {
    const requestId = uuidv4();
    const { id } = req.params;

    try {
      const product = getProductById(id);

      if (!product) {
        logger.warn('Product not found', {
          request_id: requestId,
          action: 'get_product',
          product_id: id,
          error_code: 'PRODUCT_NOT_FOUND',
        });

        return res.status(404).json({
          error: 'Product not found',
          error_code: 'PRODUCT_NOT_FOUND',
          request_id: requestId,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info('Product retrieved', {
        request_id: requestId,
        action: 'get_product',
        product_id: id,
        price: product.price,
      });

      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error('Error retrieving product', {
        request_id: requestId,
        action: 'get_product',
        product_id: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        error_code: 'GET_PRODUCT_ERROR',
      });

      return res.status(500).json({
        error: 'Failed to retrieve product',
        error_code: 'GET_PRODUCT_ERROR',
        request_id: requestId,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
};
