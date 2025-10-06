import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

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
    apiContext: async ({ request }, use) => {
        // Login and get token
        const response = await request.post('/api/auth/firebase-signin', {
            data: {
                token: process.env.TEST_FIREBASE_TOKEN,
            },
        });

        const { token } = await response.json();

        // Create authenticated API context
        const apiContext = await request.newContext({
            extraHTTPHeaders: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        await use(apiContext);
    },

    // Test user fixture
    testUser: async ({ }, use) => {
        await use({
            email: process.env.TEST_USER_EMAIL || 'test@stacklens.ai',
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
