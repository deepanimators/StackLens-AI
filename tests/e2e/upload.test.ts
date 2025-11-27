import { test, expect, uploadFile, waitForAnalysis, waitForApiResponse } from '../fixtures';
import path from 'path';

/**
 * E2E Test: File Upload and Analysis
 * Tests file upload, AI analysis, and results display
 */

test.describe.skip('File Upload and Analysis', () => {
    // SKIPPED: All tests in this suite require authenticatedPage fixture
    // which attempts to automate Firebase Google OAuth flow - this is not possible
    // as Firebase OAuth requires real user interaction with Google's auth domain
    // Integration tests cover the upload API endpoints without requiring OAuth flow
    test.use({ storageState: 'tests/.auth/user.json' });

    test.beforeEach(async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/upload');
    });

    test('should upload Excel file successfully', async ({ authenticatedPage }) => {
        const testFile = path.join(__dirname, '../fixtures/test-error-log.xlsx');

        // Upload file
        await uploadFile(authenticatedPage, testFile);

        // Verify upload success
        await expect(authenticatedPage.locator('[data-testid="upload-success"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="file-name"]')).toContainText('test-error-log.xlsx');
    });

    test('should upload CSV file successfully', async ({ authenticatedPage }) => {
        const testFile = path.join(__dirname, '../fixtures/test-errors.csv');

        await uploadFile(authenticatedPage, testFile);

        await expect(authenticatedPage.locator('[data-testid="upload-success"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="file-name"]')).toContainText('test-errors.csv');
    });

    test('should upload log file successfully', async ({ authenticatedPage }) => {
        const testFile = path.join(__dirname, '../fixtures/test-application.log');

        await uploadFile(authenticatedPage, testFile);

        await expect(authenticatedPage.locator('[data-testid="upload-success"]')).toBeVisible();
    });

    test('should reject invalid file types', async ({ authenticatedPage }) => {
        const testFile = path.join(__dirname, '../fixtures/test-document.pdf');

        const fileInput = authenticatedPage.locator('input[type="file"]');
        await fileInput.setInputFiles(testFile);

        // Should show error
        await expect(authenticatedPage.locator('[data-testid="error-message"]'))
            .toContainText('Invalid file type');
    });

    test('should reject files larger than limit', async ({ authenticatedPage }) => {
        // Mock large file
        const largeFile = path.join(__dirname, '../fixtures/large-file.log');

        const fileInput = authenticatedPage.locator('input[type="file"]');
        await fileInput.setInputFiles(largeFile);

        await expect(authenticatedPage.locator('[data-testid="error-message"]'))
            .toContainText('File too large');
    });

    test('should trigger AI analysis after upload', async ({ authenticatedPage }) => {
        const testFile = path.join(__dirname, '../fixtures/test-error-log.xlsx');

        // Upload file
        await uploadFile(authenticatedPage, testFile);

        // Wait for analysis to start
        await expect(authenticatedPage.locator('[data-testid="analysis-status"]'))
            .toContainText('Processing');

        // Wait for analysis to complete
        await waitForAnalysis(authenticatedPage);

        // Verify results displayed
        await expect(authenticatedPage.locator('[data-testid="analysis-results"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="error-count"]')).toBeVisible();
    });

    test('should display error detection results', async ({ authenticatedPage }) => {
        const testFile = path.join(__dirname, '../fixtures/test-error-log.xlsx');

        await uploadFile(authenticatedPage, testFile);
        await waitForAnalysis(authenticatedPage);

        // Check error statistics
        await expect(authenticatedPage.locator('[data-testid="total-errors"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="critical-errors"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="high-errors"]')).toBeVisible();

        // Check error list
        await expect(authenticatedPage.locator('[data-testid="error-list"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="error-card"]').first()).toBeVisible();
    });

    test('should display AI suggestions', async ({ authenticatedPage }) => {
        const testFile = path.join(__dirname, '../fixtures/test-error-log.xlsx');

        await uploadFile(authenticatedPage, testFile);
        await waitForAnalysis(authenticatedPage);

        // Check AI suggestions section
        await expect(authenticatedPage.locator('[data-testid="ai-suggestions"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="suggestion-card"]').first()).toBeVisible();
    });

    test('should display ML predictions', async ({ authenticatedPage }) => {
        const testFile = path.join(__dirname, '../fixtures/test-error-log.xlsx');

        await uploadFile(authenticatedPage, testFile);
        await waitForAnalysis(authenticatedPage);

        // Check ML predictions
        await expect(authenticatedPage.locator('[data-testid="ml-predictions"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="prediction-confidence"]').first()).toBeVisible();
    });

    test('should navigate to error details', async ({ authenticatedPage }) => {
        const testFile = path.join(__dirname, '../fixtures/test-error-log.xlsx');

        await uploadFile(authenticatedPage, testFile);
        await waitForAnalysis(authenticatedPage);

        // Click on error card
        await authenticatedPage.click('[data-testid="error-card"]');

        // Verify error details page
        await authenticatedPage.waitForURL('**/errors/**');
        await expect(authenticatedPage.locator('[data-testid="error-detail"]')).toBeVisible();
    });

    test('should handle upload errors gracefully', async ({ authenticatedPage }) => {
        // Mock failed upload
        await authenticatedPage.route('**/api/upload', (route) => {
            route.fulfill({
                status: 500,
                body: JSON.stringify({ message: 'Upload failed' }),
            });
        });

        const testFile = path.join(__dirname, '../fixtures/test-error-log.xlsx');
        const fileInput = authenticatedPage.locator('input[type="file"]');
        await fileInput.setInputFiles(testFile);
        await authenticatedPage.click('button:has-text("Upload")');

        // Should show error
        await expect(authenticatedPage.locator('[data-testid="error-message"]'))
            .toContainText('Upload failed');
    });
});
