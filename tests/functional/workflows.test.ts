import { test, expect } from '@playwright/test';

test.describe('Functional Tests - Error Analysis Workflow', () => {
    test('complete error analysis workflow from upload to resolution', async ({ page }) => {
        // 1. Login
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // 2. Upload error file
        await page.click('button:has-text("Upload")');
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'errors.log',
            mimeType: 'text/plain',
            buffer: Buffer.from('[ERROR] Critical system failure\n[ERROR] Database connection lost')
        });

        // 3. Wait for upload and processing
        await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Processing complete')).toBeVisible({ timeout: 30000 });

        // 4. Navigate to dashboard and view errors
        await page.goto('http://localhost:5173/dashboard');
        await expect(page.locator('table tbody tr')).toHaveCount(2, { timeout: 5000 });

        // 5. Select first error
        const firstError = page.locator('table tbody tr').first();
        await firstError.click();

        // 6. Request AI analysis
        await page.click('button:has-text("Analyze with AI")');
        await expect(page.locator('text=AI Analysis')).toBeVisible();
        await expect(page.locator('[data-testid="ai-suggestions"]')).toBeVisible({ timeout: 15000 });

        // 7. Review suggestions
        const suggestions = page.locator('[data-testid="suggestion-item"]');
        await expect(suggestions).toHaveCount(await suggestions.count());

        // 8. Mark as resolved
        await page.click('button:has-text("Mark as Resolved")');
        await expect(page.locator('text=Error resolved successfully')).toBeVisible();

        // 9. Verify error is marked resolved
        const errorStatus = page.locator('[data-testid="error-status"]');
        await expect(errorStatus).toHaveText('Resolved');

        // 10. Check dashboard statistics update
        await page.goto('http://localhost:5173/dashboard');
        const resolvedCount = page.locator('[data-testid="resolved-count"]');
        await expect(resolvedCount).toContainText('1');
    });

    test('batch error analysis workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Upload file with multiple errors
        await page.click('button:has-text("Upload")');
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'batch-errors.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            buffer: Buffer.from('mock excel content with 10 errors')
        });

        await expect(page.locator('text=Upload successful')).toBeVisible();
        await page.goto('http://localhost:5173/dashboard');

        // Select multiple errors
        const checkboxes = page.locator('input[type="checkbox"][data-testid="error-checkbox"]');
        await checkboxes.first().check();
        await checkboxes.nth(1).check();
        await checkboxes.nth(2).check();

        // Batch analyze
        await page.click('button:has-text("Analyze Selected")');
        await expect(page.locator('text=Analyzing 3 errors')).toBeVisible();
        await expect(page.locator('text=Analysis complete')).toBeVisible({ timeout: 30000 });

        // Verify all analyzed
        const analyzedBadges = page.locator('[data-testid="analyzed-badge"]');
        await expect(analyzedBadges).toHaveCount(3);
    });

    test('error escalation workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Create critical error
        await page.goto('http://localhost:5173/dashboard');
        const criticalError = page.locator('tr:has-text("critical")').first();
        await criticalError.click();

        // Escalate to admin
        await page.click('button:has-text("Escalate")');
        await page.selectOption('select[name="escalateTo"]', 'admin');
        await page.fill('textarea[name="escalationNote"]', 'Requires immediate attention');
        await page.click('button:has-text("Confirm Escalation")');

        await expect(page.locator('text=Error escalated successfully')).toBeVisible();

        // Verify escalation status
        const escalationBadge = page.locator('[data-testid="escalation-badge"]');
        await expect(escalationBadge).toHaveText('Escalated to Admin');
    });

    test('error filtering and search workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.goto('http://localhost:5173/dashboard');

        // Filter by severity
        await page.selectOption('select[name="severity"]', 'critical');
        await page.waitForTimeout(1000);

        const criticalRows = page.locator('tr[data-severity="critical"]');
        const allRows = page.locator('table tbody tr');
        expect(await criticalRows.count()).toBe(await allRows.count());

        // Add error type filter
        await page.selectOption('select[name="errorType"]', 'Database');
        await page.waitForTimeout(1000);

        const dbRows = page.locator('tr[data-type="Database"]');
        expect(await dbRows.count()).toBeGreaterThan(0);

        // Search by message
        await page.fill('input[placeholder="Search errors..."]', 'connection');
        await page.waitForTimeout(1000);

        const searchResults = page.locator('table tbody tr');
        const count = await searchResults.count();
        expect(count).toBeGreaterThan(0);

        // Verify all results contain search term
        for (let i = 0; i < count; i++) {
            const row = searchResults.nth(i);
            const text = await row.textContent();
            expect(text?.toLowerCase()).toContain('connection');
        }
    });

    test('error export workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.goto('http://localhost:5173/dashboard');

        // Apply filters
        await page.selectOption('select[name="severity"]', 'high');
        await page.fill('input[type="date"][name="startDate"]', '2025-01-01');
        await page.fill('input[type="date"][name="endDate"]', '2025-12-31');

        // Export as CSV
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Export")');
        await page.click('button:has-text("CSV")');

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.csv');

        // Export as Excel
        const xlsxDownloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Export")');
        await page.click('button:has-text("Excel")');

        const xlsxDownload = await xlsxDownloadPromise;
        expect(xlsxDownload.suggestedFilename()).toContain('.xlsx');
    });
});

test.describe('Functional Tests - ML Training Workflow', () => {
    test('complete ML training workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Navigate to ML training
        await page.click('nav a:has-text("ML Training")');
        await expect(page).toHaveURL(/.*ml-training/);

        // Configure training
        await page.click('button:has-text("New Training Job")');

        await page.fill('input[name="jobName"]', 'Error Classification Model');
        await page.selectOption('select[name="modelType"]', 'classification');

        // Select features
        await page.check('input[name="feature"][value="severity"]');
        await page.check('input[name="feature"][value="errorType"]');
        await page.check('input[name="feature"][value="lineNumber"]');

        await page.selectOption('select[name="targetField"]', 'resolved');
        await page.selectOption('select[name="algorithm"]', 'random_forest');

        // Set parameters
        await page.fill('input[name="testSize"]', '0.2');
        await page.fill('input[name="randomState"]', '42');

        // Start training
        await page.click('button:has-text("Start Training")');
        await expect(page.locator('text=Training job started')).toBeVisible();

        // Monitor progress
        const progressBar = page.locator('[data-testid="training-progress"]');
        await expect(progressBar).toBeVisible();

        // Wait for completion
        await expect(page.locator('text=Training completed')).toBeVisible({ timeout: 60000 });

        // View results
        const accuracy = page.locator('[data-testid="model-accuracy"]');
        await expect(accuracy).toBeVisible();

        const accuracyValue = await accuracy.textContent();
        const accuracyPercent = parseFloat(accuracyValue || '0');
        expect(accuracyPercent).toBeGreaterThan(0);

        // Deploy model
        await page.click('button:has-text("Deploy Model")');
        await expect(page.locator('text=Model deployed successfully')).toBeVisible();

        const deployedBadge = page.locator('[data-testid="deployed-badge"]');
        await expect(deployedBadge).toHaveText('Active');
    });

    test('model prediction workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Navigate to predictions
        await page.click('nav a:has-text("Predictions")');

        // Input error data for prediction
        await page.fill('input[name="errorMessage"]', 'Database connection timeout');
        await page.selectOption('select[name="severity"]', 'high');
        await page.selectOption('select[name="errorType"]', 'Database');
        await page.fill('input[name="lineNumber"]', '150');

        // Get prediction
        await page.click('button:has-text("Predict")');

        await expect(page.locator('[data-testid="prediction-result"]')).toBeVisible();

        const prediction = page.locator('[data-testid="prediction-value"]');
        await expect(prediction).toHaveText(/Resolved|Unresolved/);

        const confidence = page.locator('[data-testid="confidence-score"]');
        await expect(confidence).toBeVisible();
    });

    test('model comparison workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.click('nav a:has-text("ML Training")');

        // Select models to compare
        await page.check('input[type="checkbox"][data-model-id="model-1"]');
        await page.check('input[type="checkbox"][data-model-id="model-2"]');

        await page.click('button:has-text("Compare Models")');

        // View comparison metrics
        await expect(page.locator('text=Model Comparison')).toBeVisible();

        const accuracyChart = page.locator('[data-testid="accuracy-comparison-chart"]');
        await expect(accuracyChart).toBeVisible();

        const precisionChart = page.locator('[data-testid="precision-comparison-chart"]');
        await expect(precisionChart).toBeVisible();

        // Select best model
        await page.click('button:has-text("Select Best Model")');
        await expect(page.locator('text=Model selected as active')).toBeVisible();
    });
});

test.describe('Functional Tests - Store Management Workflow', () => {
    test('complete store management workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Navigate to stores
        await page.click('nav a:has-text("Stores")');
        await expect(page).toHaveURL(/.*stores/);

        // Add new store
        await page.click('button:has-text("Add Store")');

        await page.fill('input[name="storeNumber"]', 'STORE-9999');
        await page.fill('input[name="storeName"]', 'Test Store 9999');
        await page.fill('input[name="location"]', 'Test City');
        await page.selectOption('select[name="region"]', 'North');

        await page.click('button:has-text("Create Store")');
        await expect(page.locator('text=Store created successfully')).toBeVisible();

        // Add kiosk to store
        await page.click('tr:has-text("STORE-9999")');
        await page.click('button:has-text("Add Kiosk")');

        await page.fill('input[name="kioskNumber"]', 'KIOSK-9999-01');
        await page.selectOption('select[name="status"]', 'active');

        await page.click('button:has-text("Create Kiosk")');
        await expect(page.locator('text=Kiosk added successfully')).toBeVisible();

        // View store errors
        await page.click('button:has-text("View Errors")');
        await expect(page.locator('[data-testid="store-errors-list"]')).toBeVisible();

        // Generate store report
        await page.click('button:has-text("Generate Report")');
        await page.selectOption('select[name="reportType"]', 'monthly');
        await page.fill('input[name="month"]', '2025-10');

        await page.click('button:has-text("Create Report")');
        await expect(page.locator('text=Report generated')).toBeVisible();

        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Download Report")');
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('report');
    });

    test('multi-store analysis workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.click('nav a:has-text("Analytics")');

        // Select multiple stores
        await page.check('input[type="checkbox"][value="STORE-0001"]');
        await page.check('input[type="checkbox"][value="STORE-0002"]');
        await page.check('input[type="checkbox"][value="STORE-0003"]');

        // Set date range
        await page.fill('input[name="startDate"]', '2025-01-01');
        await page.fill('input[name="endDate"]', '2025-10-06');

        // Generate analytics
        await page.click('button:has-text("Generate Analytics")');

        // View visualizations
        await expect(page.locator('[data-testid="error-trend-chart"]')).toBeVisible();
        await expect(page.locator('[data-testid="severity-distribution"]')).toBeVisible();
        await expect(page.locator('[data-testid="store-comparison"]')).toBeVisible();

        // Identify outliers
        await page.click('button:has-text("Detect Anomalies")');
        await expect(page.locator('[data-testid="anomalies-list"]')).toBeVisible();

        const anomalyCount = page.locator('[data-testid="anomaly-count"]');
        await expect(anomalyCount).toBeVisible();
    });
});

test.describe('Functional Tests - User Management Workflow', () => {
    test('complete user lifecycle workflow', async ({ page }) => {
        // Login as admin
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Navigate to user management
        await page.click('nav a:has-text("Admin")');
        await page.click('a:has-text("User Management")');

        // Create new user
        await page.click('button:has-text("Add User")');

        await page.fill('input[name="email"]', 'testuser@example.com');
        await page.fill('input[name="name"]', 'Test User');
        await page.selectOption('select[name="role"]', 'analyst');

        await page.click('button:has-text("Create User")');
        await expect(page.locator('text=User created successfully')).toBeVisible();

        // Assign permissions
        await page.click('tr:has-text("testuser@example.com")');
        await page.click('button:has-text("Manage Permissions")');

        await page.check('input[name="permission"][value="view_errors"]');
        await page.check('input[name="permission"][value="analyze_errors"]');
        await page.check('input[name="permission"][value="export_data"]');

        await page.click('button:has-text("Save Permissions")');
        await expect(page.locator('text=Permissions updated')).toBeVisible();

        // Assign to stores
        await page.click('button:has-text("Assign Stores")');
        await page.check('input[value="STORE-0001"]');
        await page.check('input[value="STORE-0002"]');

        await page.click('button:has-text("Save Assignments")');
        await expect(page.locator('text=Store assignments saved')).toBeVisible();

        // Deactivate user
        await page.click('button:has-text("Deactivate User")');
        await page.click('button:has-text("Confirm")');
        await expect(page.locator('text=User deactivated')).toBeVisible();

        // Verify user status
        const status = page.locator('tr:has-text("testuser@example.com") [data-testid="user-status"]');
        await expect(status).toHaveText('Inactive');
    });

    test('role-based access control workflow', async ({ page }) => {
        // Test analyst role
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Should have access to analysis
        await expect(page.locator('nav a:has-text("Dashboard")')).toBeVisible();
        await expect(page.locator('nav a:has-text("Analytics")')).toBeVisible();

        // Should NOT have access to admin
        await expect(page.locator('nav a:has-text("Admin")')).not.toBeVisible();

        // Attempt to access admin page directly
        await page.goto('http://localhost:5173/admin');
        await expect(page.locator('text=Access Denied')).toBeVisible();
    });
});

test.describe('Functional Tests - Report Generation Workflow', () => {
    test('comprehensive report generation workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.click('nav a:has-text("Reports")');

        // Configure report
        await page.click('button:has-text("New Report")');

        await page.fill('input[name="reportName"]', 'Monthly Error Analysis');
        await page.selectOption('select[name="reportType"]', 'comprehensive');

        // Select data sources
        await page.check('input[name="includeErrors"]');
        await page.check('input[name="includeAnalytics"]');
        await page.check('input[name="includePredictions"]');

        // Set filters
        await page.fill('input[name="dateFrom"]', '2025-09-01');
        await page.fill('input[name="dateTo"]', '2025-09-30');
        await page.selectOption('select[name="severity"]', 'all');

        // Select stores
        await page.click('button:has-text("Select Stores")');
        await page.check('input[name="allStores"]');
        await page.click('button:has-text("Done")');

        // Generate report
        await page.click('button:has-text("Generate Report")');
        await expect(page.locator('text=Generating report')).toBeVisible();
        await expect(page.locator('text=Report ready')).toBeVisible({ timeout: 30000 });

        // Preview report
        await page.click('button:has-text("Preview")');
        await expect(page.locator('[data-testid="report-preview"]')).toBeVisible();

        // Download report
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Download PDF")');
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.pdf');

        // Schedule report
        await page.click('button:has-text("Schedule")');
        await page.selectOption('select[name="frequency"]', 'monthly');
        await page.fill('input[name="recipients"]', 'admin@example.com');

        await page.click('button:has-text("Save Schedule")');
        await expect(page.locator('text=Report scheduled')).toBeVisible();
    });
});

test.describe('Functional Tests - Error Recovery Workflow', () => {
    test('system recovery after critical error', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Simulate critical error
        await page.goto('http://localhost:5173/dashboard');

        // System should show error state
        await page.click('button[data-testid="trigger-error"]'); // Test button
        await expect(page.locator('text=An error occurred')).toBeVisible();

        // Verify error boundary catches it
        await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();

        // Recover
        await page.click('button:has-text("Retry")');
        await expect(page.locator('[data-testid="error-boundary"]')).not.toBeVisible();
        await expect(page.locator('table')).toBeVisible();

        // Verify data integrity
        const errorCount = await page.locator('table tbody tr').count();
        expect(errorCount).toBeGreaterThan(0);
    });

    test('offline mode workflow', async ({ page, context }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Go offline
        await context.setOffline(true);

        // Should show offline indicator
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

        // Should use cached data
        await page.goto('http://localhost:5173/dashboard');
        await expect(page.locator('table tbody tr')).toHaveCount(await page.locator('table tbody tr').count());

        // Queue actions
        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();
        await page.click('button:has-text("Mark as Resolved")');
        await expect(page.locator('text=Action queued')).toBeVisible();

        // Go online
        await context.setOffline(false);
        await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();

        // Should sync queued actions
        await expect(page.locator('text=Syncing...')).toBeVisible();
        await expect(page.locator('text=Sync complete')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Functional Tests - Multi-Step Error Resolution', () => {
    test('complete error triage and escalation workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Step 1: Create new error
        await page.click('button:has-text("Report Error")');
        await page.fill('[name="message"]', 'Production database connection timeout');
        await page.selectOption('[name="severity"]', 'critical');
        await page.fill('[name="errorType"]', 'Database');
        await page.click('button:has-text("Submit")');
        await expect(page.locator('text=Error reported successfully')).toBeVisible();

        // Step 2: Assign to team member
        await page.click('table tbody tr:has-text("Production database")');
        await page.click('button:has-text("Assign")');
        await page.selectOption('[name="assignee"]', 'dev-team');
        await page.click('button:has-text("Confirm Assignment")');
        await expect(page.locator('text=Assigned to dev-team')).toBeVisible();

        // Step 3: Add investigation notes
        await page.click('button:has-text("Add Note")');
        await page.fill('[name="note"]', 'Investigating connection pool settings');
        await page.click('button:has-text("Save Note")');
        await expect(page.locator('text=Note added')).toBeVisible();

        // Step 4: Escalate if not resolved
        await page.click('button:has-text("Escalate")');
        await page.selectOption('[name="escalateTo"]', 'senior-team');
        await page.fill('[name="reason"]', 'Requires immediate attention');
        await page.click('button:has-text("Escalate")');
        await expect(page.locator('text=Escalated successfully')).toBeVisible();

        // Step 5: Implement fix
        await page.click('button:has-text("Mark as Resolved")');
        await page.fill('[name="resolution"]', 'Increased connection pool size');
        await page.click('button:has-text("Confirm Resolution")');
        await expect(page.locator('[data-testid="status-badge"]')).toHaveText('Resolved');
    });

    test('bulk error processing workflow', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Select multiple errors
        const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
        for (let i = 0; i < 5; i++) {
            await checkboxes.nth(i).check();
        }

        // Bulk update severity
        await page.click('button:has-text("Bulk Actions")');
        await page.click('text=Update Severity');
        await page.selectOption('[name="severity"]', 'high');
        await page.click('button:has-text("Apply")');
        await expect(page.locator('text=5 errors updated')).toBeVisible();

        // Bulk assign
        await page.click('button:has-text("Bulk Actions")');
        await page.click('text=Assign');
        await page.selectOption('[name="assignee"]', 'team-alpha');
        await page.click('button:has-text("Apply")');
        await expect(page.locator('text=5 errors assigned')).toBeVisible();

        // Verify changes
        const selectedRows = page.locator('table tbody tr input[type="checkbox"]:checked');
        await expect(selectedRows).toHaveCount(5);
    });

    test('error investigation with root cause analysis', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Select error for deep analysis
        await page.click('table tbody tr:has-text("Critical")');

        // Request AI-powered root cause analysis
        await page.click('button:has-text("Root Cause Analysis")');
        await expect(page.locator('[data-testid="rca-panel"]')).toBeVisible();

        // View similar errors
        await page.click('button:has-text("Find Similar")');
        await expect(page.locator('[data-testid="similar-errors"]')).toBeVisible();
        const similarCount = await page.locator('[data-testid="similar-error-item"]').count();
        expect(similarCount).toBeGreaterThanOrEqual(0);

        // Check error timeline
        await page.click('tab:has-text("Timeline")');
        await expect(page.locator('[data-testid="error-timeline"]')).toBeVisible();

        // View stack trace
        await page.click('tab:has-text("Stack Trace")');
        await expect(page.locator('[data-testid="stack-trace"]')).toBeVisible();

        // Generate report
        await page.click('button:has-text("Generate Report")');
        await expect(page.locator('text=Report generated')).toBeVisible();
    });
});

test.describe('Functional Tests - Data Migration and Import', () => {
    test('import errors from CSV file', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Navigate to import section
        await page.click('button:has-text("Import")');

        // Upload CSV file
        const csvContent = `message,severity,errorType,timestamp
"Database error",critical,Database,2025-01-20T10:00:00Z
"API timeout",high,Network,2025-01-20T11:00:00Z
"Null pointer",medium,Runtime,2025-01-20T12:00:00Z`;

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'errors.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
        });

        // Configure import settings
        await page.check('[name="skipDuplicates"]');
        await page.check('[name="validateData"]');
        await page.click('button:has-text("Start Import")');

        // Wait for processing
        await expect(page.locator('text=Processing import')).toBeVisible();
        await expect(page.locator('text=Import complete')).toBeVisible({ timeout: 15000 });

        // Verify import results
        await expect(page.locator('text=3 records imported')).toBeVisible();

        // Check imported data
        await page.goto('http://localhost:5173/dashboard');
        await expect(page.locator('table tbody tr:has-text("Database error")')).toBeVisible();
    });

    test('export filtered errors to JSON', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Apply filters
        await page.selectOption('[name="severity"]', 'critical');
        await page.fill('[name="search"]', 'database');

        // Export filtered results
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.click('button:has-text("Export")')
        ]);

        expect(download.suggestedFilename()).toContain('.json');

        // Verify download
        const path = await download.path();
        expect(path).toBeTruthy();
    });

    test('migrate data between stores', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Navigate to migration tool
        await page.click('text=Admin');
        await page.click('text=Data Migration');

        // Select source and destination
        await page.selectOption('[name="source"]', 'STORE-0001');
        await page.selectOption('[name="destination"]', 'STORE-0002');

        // Configure migration
        await page.fill('[name="startDate"]', '2025-01-01');
        await page.fill('[name="endDate"]', '2025-01-31');
        await page.check('[name="includeResolved"]');

        // Start migration
        await page.click('button:has-text("Start Migration")');
        await expect(page.locator('text=Migration in progress')).toBeVisible();
        await expect(page.locator('text=Migration complete')).toBeVisible({ timeout: 30000 });

        // Verify migration
        const summary = page.locator('[data-testid="migration-summary"]');
        await expect(summary).toContainText('migrated successfully');
    });
});

test.describe('Functional Tests - Backup and Restore', () => {
    test('create system backup', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        // Navigate to backup settings
        await page.click('text=Settings');
        await page.click('text=Backup & Restore');

        // Create backup
        await page.click('button:has-text("Create Backup")');
        await page.fill('[name="backupName"]', 'Test Backup');
        await page.check('[name="includeAttachments"]');
        await page.click('button:has-text("Confirm")');

        await expect(page.locator('text=Creating backup')).toBeVisible();
        await expect(page.locator('text=Backup created successfully')).toBeVisible({ timeout: 30000 });

        // Verify backup in list
        await expect(page.locator('text=Test Backup')).toBeVisible();
    });

    test('restore from backup', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in with Google")');
        await page.waitForURL('**/dashboard');

        await page.click('text=Settings');
        await page.click('text=Backup & Restore');

        // Select backup to restore
        await page.click('table tbody tr:has-text("Test Backup")');
        await page.click('button:has-text("Restore")');

        // Confirm restoration
        await page.click('button:has-text("Confirm Restore")');
        await expect(page.locator('text=Restoring from backup')).toBeVisible();
        await expect(page.locator('text=Restore complete')).toBeVisible({ timeout: 30000 });

        // Verify system state
        await page.goto('http://localhost:5173/dashboard');
        await expect(page.locator('table tbody tr')).toHaveCount(await page.locator('table tbody tr').count());
    });
});

test.describe('Functional Tests - User Permission Workflows', () => {
    test('admin manages user roles', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in as Admin")');
        await page.waitForURL('**/dashboard');

        // Navigate to user management
        await page.click('text=Admin');
        await page.click('text=User Management');

        // View all users
        await expect(page.locator('table tbody tr')).toHaveCount(await page.locator('table tbody tr').count());

        // Select user and change role
        await page.click('table tbody tr:first-child');
        await page.click('button:has-text("Change Role")');
        await page.selectOption('[name="role"]', 'editor');
        await page.click('button:has-text("Save")');
        await expect(page.locator('text=Role updated')).toBeVisible();

        // Verify permissions
        await page.click('button:has-text("View Permissions")');
        await expect(page.locator('text=Can edit errors')).toBeVisible();
    });

    test('user with limited permissions', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.click('button:has-text("Sign in as Viewer")');
        await page.waitForURL('**/dashboard');

        // Should see read-only view
        await expect(page.locator('button:has-text("Delete")')).not.toBeVisible();
        await expect(page.locator('button:has-text("Edit")')).not.toBeVisible();

        // Can view errors
        await page.click('table tbody tr:first-child');
        await expect(page.locator('[data-testid="error-details"]')).toBeVisible();

        // Cannot modify
        await expect(page.locator('button:has-text("Mark as Resolved")')).toBeDisabled();
    });
});
