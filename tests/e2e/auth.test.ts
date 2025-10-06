import { test, expect } from '../fixtures';

/**
 * E2E Test: Authentication Flow
 * Tests Firebase Google Sign-in and user session management
 */

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display login page', async ({ page }) => {
        await expect(page).toHaveTitle(/StackLens AI/);
        await expect(page.locator('h1')).toContainText('Welcome to StackLens AI');
        await expect(page.locator('button:has-text("Sign in with Google")')).toBeVisible();
    });

    test('should login with Google successfully', async ({ page }) => {
        // Click Google Sign-in
        await page.click('button:has-text("Sign in with Google")');

        // Wait for Firebase auth redirect
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        // Verify dashboard loaded
        await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
        await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    });

    test('should display user profile after login', async ({ authenticatedPage }) => {
        const userProfile = authenticatedPage.locator('[data-testid="user-profile"]');
        await expect(userProfile).toBeVisible();
        await expect(userProfile).toContainText(/@/); // Should contain email
    });

    test('should logout successfully', async ({ authenticatedPage }) => {
        // Click logout
        await authenticatedPage.click('[data-testid="user-profile"]');
        await authenticatedPage.click('button:has-text("Logout")');

        // Verify redirected to login
        await authenticatedPage.waitForURL('/');
        await expect(authenticatedPage.locator('button:has-text("Sign in with Google")')).toBeVisible();
    });

    test('should persist session on page reload', async ({ authenticatedPage }) => {
        await authenticatedPage.reload();

        // Should still be authenticated
        await expect(authenticatedPage.locator('[data-testid="dashboard"]')).toBeVisible();
        await expect(authenticatedPage.locator('[data-testid="user-profile"]')).toBeVisible();
    });

    test('should handle authentication errors', async ({ page }) => {
        // Mock failed auth response
        await page.route('**/api/auth/firebase-signin', (route) => {
            route.fulfill({
                status: 401,
                body: JSON.stringify({ message: 'Authentication failed' }),
            });
        });

        await page.click('button:has-text("Sign in with Google")');

        // Should show error message
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Authentication failed');
    });
});
