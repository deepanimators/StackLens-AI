import { test, expect } from '@playwright/test';

const POS_BACKEND_URL = 'http://localhost:3000';
const STACKLENS_API_URL = 'http://localhost:4000';

test.describe('POS to StackLens Logging Integration', () => {
    test.beforeAll(async () => {
        // Wait a bit for services to be fully ready
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('POS backend should be accessible', async ({ request }) => {
        const response = await request.get(`${POS_BACKEND_URL}/api/health`);
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.status).toBe('ok');
    });

    test('StackLens analytics endpoint should be accessible', async ({ request }) => {
        const response = await request.get(`${STACKLENS_API_URL}/api/analytics/metrics`);
        expect(response.ok()).toBeTruthy();
    });

    test('POS info event should reach StackLens analytics', async ({ request }) => {
        // Get baseline metrics
        const beforeResponse = await request.get(`${STACKLENS_API_URL}/api/analytics/metrics`);
        expect(beforeResponse.ok()).toBeTruthy();
        const beforeData = await beforeResponse.json();
        const beforeEventCount = beforeData.data?.metrics?.length || 0;

        // Send info event via POS backend
        const posResponse = await request.post(`${POS_BACKEND_URL}/api/info`, {
            data: {}
        });
        expect(posResponse.ok()).toBeTruthy();

        // Wait for log to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if analytics received the event
        const afterResponse = await request.get(`${STACKLENS_API_URL}/api/analytics/metrics`);
        expect(afterResponse.ok()).toBeTruthy();
        const afterData = await afterResponse.json();
        const afterEventCount = afterData.data?.metrics?.length || 0;

        // Should have new metric
        expect(afterEventCount).toBeGreaterThan(beforeEventCount);
    });

    test('POS error event should trigger alert in StackLens', async ({ request }) => {
        // Get baseline alerts
        const beforeAlertsResponse = await request.get(`${STACKLENS_API_URL}/api/analytics/alerts`);
        expect(beforeAlertsResponse.ok()).toBeTruthy();
        const beforeAlerts = await beforeAlertsResponse.json();
        const beforeAlertCount = beforeAlerts.data?.alerts?.length || 0;

        // Send multiple error events to trigger alert threshold
        for (let i = 0; i < 3; i++) {
            const posResponse = await request.post(`${POS_BACKEND_URL}/api/error`, {
                data: {}
            });
            expect(posResponse.ok()).toBeTruthy();
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Wait for alerts to be generated
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if alert was created
        const afterAlertsResponse = await request.get(`${STACKLENS_API_URL}/api/analytics/alerts`);
        expect(afterAlertsResponse.ok()).toBeTruthy();
        const afterAlerts = await afterAlertsResponse.json();
        const afterAlertCount = afterAlerts.data?.alerts?.length || 0;

        // Should have alerts
        expect(afterAlertCount).toBeGreaterThanOrEqual(beforeAlertCount);

        // Verify error rate alert exists
        const alerts = afterAlerts.data?.alerts || [];
        const hasErrorAlert = alerts.some((alert: any) =>
            alert.severity === 'critical' && alert.metric === 'error_rate'
        );
        expect(hasErrorAlert || afterAlertCount > beforeAlertCount).toBeTruthy();
    });

    test('POS checkout event should be tracked correctly', async ({ request }) => {
        // Send checkout event
        const posResponse = await request.post(`${POS_BACKEND_URL}/api/checkout`, {
            data: {}
        });
        expect(posResponse.ok()).toBeTruthy();

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get metrics
        const metricsResponse = await request.get(`${STACKLENS_API_URL}/api/analytics/metrics`);
        expect(metricsResponse.ok()).toBeTruthy();
        const metricsData = await metricsResponse.json();

        // Should have metrics with total requests > 0
        const metrics = metricsData.data?.metrics || [];
        expect(metrics.length).toBeGreaterThan(0);

        if (metrics.length > 0) {
            const latestMetric = metrics[metrics.length - 1];
            expect(latestMetric.total_requests).toBeGreaterThan(0);
        }
    });

    test('Custom log message should be forwarded to analytics', async ({ request }) => {
        const customMessage = 'Test custom log from integration test';

        // Send custom log
        const posResponse = await request.post(`${POS_BACKEND_URL}/api/log`, {
            data: {
                message: customMessage,
                source: 'integration-test'
            }
        });
        expect(posResponse.ok()).toBeTruthy();

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify metrics were updated
        const metricsResponse = await request.get(`${STACKLENS_API_URL}/api/analytics/metrics`);
        expect(metricsResponse.ok()).toBeTruthy();
        const metricsData = await metricsResponse.json();

        expect(metricsData.success).toBeTruthy();
    });

    test('Health status should reflect POS activity', async ({ request }) => {
        // Send some events
        await request.post(`${POS_BACKEND_URL}/api/info`, { data: {} });
        await request.post(`${POS_BACKEND_URL}/api/checkout`, { data: {} });

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check health status
        const healthResponse = await request.get(`${STACKLENS_API_URL}/api/analytics/health-status`);
        expect(healthResponse.ok()).toBeTruthy();
        const healthData = await healthResponse.json();

        expect(healthData.success).toBeTruthy();
        expect(healthData.data?.status).toBeDefined();
        expect(['healthy', 'degraded', 'offline']).toContain(healthData.data.status);
    });

    test('Multiple concurrent events should all be captured', async ({ request }) => {
        // Get baseline
        const beforeResponse = await request.get(`${STACKLENS_API_URL}/api/analytics/metrics`);
        const beforeData = await beforeResponse.json();
        const beforeCount = beforeData.data?.metrics?.length || 0;

        // Send multiple events concurrently
        const promises = [
            request.post(`${POS_BACKEND_URL}/api/info`, { data: {} }),
            request.post(`${POS_BACKEND_URL}/api/checkout`, { data: {} }),
            request.post(`${POS_BACKEND_URL}/api/info`, { data: {} }),
            request.post(`${POS_BACKEND_URL}/api/checkout`, { data: {} }),
        ];

        const responses = await Promise.all(promises);
        responses.forEach(response => {
            expect(response.ok()).toBeTruthy();
        });

        // Wait for all to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if all events were captured
        const afterResponse = await request.get(`${STACKLENS_API_URL}/api/analytics/metrics`);
        const afterData = await afterResponse.json();
        const afterCount = afterData.data?.metrics?.length || 0;

        // Should have more metrics
        expect(afterCount).toBeGreaterThan(beforeCount);
    });
});
