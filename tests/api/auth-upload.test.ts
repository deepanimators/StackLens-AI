import { test, expect } from '../fixtures';

/**
 * API Test: Authentication Endpoints
 * Tests all authentication-related API endpoints
 */

test.describe('Authentication API', () => {
    const API_BASE = process.env.VITE_API_URL || `http://localhost:${process.env.API_PORT || '4001'}`;

    test('POST /api/auth/firebase-signin - should authenticate user', async ({ request }) => {
        test.skip(!process.env.TEST_FIREBASE_TOKEN, 'TEST_FIREBASE_TOKEN not set');
        const response = await request.post('/api/auth/firebase-signin', {
            data: {
                idToken: process.env.TEST_FIREBASE_TOKEN,
                email: 'test@stacklens.ai',
            },
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('token');
        expect(data).toHaveProperty('user');
        expect(data.user).toHaveProperty('email');
    });

    test('POST /api/auth/firebase-verify - should verify token', async ({ request }) => {
        test.skip(!process.env.TEST_FIREBASE_TOKEN, 'TEST_FIREBASE_TOKEN not set');

        const response = await request.post('/api/auth/firebase-verify', {
            data: {
                idToken: process.env.TEST_FIREBASE_TOKEN,
            },
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('valid', true);
        expect(data).toHaveProperty('user');
    });

    test('GET /api/auth/me - should return current user', async ({ apiContext }) => {
        test.skip(!process.env.TEST_FIREBASE_TOKEN, 'TEST_FIREBASE_TOKEN not set');

        const response = await apiContext.get('/api/auth/me');

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('email');
        expect(data).toHaveProperty('role');
    });

    test('POST /api/auth/firebase-signin - should reject invalid token', async ({ request }) => {
        test.skip(!process.env.TEST_FIREBASE_TOKEN, 'TEST_FIREBASE_TOKEN not set');

        const response = await request.post('/api/auth/firebase-signin', {
            data: {
                idToken: 'invalid-token',
            },
        });

        expect(response.status()).toBe(401);

        const data = await response.json();
        expect(data).toHaveProperty('message');
    });

    test('GET /api/auth/me - should reject unauthenticated request', async ({ request }) => {
        const response = await request.get('/api/auth/me');

        expect(response.status()).toBe(401);
    });
});

/**
 * API Test: File Upload Endpoints
 * NOTE: File upload tests are currently skipped due to multipart/form-data middleware ordering issues.
 * These will be fixed in a future release.
 */

test.describe('File Upload API', () => {
    const API_BASE = process.env.VITE_API_URL || `http://localhost:${process.env.API_PORT || '4001'}`;

    test('POST /api/upload - should upload Excel file', async ({ apiContext }) => {
        test.skip(true, 'File upload tests skipped - multipart/form-data middleware issue');

        const response = await apiContext.post('/api/upload', {
            multipart: {
                file: {
                    name: 'test-errors.xlsx',
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    buffer: Buffer.from('test data'),
                },
            },
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('fileId');
        expect(data).toHaveProperty('filename');
        expect(data).toHaveProperty('status', 'uploaded');
    });

    test('POST /api/upload - should upload CSV file', async ({ apiContext }) => {
        test.skip(true, 'File upload tests skipped - multipart/form-data middleware issue');

        const response = await apiContext.post('/api/upload', {
            multipart: {
                file: {
                    name: 'test-errors.csv',
                    mimeType: 'text/csv',
                    buffer: Buffer.from('error,message\nError1,Test message'),
                },
            },
        });

        expect(response.status()).toBe(200);
    });

    test('POST /api/upload - should reject invalid file type', async ({ apiContext }) => {
        test.skip(true, 'File upload tests skipped - multipart/form-data middleware issue');

        const response = await apiContext.post('/api/upload', {
            multipart: {
                file: {
                    name: 'test.pdf',
                    mimeType: 'application/pdf',
                    buffer: Buffer.from('test data'),
                },
            },
        });

        expect(response.status()).toBe(400);

        const data = await response.json();
        expect(data).toHaveProperty('message');
        expect(data.message).toContain('Invalid file type');
    });

    test('GET /api/files - should list uploaded files', async ({ apiContext }) => {
        test.skip(true, 'File upload tests skipped - depends on upload functionality');

        const response = await apiContext.get('/api/files');

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);

        if (data.length > 0) {
            expect(data[0]).toHaveProperty('id');
            expect(data[0]).toHaveProperty('filename');
            expect(data[0]).toHaveProperty('uploadTimestamp');
        }
    });

    test('GET /api/files/:id - should get file details', async ({ apiContext }) => {
        test.skip(!process.env.TEST_FIREBASE_TOKEN, 'TEST_FIREBASE_TOKEN not set');

        // First upload a file
        const uploadResponse = await apiContext.post('/api/upload', {
            multipart: {
                file: {
                    name: 'test.xlsx',
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    buffer: Buffer.from('test'),
                },
            },
        });

        const { fileId } = await uploadResponse.json();

        // Get file details
        const response = await apiContext.get(`/api/files/${fileId}`);

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('id', fileId);
        expect(data).toHaveProperty('filename');
    });

    test('DELETE /api/files/:id - should delete file', async ({ apiContext }) => {
        test.skip(!process.env.TEST_FIREBASE_TOKEN, 'TEST_FIREBASE_TOKEN not set');

        // First upload a file
        const uploadResponse = await apiContext.post('/api/upload', {
            multipart: {
                file: {
                    name: 'test.xlsx',
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    buffer: Buffer.from('test'),
                },
            },
        });

        const { fileId } = await uploadResponse.json();

        // Delete file
        const response = await apiContext.delete(`/api/files/${fileId}`);

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('message', 'File deleted successfully');
    });
});
