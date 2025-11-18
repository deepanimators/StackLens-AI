import request from 'supertest';
import app from '../app';
import { getDb } from '../services/db';

describe('POS Backend Integration', () => {
    beforeAll(async () => {
        // Initialize DB
        await getDb();
    });

    it('should list products', async () => {
        const res = await request(app).get('/api/products');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('should seed a product', async () => {
        const product = { id: 'p1', name: 'Test Product', sku: 'TP-001', price: 100, stock: 10 };
        const res = await request(app).post('/api/products/seed').send(product);
        expect(res.status).toBe(201);
    });

    it('should create an order', async () => {
        const res = await request(app).post('/api/order').send({
            productId: 'p1',
            qty: 1,
            userId: 'u1'
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('confirmed');
    });

    it('should return PRICE_MISSING error', async () => {
        await request(app).post('/api/products/seed').send({ id: 'p_noprice', name: 'No Price', sku: 'NP-001', price: null, stock: 10 });

        const res = await request(app).post('/api/order').send({
            productId: 'p_noprice',
            qty: 1,
            userId: 'u1'
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('PRICE_MISSING');
    });

    it('should return INVENTORY_UNAVAILABLE error', async () => {
        await request(app).post('/api/products/seed').send({ id: 'p_lowstock', name: 'Low Stock', sku: 'LS-001', price: 100, stock: 1 });

        const res = await request(app).post('/api/order').send({
            productId: 'p_lowstock',
            qty: 2,
            userId: 'u1'
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('INVENTORY_UNAVAILABLE');
    });
});
