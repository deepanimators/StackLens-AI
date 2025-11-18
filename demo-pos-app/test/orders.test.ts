/**
 * Integration tests for Orders API
 * Tests the key scenarios:
 * - Successful order creation
 * - PRICE_MISSING alert trigger
 * - Product not found
 * - Invalid request
 */

import request from 'supertest';
import express from 'express';
import { createOrdersRouter } from '../src/routes/orders';
import { createProductsRouter } from '../src/routes/products';

describe('Orders API', () => {
  let app: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(createProductsRouter());
    app.use(createOrdersRouter());
  });

  describe('POST /order', () => {
    test('creates order successfully with valid product', async () => {
      const res = await request(app)
        .post('/order')
        .send({
          product_id: 'prod_laptop',
          user_id: 'user123',
          quantity: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order_id).toBeDefined();
      expect(res.body.data.product_id).toBe('prod_laptop');
      expect(res.body.data.price).toBe(999.99);
      expect(res.body.data.quantity).toBe(1);
      expect(res.body.data.total).toBe(999.99);
    });

    test('returns 400 PRICE_MISSING when ordering product with null price', async () => {
      const res = await request(app)
        .post('/order')
        .send({
          product_id: 'prod_mouse_defect',
          user_id: 'user456',
          quantity: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error_code).toBe('PRICE_MISSING');
      expect(res.body.request_id).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });

    test('returns 404 when product does not exist', async () => {
      const res = await request(app)
        .post('/order')
        .send({
          product_id: 'prod_nonexistent',
          user_id: 'user789',
          quantity: 1,
        });

      expect(res.status).toBe(404);
      expect(res.body.error_code).toBe('PRODUCT_NOT_FOUND');
    });

    test('returns 400 when product_id is missing', async () => {
      const res = await request(app)
        .post('/order')
        .send({
          user_id: 'user999',
          quantity: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error_code).toBe('INVALID_REQUEST');
    });

    test('returns 400 when quantity is invalid', async () => {
      const res = await request(app)
        .post('/order')
        .send({
          product_id: 'prod_laptop',
          user_id: 'user111',
          quantity: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error_code).toBe('INVALID_QUANTITY');
    });

    test('calculates total correctly for multiple quantities', async () => {
      const res = await request(app)
        .post('/order')
        .send({
          product_id: 'prod_keyboard',
          user_id: 'user222',
          quantity: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.price).toBe(149.99);
      expect(res.body.data.quantity).toBe(2);
      expect(res.body.data.total).toBe(299.98);
    });

    test('defaults quantity to 1 if not provided', async () => {
      const res = await request(app)
        .post('/order')
        .send({
          product_id: 'prod_monitor',
          user_id: 'user333',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.quantity).toBe(1);
      expect(res.body.data.total).toBe(399.99);
    });

    test('defaults user_id to "anonymous" if not provided', async () => {
      const res = await request(app)
        .post('/order')
        .send({
          product_id: 'prod_headphones',
          quantity: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order_id).toBeDefined();
    });
  });
});

describe('Products API', () => {
  let app: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(createProductsRouter());
  });

  describe('GET /products', () => {
    test('returns list of all products', async () => {
      const res = await request(app).get('/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
    });

    test('includes product with null price in list', async () => {
      const res = await request(app).get('/products');

      expect(res.status).toBe(200);
      const nullPriceProduct = res.body.data.find(
        (p: any) => p.id === 'prod_mouse_defect',
      );
      expect(nullPriceProduct).toBeDefined();
      expect(nullPriceProduct.price).toBeNull();
    });
  });

  describe('GET /products/:id', () => {
    test('returns product by valid id', async () => {
      const res = await request(app).get('/products/prod_laptop');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('prod_laptop');
      expect(res.body.data.price).toBe(999.99);
    });

    test('returns 404 for non-existent product id', async () => {
      const res = await request(app).get('/products/prod_invalid');

      expect(res.status).toBe(404);
      expect(res.body.error_code).toBe('PRODUCT_NOT_FOUND');
    });

    test('returns product with null price', async () => {
      const res = await request(app).get('/products/prod_mouse_defect');

      expect(res.status).toBe(200);
      expect(res.body.data.price).toBeNull();
    });

    test('all products have expected properties', async () => {
      const res = await request(app).get('/products');

      expect(res.status).toBe(200);
      res.body.data.forEach((product: any) => {
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('sku');
        expect(product).toHaveProperty('price');
      });
    });

    test('product count matches array length', async () => {
      const res = await request(app).get('/products');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(res.body.data.length);
    });
  });
});
