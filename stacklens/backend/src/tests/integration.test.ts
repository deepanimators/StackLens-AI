import request from 'supertest';
import app from '../app';
import { connectProducer } from '../services/kafkaProducer';

// Mock Kafka
jest.mock('../services/kafkaProducer', () => ({
    connectProducer: jest.fn(),
    sendToKafka: jest.fn().mockResolvedValue(true)
}));

describe('Ingest API', () => {
    it('should ingest logs successfully', async () => {
        const res = await request(app)
            .post('/api/ingest/log')
            .send({
                message: 'Test log',
                service: 'test-service',
                timestamp: new Date().toISOString()
            });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('should handle batch logs', async () => {
        const res = await request(app)
            .post('/api/ingest/log')
            .send([
                { message: 'Log 1', service: 'test', timestamp: new Date().toISOString() },
                { message: 'Log 2', service: 'test', timestamp: new Date().toISOString() }
            ]);

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);
    });
});
