import { test, expect } from '@playwright/test';
import axios from 'axios';

test.describe('StackLens E2E', () => {
    test('should display alert when error log is ingested', async ({ page }) => {
        // 1. Ingest error log via API
        await axios.post('http://localhost:3001/api/ingest/log', {
            message: 'E2E Test Error',
            service: 'e2e-service',
            error_code: 'PRICE_MISSING',
            timestamp: new Date().toISOString()
        });

        // 2. Open Dashboard
        await page.goto('http://localhost:5173');

        // 3. Verify Alert appears
        await expect(page.getByText('PRICE_MISSING')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('e2e-service')).toBeVisible();
    });

    test('should create Jira ticket from alert', async ({ page }) => {
        // 1. Ingest error log
        await axios.post('http://localhost:3001/api/ingest/log', {
            message: 'Jira Test Error',
            service: 'jira-service',
            error_code: 'DB_CONNECTION_ERROR',
            timestamp: new Date().toISOString()
        });

        await page.goto('http://localhost:5173');
        await expect(page.getByText('DB_CONNECTION_ERROR')).toBeVisible();

        // 2. Click Create Ticket
        await page.getByRole('button', { name: 'Create Jira Ticket' }).first().click();

        // 3. Verify Ticket Key appears
        await expect(page.getByText(/MOCK-\d+/)).toBeVisible();
        await expect(page.getByText('assigned')).toBeVisible();
    });
});
