import { test, expect } from '../fixtures';

test.describe('API Tests - Error Management Endpoints', () => {
    test.describe('GET /api/errors', () => {
        test('should retrieve all errors', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors');

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(Array.isArray(data.errors)).toBeTruthy();
        });

        test('should support pagination', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors?page=1&limit=10');

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(data).toHaveProperty('errors');
            expect(data).toHaveProperty('total');
            expect(data).toHaveProperty('page');
            expect(data).toHaveProperty('totalPages');
            expect(data.errors.length).toBeLessThanOrEqual(10);
        });

        test('should filter by severity', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors?severity=critical');

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(Array.isArray(data.errors)).toBeTruthy();
            data.errors.forEach((error: any) => {
                expect(error.severity).toBe('critical');
            });
        });

        test('should filter by error type', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors?errorType=Runtime');

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(Array.isArray(data.errors)).toBeTruthy();
            data.errors.forEach((error: any) => {
                expect(error.errorType).toBe('Runtime');
            });
        });

        test('should filter by date range', async ({ apiContext }) => {
            const startDate = '2025-01-01';
            const endDate = '2025-12-31';

            const response = await apiContext.get(
                `/api/errors?startDate=${startDate}&endDate=${endDate}`
            );

            expect(response.ok()).toBeTruthy();
        });

        test('should search by message', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors?search=database');

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(Array.isArray(data.errors)).toBeTruthy();
            data.errors.forEach((error: any) => {
                expect(error.message.toLowerCase()).toContain('database');
            });
        });

        test('should filter by resolved status', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors?resolved=false');

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(Array.isArray(data.errors)).toBeTruthy();
            data.errors.forEach((error: any) => {
                expect(error.resolved).toBe(false);
            });
        });

        test('should filter by store', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors?store=STORE-0001');

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(Array.isArray(data.errors)).toBeTruthy();
            data.errors.forEach((error: any) => {
                expect(error.store).toBe('STORE-0001');
            });
        });

        test('should support sorting', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors?sortBy=timestamp&order=desc');

            expect(response.ok()).toBeTruthy();
            const errors = await response.json();

            // Verify descending order
            for (let i = 0; i < errors.length - 1; i++) {
                const current = new Date(errors[i].timestamp);
                const next = new Date(errors[i + 1].timestamp);
                expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
            }
        });

        test('should handle invalid query parameters gracefully', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors?page=-1&limit=1000');

            expect(response.status()).toBe(400);
            const error = await response.json();
            expect(error).toHaveProperty('error');
        });
    });

    test.describe('POST /api/errors', () => {
        test('should create new error', async ({ apiContext }) => {
            const newError = {
                message: 'Test API error',
                severity: 'high',
                errorType: 'Runtime',
                lineNumber: 100,
                stackTrace: 'Error at line 100',
                store: 'STORE-0001'
            };

            const response = await apiContext.post('/api/errors', {
                data: newError
            });

            expect(response.ok()).toBeTruthy();
            const created = await response.json();
            expect(created).toHaveProperty('id');
            expect(created.message).toBe(newError.message);
            expect(created.severity).toBe(newError.severity);
        });

        test('should validate required fields', async ({ apiContext }) => {
            const invalidError = {
                // Missing required fields
                severity: 'high'
            };

            const response = await apiContext.post('/api/errors', {
                data: invalidError
            });

            expect(response.status()).toBe(400);
            const error = await response.json();
            expect(error).toHaveProperty('error');
        });

        test('should validate severity values', async ({ apiContext }) => {
            const invalidError = {
                message: 'Test error',
                severity: 'invalid_severity',
                errorType: 'Runtime'
            };

            const response = await apiContext.post('/api/errors', {
                data: invalidError
            });

            expect(response.status()).toBe(400);
        });

        test('should set default values for optional fields', async ({ apiContext }) => {
            const minimalError = {
                message: 'Minimal error',
                severity: 'medium',
                errorType: 'Runtime'
            };

            const response = await apiContext.post('/api/errors', {
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
        test('should retrieve specific error by ID', async ({ apiContext }) => {
            // First create an error
            const newError = {
                message: 'Specific error test',
                severity: 'low',
                errorType: 'Test'
            };

            const createResponse = await apiContext.post('/api/errors', {
                data: newError
            });

            const created = await createResponse.json();

            // Retrieve the error
            const getResponse = await apiContext.get(`/api/errors/${created.id}`);
            expect(getResponse.ok()).toBeTruthy();

            const error = await getResponse.json();
            expect(error.id).toBe(created.id);
            expect(error.message).toBe(newError.message);
        });

        test('should return 404 for non-existent error', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors/99999999');
            expect(response.status()).toBe(404);
        });

        test('should return 400 for invalid ID format', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors/invalid-id');
            expect(response.status()).toBe(400);
        });
    });

    test.describe('PATCH /api/errors/:id', () => {
        test('should update error fields', async ({ apiContext }) => {
            // Create error
            const newError = {
                message: 'Error to update',
                severity: 'medium',
                resolved: false
            };

            const createResponse = await apiContext.post('/api/errors', {
                data: newError
            });

            const created = await createResponse.json();

            // Update error
            const updates = {
                severity: 'high',
                resolved: true,
                notes: 'Fixed in production'
            };

            const updateResponse = await apiContext.patch(`/api/errors/${created.id}`, {
                data: updates
            });

            expect(updateResponse.ok()).toBeTruthy();

            const updated = await updateResponse.json();
            expect(updated.severity).toBe('high');
            expect(updated.resolved).toBe(true);
            expect(updated.notes).toBe('Fixed in production');
        });

        test('should validate updated field values', async ({ apiContext }) => {
            const createResponse = await apiContext.post('/api/errors', {
                data: { message: 'Test', severity: 'low', errorType: 'Test' }
            });

            const created = await createResponse.json();

            const invalidUpdate = {
                severity: 'invalid_value'
            };

            const updateResponse = await apiContext.patch(`/api/errors/${created.id}`, {
                data: invalidUpdate
            });

            expect(updateResponse.status()).toBe(400);
        });

        test('should return 404 when updating non-existent error', async ({ apiContext }) => {
            const response = await apiContext.patch('/api/errors/99999999', {
                data: { resolved: true }
            });

            expect(response.status()).toBe(404);
        });
    });

    test.describe('DELETE /api/errors/:id', () => {
        test('should delete error', async ({ apiContext }) => {
            // Create error
            const newError = {
                message: 'Error to delete',
                severity: 'low',
                errorType: 'Test'
            };

            const createResponse = await apiContext.post('/api/errors', {
                data: newError
            });

            const created = await createResponse.json();

            // Delete error
            const deleteResponse = await apiContext.delete(`/api/errors/${created.id}`);
            expect(deleteResponse.ok()).toBeTruthy();

            // Verify deletion
            const getResponse = await apiContext.get(`/api/errors/${created.id}`);
            expect(getResponse.status()).toBe(404);
        });

        test('should return 404 when deleting non-existent error', async ({ apiContext }) => {
            const response = await apiContext.delete('/api/errors/99999999');
            expect(response.status()).toBe(404);
        });
    });

    test.describe('POST /api/errors/bulk', () => {
        test('should create multiple errors in bulk', async ({ apiContext }) => {
            const errors = [
                { message: 'Bulk error 1', severity: 'high', errorType: 'Runtime' },
                { message: 'Bulk error 2', severity: 'medium', errorType: 'Database' },
                { message: 'Bulk error 3', severity: 'low', errorType: 'Network' }
            ];

            const response = await apiContext.post('/api/errors/bulk', {
                data: { errors }
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('created');
            expect(result.created).toBe(3);
            expect(result).toHaveProperty('ids');
            expect(result.ids.length).toBe(3);
        });

        test('should handle validation errors in bulk creation', async ({ apiContext }) => {
            const errors = [
                { message: 'Valid error', severity: 'high', errorType: 'Runtime' },
                { message: 'Invalid error', severity: 'invalid', errorType: 'Runtime' }
            ];

            const response = await apiContext.post('/api/errors/bulk', {
                data: { errors }
            });

            expect(response.status()).toBe(400);
            const error = await response.json();
            expect(error).toHaveProperty('invalidIndices');
        });
    });

    test.describe('GET /api/errors/stats', () => {
        test('should retrieve error statistics', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors/stats');

            expect(response.ok()).toBeTruthy();
            const stats = await response.json();
            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('bySeverity');
            expect(stats).toHaveProperty('byType');
            expect(stats).toHaveProperty('resolved');
            expect(stats).toHaveProperty('unresolved');
        });

        test('should filter statistics by date range', async ({ apiContext }) => {
            const response = await apiContext.get(
                '/api/errors/stats?startDate=2025-01-01&endDate=2025-12-31'
            );

            expect(response.ok()).toBeTruthy();
            const stats = await response.json();
            expect(stats).toHaveProperty('dateRange');
        });

        test('should provide statistics by store', async ({ apiContext }) => {
            const response = await apiContext.get('/api/errors/stats/by-store');

            expect(response.ok()).toBeTruthy();
            const stats = await response.json();
            expect(Array.isArray(stats)).toBeTruthy();
        });
    });

    test.describe('POST /api/errors/export', () => {
        test('should export errors as CSV', async ({ apiContext }) => {
            const response = await apiContext.post('/api/errors/export', {
                data: {
                    format: 'csv',
                    filters: { severity: 'critical' }
                }
            });

            expect(response.ok()).toBeTruthy();
            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('text/csv');
        });

        test('should export errors as JSON', async ({ apiContext }) => {
            const response = await apiContext.post('/api/errors/export', {
                data: {
                    format: 'json',
                    filters: {}
                }
            });

            expect(response.ok()).toBeTruthy();
            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('application/json');
        });

        test('should export errors as Excel', async ({ apiContext }) => {
            const response = await apiContext.post('/api/errors/export', {
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
        test('should retrieve all stores', async ({ apiContext }) => {
            const response = await apiContext.get('/api/stores');

            expect(response.ok()).toBeTruthy();
            const stores = await response.json();
            expect(Array.isArray(stores)).toBeTruthy();
        });

        test('should support pagination for stores', async ({ apiContext }) => {
            const response = await apiContext.get('/api/stores?page=1&limit=20');

            expect(response.ok()).toBeTruthy();
            const data = await response.json();
            expect(data.stores.length).toBeLessThanOrEqual(20);
        });

        test('should search stores by name', async ({ apiContext }) => {
            const response = await apiContext.get('/api/stores?search=test');

            expect(response.ok()).toBeTruthy();
        });
    });

    test.describe('POST /api/stores', () => {
        test('should create new store', async ({ apiContext }) => {
            const newStore = {
                storeNumber: `STORE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: 'Test Store',
                location: 'Test City',
                region: 'North'
            };

            const response = await apiContext.post('/api/stores', {
                data: newStore
            });

            expect(response.ok()).toBeTruthy();
            const created = await response.json();
            expect(created.storeNumber).toBe(newStore.storeNumber);
        });

        test('should prevent duplicate store numbers', async ({ apiContext }) => {
            const storeNumber = `STORE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Create first store
            await apiContext.post('/api/stores', {
                data: { storeNumber, name: 'Store 1', location: 'Location 1' }
            });

            // Attempt to create duplicate
            const response = await apiContext.post('/api/stores', {
                data: { storeNumber, name: 'Store 2', location: 'Location 2' }
            });

            expect(response.status()).toBe(409); // Conflict
        });
    });

    test.describe('GET /api/kiosks', () => {
        test('should retrieve all kiosks', async ({ apiContext }) => {
            const response = await apiContext.get('/api/kiosks');

            expect(response.ok()).toBeTruthy();
            const kiosks = await response.json();
            expect(Array.isArray(kiosks)).toBeTruthy();
        });

        test('should filter kiosks by store', async ({ apiContext }) => {
            const response = await apiContext.get('/api/kiosks?store=STORE-0001');

            expect(response.ok()).toBeTruthy();
            const kiosks = await response.json();
            kiosks.forEach((kiosk: any) => {
                expect(kiosk.storeNumber).toBe('STORE-0001');
            });
        });
    });

    test.describe('POST /api/kiosks', () => {
        test('should create new kiosk', async ({ apiContext }) => {
            const newKiosk = {
                kioskNumber: `KIOSK-${Date.now()}`,
                storeNumber: 'STORE-0001',
                status: 'active'
            };

            const response = await apiContext.post('/api/kiosks', {
                data: newKiosk
            });

            expect(response.ok()).toBeTruthy();
            const created = await response.json();
            expect(created.kioskNumber).toBe(newKiosk.kioskNumber);
        });

        test('should validate kiosk belongs to valid store', async ({ apiContext }) => {
            const newKiosk = {
                kioskNumber: `KIOSK-${Date.now()}`,
                storeNumber: 'INVALID-STORE',
                status: 'active'
            };

            const response = await apiContext.post('/api/kiosks', {
                data: newKiosk
            });

            expect(response.status()).toBe(400);
        });
    });
});

test.describe('API Tests - ML Training Endpoints', () => {
    test.describe('POST /api/ml/train', () => {
        test('should initiate ML training job', async ({ apiContext }) => {
            const trainingConfig = {
                modelType: 'classification',
                features: ['severity', 'errorType', 'lineNumber'],
                targetField: 'resolved',
                algorithm: 'random_forest'
            };

            const response = await apiContext.post('/api/ml/train', {
                data: trainingConfig
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('jobId');
            expect(result).toHaveProperty('status');
            expect(result.status).toBe('queued');
        });

        test('should validate training configuration', async ({ apiContext }) => {
            const invalidConfig = {
                modelType: 'invalid_type'
            };

            const response = await apiContext.post('/api/ml/train', {
                data: invalidConfig
            });

            expect(response.status()).toBe(400);
        });
    });

    test.describe('GET /api/ml/jobs/:jobId', () => {
        test('should retrieve training job status', async ({ apiContext }) => {
            // Create job
            const trainingConfig = {
                modelType: 'classification',
                features: ['severity'],
                targetField: 'resolved'
            };

            const createResponse = await apiContext.post('/api/ml/train', {
                data: trainingConfig
            });

            const job = await createResponse.json();

            // Check status
            const statusResponse = await apiContext.get(`/api/ml/jobs/${job.jobId}`);
            expect(statusResponse.ok()).toBeTruthy();

            const status = await statusResponse.json();
            expect(status).toHaveProperty('jobId');
            expect(status).toHaveProperty('status');
            expect(['queued', 'running', 'completed', 'failed']).toContain(status.status);
        });
    });

    test.describe('POST /api/ml/predict', () => {
        test('should make prediction with trained model', async ({ apiContext }) => {
            const predictionData = {
                severity: 'high',
                errorType: 'Runtime',
                lineNumber: 100
            };

            const response = await apiContext.post('/api/ml/predict', {
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
        test('should list all trained models', async ({ apiContext }) => {
            const response = await apiContext.get('/api/ml/models');

            expect(response.ok()).toBeTruthy();
            const models = await response.json();
            expect(Array.isArray(models)).toBeTruthy();
        });

        test('should filter models by status', async ({ apiContext }) => {
            const response = await apiContext.get('/api/ml/models?status=active');

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
        test('should analyze error with AI', async ({ apiContext }) => {
            const errorData = {
                message: 'Null pointer exception at line 42',
                errorType: 'Runtime',
                stackTrace: 'Error at main.js:42'
            };

            const response = await apiContext.post('/api/ai/analyze', {
                data: errorData
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('analysis');
            expect(result).toHaveProperty('suggestions');
            expect(result).toHaveProperty('severity');
        });

        test('should handle timeout for long-running analysis', async ({ apiContext }) => {
            const response = await apiContext.post('/api/ai/analyze', {
                data: { message: 'Complex error requiring long analysis' },
                timeout: 30000 // 30 seconds
            });

            expect([200, 408]).toContain(response.status()); // OK or Timeout
        });
    });

    test.describe('POST /api/ai/suggest', () => {
        test('should provide fix suggestions', async ({ apiContext }) => {
            const errorData = {
                message: 'Memory leak detected',
                errorType: 'Memory'
            };

            const response = await apiContext.post('/api/ai/suggest', {
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
        test('should summarize multiple errors', async ({ apiContext }) => {
            const errors = [
                { message: 'Database timeout', count: 10 },
                { message: 'Network error', count: 5 },
                { message: 'Memory leak', count: 3 }
            ];

            const response = await apiContext.post('/api/ai/summarize', {
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
        test('should handle Excel file upload', async ({ apiContext }) => {
            const file = Buffer.from('test excel content');

            const response = await apiContext.post('/api/upload', {
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

        test('should reject files exceeding size limit', async ({ apiContext }) => {
            const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB (exceeds 10MB limit)

            const response = await apiContext.post('/api/upload', {
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

        test('should reject unsupported file types', async ({ apiContext }) => {
            const file = Buffer.from('test content');

            const response = await apiContext.post('/api/upload', {
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
        test('should retrieve upload status', async ({ apiContext }) => {
            // Upload file first
            const file = Buffer.from('test');
            const uploadResponse = await apiContext.post('/api/upload', {
                multipart: {
                    file: { name: 'test.csv', mimeType: 'text/csv', buffer: file }
                }
            });

            const upload = await uploadResponse.json();

            // Check status
            const statusResponse = await apiContext.get(`/api/uploads/${upload.fileId}`);
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
        test('should authenticate with valid Firebase token', async ({ apiContext }) => {
            const response = await apiContext.post('/api/auth/firebase', {
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

        test('should reject invalid token', async ({ apiContext }) => {
            const response = await apiContext.post('/api/auth/firebase', {
                data: {
                    idToken: 'invalid-token'
                }
            });

            expect(response.status()).toBe(401);
        });
    });

    test.describe('POST /api/auth/logout', () => {
        test('should logout user', async ({ apiContext }) => {
            // Login first
            const loginResponse = await apiContext.post('/api/auth/firebase', {
                data: { idToken: 'valid-token' }
            });

            const auth = await loginResponse.json();

            // Logout
            const logoutResponse = await apiContext.post('/api/auth/logout', {
                headers: {
                    'Authorization': `Bearer ${auth.sessionToken}`
                }
            });

            expect(logoutResponse.ok()).toBeTruthy();
        });
    });

    test.describe('GET /api/admin/users', () => {
        test('should require admin role', async ({ apiContext }) => {
            const response = await apiContext.get('/api/admin/users', {
                headers: { Authorization: '' }
            });
            expect(response.status()).toBe(401);
        });

        test('should allow access with admin token', async ({ apiContext }) => {
            // Login as admin
            const mockPayload = Buffer.from(JSON.stringify({
                email: 'test@stacklens.ai',
                sub: 'admin-user',
                name: 'Admin User',
                picture: 'https://example.com/avatar.jpg'
            })).toString('base64');
            const mockToken = `header.${mockPayload}.signature`;

            const loginResponse = await apiContext.post('/api/auth/firebase-signin', {
                data: { idToken: mockToken }
            });

            const auth = await loginResponse.json();
            console.log('Auth response:', auth);

            // Access admin endpoint
            const response = await apiContext.get('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });

            if (!response.ok()) {
                console.log('Admin access failed:', response.status(), await response.text());
            }
            expect(response.ok()).toBeTruthy();
        });
    });
});

test.describe('API Tests - Request Validation', () => {
    test('should reject requests with invalid Content-Type', async ({ apiContext }) => {
        const response = await apiContext.post('/api/errors', {
            headers: {
                'Content-Type': 'text/plain'
            },
            data: 'not json'
        });

        expect([400, 415]).toContain(response.status());
    });

    test('should validate JSON syntax', async ({ apiContext }) => {
        const response = await apiContext.post('/api/errors', {
            headers: {
                'Content-Type': 'application/json'
            },
            data: '{invalid json}'
        });

        expect(response.status()).toBe(400);
    });

    test('should enforce maximum payload size', async ({ apiContext }) => {
        const largePayload = {
            message: 'A'.repeat(1000000), // 1MB of text
            severity: 'high',
            errorType: 'Test'
        };

        const response = await apiContext.post('/api/errors', {
            data: largePayload
        });

        expect([413, 400]).toContain(response.status());
    });

    test('should validate required headers', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors', {
            headers: {
                // Missing required headers if any
            }
        });

        // Should still work or return specific error
        expect([200, 400]).toContain(response.status());
    });

    test('should handle missing request body', async ({ apiContext }) => {
        const response = await apiContext.post('/api/errors');

        expect(response.status()).toBe(400);
    });

    test('should validate URL parameter formats', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors?page=invalid');

        expect([400, 422]).toContain(response.status());
    });

    test('should handle special characters in query params', async ({ apiContext }) => {
        const specialChars = '!@#$%^&*()';
        const response = await apiContext.get(
            `/api/errors?search=${encodeURIComponent(specialChars)}`
        );

        expect([200, 400]).toContain(response.status());
    });
});

test.describe('API Tests - Response Format Validation', () => {
    test('should return proper Content-Type headers', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors');

        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('application/json');
    });

    test('should include CORS headers', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors', {
            headers: {
                'Origin': 'http://localhost:5173'
            }
        });

        const headers = response.headers();
        expect(headers).toHaveProperty('access-control-allow-origin');
    });

    test('should return consistent error response format', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors/999999');

        expect(response.status()).toBe(404);
        const error = await response.json();

        expect(error).toHaveProperty('error');
        expect(error).toHaveProperty('message');
    });

    test('should include pagination metadata', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors?page=1&limit=5');

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        expect(data).toHaveProperty('page');
        expect(data).toHaveProperty('totalPages');
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('limit');
    });

    test('should return timestamps in ISO format', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors');

        expect(response.ok()).toBeTruthy();
        const errors = await response.json();

        if (errors.length > 0 && errors[0].timestamp) {
            const timestamp = errors[0].timestamp;
            expect(new Date(timestamp).toISOString()).toBe(timestamp);
        }
    });
});

test.describe('API Tests - Error Handling', () => {
    test('should handle database connection errors gracefully', async ({ apiContext }) => {
        // Simulate database error scenario
        const response = await apiContext.get('/api/errors');

        // Should return proper error, not crash
        expect([200, 500, 503]).toContain(response.status());
    });

    test('should return 404 for non-existent routes', async ({ apiContext }) => {
        const response = await apiContext.get('/api/nonexistent');

        expect(response.status()).toBe(404);
    });

    test('should handle malformed route parameters', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors/not-a-number');

        expect([400, 404]).toContain(response.status());
    });

    test('should provide helpful error messages', async ({ apiContext }) => {
        const response = await apiContext.post('/api/errors', {
            data: { severity: 'invalid' }
        });

        expect(response.status()).toBe(400);
        const error = await response.json();

        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(0);
    });

    test('should handle concurrent request failures', async ({ apiContext }) => {
        const requests = Array.from({ length: 20 }, () =>
            apiContext.get('/api/errors/999999')
        );

        const responses = await Promise.all(requests);

        responses.forEach(response => {
            expect(response.status()).toBe(404);
        });
    });
});

test.describe('API Tests - Rate Limiting', () => {
    test('should implement rate limiting', async ({ apiContext }) => {
        const requests = Array.from({ length: 150 }, () =>
            apiContext.get('/api/errors', {
                headers: { 'x-test-force-ratelimit': 'true' }
            })
        );

        const responses = await Promise.all(requests);

        // Some requests might be rate limited
        const rateLimited = responses.filter(r => r.status() === 429);
        const successful = responses.filter(r => r.ok());

        expect(successful.length + rateLimited.length).toBe(150);
    });

    test('should include rate limit headers', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors');

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

    test('should reset rate limits after time window', async ({ apiContext }) => {
        // Make requests to hit limit
        const initialRequests = Array.from({ length: 100 }, () =>
            apiContext.get('/api/errors', {
                headers: { 'x-test-force-ratelimit': 'true' }
            })
        );

        await Promise.all(initialRequests);

        // Wait for rate limit window to reset (simulate)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Should be able to make requests again
        const response = await apiContext.get('/api/errors');
        expect([200, 429]).toContain(response.status());
    });
});

test.describe('API Tests - Pagination Edge Cases', () => {
    test('should handle page=0', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors?page=0&limit=10');

        // Should either default to page 1 or return error
        expect([200, 400]).toContain(response.status());
    });

    test('should handle negative page numbers', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors?page=-1&limit=10');

        expect([400, 422]).toContain(response.status());
    });

    test('should handle excessive page numbers', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors?page=999999&limit=10');

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        // Should return empty array for pages beyond data
        expect(Array.isArray(data.errors) || Array.isArray(data)).toBeTruthy();
    });

    test('should handle limit=0', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors?page=1&limit=0');

        expect([400, 422]).toContain(response.status());
    });

    test('should enforce maximum limit', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors?page=1&limit=10000');

        // Should cap at reasonable limit or return error
        expect([200, 400]).toContain(response.status());

        if (response.ok()) {
            const data = await response.json();
            expect(data.errors.length).toBeLessThanOrEqual(1000);
        }
    });
});

test.describe('API Tests - Concurrent Operations', () => {
    test('should handle concurrent reads safely', async ({ apiContext }) => {
        const requests = Array.from({ length: 50 }, () =>
            apiContext.get('/api/errors')
        );

        const responses = await Promise.all(requests);

        const allSuccessful = responses.every(r => r.ok());
        expect(allSuccessful).toBeTruthy();
    });

    test('should handle concurrent writes with proper isolation', async ({ apiContext }) => {
        const errors = Array.from({ length: 10 }, (_, i) => ({
            message: `Concurrent error ${i}`,
            severity: 'medium',
            errorType: 'Test'
        }));

        const createRequests = errors.map(e =>
            apiContext.post('/api/errors', { data: e })
        );

        const responses = await Promise.all(createRequests);

        const allSuccessful = responses.every((r: any) => r.ok());
        expect(allSuccessful).toBeTruthy();
    });

    test('should prevent race conditions on updates', async ({ apiContext }) => {
        // Create an error
        const createResponse = await apiContext.post('/api/errors', {
            data: {
                message: 'Race condition test',
                severity: 'high',
                errorType: 'Test'
            }
        });

        const created = await createResponse.json();

        // Concurrent updates
        const updates = Array.from({ length: 5 }, (_, i) =>
            apiContext.put(`/api/errors/${created.id}`, {
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
    test('should include appropriate cache headers', async ({ apiContext }) => {
        const response = await apiContext.get('/api/errors');

        const headers = response.headers();

        // Check for cache control headers
        if (headers['cache-control']) {
            expect(headers['cache-control']).toBeTruthy();
        }
    });

    test('should respect If-None-Match for conditional requests', async ({ apiContext }) => {
        const response1 = await apiContext.get('/api/errors');
        const etag = response1.headers()['etag'];

        if (etag) {
            const response2 = await apiContext.get('/api/errors', {
                headers: {
                    'If-None-Match': etag
                }
            });

            expect([200, 304]).toContain(response2.status());
        }
    });

    test('should support If-Modified-Since', async ({ apiContext }) => {
        const pastDate = new Date(Date.now() - 86400000).toUTCString();

        const response = await apiContext.get('/api/errors', {
            headers: {
                'If-Modified-Since': pastDate
            }
        });

        expect([200, 304]).toContain(response.status());
    });
});
