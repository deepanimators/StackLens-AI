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
        // Wait for auth check to complete
        await page.waitForTimeout(1000);

        // Check title
        await expect(page).toHaveTitle(/StackLens AI/);

        // Login page shows Firebase sign-in component with the welcome message in a card title
        const welcomeText = page.locator('text=Welcome to StackLens AI');
        await expect(welcomeText).toBeVisible({ timeout: 10000 });

        // Check for Google sign-in button
        const signInButton = page.locator('button:has-text("Sign in with Google")');
        await expect(signInButton).toBeVisible({ timeout: 5000 });
    });

    test.skip('should login with Google successfully', async ({ page }) => {
        // SKIPPED: This test requires actual Firebase authentication flow
        // which involves redirects to Google OAuth that cannot be easily automated
        // Integration tests cover the API authentication endpoints
    });

    test.skip('should display user profile after login', async ({ authenticatedPage }) => {
        // SKIPPED: Requires authenticated state which needs Firebase OAuth flow
        // Integration tests cover authenticated API access
    });

    test.skip('should logout successfully', async ({ authenticatedPage }) => {
        // SKIPPED: Requires authenticated state which needs Firebase OAuth flow
    });

    test.skip('should persist session on page reload', async ({ authenticatedPage }) => {
        // SKIPPED: Requires authenticated state which needs Firebase OAuth flow
    });

    test.skip('should handle authentication errors', async ({ page }) => {
        // SKIPPED: Firebase error handling is covered by integration tests
        // E2E testing of OAuth error flows is complex and not critical
    });
});
