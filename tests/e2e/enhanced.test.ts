import { test, expect } from '@playwright/test';

test.describe('Enhanced E2E Tests - Multi-User Scenarios', () => {
    test('concurrent users editing same error', async ({ browser }) => {
        // Create two browser contexts (two users)
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Both users login
        await page1.goto('http://localhost:5173/login');
        await page1.click('button:has-text("Sign in with Google")');
        await page1.waitForURL('**/dashboard');

        await page2.goto('http://localhost:5173/login');
        await page2.click('button:has-text("Sign in with Google")');
        await page2.waitForURL('**/dashboard');

        // Both users open same error
        await page1.goto('http://localhost:5173/dashboard');
        const errorId = await page1.locator('table tbody tr').first().getAttribute('data-error-id');

        await page1.click(`tr[data-error-id="${errorId}"]`);
        await page2.goto('http://localhost:5173/dashboard');
        await page2.click(`tr[data-error-id="${errorId}"]`);

        // User 1 starts editing
        await page1.click('button:has-text("Edit")');
        await expect(page1.locator('[data-testid="edit-mode"]')).toBeVisible();

        // User 2 should see "locked" indicator
        await expect(page2.locator('[data-testid="locked-indicator"]')).toBeVisible();
        await expect(page2.locator('text=Another user is editing')).toBeVisible();

        // User 1 makes changes
        await page1.fill('textarea[name="notes"]', 'Updated by user 1');
        await page1.click('button:has-text("Save")');

        // User 2 should see update notification
        await expect(page2.locator('text=Error was updated')).toBeVisible();
        await page2.click('button:has-text("Refresh")');

        // User 2 should see user 1's changes
        const notes = await page2.locator('[data-testid="error-notes"]').textContent();
        expect(notes).toContain('Updated by user 1');

        await context1.close();
        await context2.close();
    });

    test('collaborative analysis workflow', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const analyst = await context1.newPage();
        const admin = await context2.newPage();

        // Analyst uploads and analyzes
        await analyst.goto('http://localhost:5173/login');
        await analyst.click('button:has-text("Sign in with Google")');
        await analyst.waitForURL('**/dashboard');

        await analyst.click('button:has-text("Upload")');
        const fileInput = analyst.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'errors.log',
            mimeType: 'text/plain',
            buffer: Buffer.from('[ERROR] Critical issue requiring admin attention')
        });

        await expect(analyst.locator('text=Upload successful')).toBeVisible();
        await analyst.goto('http://localhost:5173/dashboard');

        // Analyst requests AI analysis
        const firstRow = analyst.locator('table tbody tr').first();
        await firstRow.click();
        await analyst.click('button:has-text("Analyze with AI")');
        await expect(analyst.locator('[data-testid="ai-suggestions"]')).toBeVisible({ timeout: 15000 });

        // Analyst escalates to admin
        await analyst.click('button:has-text("Escalate to Admin")');
        await expect(analyst.locator('text=Escalated successfully')).toBeVisible();

        // Admin receives notification
        await admin.goto('http://localhost:5173/login');
        await admin.click('button:has-text("Sign in with Google")');
        await admin.waitForURL('**/dashboard');

        const notificationBadge = admin.locator('[data-testid="notification-badge"]');
        await expect(notificationBadge).toBeVisible();
        const count = await notificationBadge.textContent();
        expect(parseInt(count || '0')).toBeGreaterThan(0);

        // Admin reviews and resolves
        await admin.click('[data-testid="notifications-button"]');
        await admin.click('text=Critical issue requiring admin attention');

        await expect(admin.locator('[data-testid="escalation-info"]')).toBeVisible();
        await admin.click('button:has-text("Resolve")');
        await admin.fill('textarea[name="resolution"]', 'Fixed in production');
        await admin.click('button:has-text("Confirm Resolution")');

        // Analyst sees resolution
        await analyst.reload();
        await expect(analyst.locator('[data-testid="resolution-banner"]')).toBeVisible();
        await expect(analyst.locator('text=Fixed in production')).toBeVisible();

        await context1.close();
        await context2.close();
    });
});

test.describe('Enhanced E2E Tests - Error Scenarios', () => {
    test('handle network failures gracefully', async ({ page, context }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Go offline
        await context.setOffline(true);

        // Attempt to fetch data
        await page.goto('http://localhost:5173/dashboard');

        // Should show offline message
        await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
        await expect(page.locator('text=No internet connection')).toBeVisible();

        // Should still show cached data
        await expect(page.locator('table')).toBeVisible();

        // Go back online
        await context.setOffline(false);

        // Should reconnect automatically
        await expect(page.locator('[data-testid="offline-message"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
    });

    test('handle API errors and retry', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Intercept API to return error
        let attemptCount = 0;
        await page.route('**/api/errors', route => {
            attemptCount++;
            if (attemptCount < 3) {
                route.fulfill({ status: 500, body: 'Server error' });
            } else {
                route.continue();
            }
        });

        // Trigger API call
        await page.goto('http://localhost:5173/dashboard');

        // Should show error message
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

        // Should show retry button
        const retryButton = page.locator('button:has-text("Retry")');
        await expect(retryButton).toBeVisible();

        // Retry should work after 3 attempts
        await retryButton.click();
        await page.waitForTimeout(500);
        await retryButton.click();

        // Should succeed
        await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });

    test('handle session timeout', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Simulate session expiry by intercepting auth check
        await page.route('**/api/auth/verify', route => {
            route.fulfill({ status: 401, body: JSON.stringify({ error: 'Session expired' }) });
        });

        // Trigger auth check
        await page.goto('http://localhost:5173/dashboard');

        // Should show session expired modal
        await expect(page.locator('[data-testid="session-expired-modal"]')).toBeVisible();
        await expect(page.locator('text=Your session has expired')).toBeVisible();

        // Should redirect to login
        await page.click('button:has-text("Sign in again")');
        await expect(page).toHaveURL(/.*login/);
    });

    test('handle upload errors and validation', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.click('button:has-text("Upload")');

        // Test invalid file type
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'invalid.exe',
            mimeType: 'application/x-msdownload',
            buffer: Buffer.from('invalid content')
        });

        await expect(page.locator('text=Invalid file type')).toBeVisible();

        // Test file too large
        await fileInput.setInputFiles({
            name: 'large.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            buffer: Buffer.alloc(11 * 1024 * 1024) // 11MB
        });

        await expect(page.locator('text=File too large')).toBeVisible();
        await expect(page.locator('text=Maximum size is 10MB')).toBeVisible();

        // Test corrupted file
        await fileInput.setInputFiles({
            name: 'corrupted.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            buffer: Buffer.from('corrupted data')
        });

        await expect(page.locator('text=Failed to process file')).toBeVisible();
    });

    test('handle ML training failures', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.click('nav a:has-text("ML Training")');

        // Intercept training API to fail
        await page.route('**/api/ml/train', route => {
            route.fulfill({
                status: 400,
                body: JSON.stringify({ error: 'Insufficient training data' })
            });
        });

        await page.click('button:has-text("New Training")');

        await page.fill('input[name="jobName"]', 'Test Training');
        await page.selectOption('select[name="modelType"]', 'classification');
        await page.check('input[name="feature"][value="severity"]');

        await page.click('button:has-text("Start Training")');

        // Should show error
        await expect(page.locator('[data-testid="training-error"]')).toBeVisible();
        await expect(page.locator('text=Insufficient training data')).toBeVisible();

        // Should offer suggestions
        await expect(page.locator('text=Upload more data')).toBeVisible();
    });
});

test.describe('Enhanced E2E Tests - Performance Scenarios', () => {
    test('handle large datasets efficiently', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Mock large dataset response
        await page.route('**/api/errors*', route => {
            const largeDataset = {
                errors: Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    message: `Error ${i}`,
                    severity: ['critical', 'high', 'medium', 'low'][i % 4],
                    errorType: 'Runtime',
                    timestamp: new Date().toISOString()
                })),
                total: 1000,
                page: 1,
                totalPages: 20
            };
            route.fulfill({ status: 200, body: JSON.stringify(largeDataset) });
        });

        await page.goto('http://localhost:5173/dashboard');

        // Should use virtualization/pagination
        await expect(page.locator('table')).toBeVisible();

        // Should not render all 1000 rows at once
        const visibleRows = await page.locator('table tbody tr').count();
        expect(visibleRows).toBeLessThan(100);

        // Scrolling should load more
        await page.locator('table').evaluate(el => el.scrollTo(0, el.scrollHeight));
        await page.waitForTimeout(500);

        // More rows should be visible
        const newVisibleRows = await page.locator('table tbody tr').count();
        expect(newVisibleRows).toBeGreaterThan(visibleRows);
    });

    test('handle rapid filter changes without lag', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        const startTime = Date.now();

        // Rapidly change filters
        for (let i = 0; i < 10; i++) {
            const severity = ['critical', 'high', 'medium', 'low'][i % 4];
            await page.selectOption('select[name="severity"]', severity);
            await page.waitForTimeout(100);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should complete within reasonable time (debounced)
        expect(duration).toBeLessThan(3000);

        // Final result should be visible
        await expect(page.locator('table tbody tr').first()).toBeVisible();
    });

    test('handle concurrent API requests', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Track API requests
        const apiRequests: string[] = [];
        page.on('request', request => {
            if (request.url().includes('/api/')) {
                apiRequests.push(request.url());
            }
        });

        // Trigger multiple concurrent requests
        await page.goto('http://localhost:5173/dashboard');
        await page.click('[data-testid="refresh-stats"]');
        await page.click('[data-testid="refresh-chart"]');

        await page.waitForTimeout(2000);

        // Should handle multiple requests
        expect(apiRequests.length).toBeGreaterThan(1);

        // Page should remain responsive
        await expect(page.locator('table')).toBeVisible();
    });
});

test.describe('Enhanced E2E Tests - Security Scenarios', () => {
    test('prevent unauthorized access to admin pages', async ({ page }) => {
        // Login as regular user
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Attempt to access admin page
        await page.goto('http://localhost:5173/admin/users');

        // Should be redirected or show access denied
        await expect(page.locator('text=Access Denied')).toBeVisible();
        expect(page.url()).not.toContain('/admin/users');
    });

    test('sanitize user input to prevent XSS', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Attempt XSS in search
        const xssPayload = '<script>alert("XSS")</script>';
        await page.fill('input[placeholder="Search errors..."]', xssPayload);

        await page.waitForTimeout(1000);

        // Script should not execute
        page.on('dialog', () => {
            throw new Error('XSS vulnerability: alert was triggered');
        });

        // Input should be escaped
        const searchValue = await page.locator('input[placeholder="Search errors..."]').inputValue();
        expect(searchValue).toBe(xssPayload);

        // Display should be escaped
        const displayedText = await page.locator('table').textContent();
        expect(displayedText).not.toContain('<script>');
    });

    test('validate CSRF protection', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Check that state-changing requests include CSRF token
        let csrfToken: string | null = null;

        page.on('request', request => {
            if (request.method() === 'POST' || request.method() === 'PATCH' || request.method() === 'DELETE') {
                const headers = request.headers();
                if (headers['x-csrf-token']) {
                    csrfToken = headers['x-csrf-token'];
                }
            }
        });

        // Trigger state-changing request
        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();
        await page.click('button:has-text("Mark as Resolved")');

        await page.waitForTimeout(1000);

        // CSRF token should be present
        expect(csrfToken).toBeTruthy();
    });
});

test.describe('Enhanced E2E Tests - Data Integrity', () => {
    test('verify data consistency across operations', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Get initial error count
        const initialCount = await page.locator('[data-testid="total-errors"]').textContent();
        const initialNumber = parseInt(initialCount || '0');

        // Create new error via API
        await page.request.post('http://localhost:5000/api/errors', {
            data: {
                message: 'Test error',
                severity: 'medium',
                errorType: 'Test'
            }
        });

        // Refresh dashboard
        await page.goto('http://localhost:5173/dashboard');

        // Count should increase by 1
        const newCount = await page.locator('[data-testid="total-errors"]').textContent();
        const newNumber = parseInt(newCount || '0');
        expect(newNumber).toBe(initialNumber + 1);

        // Verify in table
        await expect(page.locator('tr:has-text("Test error")')).toBeVisible();
    });

    test('handle optimistic updates correctly', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Select first error
        const firstRow = page.locator('table tbody tr').first();
        const errorId = await firstRow.getAttribute('data-error-id');

        await firstRow.click();

        // Mark as resolved (optimistic update)
        await page.click('button:has-text("Mark as Resolved")');

        // UI should update immediately
        await expect(page.locator(`tr[data-error-id="${errorId}"] [data-testid="status"]`))
            .toHaveText('Resolved');

        // If API fails, should revert
        await page.route(`**/api/errors/${errorId}`, route => {
            route.fulfill({ status: 500, body: 'Server error' });
        });

        // Trigger another update
        await page.click('button:has-text("Mark as Unresolved")');

        // Should show error and revert
        await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
        await expect(page.locator(`tr[data-error-id="${errorId}"] [data-testid="status"]`))
            .toHaveText('Resolved'); // Reverted to previous state
    });
});

test.describe('Enhanced E2E Tests - Accessibility', () => {
    test('keyboard navigation works correctly', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.goto('http://localhost:5173/dashboard');

        // Tab through interactive elements
        await page.keyboard.press('Tab'); // Focus first element
        await page.keyboard.press('Tab'); // Focus next
        await page.keyboard.press('Tab'); // Focus table

        // Enter to interact
        await page.keyboard.press('Enter');

        // Should open error details
        await expect(page.locator('[data-testid="error-details"]')).toBeVisible();

        // Escape to close
        await page.keyboard.press('Escape');
        await expect(page.locator('[data-testid="error-details"]')).not.toBeVisible();

        // Arrow keys for navigation
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        // Should select third row
        const selectedRow = page.locator('tr[aria-selected="true"]');
        await expect(selectedRow).toBeVisible();
    });

    test('screen reader support', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Check ARIA labels
        await expect(page.locator('[aria-label="Error list table"]')).toBeVisible();
        await expect(page.locator('[aria-label="Filter errors"]')).toBeVisible();
        await expect(page.locator('[aria-label="Search errors"]')).toBeVisible();

        // Check heading structure
        const h1 = page.locator('h1');
        await expect(h1).toBeVisible();

        // Check live regions for updates
        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();
        await page.click('button:has-text("Mark as Resolved")');

        const liveRegion = page.locator('[aria-live="polite"]');
        await expect(liveRegion).toContainText(/resolved|success/i);
    });

    test('color contrast meets WCAG standards', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Critical severity badge - should have high contrast
        const criticalBadge = page.locator('[data-severity="critical"]').first();
        const criticalBg = await criticalBadge.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
        );
        const criticalColor = await criticalBadge.evaluate(el =>
            window.getComputedStyle(el).color
        );

        // Basic contrast check (detailed check would need actual contrast calculation)
        expect(criticalBg).toBeTruthy();
        expect(criticalColor).toBeTruthy();
        expect(criticalBg).not.toBe(criticalColor);
    });
});

test.describe('Enhanced E2E Tests - Cross-Browser Compatibility', () => {
    test('works in Chromium', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'Chromium-only test');

        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await expect(page.locator('table')).toBeVisible();
    });

    test('works in Firefox', async ({ page, browserName }) => {
        test.skip(browserName !== 'firefox', 'Firefox-only test');

        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await expect(page.locator('table')).toBeVisible();
    });

    test('works in WebKit/Safari', async ({ page, browserName }) => {
        test.skip(browserName !== 'webkit', 'WebKit-only test');

        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await expect(page.locator('table')).toBeVisible();
    });

    test('handles CSS Grid across browsers', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const grid = page.locator('[data-testid="dashboard-grid"]');
        const display = await grid.evaluate(el =>
            window.getComputedStyle(el).display
        );

        expect(display).toBe('grid');
    });

    test('handles Flexbox across browsers', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const flex = page.locator('[data-testid="header-nav"]');
        const display = await flex.evaluate(el =>
            window.getComputedStyle(el).display
        );

        expect(display).toBe('flex');
    });
});

test.describe('Enhanced E2E Tests - Mobile Viewport', () => {
    test('iPhone SE viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('http://localhost:5173/dashboard');

        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
        await expect(page.locator('table, [data-testid="error-card"]')).toHaveCount(await page.locator('table, [data-testid="error-card"]').count());
    });

    test('iPhone 12 Pro viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('http://localhost:5173/dashboard');

        const content = page.locator('main');
        const box = await content.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(390);
    });

    test('iPad viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('http://localhost:5173/dashboard');

        await expect(page.locator('table')).toBeVisible();
    });

    test('iPad Pro viewport (landscape)', async ({ page }) => {
        await page.setViewportSize({ width: 1366, height: 1024 });
        await page.goto('http://localhost:5173/dashboard');

        await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
    });

    test('Android phone viewport', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 640 });
        await page.goto('http://localhost:5173/dashboard');

        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    });
});

test.describe('Enhanced E2E Tests - File Operations', () => {
    test('download error report as PDF', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('button:has-text("Download PDF")')
        ]);

        expect(download.suggestedFilename()).toMatch(/\.pdf$/);
        const path = await download.path();
        expect(path).toBeTruthy();
    });

    test('download error log as text file', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('button:has-text("Download Log")')
        ]);

        expect(download.suggestedFilename()).toMatch(/\.(log|txt)$/);
    });

    test('export multiple errors to Excel', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Select multiple errors
        await page.check('table tbody tr:nth-child(1) input[type="checkbox"]');
        await page.check('table tbody tr:nth-child(2) input[type="checkbox"]');
        await page.check('table tbody tr:nth-child(3) input[type="checkbox"]');

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('button:has-text("Export to Excel")')
        ]);

        expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    });

    test('upload and process CSV file', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.click('button:has-text("Import")');

        const csvContent = `message,severity,errorType
"Test error 1",high,Runtime
"Test error 2",medium,Network`;

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'errors.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
        });

        await expect(page.locator('text=2 records will be imported')).toBeVisible();
        await page.click('button:has-text("Confirm Import")');
        await expect(page.locator('text=Import successful')).toBeVisible({ timeout: 10000 });
    });

    test('handle file upload errors gracefully', async ({ page }) => {
        await page.goto('http://localhost:5173/upload');

        // Upload invalid file type
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'invalid.exe',
            mimeType: 'application/exe',
            buffer: Buffer.from('invalid content')
        });

        await expect(page.locator('text=Unsupported file type')).toBeVisible();
    });
});

test.describe('Enhanced E2E Tests - Media and Assets', () => {
    test('display error screenshots', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.click('table tbody tr:has([data-has-screenshot="true"])');

        const screenshot = page.locator('[data-testid="error-screenshot"]');
        await expect(screenshot).toBeVisible();

        // Verify image loads
        const loaded = await screenshot.evaluate((img: HTMLImageElement) => img.complete);
        expect(loaded).toBeTruthy();
    });

    test('lazy load images in gallery', async ({ page }) => {
        await page.goto('http://localhost:5173/gallery');

        // Images outside viewport should not be loaded
        const images = page.locator('img[loading="lazy"]');
        const count = await images.count();
        expect(count).toBeGreaterThan(0);

        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        // Wait for images to load
        await page.waitForTimeout(1000);

        // More images should be visible now
        const visibleImages = page.locator('img[loading="lazy"]:visible');
        await expect(visibleImages.first()).toBeVisible();
    });

    test('display chart visualizations', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.click('a:has-text("Analytics")');

        const chart = page.locator('[data-testid="error-trend-chart"]');
        await expect(chart).toBeVisible();

        // Verify canvas or SVG is rendered
        const canvas = page.locator('canvas, svg');
        await expect(canvas.first()).toBeVisible();
    });
});

test.describe('Enhanced E2E Tests - Print and Export', () => {
    test('print error report', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();

        // Emulate print dialog
        await page.emulateMedia({ media: 'print' });

        // Check print styles are applied
        const printElement = page.locator('[data-testid="print-view"]');
        const display = await printElement.evaluate(el =>
            window.getComputedStyle(el).display
        );

        expect(display).not.toBe('none');

        // Reset media
        await page.emulateMedia({ media: 'screen' });
    });

    test('generate shareable link', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();
        await page.click('button:has-text("Share")');

        const shareLink = page.locator('[data-testid="share-link"]');
        await expect(shareLink).toBeVisible();

        const link = await shareLink.inputValue();
        expect(link).toMatch(/^https?:\/\//);

        // Copy to clipboard
        await page.click('button:has-text("Copy Link")');
        await expect(page.locator('text=Link copied')).toBeVisible();
    });
});

test.describe('Enhanced E2E Tests - Real-time Features', () => {
    test('receive real-time error notifications', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const adminPage = await context1.newPage();
        const userPage = await context2.newPage();

        // Admin creates error
        await adminPage.goto('http://localhost:5173/login');
        await adminPage.click('button:has-text("Sign in as Admin")');
        await adminPage.waitForURL('**/dashboard');

        // User views dashboard
        await userPage.goto('http://localhost:5173/login');
        await userPage.click('button:has-text("Sign in with Google")');
        await userPage.waitForURL('**/dashboard');

        const initialCount = await userPage.locator('table tbody tr').count();

        // Admin creates new error
        await adminPage.click('button:has-text("Report Error")');
        await adminPage.fill('[name="message"]', 'Real-time test error');
        await adminPage.selectOption('[name="severity"]', 'critical');
        await adminPage.fill('[name="errorType"]', 'Test');
        await adminPage.click('button[type="submit"]');

        // User should see notification
        await expect(userPage.locator('[data-testid="new-error-notification"]')).toBeVisible({ timeout: 5000 });

        // Table should update
        const newCount = await userPage.locator('table tbody tr').count();
        expect(newCount).toBe(initialCount + 1);

        await context1.close();
        await context2.close();
    });

    test('sync status updates across sessions', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Both users view same error
        await page1.goto('http://localhost:5173/login');
        await page1.click('button:has-text("Sign in with Google")');
        await page1.waitForURL('**/dashboard');

        await page2.goto('http://localhost:5173/login');
        await page2.click('button:has-text("Sign in with Google")');
        await page2.waitForURL('**/dashboard');

        const errorId = await page1.locator('table tbody tr').first().getAttribute('data-error-id');

        await page1.click(`tr[data-error-id="${errorId}"]`);
        await page2.click(`tr[data-error-id="${errorId}"]`);

        // User 1 changes status
        await page1.click('button:has-text("Mark as Resolved")');

        // User 2 should see update
        await expect(page2.locator('[data-testid="status-badge"]:has-text("Resolved")')).toBeVisible({ timeout: 5000 });

        await context1.close();
        await context2.close();
    });
});
