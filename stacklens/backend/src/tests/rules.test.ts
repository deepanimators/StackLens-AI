import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeLog } from '../services/analyzer';
import { persistAlert } from '../services/db';
import { broadcastAlert } from '../services/websocket';

// Mock dependencies
vi.mock('../services/db', () => ({
    persistAlert: vi.fn().mockResolvedValue(1)
}));

vi.mock('../services/websocket', () => ({
    broadcastAlert: vi.fn()
}));

describe('Rule Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should trigger PRICE_MISSING alert', async () => {
        const log = {
            error_code: 'PRICE_MISSING',
            service: 'pos-backend',
            message: 'Price not found'
        };

        await analyzeLog(log);

        expect(persistAlert).toHaveBeenCalledWith(expect.objectContaining({
            issue_code: 'PRICE_MISSING',
            severity: 'high'
        }));
        expect(broadcastAlert).toHaveBeenCalled();
    });

    it('should trigger DB_CONNECTION_ERROR alert', async () => {
        const log = {
            message: 'Connection refused to database',
            service: 'pos-backend'
        };

        await analyzeLog(log);

        expect(persistAlert).toHaveBeenCalledWith(expect.objectContaining({
            issue_code: 'DB_CONNECTION_ERROR',
            severity: 'critical'
        }));
    });

    it('should not trigger alert for normal logs', async () => {
        const log = {
            message: 'Request processed successfully',
            service: 'pos-backend'
        };

        await analyzeLog(log);

        expect(persistAlert).not.toHaveBeenCalled();
    });
});
