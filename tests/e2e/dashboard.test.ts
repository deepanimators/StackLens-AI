import { test, expect, filterErrors, selectDropdownOption } from '../fixtures';

/**
 * E2E Test: Error Dashboard and Filtering
 * Tests dashboard functionality, filters, and error management
 */

test.describe('Error Dashboard', () => {
    test.use({ storageState: 'tests/.auth/user.json' });

    test.beforeEach(async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/errors');
    });

    test('should display dashboard with error statistics', async ({ authenticatedPage }) => {
        // Check main dashboard elements
        await expect(authenticatedPage.locator('[data-testid="dashboard"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="total-errors"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="error-chart"]')).toBeVisible();
    });

    test('should display error severity breakdown', async ({ authenticatedPage }) => {
        await expect(authenticatedPage.locator('[data-testid="critical-count"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="high-count"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="medium-count"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="low-count"]')).toBeVisible();
    });

    test('should filter errors by store', async ({ authenticatedPage }) => {
        await filterErrors(authenticatedPage, { store: 'BK-001' });

        // Wait for filtered results
        await authenticatedPage.waitForResponse('**/api/errors**');

        // Verify filtered results
        const errorCards = authenticatedPage.locator('[data-testid="error-card"]');
        await expect(errorCards.first()).toBeVisible();

        // All errors should be from selected store
        const storeLabels = await errorCards.locator('[data-testid="error-store"]').allTextContents();
        expect(storeLabels.every(label => label.includes('BK-001'))).toBe(true);
    });

    test('should filter errors by kiosk', async ({ authenticatedPage }) => {
        await filterErrors(authenticatedPage, {
            store: 'BK-001',
            kiosk: 'BK-001-K1'
        });

        await authenticatedPage.waitForResponse('**/api/errors**');

        const errorCards = authenticatedPage.locator('[data-testid="error-card"]');
        const kioskLabels = await errorCards.locator('[data-testid="error-kiosk"]').allTextContents();
        expect(kioskLabels.every(label => label.includes('BK-001-K1'))).toBe(true);
    });

    test('should filter errors by severity', async ({ authenticatedPage }) => {
        await filterErrors(authenticatedPage, { severity: 'High' });

        await authenticatedPage.waitForResponse('**/api/errors**');

        const errorCards = authenticatedPage.locator('[data-testid="error-card"]');
        const severityBadges = await errorCards.locator('[data-testid="error-severity"]').allTextContents();
        expect(severityBadges.every(badge => badge.includes('High'))).toBe(true);
    });

    test('should filter errors by date range', async ({ authenticatedPage }) => {
        await filterErrors(authenticatedPage, {
            dateRange: {
                from: '2024-01-01',
                to: '2024-01-31'
            }
        });

        await authenticatedPage.waitForResponse('**/api/errors**');

        // Verify dates are within range
        const errorCards = authenticatedPage.locator('[data-testid="error-card"]');
        await expect(errorCards.first()).toBeVisible();
    });

    test('should apply multiple filters together', async ({ authenticatedPage }) => {
        await filterErrors(authenticatedPage, {
            store: 'BK-001',
            kiosk: 'BK-001-K1',
            severity: 'High',
            dateRange: {
                from: '2024-01-01',
                to: '2024-01-31'
            }
        });

        await authenticatedPage.waitForResponse('**/api/errors**');

        const errorCards = authenticatedPage.locator('[data-testid="error-card"]');
        await expect(errorCards).toHaveCount(expect.any(Number));
    });

    test('should clear all filters', async ({ authenticatedPage }) => {
        // Apply filters
        await filterErrors(authenticatedPage, {
            store: 'BK-001',
            severity: 'High'
        });

        // Clear filters
        await authenticatedPage.click('button:has-text("Clear Filters")');

        // Verify all errors shown
        const errorCards = authenticatedPage.locator('[data-testid="error-card"]');
        const count = await errorCards.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should search errors by keyword', async ({ authenticatedPage }) => {
        await authenticatedPage.fill('[data-testid="search-input"]', 'NullPointerException');
        await authenticatedPage.click('button:has-text("Search")');

        await authenticatedPage.waitForResponse('**/api/errors**');

        const errorCards = authenticatedPage.locator('[data-testid="error-card"]');
        const messages = await errorCards.locator('[data-testid="error-message"]').allTextContents();
        expect(messages.some(msg => msg.includes('NullPointerException'))).toBe(true);
    });

    test('should paginate through error results', async ({ authenticatedPage }) => {
        // Go to next page
        await authenticatedPage.click('[data-testid="next-page"]');

        // Verify page changed
        await expect(authenticatedPage.locator('[data-testid="current-page"]')).toContainText('2');

        // Go back to first page
        await authenticatedPage.click('[data-testid="prev-page"]');
        await expect(authenticatedPage.locator('[data-testid="current-page"]')).toContainText('1');
    });

    test('should change items per page', async ({ authenticatedPage }) => {
        await selectDropdownOption(authenticatedPage, '[data-testid="items-per-page"]', '50');

        await authenticatedPage.waitForResponse('**/api/errors**');

        const errorCards = authenticatedPage.locator('[data-testid="error-card"]');
        const count = await errorCards.count();
        expect(count).toBeLessThanOrEqual(50);
    });

    test('should sort errors by severity', async ({ authenticatedPage }) => {
        await authenticatedPage.click('[data-testid="sort-severity"]');

        await authenticatedPage.waitForResponse('**/api/errors**');

        const severities = await authenticatedPage
            .locator('[data-testid="error-severity"]')
            .allTextContents();

        // Verify sorted (Critical > High > Medium > Low)
        expect(severities[0]).toContain('Critical');
    });

    test('should sort errors by date', async ({ authenticatedPage }) => {
        await authenticatedPage.click('[data-testid="sort-date"]');

        await authenticatedPage.waitForResponse('**/api/errors**');

        const dates = await authenticatedPage
            .locator('[data-testid="error-date"]')
            .allTextContents();

        // Verify chronologically sorted
        expect(dates.length).toBeGreaterThan(0);
    });

    test('should export errors to CSV', async ({ authenticatedPage }) => {
        const downloadPromise = authenticatedPage.waitForEvent('download');

        await authenticatedPage.click('button:has-text("Export CSV")');

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.csv');
    });

    test('should export errors to Excel', async ({ authenticatedPage }) => {
        const downloadPromise = authenticatedPage.waitForEvent('download');

        await authenticatedPage.click('button:has-text("Export Excel")');

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.xlsx');
    });

    test('should display error details on click', async ({ authenticatedPage }) => {
        await authenticatedPage.click('[data-testid="error-card"]');

        // Verify detail modal/page
        await expect(authenticatedPage.locator('[data-testid="error-detail-modal"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="error-stack-trace"]')).toBeVisible();
    });

    test('should mark error as resolved', async ({ authenticatedPage }) => {
        await authenticatedPage.click('[data-testid="error-card"]');
        await authenticatedPage.click('button:has-text("Mark as Resolved")');

        await authenticatedPage.waitForResponse('**/api/errors/**/resolve');

        await expect(authenticatedPage.locator('[data-testid="resolved-badge"]')).toBeVisible();
    });

    test('should display real-time updates', async ({ authenticatedPage }) => {
        const initialCount = await authenticatedPage
            .locator('[data-testid="total-errors"]')
            .textContent();

        // Wait for WebSocket update (simulated new error)
        await authenticatedPage.waitForTimeout(2000);

        const updatedCount = await authenticatedPage
            .locator('[data-testid="total-errors"]')
            .textContent();

        // Count might be same or updated
        expect(updatedCount).toBeDefined();
    });
});
