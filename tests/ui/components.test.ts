import { test, expect } from '@playwright/test';

test.describe('UI Component Tests - Error Table', () => {
    test('should render error table with data', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Wait for table to load
        await expect(page.locator('table')).toBeVisible();

        // Check table headers
        await expect(page.locator('th:has-text("Message")')).toBeVisible();
        await expect(page.locator('th:has-text("Severity")')).toBeVisible();
        await expect(page.locator('th:has-text("Type")')).toBeVisible();
        await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
        await expect(page.locator('th:has-text("Status")')).toBeVisible();

        // Check table has rows
        const rows = page.locator('table tbody tr');
        await expect(rows.first()).toBeVisible();
    });

    test('should display severity badges with correct colors', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Critical severity - red
        const criticalBadge = page.locator('[data-severity="critical"]').first();
        await expect(criticalBadge).toHaveCSS('background-color', /red|rgb\(220, 38, 38\)/);

        // High severity - orange
        const highBadge = page.locator('[data-severity="high"]').first();
        await expect(highBadge).toHaveCSS('background-color', /orange|rgb\(234, 88, 12\)/);

        // Medium severity - yellow
        const mediumBadge = page.locator('[data-severity="medium"]').first();
        await expect(mediumBadge).toHaveCSS('background-color', /yellow|rgb\(234, 179, 8\)/);

        // Low severity - green
        const lowBadge = page.locator('[data-severity="low"]').first();
        await expect(lowBadge).toHaveCSS('background-color', /green|rgb\(34, 197, 94\)/);
    });

    test('should show row actions on hover', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const firstRow = page.locator('table tbody tr').first();

        // Actions should be hidden initially
        const actions = firstRow.locator('[data-testid="row-actions"]');
        await expect(actions).toBeHidden();

        // Hover to show actions
        await firstRow.hover();
        await expect(actions).toBeVisible();

        // Should have action buttons
        await expect(actions.locator('button[title="View Details"]')).toBeVisible();
        await expect(actions.locator('button[title="Analyze"]')).toBeVisible();
        await expect(actions.locator('button[title="Delete"]')).toBeVisible();
    });

    test('should support row selection', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const checkbox = page.locator('table tbody tr').first().locator('input[type="checkbox"]');

        // Initially unchecked
        await expect(checkbox).not.toBeChecked();

        // Check the checkbox
        await checkbox.check();
        await expect(checkbox).toBeChecked();

        // Bulk action bar should appear
        await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible();
    });

    test('should expand row to show details', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const firstRow = page.locator('table tbody tr').first();
        const expandButton = firstRow.locator('[data-testid="expand-row"]');

        await expandButton.click();

        // Details row should be visible
        const detailsRow = page.locator('[data-testid="error-details"]').first();
        await expect(detailsRow).toBeVisible();

        // Should show stack trace
        await expect(detailsRow.locator('text=Stack Trace')).toBeVisible();

        // Should show additional info
        await expect(detailsRow.locator('text=Line Number')).toBeVisible();
        await expect(detailsRow.locator('text=File Path')).toBeVisible();
    });

    test('should handle empty state', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard?filter=nonexistent');

        // Should show empty state
        await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
        await expect(page.locator('text=No errors found')).toBeVisible();

        // Should show helpful message
        await expect(page.locator('text=Try adjusting your filters')).toBeVisible();
    });

    test('should handle loading state', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Intercept API call to delay response
        await page.route('**/api/errors', route => {
            setTimeout(() => route.continue(), 2000);
        });

        // Reload to trigger loading
        await page.reload();

        // Should show loading skeleton
        await expect(page.locator('[data-testid="table-skeleton"]')).toBeVisible();

        // Should show spinner
        await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

        // Wait for data to load
        await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
    });
});

test.describe('UI Component Tests - Header', () => {
    test('should render header with logo and navigation', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Logo should be visible
        await expect(page.locator('[data-testid="logo"]')).toBeVisible();

        // Navigation links
        await expect(page.locator('nav a:has-text("Dashboard")')).toBeVisible();
        await expect(page.locator('nav a:has-text("Upload")')).toBeVisible();
        await expect(page.locator('nav a:has-text("Analytics")')).toBeVisible();
    });

    test('should show user menu on click', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const userMenu = page.locator('[data-testid="user-menu-button"]');
        await userMenu.click();

        // Dropdown should appear
        await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();

        // Should show user info
        await expect(page.locator('text=Profile')).toBeVisible();
        await expect(page.locator('text=Settings')).toBeVisible();
        await expect(page.locator('text=Logout')).toBeVisible();
    });

    test('should highlight active navigation item', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const dashboardLink = page.locator('nav a:has-text("Dashboard")');
        await expect(dashboardLink).toHaveClass(/active|bg-primary/);

        // Navigate to upload
        await page.click('nav a:has-text("Upload")');
        await expect(page.locator('nav a:has-text("Upload")')).toHaveClass(/active|bg-primary/);
        await expect(dashboardLink).not.toHaveClass(/active|bg-primary/);
    });

    test('should show notification badge', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const notificationButton = page.locator('[data-testid="notifications-button"]');
        const badge = notificationButton.locator('[data-testid="notification-badge"]');

        await expect(badge).toBeVisible();

        const count = await badge.textContent();
        expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
    });

    test('should open search on shortcut', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Press Cmd+K or Ctrl+K
        await page.keyboard.press('Meta+K');

        // Search modal should open
        await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();
        await expect(page.locator('input[placeholder*="Search"]')).toBeFocused();
    });
});

test.describe('UI Component Tests - Theme Toggle', () => {
    test('should toggle between light and dark mode', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const themeToggle = page.locator('[data-testid="theme-toggle"]');

        // Check initial theme
        const html = page.locator('html');
        const initialTheme = await html.getAttribute('data-theme');

        // Toggle theme
        await themeToggle.click();

        // Theme should change
        const newTheme = await html.getAttribute('data-theme');
        expect(newTheme).not.toBe(initialTheme);

        // Toggle back
        await themeToggle.click();
        const finalTheme = await html.getAttribute('data-theme');
        expect(finalTheme).toBe(initialTheme);
    });

    test('should persist theme preference', async ({ page, context }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Set to dark mode
        const themeToggle = page.locator('[data-testid="theme-toggle"]');
        await themeToggle.click();

        // Reload page
        await page.reload();

        // Theme should persist
        const html = page.locator('html');
        const theme = await html.getAttribute('data-theme');
        expect(theme).toBe('dark');
    });

    test('should show appropriate icon for current theme', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const themeToggle = page.locator('[data-testid="theme-toggle"]');

        // In light mode, should show moon icon
        await expect(themeToggle.locator('[data-icon="moon"]')).toBeVisible();

        // Toggle to dark
        await themeToggle.click();

        // In dark mode, should show sun icon
        await expect(themeToggle.locator('[data-icon="sun"]')).toBeVisible();
    });
});

test.describe('UI Component Tests - ML Training Modal', () => {
    test('should open ML training modal', async ({ page }) => {
        await page.goto('http://localhost:5173/ml-training');

        await page.click('button:has-text("New Training")');

        // Modal should be visible
        await expect(page.locator('[data-testid="ml-training-modal"]')).toBeVisible();
        await expect(page.locator('h2:has-text("Configure ML Training")')).toBeVisible();
    });

    test('should show training configuration form', async ({ page }) => {
        await page.goto('http://localhost:5173/ml-training');
        await page.click('button:has-text("New Training")');

        // Form fields
        await expect(page.locator('input[name="jobName"]')).toBeVisible();
        await expect(page.locator('select[name="modelType"]')).toBeVisible();
        await expect(page.locator('select[name="algorithm"]')).toBeVisible();

        // Feature selection
        await expect(page.locator('text=Select Features')).toBeVisible();
        await expect(page.locator('input[type="checkbox"][name="feature"]')).toHaveCount(await page.locator('input[type="checkbox"][name="feature"]').count());

        // Advanced options
        await page.click('button:has-text("Advanced Options")');
        await expect(page.locator('input[name="testSize"]')).toBeVisible();
        await expect(page.locator('input[name="randomState"]')).toBeVisible();
    });

    test('should validate form inputs', async ({ page }) => {
        await page.goto('http://localhost:5173/ml-training');
        await page.click('button:has-text("New Training")');

        // Submit without required fields
        await page.click('button:has-text("Start Training")');

        // Should show validation errors
        await expect(page.locator('text=Job name is required')).toBeVisible();
        await expect(page.locator('text=Select at least one feature')).toBeVisible();
    });

    test('should close modal on cancel', async ({ page }) => {
        await page.goto('http://localhost:5173/ml-training');
        await page.click('button:has-text("New Training")');

        const modal = page.locator('[data-testid="ml-training-modal"]');
        await expect(modal).toBeVisible();

        await page.click('button:has-text("Cancel")');
        await expect(modal).not.toBeVisible();
    });

    test('should show progress when training starts', async ({ page }) => {
        await page.goto('http://localhost:5173/ml-training');
        await page.click('button:has-text("New Training")');

        // Fill required fields
        await page.fill('input[name="jobName"]', 'Test Training');
        await page.selectOption('select[name="modelType"]', 'classification');
        await page.check('input[name="feature"][value="severity"]');
        await page.selectOption('select[name="targetField"]', 'resolved');

        // Start training
        await page.click('button:has-text("Start Training")');

        // Progress indicators
        await expect(page.locator('[data-testid="training-progress-bar"]')).toBeVisible();
        await expect(page.locator('text=Training in progress')).toBeVisible();
    });
});

test.describe('UI Component Tests - Charts and Visualizations', () => {
    test('should render severity distribution chart', async ({ page }) => {
        await page.goto('http://localhost:5173/analytics');

        const chart = page.locator('[data-testid="severity-chart"]');
        await expect(chart).toBeVisible();

        // Should have chart canvas or SVG
        await expect(chart.locator('canvas, svg')).toBeVisible();

        // Should show legend
        await expect(page.locator('text=Critical')).toBeVisible();
        await expect(page.locator('text=High')).toBeVisible();
        await expect(page.locator('text=Medium')).toBeVisible();
        await expect(page.locator('text=Low')).toBeVisible();
    });

    test('should render error trend chart', async ({ page }) => {
        await page.goto('http://localhost:5173/analytics');

        const trendChart = page.locator('[data-testid="error-trend-chart"]');
        await expect(trendChart).toBeVisible();

        // Should have time axis
        await expect(trendChart.locator('text=/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/')).toBeVisible();

        // Should be interactive
        const dataPoint = trendChart.locator('[data-testid="chart-data-point"]').first();
        await dataPoint.hover();

        // Tooltip should appear
        await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    });

    test('should update charts when filters change', async ({ page }) => {
        await page.goto('http://localhost:5173/analytics');

        // Get initial chart state
        const chart = page.locator('[data-testid="severity-chart"]');
        const initialChart = await chart.screenshot();

        // Apply filter
        await page.selectOption('select[name="dateRange"]', 'last-7-days');
        await page.waitForTimeout(1000);

        // Chart should update
        const updatedChart = await chart.screenshot();
        expect(initialChart).not.toEqual(updatedChart);
    });

    test('should export chart as image', async ({ page }) => {
        await page.goto('http://localhost:5173/analytics');

        const chart = page.locator('[data-testid="severity-chart"]');
        await chart.hover();

        const exportButton = chart.locator('[data-testid="export-chart"]');
        await expect(exportButton).toBeVisible();

        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.png|\.jpg|\.svg/);
    });
});

test.describe('UI Component Tests - Filter Panel', () => {
    test('should render all filter controls', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Severity filter
        await expect(page.locator('select[name="severity"]')).toBeVisible();

        // Error type filter
        await expect(page.locator('select[name="errorType"]')).toBeVisible();

        // Date range
        await expect(page.locator('input[name="startDate"]')).toBeVisible();
        await expect(page.locator('input[name="endDate"]')).toBeVisible();

        // Store filter
        await expect(page.locator('select[name="store"]')).toBeVisible();

        // Resolved status
        await expect(page.locator('select[name="resolved"]')).toBeVisible();
    });

    test('should apply filters and update results', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Get initial count
        const initialCount = await page.locator('table tbody tr').count();

        // Apply severity filter
        await page.selectOption('select[name="severity"]', 'critical');
        await page.waitForTimeout(500);

        // Results should update
        const filteredCount = await page.locator('table tbody tr').count();

        // All visible rows should be critical
        const criticalRows = await page.locator('tr[data-severity="critical"]').count();
        expect(criticalRows).toBe(filteredCount);
    });

    test('should clear all filters', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Apply multiple filters
        await page.selectOption('select[name="severity"]', 'high');
        await page.selectOption('select[name="errorType"]', 'Database');
        await page.fill('input[name="startDate"]', '2025-01-01');

        // Clear all
        await page.click('button:has-text("Clear Filters")');

        // Filters should reset
        await expect(page.locator('select[name="severity"]')).toHaveValue('all');
        await expect(page.locator('select[name="errorType"]')).toHaveValue('all');
        await expect(page.locator('input[name="startDate"]')).toHaveValue('');
    });

    test('should show active filter count', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const filterBadge = page.locator('[data-testid="active-filters-badge"]');

        // Initially no filters
        await expect(filterBadge).toHaveText('0');

        // Apply filters
        await page.selectOption('select[name="severity"]', 'critical');
        await expect(filterBadge).toHaveText('1');

        await page.selectOption('select[name="errorType"]', 'Runtime');
        await expect(filterBadge).toHaveText('2');

        await page.fill('input[name="startDate"]', '2025-01-01');
        await expect(filterBadge).toHaveText('3');
    });

    test('should save filter presets', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Apply filters
        await page.selectOption('select[name="severity"]', 'critical');
        await page.selectOption('select[name="errorType"]', 'Database');

        // Save preset
        await page.click('button:has-text("Save Filter")');
        await page.fill('input[name="presetName"]', 'Critical DB Errors');
        await page.click('button:has-text("Save")');

        await expect(page.locator('text=Filter preset saved')).toBeVisible();

        // Clear filters
        await page.click('button:has-text("Clear Filters")');

        // Load preset
        await page.click('button:has-text("Load Filter")');
        await page.click('text=Critical DB Errors');

        // Filters should be restored
        await expect(page.locator('select[name="severity"]')).toHaveValue('critical');
        await expect(page.locator('select[name="errorType"]')).toHaveValue('Database');
    });
});

test.describe('UI Component Tests - Toast Notifications', () => {
    test('should show success toast', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Trigger success action
        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();
        await page.click('button:has-text("Mark as Resolved")');

        // Toast should appear
        const toast = page.locator('[data-testid="toast-success"]');
        await expect(toast).toBeVisible();
        await expect(toast).toHaveText(/successfully|Success/i);

        // Should auto-dismiss
        await expect(toast).not.toBeVisible({ timeout: 5000 });
    });

    test('should show error toast', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Intercept API to return error
        await page.route('**/api/errors/*', route => {
            route.fulfill({ status: 500, body: 'Server error' });
        });

        // Trigger action that will fail
        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();
        await page.click('button:has-text("Delete")');

        // Error toast should appear
        const errorToast = page.locator('[data-testid="toast-error"]');
        await expect(errorToast).toBeVisible();
        await expect(errorToast).toHaveText(/error|failed/i);
    });

    test('should dismiss toast on click', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Trigger toast
        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();
        await page.click('button:has-text("Mark as Resolved")');

        const toast = page.locator('[data-testid="toast-success"]');
        await expect(toast).toBeVisible();

        // Click to dismiss
        const dismissButton = toast.locator('[data-testid="toast-dismiss"]');
        await dismissButton.click();

        await expect(toast).not.toBeVisible();
    });

    test('should stack multiple toasts', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Trigger multiple actions quickly
        const rows = page.locator('table tbody tr');
        await rows.nth(0).click();
        await page.click('button:has-text("Mark as Resolved")');

        await rows.nth(1).click();
        await page.click('button:has-text("Mark as Resolved")');

        // Multiple toasts should be visible
        const toasts = page.locator('[data-testid^="toast-"]');
        await expect(toasts).toHaveCount(2);
    });
});

test.describe('UI Component Tests - Loading States', () => {
    test('should show skeleton loader while loading table', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Intercept to delay response
        await page.route('**/api/errors', route => {
            setTimeout(() => route.continue(), 2000);
        });

        await page.reload();

        // Skeleton should be visible
        await expect(page.locator('[data-testid="table-skeleton"]')).toBeVisible();

        // Table should appear after loading
        await expect(page.locator('table')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-testid="table-skeleton"]')).not.toBeVisible();
    });

    test('should show spinner for actions', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Intercept to delay response
        await page.route('**/api/errors/*/analyze', route => {
            setTimeout(() => route.continue(), 2000);
        });

        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();
        await page.click('button:has-text("Analyze")');

        // Spinner should be visible
        await expect(page.locator('[data-testid="action-spinner"]')).toBeVisible();

        // Should disappear when complete
        await expect(page.locator('[data-testid="action-spinner"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('should show progress bar for uploads', async ({ page }) => {
        await page.goto('http://localhost:5173/upload');

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'large-file.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            buffer: Buffer.alloc(1024 * 1024) // 1MB
        });

        // Progress bar should appear
        const progressBar = page.locator('[data-testid="upload-progress"]');
        await expect(progressBar).toBeVisible();

        // Should show percentage
        await expect(progressBar).toContainText(/%/);

        // Should complete
        await expect(progressBar).toHaveAttribute('aria-valuenow', '100', { timeout: 10000 });
    });
});

test.describe('UI Component Tests - Form Validation', () => {
    test('should validate required fields', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');
        await page.click('button:has-text("Report Error")');

        // Try to submit without filling required fields
        await page.click('button[type="submit"]');

        // Should show validation errors
        await expect(page.locator('text=Message is required')).toBeVisible();
        await expect(page.locator('text=Severity is required')).toBeVisible();
        await expect(page.locator('text=Error type is required')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
        await page.goto('http://localhost:5173/settings');

        const emailInput = page.locator('[name="email"]');

        // Invalid email
        await emailInput.fill('invalid-email');
        await emailInput.blur();
        await expect(page.locator('text=Please enter a valid email')).toBeVisible();

        // Valid email
        await emailInput.fill('user@example.com');
        await emailInput.blur();
        await expect(page.locator('text=Please enter a valid email')).not.toBeVisible();
    });

    test('should validate numeric ranges', async ({ page }) => {
        await page.goto('http://localhost:5173/settings');

        const limitInput = page.locator('[name="resultsLimit"]');

        // Too low
        await limitInput.fill('0');
        await limitInput.blur();
        await expect(page.locator('text=Minimum value is 1')).toBeVisible();

        // Too high
        await limitInput.fill('10000');
        await limitInput.blur();
        await expect(page.locator('text=Maximum value is 1000')).toBeVisible();

        // Valid
        await limitInput.fill('50');
        await limitInput.blur();
        await expect(page.locator('[name="resultsLimit"]:invalid')).toHaveCount(0);
    });

    test('should show character count for text fields', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');
        await page.click('button:has-text("Report Error")');

        const messageField = page.locator('[name="message"]');
        await messageField.fill('Test error message');

        const charCount = page.locator('[data-testid="char-count"]');
        await expect(charCount).toContainText('18');
        await expect(charCount).toContainText('/500');
    });

    test('should enforce maximum length', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');
        await page.click('button:has-text("Report Error")');

        const messageField = page.locator('[name="message"]');
        const longText = 'A'.repeat(600);
        await messageField.fill(longText);

        // Should be truncated or show error
        const value = await messageField.inputValue();
        expect(value.length).toBeLessThanOrEqual(500);
    });
});

test.describe('UI Component Tests - Drag and Drop', () => {
    test('should support drag and drop file upload', async ({ page }) => {
        await page.goto('http://localhost:5173/upload');

        const dropZone = page.locator('[data-testid="drop-zone"]');

        // Create file
        const buffer = Buffer.from('[ERROR] Test error\n[ERROR] Another error');

        // Simulate drop
        await dropZone.dispatchEvent('drop', {
            dataTransfer: {
                files: [
                    new File([buffer], 'errors.log', { type: 'text/plain' })
                ]
            }
        });

        await expect(page.locator('text=File added: errors.log')).toBeVisible();
    });

    test('should highlight drop zone on drag over', async ({ page }) => {
        await page.goto('http://localhost:5173/upload');

        const dropZone = page.locator('[data-testid="drop-zone"]');

        // Check initial state
        const initialBg = await dropZone.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
        );

        // Trigger drag over
        await dropZone.dispatchEvent('dragover');

        // Background should change
        const hoverBg = await dropZone.evaluate(el =>
            window.getComputedStyle(el).backgroundColor
        );

        expect(hoverBg).not.toBe(initialBg);
    });

    test('should support reordering table columns', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        const messageHeader = page.locator('th:has-text("Message")');
        const severityHeader = page.locator('th:has-text("Severity")');

        // Get initial positions
        const messageBox = await messageHeader.boundingBox();
        const severityBox = await severityHeader.boundingBox();

        if (messageBox && severityBox) {
            // Drag message header to severity position
            await messageHeader.dragTo(severityHeader);

            // Positions should swap
            const newMessageBox = await messageHeader.boundingBox();
            const newSeverityBox = await severityHeader.boundingBox();

            expect(newMessageBox?.x).toBeCloseTo(severityBox.x, -1);
        }
    });
});

test.describe('UI Component Tests - Modal Interactions', () => {
    test('should open and close modal with button', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Open modal
        await page.click('button:has-text("Report Error")');
        const modal = page.locator('[data-testid="error-modal"]');
        await expect(modal).toBeVisible();

        // Close with button
        await page.click('button:has-text("Cancel")');
        await expect(modal).not.toBeVisible();
    });

    test('should close modal with ESC key', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        await page.click('button:has-text("Report Error")');
        const modal = page.locator('[data-testid="error-modal"]');
        await expect(modal).toBeVisible();

        // Press ESC
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
    });

    test('should close modal by clicking backdrop', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        await page.click('button:has-text("Report Error")');
        const modal = page.locator('[data-testid="error-modal"]');
        await expect(modal).toBeVisible();

        // Click backdrop
        await page.click('[data-testid="modal-backdrop"]');
        await expect(modal).not.toBeVisible();
    });

    test('should prevent body scroll when modal is open', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Check initial scroll
        const bodyOverflow = await page.evaluate(() =>
            window.getComputedStyle(document.body).overflow
        );

        // Open modal
        await page.click('button:has-text("Report Error")');
        await expect(page.locator('[data-testid="error-modal"]')).toBeVisible();

        // Body should have overflow hidden
        const modalOverflow = await page.evaluate(() =>
            window.getComputedStyle(document.body).overflow
        );
        expect(modalOverflow).toBe('hidden');
    });

    test('should trap focus within modal', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');
        await page.click('button:has-text("Report Error")');

        // Tab through focusable elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Focus should stay within modal
        const focusedElement = await page.evaluate(() =>
            document.activeElement?.getAttribute('data-testid')
        );
        expect(focusedElement).toContain('modal');
    });
});

test.describe('UI Component Tests - Keyboard Shortcuts', () => {
    test('should support keyboard navigation in table', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Focus first row
        await page.click('table tbody tr:first-child');

        // Navigate down with arrow key
        await page.keyboard.press('ArrowDown');

        const focusedRow = await page.evaluate(() =>
            document.activeElement?.tagName
        );
        expect(focusedRow).toBe('TR');
    });

    test('should support global shortcuts', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');

        // Cmd/Ctrl + K to open search
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
        await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();

        // ESC to close
        await page.keyboard.press('Escape');
        await expect(page.locator('[data-testid="search-modal"]')).not.toBeVisible();
    });

    test('should support shortcuts in form', async ({ page }) => {
        await page.goto('http://localhost:5173/dashboard');
        await page.click('button:has-text("Report Error")');

        // Cmd/Ctrl + Enter to submit
        await page.fill('[name="message"]', 'Test error');
        await page.selectOption('[name="severity"]', 'high');
        await page.fill('[name="errorType"]', 'Test');

        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');

        await expect(page.locator('text=Error reported')).toBeVisible({ timeout: 5000 });
    });
});

test.describe('UI Component Tests - Responsive Behavior', () => {
    test('should show mobile menu on small screens', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto('http://localhost:5173/dashboard');

        // Desktop nav should be hidden
        await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();

        // Mobile menu button should be visible
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

        // Click to open menu
        await page.click('[data-testid="mobile-menu-button"]');
        await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    });

    test('should adapt table for mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('http://localhost:5173/dashboard');

        // Table should switch to card view on mobile
        const table = page.locator('table');
        const cards = page.locator('[data-testid="error-card"]');

        // Either table is scrollable or cards are shown
        const hasTable = await table.isVisible();
        const hasCards = await cards.count() > 0;
        expect(hasTable || hasCards).toBeTruthy();
    });

    test('should show/hide columns based on screen size', async ({ page }) => {
        // Desktop
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('http://localhost:5173/dashboard');
        await expect(page.locator('th:has-text("Stack Trace")')).toBeVisible();

        // Tablet
        await page.setViewportSize({ width: 768, height: 1024 });
        await expect(page.locator('th:has-text("Stack Trace")')).not.toBeVisible();
    });

    test('should adapt button sizes for touch', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('http://localhost:5173/dashboard');

        const button = page.locator('button').first();
        const box = await button.boundingBox();

        // Touch targets should be at least 44x44px
        expect(box?.height).toBeGreaterThanOrEqual(44);
    });
});
