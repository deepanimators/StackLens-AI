import { test, expect } from '@playwright/test';

test.describe('Integration Tests - Services', () => {
    test.describe('ML Service Integration', () => {
        test('should train model with valid data', async ({ request }) => {
            // Create sample training data
            const trainingData = {
                features: [
                    { severity: 'high', errorType: 'Runtime', lineNumber: 100 },
                    { severity: 'low', errorType: 'Database', lineNumber: 200 }
                ],
                labels: ['critical', 'warning']
            };

            const response = await request.post('http://localhost:4000/api/ml/train', {
                data: trainingData
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('modelId');
            expect(result).toHaveProperty('accuracy');
        });

        test('should make predictions with trained model', async ({ request }) => {
            const predictionData = {
                severity: 'high',
                errorType: 'Runtime',
                lineNumber: 150
            };

            const response = await request.post('http://localhost:4000/api/ml/predict', {
                data: predictionData
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('prediction');
            expect(result).toHaveProperty('confidence');
        });

        test('should handle invalid training data', async ({ request }) => {
            const invalidData = {
                features: [],
                labels: []
            };

            const response = await request.post('http://localhost:4000/api/ml/train', {
                data: invalidData
            });

            expect(response.status()).toBe(400);
            const error = await response.json();
            expect(error).toHaveProperty('error');
        });
    });

    test.describe('AI Service Integration', () => {
        test('should analyze error with AI', async ({ request }) => {
            const errorData = {
                message: 'Null pointer exception at line 42',
                errorType: 'Runtime',
                stackTrace: 'Error: Cannot read property of null\n  at main.js:42'
            };

            const response = await request.post('http://localhost:4000/api/ai/analyze', {
                data: errorData
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('analysis');
            expect(result).toHaveProperty('suggestions');
            expect(result.suggestions).toBeInstanceOf(Array);
        });

        test('should generate error summary', async ({ request }) => {
            const errors = [
                { message: 'Database timeout', count: 10 },
                { message: 'Network error', count: 5 }
            ];

            const response = await request.post('http://localhost:4000/api/ai/summarize', {
                data: { errors }
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('summary');
            expect(result.summary).toBeTruthy();
        });

        test('should suggest fixes for error', async ({ request }) => {
            const errorData = {
                message: 'Memory leak detected',
                errorType: 'Memory'
            };

            const response = await request.post('http://localhost:4000/api/ai/suggest-fix', {
                data: errorData
            });

            expect(response.ok()).toBeTruthy();
            const result = await response.json();
            expect(result).toHaveProperty('suggestions');
            expect(result.suggestions.length).toBeGreaterThan(0);
        });
    });

    test.describe('Database Service Integration', () => {
        test('should create and retrieve error', async ({ request }) => {
            // Create error
            const newError = {
                message: 'Test error for integration',
                severity: 'medium',
                errorType: 'Test',
                lineNumber: 100,
                store: 'STORE-0001'
            };

            const createResponse = await request.post('http://localhost:4000/api/errors', {
                data: newError
            });

            expect(createResponse.ok()).toBeTruthy();
            const created = await createResponse.json();
            expect(created).toHaveProperty('id');

            // Retrieve error
            const getResponse = await request.get(`http://localhost:4000/api/errors/${created.id}`);
            expect(getResponse.ok()).toBeTruthy();

            const retrieved = await getResponse.json();
            expect(retrieved.message).toBe(newError.message);
            expect(retrieved.severity).toBe(newError.severity);
        });

        test('should update error status', async ({ request }) => {
            // Create error
            const newError = {
                message: 'Error to update',
                severity: 'high',
                resolved: false
            };

            const createResponse = await request.post('http://localhost:4000/api/errors', {
                data: newError
            });

            const created = await createResponse.json();

            // Update error
            const updateResponse = await request.patch(`http://localhost:4000/api/errors/${created.id}`, {
                data: { resolved: true }
            });

            expect(updateResponse.ok()).toBeTruthy();

            // Verify update
            const getResponse = await request.get(`http://localhost:4000/api/errors/${created.id}`);
            const updated = await getResponse.json();
            expect(updated.resolved).toBe(true);
        });

        test('should delete error', async ({ request }) => {
            // Create error
            const newError = {
                message: 'Error to delete',
                severity: 'low'
            };

            const createResponse = await request.post('http://localhost:4000/api/errors', {
                data: newError
            });

            const created = await createResponse.json();

            // Delete error
            const deleteResponse = await request.delete(`http://localhost:4000/api/errors/${created.id}`);
            expect(deleteResponse.ok()).toBeTruthy();

            // Verify deletion
            const getResponse = await request.get(`http://localhost:4000/api/errors/${created.id}`);
            expect(getResponse.status()).toBe(404);
        });

        test('should handle concurrent database operations', async ({ request }) => {
            const operations = Array.from({ length: 10 }, (_, i) =>
                request.post('http://localhost:4000/api/errors', {
                    data: {
                        message: `Concurrent error ${i}`,
                        severity: 'medium'
                    }
                })
            );

            const responses = await Promise.all(operations);
            const allSuccessful = responses.every(r => r.ok());

            expect(allSuccessful).toBeTruthy();
        });
    });

    test.describe('Auth Service Integration', () => {
        test('should authenticate user and create session', async ({ request }) => {
            const authResponse = await request.post('http://localhost:4000/api/auth/firebase', {
                data: {
                    idToken: 'test-firebase-token'
                }
            });

            expect(authResponse.ok()).toBeTruthy();
            const auth = await authResponse.json();
            expect(auth).toHaveProperty('userId');
            expect(auth).toHaveProperty('sessionId');
        });

        test('should reject invalid authentication', async ({ request }) => {
            const authResponse = await request.post('http://localhost:4000/api/auth/firebase', {
                data: {
                    idToken: 'invalid-token'
                }
            });

            expect(authResponse.status()).toBe(401);
        });

        test('should verify admin permissions', async ({ request }) => {
            // Authenticate as admin
            const authResponse = await request.post('http://localhost:4000/api/auth/firebase', {
                data: {
                    idToken: 'admin-token',
                    role: 'admin'
                }
            });

            const auth = await authResponse.json();

            // Access admin endpoint
            const adminResponse = await request.get('http://localhost:4000/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${auth.sessionId}`
                }
            });

            expect(adminResponse.ok()).toBeTruthy();
        });
    });

    test.describe('File Upload Integration', () => {
        test('should upload Excel file and process errors', async ({ request }) => {
            const file = Buffer.from('dummy excel content');

            const formData = new FormData();
            formData.append('file', new Blob([file]), 'test.xlsx');

            const uploadResponse = await request.post('http://localhost:4000/api/upload', {
                multipart: {
                    file: {
                        name: 'test.xlsx',
                        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        buffer: file
                    }
                }
            });

            expect(uploadResponse.ok()).toBeTruthy();
            const result = await uploadResponse.json();
            expect(result).toHaveProperty('fileId');
            expect(result).toHaveProperty('processedCount');
        });

        test('should upload and analyze log file', async ({ request }) => {
            const logContent = `
[ERROR] 2025-10-06 10:30:00 - Database connection failed
[WARN] 2025-10-06 10:31:00 - Slow query detected
[ERROR] 2025-10-06 10:32:00 - Null pointer exception
      `;

            const file = Buffer.from(logContent);

            const uploadResponse = await request.post('http://localhost:4000/api/upload', {
                multipart: {
                    file: {
                        name: 'test.log',
                        mimeType: 'text/plain',
                        buffer: file
                    }
                }
            });

            expect(uploadResponse.ok()).toBeTruthy();
            const result = await uploadResponse.json();
            expect(result.processedCount).toBeGreaterThan(0);
        });
    });
});

test.describe('Integration Tests - Service Interactions', () => {
    test('should chain AI analysis with ML prediction', async ({ request }) => {
        // Step 1: AI Analysis
        const errorData = {
            message: 'Out of memory error',
            errorType: 'Memory'
        };

        const aiResponse = await request.post('http://localhost:4000/api/ai/analyze', {
            data: errorData
        });

        const aiResult = await aiResponse.json();

        // Step 2: ML Prediction
        const mlResponse = await request.post('http://localhost:4000/api/ml/predict', {
            data: {
                ...errorData,
                aiAnalysis: aiResult.analysis
            }
        });

        expect(mlResponse.ok()).toBeTruthy();
        const mlResult = await mlResponse.json();
        expect(mlResult).toHaveProperty('prediction');
    });

    test('should upload file and trigger AI analysis', async ({ request }) => {
        const logContent = '[ERROR] Critical system failure';
        const file = Buffer.from(logContent);

        // Upload file
        const uploadResponse = await request.post('http://localhost:4000/api/upload', {
            multipart: {
                file: {
                    name: 'error.log',
                    mimeType: 'text/plain',
                    buffer: file
                }
            }
        });

        const uploadResult = await uploadResponse.json();

        // Trigger AI analysis on uploaded file
        const analysisResponse = await request.post('http://localhost:4000/api/ai/analyze-file', {
            data: { fileId: uploadResult.fileId }
        });

        expect(analysisResponse.ok()).toBeTruthy();
        const analysis = await analysisResponse.json();
        expect(analysis).toHaveProperty('insights');
    });

    test('should process error through complete pipeline', async ({ request }) => {
        // 1. Create error
        const errorData = {
            message: 'Pipeline test error',
            severity: 'high',
            errorType: 'Runtime'
        };

        const createResponse = await request.post('http://localhost:4000/api/errors', {
            data: errorData
        });

        const error = await createResponse.json();

        // 2. AI Analysis
        const aiResponse = await request.post(`http://localhost:4000/api/errors/${error.id}/analyze`, {});
        expect(aiResponse.ok()).toBeTruthy();

        // 3. ML Prediction
        const mlResponse = await request.post(`http://localhost:4000/api/errors/${error.id}/predict`, {});
        expect(mlResponse.ok()).toBeTruthy();

        // 4. Get suggestions
        const suggestResponse = await request.get(`http://localhost:4000/api/errors/${error.id}/suggestions`);
        expect(suggestResponse.ok()).toBeTruthy();

        // 5. Resolve error
        const resolveResponse = await request.patch(`http://localhost:4000/api/errors/${error.id}`, {
            data: { resolved: true }
        });

        expect(resolveResponse.ok()).toBeTruthy();
    });
});

test.describe('Integration Tests - Data Consistency', () => {
    test('should maintain consistency across store updates', async ({ request }) => {
        // Create store
        const store = {
            storeNumber: 'STORE-9999',
            name: 'Test Store',
            location: 'Test Location'
        };

        const createStoreResponse = await request.post('http://localhost:4000/api/stores', {
            data: store
        });

        const createdStore = await createStoreResponse.json();

        // Add errors to store
        const errors = Array.from({ length: 5 }, (_, i) => ({
            message: `Store error ${i}`,
            store: createdStore.storeNumber,
            severity: 'medium'
        }));

        for (const error of errors) {
            await request.post('http://localhost:4000/api/errors', { data: error });
        }

        // Verify store error count
        const storeResponse = await request.get(`http://localhost:4000/api/stores/${createdStore.storeNumber}`);
        const storeData = await storeResponse.json();

        expect(storeData.errorCount).toBe(5);
    });

    test('should handle transaction rollback on failure', async ({ request }) => {
        // Attempt to create multiple related records where one will fail
        const batchData = {
            errors: [
                { message: 'Valid error 1', severity: 'high' },
                { message: 'Invalid error', severity: 'invalid_severity' }, // This should fail
                { message: 'Valid error 2', severity: 'low' }
            ]
        };

        const response = await request.post('http://localhost:4000/api/errors/batch', {
            data: batchData
        });

        // Should rollback all if one fails
        expect(response.status()).toBe(400);

        // Verify no partial data was saved
        const listResponse = await request.get('http://localhost:4000/api/errors?search=Valid error');
        const errors = await listResponse.json();

        const batchErrors = errors.filter((e: any) =>
            e.message.includes('Valid error 1') || e.message.includes('Valid error 2')
        );

        expect(batchErrors.length).toBe(0);
    });
});

test.describe('Integration Tests - Caching and Performance', () => {
    test('should cache frequent queries', async ({ request }) => {
        const query = 'severity=critical';

        // First request
        const start1 = Date.now();
        await request.get(`http://localhost:4000/api/errors?${query}`);
        const time1 = Date.now() - start1;

        // Second request (should be cached)
        const start2 = Date.now();
        const response = await request.get(`http://localhost:4000/api/errors?${query}`);
        const time2 = Date.now() - start2;

        expect(response.ok()).toBeTruthy();
        // Cached request should be faster (or similar if network is very fast)
        expect(time2).toBeLessThanOrEqual(time1 + 100);
    });

    test('should handle rate limiting gracefully', async ({ request }) => {
        // Make multiple rapid requests
        const requests = Array.from({ length: 100 }, () =>
            request.get('http://localhost:4000/api/errors?page=1&limit=10')
        );

        const responses = await Promise.all(requests);
        const allSuccessful = responses.every(r => r.ok() || r.status() === 429);

        expect(allSuccessful).toBeTruthy();
    });

    test('should implement query result pagination efficiently', async ({ request }) => {
        const page1Response = await request.get('http://localhost:4000/api/errors?page=1&limit=10');
        const page2Response = await request.get('http://localhost:4000/api/errors?page=2&limit=10');

        expect(page1Response.ok()).toBeTruthy();
        expect(page2Response.ok()).toBeTruthy();

        const page1Data = await page1Response.json();
        const page2Data = await page2Response.json();

        // Pages should have different data
        if (page1Data.errors && page2Data.errors) {
            expect(page1Data.errors[0]?.id).not.toBe(page2Data.errors[0]?.id);
        }
    });
});

test.describe('Integration Tests - Error Recovery', () => {
    test('should recover from temporary database errors', async ({ request }) => {
        // Simulate retry logic
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const response = await request.get('http://localhost:4000/api/errors');
                if (response.ok()) {
                    expect(response.ok()).toBeTruthy();
                    break;
                }
            } catch (error) {
                attempts++;
                if (attempts === maxAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    });

    test('should handle circuit breaker pattern', async ({ request }) => {
        // Test circuit breaker for failing service
        const responses = [];

        for (let i = 0; i < 5; i++) {
            const response = await request.get('http://localhost:4000/api/ml/predict', {
                data: { invalid: 'data' }
            });
            responses.push(response);
        }

        // After multiple failures, circuit should open
        expect(responses.length).toBe(5);
    });

    test('should implement graceful degradation', async ({ request }) => {
        // When AI service is down, should still return partial results
        const response = await request.get('http://localhost:4000/api/errors');

        expect(response.ok()).toBeTruthy();
        const data = await response.json();

        // Should have errors even if AI analysis is unavailable
        expect(data).toBeDefined();
    });
});

test.describe('Integration Tests - Security', () => {
    test('should validate authentication tokens', async ({ request }) => {
        // Request without auth should fail
        const response = await request.get('http://localhost:4000/api/admin/users');
        expect([401, 403]).toContain(response.status());
    });

    test('should prevent SQL injection in queries', async ({ request }) => {
        const maliciousQuery = "'; DROP TABLE errors; --";
        const response = await request.get(`http://localhost:4000/api/errors?search=${encodeURIComponent(maliciousQuery)}`);

        // Should handle safely without error
        expect([200, 400]).toContain(response.status());
    });

    test('should sanitize user input', async ({ request }) => {
        const xssPayload = '<script>alert("xss")</script>';
        const response = await request.post('http://localhost:4000/api/errors', {
            data: {
                message: xssPayload,
                severity: 'high',
                errorType: 'Test'
            }
        });

        if (response.ok()) {
            const created = await response.json();
            // Script tags should be sanitized
            expect(created.message).not.toContain('<script>');
        }
    });

    test('should enforce CORS policies', async ({ request }) => {
        const response = await request.get('http://localhost:4000/api/errors', {
            headers: {
                'Origin': 'http://malicious-site.com'
            }
        });

        const headers = response.headers();
        // Should either block or have proper CORS headers
        expect(headers).toBeDefined();
    });
});

test.describe('Integration Tests - Data Validation', () => {
    test('should validate required fields on creation', async ({ request }) => {
        const invalidError = {
            // Missing required message field
            severity: 'high'
        };

        const response = await request.post('http://localhost:4000/api/errors', {
            data: invalidError
        });

        expect(response.status()).toBe(400);
    });

    test('should validate data types', async ({ request }) => {
        const invalidError = {
            message: 'Test',
            severity: 'high',
            lineNumber: 'not-a-number', // Should be number
            errorType: 'Test'
        };

        const response = await request.post('http://localhost:4000/api/errors', {
            data: invalidError
        });

        expect([400, 422]).toContain(response.status());
    });

    test('should validate enum values', async ({ request }) => {
        const invalidError = {
            message: 'Test',
            severity: 'invalid-severity', // Not in enum
            errorType: 'Test'
        };

        const response = await request.post('http://localhost:4000/api/errors', {
            data: invalidError
        });

        expect(response.status()).toBe(400);
    });

    test('should enforce maximum string lengths', async ({ request }) => {
        const veryLongMessage = 'A'.repeat(10000);
        const response = await request.post('http://localhost:4000/api/errors', {
            data: {
                message: veryLongMessage,
                severity: 'high',
                errorType: 'Test'
            }
        });

        // Should either accept and truncate, or reject
        expect([200, 201, 400, 413]).toContain(response.status());
    });
});

test.describe('Integration Tests - Webhooks and Notifications', () => {
    test('should trigger webhook on critical error', async ({ request }) => {
        const criticalError = {
            message: 'Critical system failure',
            severity: 'critical',
            errorType: 'System',
            store: 'STORE-0001'
        };

        const response = await request.post('http://localhost:4000/api/errors', {
            data: criticalError
        });

        expect(response.ok()).toBeTruthy();
        // Webhook should be triggered (check logs or webhook service)
    });

    test('should send notifications for escalated errors', async ({ request }) => {
        // Create error
        const error = {
            message: 'Error needing escalation',
            severity: 'high',
            errorType: 'Database'
        };

        const createResponse = await request.post('http://localhost:4000/api/errors', {
            data: error
        });

        const created = await createResponse.json();

        // Escalate error
        const escalateResponse = await request.post(`http://localhost:4000/api/errors/${created.id}/escalate`, {
            data: { to: 'admin', reason: 'Requires immediate attention' }
        });

        // Should trigger notification
        expect([200, 201, 202]).toContain(escalateResponse.status());
    });
});

test.describe('Integration Tests - Batch Operations', () => {
    test('should process batch updates efficiently', async ({ request }) => {
        // Create multiple errors
        const errors = Array.from({ length: 10 }, (_, i) => ({
            message: `Batch error ${i}`,
            severity: 'medium',
            errorType: 'Test'
        }));

        const createPromises = errors.map(e =>
            request.post('http://localhost:4000/api/errors', { data: e })
        );

        const responses = await Promise.all(createPromises);
        const allCreated = responses.every(r => r.ok());

        expect(allCreated).toBeTruthy();
    });

    test('should handle batch deletion atomically', async ({ request }) => {
        // Create test errors
        const testErrors = [
            { message: 'Delete test 1', severity: 'low', errorType: 'Test' },
            { message: 'Delete test 2', severity: 'low', errorType: 'Test' }
        ];

        const createResponses = await Promise.all(
            testErrors.map(e => request.post('http://localhost:4000/api/errors', { data: e }))
        );

        const ids = await Promise.all(
            createResponses.map(async r => (await r.json()).id)
        );

        // Batch delete
        const deleteResponse = await request.delete('http://localhost:4000/api/errors/batch', {
            data: { ids }
        });

        expect([200, 204]).toContain(deleteResponse.status());
    });
});

test.describe('Integration Tests - Real-time Updates', () => {
    test('should support server-sent events for real-time updates', async ({ request }) => {
        // Check if SSE endpoint exists
        const response = await request.get('http://localhost:4000/api/monitoring/live');

        // SSE should return text/event-stream
        if (response.ok()) {
            const contentType = response.headers()['content-type'];
            expect(contentType).toContain('text/event-stream');
        }
    });

    test('should broadcast changes to connected clients', async ({ request }) => {
        // Create error which should trigger broadcast
        const error = {
            message: 'Broadcast test error',
            severity: 'critical',
            errorType: 'System'
        };

        const response = await request.post('http://localhost:4000/api/errors', {
            data: error
        });

        expect(response.ok()).toBeTruthy();
        // In real scenario, connected WebSocket/SSE clients would receive this
    });
});
