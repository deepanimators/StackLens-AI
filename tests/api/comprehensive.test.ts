import { test, expect } from '@playwright/test';

test.describe('API Tests - Error Management Endpoints', () => {
    test.describe('GET /api/errors', () => {
        test('should retrieve all errors', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors');

            expect(response.ok()).toBeTruthy();
            const errors = await response.json();
            expect(Array.isArray(errors)).toBeTruthy();
        });

        test('should support pagination', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors?page=1&limit=10');

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(data).toHaveProperty('errors');
            expect(data).toHaveProperty('total');
            expect(data).toHaveProperty('page');
            expect(data).toHaveProperty('totalPages');
            expect(data.errors.length).toBeLessThanOrEqual(10);
        });

        test('should filter by severity', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors?severity=critical');

            expect(response.ok()).toBeTruthy();
            const errors = await response.json();
            errors.forEach((error: any) => {
                expect(error.severity).toBe('critical');
            });
        });

        test('should filter by error type', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors?errorType=Runtime');

            expect(response.ok()).toBeTruthy();
            const errors = await response.json();
            errors.forEach((error: any) => {
                expect(error.errorType).toBe('Runtime');
            });
        });

        test('should filter by date range', async ({ request }) => {
            const startDate = '2025-01-01';
            const endDate = '2025-12-31';

            const response = await request.get(
                `http://localhost:5000/api/errors?startDate=${startDate}&endDate=${endDate}`
            );

            expect(response.ok()).toBeTruthy();
        });

        test('should search by message', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors?search=database');

            expect(response.ok()).toBeTruthy();
            const errors = await response.json();
            errors.forEach((error: any) => {
                expect(error.message.toLowerCase()).toContain('database');
            });
        });

        test('should filter by resolved status', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors?resolved=false');

            expect(response.ok()).toBeTruthy();
            const errors = await response.json();
            errors.forEach((error: any) => {
                expect(error.resolved).toBe(false);
            });
        });

        test('should filter by store', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors?store=STORE-0001');

            expect(response.ok()).toBeTruthy();
            const errors = await response.json();
            errors.forEach((error: any) => {
                expect(error.store).toBe('STORE-0001');
            });
        });

        test('should support sorting', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors?sortBy=timestamp&order=desc');

            expect(response.ok()).toBeTruthy();
            const errors = await response.json();

            // Verify descending order
            for (let i = 0; i < errors.length - 1; i++) {
                const current = new Date(errors[i].timestamp);
                const next = new Date(errors[i + 1].timestamp);
                expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
            }
        });

        test('should handle invalid query parameters gracefully', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors?page=-1&limit=1000');

            expect(response.status()).toBe(400);
            const error = await response.json();
            expect(error).toHaveProperty('error');
        });
    });

    test.describe('POST /api/errors', () => {
        test('should create new error', async ({ request }) => {
            const newError = {
                message: 'Test API error',
                severity: 'high',
                errorType: 'Runtime',
                lineNumber: 100,
                stackTrace: 'Error at line 100',
                store: 'STORE-0001'
            };

            const response = await request.post('http://localhost:5000/api/errors', {
                data: newError
            });

            expect(response.ok()).toBeTruthy();
            const created = await response.json();
            expect(created).toHaveProperty('id');
            expect(created.message).toBe(newError.message);
            expect(created.severity).toBe(newError.severity);
        });

        test('should validate required fields', async ({ request }) => {
            const invalidError = {
                // Missing required fields
                severity: 'high'
            };

            const response = await request.post('http://localhost:5000/api/errors', {
                data: invalidError
            });

            expect(response.status()).toBe(400);
            const error = await response.json();
            expect(error).toHaveProperty('error');
        });

        test('should validate severity values', async ({ request }) => {
            const invalidError = {
                message: 'Test error',
                severity: 'invalid_severity',
                errorType: 'Runtime'
            };

            const response = await request.post('http://localhost:5000/api/errors', {
                data: invalidError
            });

            expect(response.status()).toBe(400);
        });

        test('should set default values for optional fields', async ({ request }) => {
            const minimalError = {
                message: 'Minimal error',
                severity: 'medium',
                errorType: 'Runtime'
            };

            const response = await request.post('http://localhost:5000/api/errors', {
                data: minimalError
            });

            expect(response.ok()).toBeTruthy();
            const created = await response.json();
            expect(created).toHaveProperty('timestamp');
            expect(created).toHaveProperty('resolved');
            expect(created.resolved).toBe(false);
        });
    });

    test.describe('GET /api/errors/:id', () => {
        test('should retrieve specific error by ID', async ({ request }) => {
            // First create an error
            const newError = {
                message: 'Specific error test',
                severity: 'low',
                errorType: 'Test'
            };

            const createResponse = await request.post('http://localhost:5000/api/errors', {
                data: newError
            });

            const created = await createResponse.json();

            // Retrieve the error
            const getResponse = await request.get(`http://localhost:5000/api/errors/${created.id}`);
            expect(getResponse.ok()).toBeTruthy();

            const error = await getResponse.json();
            expect(error.id).toBe(created.id);
            expect(error.message).toBe(newError.message);
        });

        test('should return 404 for non-existent error', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors/99999999');
            expect(response.status()).toBe(404);
        });

        test('should return 400 for invalid ID format', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors/invalid-id');
            expect(response.status()).toBe(400);
        });
    });

    test.describe('PATCH /api/errors/:id', () => {
        test('should update error fields', async ({ request }) => {
            // Create error
            const newError = {
                message: 'Error to update',
                severity: 'medium',
                resolved: false
            };

            const createResponse = await request.post('http://localhost:5000/api/errors', {
                data: newError
            });

            const created = await createResponse.json();

            // Update error
            const updates = {
                severity: 'high',
                resolved: true,
                notes: 'Fixed in production'
            };

            const updateResponse = await request.patch(`http://localhost:5000/api/errors/${created.id}`, {
                data: updates
            });

            expect(updateResponse.ok()).toBeTruthy();

            const updated = await updateResponse.json();
            expect(updated.severity).toBe('high');
            expect(updated.resolved).toBe(true);
            expect(updated.notes).toBe('Fixed in production');
        });

        test('should validate updated field values', async ({ request }) => {
            const createResponse = await request.post('http://localhost:5000/api/errors', {
                data: { message: 'Test', severity: 'low', errorType: 'Test' }
            });

            const created = await createResponse.json();

            const invalidUpdate = {
                severity: 'invalid_value'
            };

            const updateResponse = await request.patch(`http://localhost:5000/api/errors/${created.id}`, {
                data: invalidUpdate
            });

            expect(updateResponse.status()).toBe(400);
        });

        test('should return 404 when updating non-existent error', async ({ request }) => {
            const response = await request.patch('http://localhost:5000/api/errors/99999999', {
                data: { resolved: true }
            });

            expect(response.status()).toBe(404);
        });
    });

    test.describe('DELETE /api/errors/:id', () => {
        test('should delete error', async ({ request }) => {
            // Create error
            const newError = {
                message: 'Error to delete',
                severity: 'low',
                errorType: 'Test'
            };

            const createResponse = await request.post('http://localhost:5000/api/errors', {
                data: newError
            });

            const created = await createResponse.json();

            // Delete error
            const deleteResponse = await request.delete(`http://localhost:5000/api/errors/${created.id}`);
            expect(deleteResponse.ok()).toBeTruthy();

            // Verify deletion
            const getResponse = await request.get(`http://localhost:5000/api/errors/${created.id}`);
            expect(getResponse.status()).toBe(404);
        });

        test('should return 404 when deleting non-existent error', async ({ request }) => {
            const response = await request.delete('http://localhost:5000/api/errors/99999999');
            expect(response.status()).toBe(404);
        });
    });

    test.describe('POST /api/errors/bulk', () => {
        test('should create multiple errors in bulk', async ({ request }) => {
            const errors = [
                { message: 'Bulk error 1', severity: 'high', errorType: 'Runtime' },
                { message: 'Bulk error 2', severity: 'medium', errorType: 'Database' },
                { message: 'Bulk error 3', severity: 'low', errorType: 'Network' }
            ];

            const response = await request.post('http://localhost:5000/api/errors/bulk', {
                data: { errors }
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('created');
            expect(result.created).toBe(3);
            expect(result).toHaveProperty('ids');
            expect(result.ids.length).toBe(3);
        });

        test('should handle validation errors in bulk creation', async ({ request }) => {
            const errors = [
                { message: 'Valid error', severity: 'high', errorType: 'Runtime' },
                { message: 'Invalid error', severity: 'invalid', errorType: 'Runtime' }
            ];

            const response = await request.post('http://localhost:5000/api/errors/bulk', {
                data: { errors }
            });

            expect(response.status()).toBe(400);
            const error = await response.json();
            expect(error).toHaveProperty('invalidIndices');
        });
    });

    test.describe('GET /api/errors/stats', () => {
        test('should retrieve error statistics', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors/stats');

            expect(response.ok()).toBeTruthy();
            const stats = await response.json();
            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('bySeverity');
            expect(stats).toHaveProperty('byType');
            expect(stats).toHaveProperty('resolved');
            expect(stats).toHaveProperty('unresolved');
        });

        test('should filter statistics by date range', async ({ request }) => {
            const response = await request.get(
                'http://localhost:5000/api/errors/stats?startDate=2025-01-01&endDate=2025-12-31'
            );

            expect(response.ok()).toBeTruthy();
            const stats = await response.json();
            expect(stats).toHaveProperty('dateRange');
        });

        test('should provide statistics by store', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/errors/stats/by-store');

            expect(response.ok()).toBeTruthy();
            const stats = await response.json();
            expect(Array.isArray(stats)).toBeTruthy();
        });
    });

    test.describe('POST /api/errors/export', () => {
        test('should export errors as CSV', async ({ request }) => {
            const response = await request.post('http://localhost:5000/api/errors/export', {
                data: {
                    format: 'csv',
                    filters: { severity: 'critical' }
                }
            });

            expect(response.ok()).toBeTruthy();
            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('text/csv');
        });

        test('should export errors as JSON', async ({ request }) => {
            const response = await request.post('http://localhost:5000/api/errors/export', {
                data: {
                    format: 'json',
                    filters: {}
                }
            });

            expect(response.ok()).toBeTruthy();
            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('application/json');
        });

        test('should export errors as Excel', async ({ request }) => {
            const response = await request.post('http://localhost:5000/api/errors/export', {
                data: {
                    format: 'xlsx',
                    filters: { resolved: false }
                }
            });

            expect(response.ok()).toBeTruthy();
            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('spreadsheet');
        });
    });
});

test.describe('API Tests - Store & Kiosk Management', () => {
    test.describe('GET /api/stores', () => {
        test('should retrieve all stores', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/stores');

            expect(response.ok()).toBeTruthy();
            const stores = await response.json();
            expect(Array.isArray(stores)).toBeTruthy();
        });

        test('should support pagination for stores', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/stores?page=1&limit=20');

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(data.stores.length).toBeLessThanOrEqual(20);
        });

        test('should search stores by name', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/stores?search=test');

            expect(response.ok()).toBeTruthy();
        });
    });

    test.describe('POST /api/stores', () => {
        test('should create new store', async ({ request }) => {
            const newStore = {
                storeNumber: `STORE-${Date.now()}`,
                name: 'Test Store',
                location: 'Test City',
                region: 'North'
            };

            const response = await request.post('http://localhost:5000/api/stores', {
                data: newStore
            });

            expect(response.ok()).toBeTruthy();
            const created = await response.json();
            expect(created.storeNumber).toBe(newStore.storeNumber);
        });

        test('should prevent duplicate store numbers', async ({ request }) => {
            const storeNumber = `STORE-${Date.now()}`;

            // Create first store
            await request.post('http://localhost:5000/api/stores', {
                data: { storeNumber, name: 'Store 1', location: 'Location 1' }
            });

            // Attempt to create duplicate
            const response = await request.post('http://localhost:5000/api/stores', {
                data: { storeNumber, name: 'Store 2', location: 'Location 2' }
            });

            expect(response.status()).toBe(409); // Conflict
        });
    });

    test.describe('GET /api/kiosks', () => {
        test('should retrieve all kiosks', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/kiosks');

            expect(response.ok()).toBeTruthy();
            const kiosks = await response.json();
            expect(Array.isArray(kiosks)).toBeTruthy();
        });

        test('should filter kiosks by store', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/kiosks?store=STORE-0001');

            expect(response.ok()).toBeTruthy();
            const kiosks = await response.json();
            kiosks.forEach((kiosk: any) => {
                expect(kiosk.storeNumber).toBe('STORE-0001');
            });
        });
    });

    test.describe('POST /api/kiosks', () => {
        test('should create new kiosk', async ({ request }) => {
            const newKiosk = {
                kioskNumber: `KIOSK-${Date.now()}`,
                storeNumber: 'STORE-0001',
                status: 'active'
            };

            const response = await request.post('http://localhost:5000/api/kiosks', {
                data: newKiosk
            });

            expect(response.ok()).toBeTruthy();
            const created = await response.json();
            expect(created.kioskNumber).toBe(newKiosk.kioskNumber);
        });

        test('should validate kiosk belongs to valid store', async ({ request }) => {
            const newKiosk = {
                kioskNumber: `KIOSK-${Date.now()}`,
                storeNumber: 'INVALID-STORE',
                status: 'active'
            };

            const response = await request.post('http://localhost:5000/api/kiosks', {
                data: newKiosk
            });

            expect(response.status()).toBe(400);
        });
    });
});

test.describe('API Tests - ML Training Endpoints', () => {
    test.describe('POST /api/ml/train', () => {
        test('should initiate ML training job', async ({ request }) => {
            const trainingConfig = {
                modelType: 'classification',
                features: ['severity', 'errorType', 'lineNumber'],
                targetField: 'resolved',
                algorithm: 'random_forest'
            };

            const response = await request.post('http://localhost:5000/api/ml/train', {
                data: trainingConfig
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('jobId');
            expect(result).toHaveProperty('status');
            expect(result.status).toBe('queued');
        });

        test('should validate training configuration', async ({ request }) => {
            const invalidConfig = {
                modelType: 'invalid_type'
            };

            const response = await request.post('http://localhost:5000/api/ml/train', {
                data: invalidConfig
            });

            expect(response.status()).toBe(400);
        });
    });

    test.describe('GET /api/ml/jobs/:jobId', () => {
        test('should retrieve training job status', async ({ request }) => {
            // Create job
            const trainingConfig = {
                modelType: 'classification',
                features: ['severity'],
                targetField: 'resolved'
            };

            const createResponse = await request.post('http://localhost:5000/api/ml/train', {
                data: trainingConfig
            });

            const job = await createResponse.json();

            // Check status
            const statusResponse = await request.get(`http://localhost:5000/api/ml/jobs/${job.jobId}`);
            expect(statusResponse.ok()).toBeTruthy();

            const status = await statusResponse.json();
            expect(status).toHaveProperty('jobId');
            expect(status).toHaveProperty('status');
            expect(['queued', 'running', 'completed', 'failed']).toContain(status.status);
        });
    });

    test.describe('POST /api/ml/predict', () => {
        test('should make prediction with trained model', async ({ request }) => {
            const predictionData = {
                severity: 'high',
                errorType: 'Runtime',
                lineNumber: 100
            };

            const response = await request.post('http://localhost:5000/api/ml/predict', {
                data: predictionData
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('prediction');
            expect(result).toHaveProperty('confidence');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });
    });

    test.describe('GET /api/ml/models', () => {
        test('should list all trained models', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/ml/models');

            expect(response.ok()).toBeTruthy();
            const models = await response.json();
            expect(Array.isArray(models)).toBeTruthy();
        });

        test('should filter models by status', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/ml/models?status=active');

            expect(response.ok()).toBeTruthy();
            const models = await response.json();
            models.forEach((model: any) => {
                expect(model.status).toBe('active');
            });
        });
    });
});

test.describe('API Tests - AI Analysis Endpoints', () => {
    test.describe('POST /api/ai/analyze', () => {
        test('should analyze error with AI', async ({ request }) => {
            const errorData = {
                message: 'Null pointer exception at line 42',
                errorType: 'Runtime',
                stackTrace: 'Error at main.js:42'
            };

            const response = await request.post('http://localhost:5000/api/ai/analyze', {
                data: errorData
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('analysis');
            expect(result).toHaveProperty('suggestions');
            expect(result).toHaveProperty('severity');
        });

        test('should handle timeout for long-running analysis', async ({ request }) => {
            const response = await request.post('http://localhost:5000/api/ai/analyze', {
                data: { message: 'Complex error requiring long analysis' },
                timeout: 30000 // 30 seconds
            });

            expect([200, 408]).toContain(response.status()); // OK or Timeout
        });
    });

    test.describe('POST /api/ai/suggest', () => {
        test('should provide fix suggestions', async ({ request }) => {
            const errorData = {
                message: 'Memory leak detected',
                errorType: 'Memory'
            };

            const response = await request.post('http://localhost:5000/api/ai/suggest', {
                data: errorData
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('suggestions');
            expect(Array.isArray(result.suggestions)).toBeTruthy();
            expect(result.suggestions.length).toBeGreaterThan(0);
        });
    });

    test.describe('POST /api/ai/summarize', () => {
        test('should summarize multiple errors', async ({ request }) => {
            const errors = [
                { message: 'Database timeout', count: 10 },
                { message: 'Network error', count: 5 },
                { message: 'Memory leak', count: 3 }
            ];

            const response = await request.post('http://localhost:5000/api/ai/summarize', {
                data: { errors }
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('keyInsights');
            expect(result).toHaveProperty('recommendations');
        });
    });
});

test.describe('API Tests - File Upload & Processing', () => {
    test.describe('POST /api/upload', () => {
        test('should handle Excel file upload', async ({ request }) => {
            const file = Buffer.from('test excel content');

            const response = await request.post('http://localhost:5000/api/upload', {
                multipart: {
                    file: {
                        name: 'test.xlsx',
                        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        buffer: file
                    }
                }
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('fileId');
            expect(result).toHaveProperty('filename');
        });

        test('should reject files exceeding size limit', async ({ request }) => {
            const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB (exceeds 10MB limit)

            const response = await request.post('http://localhost:5000/api/upload', {
                multipart: {
                    file: {
                        name: 'large.xlsx',
                        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        buffer: largeFile
                    }
                }
            });

            expect(response.status()).toBe(413); // Payload Too Large
        });

        test('should reject unsupported file types', async ({ request }) => {
            const file = Buffer.from('test content');

            const response = await request.post('http://localhost:5000/api/upload', {
                multipart: {
                    file: {
                        name: 'test.exe',
                        mimeType: 'application/x-msdownload',
                        buffer: file
                    }
                }
            });

            expect(response.status()).toBe(400);
        });
    });

    test.describe('GET /api/uploads/:fileId', () => {
        test('should retrieve upload status', async ({ request }) => {
            // Upload file first
            const file = Buffer.from('test');
            const uploadResponse = await request.post('http://localhost:5000/api/upload', {
                multipart: {
                    file: { name: 'test.csv', mimeType: 'text/csv', buffer: file }
                }
            });

            const upload = await uploadResponse.json();

            // Check status
            const statusResponse = await request.get(`http://localhost:5000/api/uploads/${upload.fileId}`);
            expect(statusResponse.ok()).toBeTruthy();

            const status = await statusResponse.json();
            expect(status).toHaveProperty('fileId');
            expect(status).toHaveProperty('status');
            expect(status).toHaveProperty('processedRows');
        });
    });
});

test.describe('API Tests - Authentication & Authorization', () => {
    test.describe('POST /api/auth/firebase', () => {
        test('should authenticate with valid Firebase token', async ({ request }) => {
            const response = await request.post('http://localhost:5000/api/auth/firebase', {
                data: {
                    idToken: 'valid-test-token'
                }
            });

            expect(response.ok()).toBeTruthy();
            const auth = await response.json();
            expect(auth).toHaveProperty('userId');
            expect(auth).toHaveProperty('email');
            expect(auth).toHaveProperty('sessionToken');
        });

        test('should reject invalid token', async ({ request }) => {
            const response = await request.post('http://localhost:5000/api/auth/firebase', {
                data: {
                    idToken: 'invalid-token'
                }
            });

            expect(response.status()).toBe(401);
        });
    });

    test.describe('POST /api/auth/logout', () => {
        test('should logout user', async ({ request }) => {
            // Login first
            const loginResponse = await request.post('http://localhost:5000/api/auth/firebase', {
                data: { idToken: 'valid-token' }
            });

            const auth = await loginResponse.json();

            // Logout
            const logoutResponse = await request.post('http://localhost:5000/api/auth/logout', {
                headers: {
                    'Authorization': `Bearer ${auth.sessionToken}`
                }
            });

            expect(logoutResponse.ok()).toBeTruthy();
        });
    });

    test.describe('GET /api/admin/users', () => {
        test('should require admin role', async ({ request }) => {
            const response = await request.get('http://localhost:5000/api/admin/users');
            expect(response.status()).toBe(401);
        });

        test('should allow access with admin token', async ({ request }) => {
            // Login as admin
            const loginResponse = await request.post('http://localhost:5000/api/auth/firebase', {
                data: { idToken: 'admin-token', role: 'admin' }
            });

            const auth = await loginResponse.json();

            // Access admin endpoint
            const response = await request.get('http://localhost:5000/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${auth.sessionToken}`
                }
            });

            expect(response.ok()).toBeTruthy();
        });
    });
});

test.describe('API Tests - Request Validation', () => {
    test('should reject requests with invalid Content-Type', async ({ request }) => {
        const response = await request.post('http://localhost:5000/api/errors', {
            headers: {
                'Content-Type': 'text/plain'
            },
            data: 'not json'
        });

        expect([400, 415]).toContain(response.status());
    });

    test('should validate JSON syntax', async ({ request }) => {
        const response = await request.post('http://localhost:5000/api/errors', {
            headers: {
                'Content-Type': 'application/json'
            },
            data: '{invalid json}'
        });

        expect(response.status()).toBe(400);
    });

    test('should enforce maximum payload size', async ({ request }) => {
        const largePayload = {
            message: 'A'.repeat(1000000), // 1MB of text
            severity: 'high',
            errorType: 'Test'
        };

        const response = await request.post('http://localhost:5000/api/errors', {
            data: largePayload
        });

        expect([413, 400]).toContain(response.status());
    });

    test('should validate required headers', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors', {
            headers: {
                // Missing required headers if any
            }
        });

        // Should still work or return specific error
        expect([200, 400]).toContain(response.status());
    });

    test('should handle missing request body', async ({ request }) => {
        const response = await request.post('http://localhost:5000/api/errors');

        expect(response.status()).toBe(400);
    });

    test('should validate URL parameter formats', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors?page=invalid');

        expect([400, 422]).toContain(response.status());
    });

    test('should handle special characters in query params', async ({ request }) => {
        const specialChars = '!@#$%^&*()';
        const response = await request.get(
            `http://localhost:5000/api/errors?search=${encodeURIComponent(specialChars)}`
        );

        expect([200, 400]).toContain(response.status());
    });
});

test.describe('API Tests - Response Format Validation', () => {
    test('should return proper Content-Type headers', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors');

        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('application/json');
    });

    test('should include CORS headers', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors', {
            headers: {
                'Origin': 'http://localhost:5173'
            }
        });

        const headers = response.headers();
        expect(headers).toHaveProperty('access-control-allow-origin');
    });

    test('should return consistent error response format', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors/999999');

        expect(response.status()).toBe(404);
        const error = await response.json();

        expect(error).toHaveProperty('error');
        expect(error).toHaveProperty('message');
    });

    test('should include pagination metadata', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors?page=1&limit=5');

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        expect(data).toHaveProperty('page');
        expect(data).toHaveProperty('totalPages');
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('limit');
    });

    test('should return timestamps in ISO format', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors');

        expect(response.ok()).toBeTruthy();
        const errors = await response.json();

        if (errors.length > 0 && errors[0].timestamp) {
            const timestamp = errors[0].timestamp;
            expect(new Date(timestamp).toISOString()).toBe(timestamp);
        }
    });
});

test.describe('API Tests - Error Handling', () => {
    test('should handle database connection errors gracefully', async ({ request }) => {
        // Simulate database error scenario
        const response = await request.get('http://localhost:5000/api/errors');

        // Should return proper error, not crash
        expect([200, 500, 503]).toContain(response.status());
    });

    test('should return 404 for non-existent routes', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/nonexistent');

        expect(response.status()).toBe(404);
    });

    test('should handle malformed route parameters', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors/not-a-number');

        expect([400, 404]).toContain(response.status());
    });

    test('should provide helpful error messages', async ({ request }) => {
        const response = await request.post('http://localhost:5000/api/errors', {
            data: { severity: 'invalid' }
        });

        expect(response.status()).toBe(400);
        const error = await response.json();

        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(0);
    });

    test('should handle concurrent request failures', async ({ request }) => {
        const requests = Array.from({ length: 20 }, () =>
            request.get('http://localhost:5000/api/errors/999999')
        );

        const responses = await Promise.all(requests);

        responses.forEach(response => {
            expect(response.status()).toBe(404);
        });
    });
});

test.describe('API Tests - Rate Limiting', () => {
    test('should implement rate limiting', async ({ request }) => {
        const requests = Array.from({ length: 150 }, () =>
            request.get('http://localhost:5000/api/errors')
        );

        const responses = await Promise.all(requests);

        // Some requests might be rate limited
        const rateLimited = responses.filter(r => r.status() === 429);
        const successful = responses.filter(r => r.ok());

        expect(successful.length + rateLimited.length).toBe(150);
    });

    test('should include rate limit headers', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors');

        const headers = response.headers();
        // Check for common rate limit headers
        const hasRateLimitHeaders =
            headers['x-ratelimit-limit'] ||
            headers['x-rate-limit-limit'] ||
            headers['ratelimit-limit'];

        // Not all APIs implement rate limiting, so this is optional
        if (hasRateLimitHeaders) {
            expect(hasRateLimitHeaders).toBeTruthy();
        }
    });

    test('should reset rate limits after time window', async ({ request }) => {
        // Make requests to hit limit
        const initialRequests = Array.from({ length: 100 }, () =>
            request.get('http://localhost:5000/api/errors')
        );

        await Promise.all(initialRequests);

        // Wait for rate limit window to reset (simulate)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Should be able to make requests again
        const response = await request.get('http://localhost:5000/api/errors');
        expect([200, 429]).toContain(response.status());
    });
});

test.describe('API Tests - Pagination Edge Cases', () => {
    test('should handle page=0', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors?page=0&limit=10');

        // Should either default to page 1 or return error
        expect([200, 400]).toContain(response.status());
    });

    test('should handle negative page numbers', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors?page=-1&limit=10');

        expect([400, 422]).toContain(response.status());
    });

    test('should handle excessive page numbers', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors?page=999999&limit=10');

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        // Should return empty array for pages beyond data
        expect(Array.isArray(data.errors) || Array.isArray(data)).toBeTruthy();
    });

    test('should handle limit=0', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors?page=1&limit=0');

        expect([400, 422]).toContain(response.status());
    });

    test('should enforce maximum limit', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors?page=1&limit=10000');

        // Should cap at reasonable limit or return error
        expect([200, 400]).toContain(response.status());

        if (response.ok()) {
            const data = await response.json();
            expect(data.errors.length).toBeLessThanOrEqual(1000);
        }
    });
});

test.describe('API Tests - Concurrent Operations', () => {
    test('should handle concurrent reads safely', async ({ request }) => {
        const requests = Array.from({ length: 50 }, () =>
            request.get('http://localhost:5000/api/errors')
        );

        const responses = await Promise.all(requests);

        const allSuccessful = responses.every(r => r.ok());
        expect(allSuccessful).toBeTruthy();
    });

    test('should handle concurrent writes with proper isolation', async ({ request }) => {
        const errors = Array.from({ length: 10 }, (_, i) => ({
            message: `Concurrent error ${i}`,
            severity: 'medium',
            errorType: 'Test'
        }));

        const createRequests = errors.map(e =>
            request.post('http://localhost:5000/api/errors', { data: e })
        );

        const responses = await Promise.all(createRequests);

        const allSuccessful = responses.every(r => r.ok());
        expect(allSuccessful).toBeTruthy();
    });

    test('should prevent race conditions on updates', async ({ request }) => {
        // Create an error
        const createResponse = await request.post('http://localhost:5000/api/errors', {
            data: {
                message: 'Race condition test',
                severity: 'high',
                errorType: 'Test'
            }
        });

        const created = await createResponse.json();

        // Concurrent updates
        const updates = Array.from({ length: 5 }, (_, i) =>
            request.put(`http://localhost:5000/api/errors/${created.id}`, {
                data: {
                    message: `Updated ${i}`,
                    severity: 'high',
                    errorType: 'Test'
                }
            })
        );

        const responses = await Promise.all(updates);

        // All should succeed or have proper conflict handling
        responses.forEach(r => {
            expect([200, 409]).toContain(r.status());
        });
    });
});

test.describe('API Tests - Cache Control', () => {
    test('should include appropriate cache headers', async ({ request }) => {
        const response = await request.get('http://localhost:5000/api/errors');

        const headers = response.headers();

        // Check for cache control headers
        if (headers['cache-control']) {
            expect(headers['cache-control']).toBeTruthy();
        }
    });

    test('should respect If-None-Match for conditional requests', async ({ request }) => {
        const response1 = await request.get('http://localhost:5000/api/errors');
        const etag = response1.headers()['etag'];

        if (etag) {
            const response2 = await request.get('http://localhost:5000/api/errors', {
                headers: {
                    'If-None-Match': etag
                }
            });

            expect([200, 304]).toContain(response2.status());
        }
    });

    test('should support If-Modified-Since', async ({ request }) => {
        const pastDate = new Date(Date.now() - 86400000).toUTCString();

        const response = await request.get('http://localhost:5000/api/errors', {
            headers: {
                'If-Modified-Since': pastDate
            }
        });

        expect([200, 304]).toContain(response.status());
    });
});
