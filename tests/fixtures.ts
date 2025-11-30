import { test as base, expect } from '@playwright/test';
import type { Page, APIRequestContext } from '@playwright/test';
import type { Playwright } from 'playwright-core';

/**
 * StackLens AI - Test Fixtures
 * Provides reusable test utilities, authentication, and helpers
 */

// Extended test context
type StackLensFixtures = {
    authenticatedPage: Page;
    apiContext: any;
    testUser: {
        email: string;
        password: string;
        token?: string;
    };
};

// Extend base test with custom fixtures
export const test = base.extend<StackLensFixtures>({
    // Authenticated page fixture
    authenticatedPage: async ({ page }, use) => {
        // Navigate to login
        await page.goto('/');

        // Perform Firebase Google Sign-in (using test credentials)
        await page.click('button:has-text("Sign in with Google")');

        // Wait for authentication
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        // Verify authenticated
        await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();

        await use(page);
    },

    // API context fixture
    apiContext: async ({ playwright }: { playwright: Playwright }, use) => {
        // Create new request context with API base URL (use 4001 for dev server)
        const apiPort = process.env.API_PORT || '4001';
        const apiContext = await playwright.request.newContext({
            baseURL: `http://127.0.0.1:${apiPort}`,
        });

        // Try to load token from auth storage state
        const fs = await import('fs');
        const path = await import('path');
        // Use fileURLToPath to get __dirname equivalent if needed, but here we are in a module?
        // Playwright runs in Node, so __dirname might be available or we construct path relative to cwd
        const authFile = path.resolve('tests/.auth/user.json');

        if (fs.existsSync(authFile)) {
            try {
                const authState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
                const origins = authState.origins || [];
                let token = null;

                for (const origin of origins) {
                    const localStorage = origin.localStorage || [];
                    const tokenItem = localStorage.find((item: any) => item.name === 'auth_token');
                    if (tokenItem) {
                        token = tokenItem.value;
                        break;
                    }
                }

                if (token) {
                    await apiContext.dispose();
                    const authenticatedContext = await playwright.request.newContext({
                        baseURL: `http://127.0.0.1:${apiPort}`,
                        extraHTTPHeaders: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    await use(authenticatedContext);
                    await authenticatedContext.dispose();
                    return;
                }
            } catch (e) {
                console.warn('⚠️  Failed to parse auth file:', e);
            }
        }

        // Fallback to existing env var logic if file not found or token missing
        if (!process.env.TEST_FIREBASE_TOKEN) {
            console.warn('⚠️  TEST_FIREBASE_TOKEN not set and no auth file found. API tests will run without authentication.');
            await use(apiContext);
            await apiContext.dispose();
            return;
        }

        try {
            // Login and get token using firebase-verify endpoint
            const response = await apiContext.post('/api/auth/firebase-verify', {
                data: {
                    idToken: process.env.TEST_FIREBASE_TOKEN,
                },
            });

            if (!response.ok()) {
                // Try to extract JWT from the test token directly for fallback
                try {
                    const tokenParts = (process.env.TEST_FIREBASE_TOKEN || '').split('.');
                    if (tokenParts.length === 3) {
                        // Use mock JWT directly - it should work with our updated auth service
                        await apiContext.dispose();
                        const fallbackContext = await playwright.request.newContext({
                            baseURL: `http://127.0.0.1:${apiPort}`,
                            extraHTTPHeaders: {
                                'Authorization': `Bearer ${process.env.TEST_FIREBASE_TOKEN}`,
                            },
                        });
                        await use(fallbackContext);
                        await fallbackContext.dispose();
                        return;
                    }
                } catch (fallbackError) {
                    console.warn('⚠️  Could not use fallback token:', (fallbackError as Error).message);
                }
                console.warn(`⚠️  Firebase verification returned ${response.status()}: ${response.statusText()}`);
                // Use unauthenticated context
                await use(apiContext);
                await apiContext.dispose();
                return;
            }

            const { token } = await response.json();

            // Dispose current context and create authenticated one
            await apiContext.dispose();
            const authenticatedContext = await playwright.request.newContext({
                baseURL: `http://127.0.0.1:${apiPort}`,
                extraHTTPHeaders: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            await use(authenticatedContext);
            await authenticatedContext.dispose();
        } catch (error) {
            console.error('❌ API authentication failed:', error);
            await use(apiContext);
            await apiContext.dispose();
        }
    },

    // Test user fixture
    testUser: async ({ }, use) => {
        await use({
            email: process.env.TEST_USER_EMAIL || 'test@stacklens.app',
            password: process.env.TEST_USER_PASSWORD || 'Test@12345',
        });
    },
});

export { expect } from '@playwright/test';

/**
 * Helper Functions
 */

// Upload file helper
export async function uploadFile(page: Page, filePath: string) {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await page.click('button:has-text("Upload")');
    await page.waitForSelector('.upload-success', { timeout: 30000 });
}

// Wait for API response helper
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
    return await page.waitForResponse(
        (response) => {
            const url = response.url();
            const matches = typeof urlPattern === 'string'
                ? url.includes(urlPattern)
                : urlPattern.test(url);
            return matches && response.status() === 200;
        },
        { timeout: 30000 }
    );
}

// Select from dropdown helper
export async function selectDropdownOption(page: Page, dropdownSelector: string, optionText: string) {
    await page.click(dropdownSelector);
    await page.waitForSelector('.dropdown-menu', { state: 'visible' });
    await page.click(`.dropdown-item:has-text("${optionText}")`);
}

// Filter errors helper
export async function filterErrors(page: Page, filters: {
    store?: string;
    kiosk?: string;
    severity?: string;
    dateRange?: { from: string; to: string };
}) {
    if (filters.store) {
        await selectDropdownOption(page, '[data-testid="store-filter"]', filters.store);
    }

    if (filters.kiosk) {
        await selectDropdownOption(page, '[data-testid="kiosk-filter"]', filters.kiosk);
    }

    if (filters.severity) {
        await selectDropdownOption(page, '[data-testid="severity-filter"]', filters.severity);
    }

    if (filters.dateRange) {
        await page.fill('[data-testid="date-from"]', filters.dateRange.from);
        await page.fill('[data-testid="date-to"]', filters.dateRange.to);
    }

    await page.click('button:has-text("Apply Filters")');
}

// Check error card helper
export async function verifyErrorCard(page: Page, errorData: {
    severity?: string;
    type?: string;
    message?: string;
}) {
    const errorCard = page.locator('[data-testid="error-card"]').first();

    if (errorData.severity) {
        await expect(errorCard.locator('[data-testid="error-severity"]'))
            .toHaveText(errorData.severity);
    }

    if (errorData.type) {
        await expect(errorCard.locator('[data-testid="error-type"]'))
            .toContainText(errorData.type);
    }

    if (errorData.message) {
        await expect(errorCard.locator('[data-testid="error-message"]'))
            .toContainText(errorData.message);
    }
}

// Wait for ML analysis
export async function waitForAnalysis(page: Page) {
    await page.waitForSelector('[data-testid="analysis-complete"]', { timeout: 60000 });
    await expect(page.locator('[data-testid="analysis-status"]')).toHaveText('Completed');
}

// Mock API response helper
export async function mockApiResponse(page: Page, url: string, response: any) {
    await page.route(url, (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(response),
        });
    });
}

// Take accessibility snapshot
export async function checkAccessibility(page: Page) {
    const violations = await page.evaluate(() => {
        // @ts-ignore
        return window.axe?.run();
    });

    return violations;
}

// Performance metrics helper
export async function getPerformanceMetrics(page: Page) {
    return await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        };
    });
}
