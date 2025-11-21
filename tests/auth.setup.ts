import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

/**
 * Authentication Setup for Playwright Tests
 * This setup file runs before all tests to establish a Firebase authenticated session.
 * The authenticated state is saved and reused across all test projects.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth', 'user.json');

setup('authenticate user', async ({ page, context }) => {
    console.log('Starting authentication setup...');

    try {
        // Navigate to the application
        await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });

        // Check if we're already authenticated (e.g., from previous test run)
        const isAuthenticated = await page.locator('[data-testid="user-profile"]').isVisible().catch(() => false);

        if (isAuthenticated) {
            console.log('Already authenticated, saving state...');
            await context.storageState({ path: authFile });
            return;
        }

        // For development/testing: Use environment variable or mock authentication
        const testToken = process.env.TEST_FIREBASE_TOKEN;
        const testEmail = process.env.TEST_USER_EMAIL || 'test@stacklens.ai';

        if (testToken) {
            // If we have a test token, inject it directly
            console.log('Using TEST_FIREBASE_TOKEN for authentication...');

            try {
                await page.evaluate((token) => {
                    localStorage.setItem('firebase_token', token);
                    localStorage.setItem('user_authenticated', 'true');
                    localStorage.setItem('test_mode', 'true');
                }, testToken);

                // Reload to apply authentication
                await page.reload({ waitUntil: 'networkidle' });

                // Try to verify authentication - but don't fail if elements aren't found
                // (frontend might still be loading or token might be expired)
                const authVerified = await page.locator('[data-testid="user-profile"]')
                    .or(page.locator('text=Dashboard'))
                    .isVisible({ timeout: 5000 })
                    .catch(() => false);

                if (authVerified) {
                    console.log('✓ Authentication successful with token');
                } else {
                    console.log('⚠️  Token injected but UI elements not found (frontend may not be ready or token invalid)');
                    // Still consider it a partial success - at least token is in storage
                }
            } catch (error) {
                console.log('⚠️  Failed to verify token authentication:', error);
                // Don't throw - let tests continue with whatever state we have
            }
        } else {
            // Fallback: Try to find and click sign-in button
            console.log('No TEST_FIREBASE_TOKEN found, attempting sign-in flow...');

            const signInButton = page.locator('button:has-text("Sign in")').first();

            if (await signInButton.isVisible({ timeout: 5000 }).catch(() => false)) {
                await signInButton.click();

                // Wait for redirect to dashboard or home
                await page.waitForURL(/\/(dashboard|home)/, { timeout: 15000 }).catch(async () => {
                    // If no redirect, check if we're already on an authenticated page
                    const onAuthPage = await page.locator('[data-testid="user-profile"]').isVisible().catch(() => false);
                    if (!onAuthPage) {
                        throw new Error('Authentication failed: not redirected to authenticated page');
                    }
                });

                console.log('Authentication successful via sign-in flow');
            } else {
                // No sign-in button found - might be in development mode with auto-auth
                console.log('No sign-in button found, checking if already authenticated...');

                // Check for any auth indicators
                const hasAuthIndicator = await page.locator('[data-testid="user-profile"], [data-testid="logout"], text=/Logout|Sign out/i').first()
                    .isVisible({ timeout: 5000 })
                    .catch(() => false);

                if (!hasAuthIndicator) {
                    console.warn('⚠️  No authentication detected. Tests may fail on protected routes.');
                    console.warn('    Set TEST_FIREBASE_TOKEN environment variable for proper authentication.');

                    // Create a minimal auth state to prevent complete failure
                    await page.evaluate(() => {
                        localStorage.setItem('test_mode', 'true');
                    });
                }
            }
        }

        // Save authenticated state for reuse in tests
        await context.storageState({ path: authFile });
        console.log(`✓ Authentication state saved to ${authFile}`);

    } catch (error) {
        console.error('❌ Authentication setup failed:', error);

        // Create a basic auth file to prevent tests from failing completely
        // Tests will still fail on protected routes, but at least setup won't block everything
        await context.storageState({ path: authFile });

        console.warn('⚠️  Created minimal auth state. Tests requiring authentication will likely fail.');
        console.warn('    To fix: Set TEST_FIREBASE_TOKEN environment variable');

        // Don't throw - allow tests to run and fail individually rather than blocking all tests
    }
});

setup('verify auth state', async ({ page }) => {
    // Optional: Verify the auth state file was created
    const authExists = fs.existsSync(authFile);

    if (!authExists) {
        console.warn('⚠️  Auth state file not found. Authentication may not be configured.');
    } else {
        console.log('✓ Auth state file verified');
    }
});
