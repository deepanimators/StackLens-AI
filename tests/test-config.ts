import { test } from '@playwright/test';

/**
 * Test Configuration
 * Centralizes test settings and environment variables
 */

export const TEST_CONFIG = {
    // Firebase configuration
    firebase: {
        enabled: !!process.env.TEST_FIREBASE_TOKEN,
        token: process.env.TEST_FIREBASE_TOKEN,
    },

    // Test user credentials
    testUser: {
        email: process.env.TEST_USER_EMAIL || 'test@stacklens.app',
        password: process.env.TEST_USER_PASSWORD || 'Test@12345',
    },

    // API endpoints
    api: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
    },

    // Test modes
    skipAuthTests: !process.env.TEST_FIREBASE_TOKEN,
    skipE2ETests: !process.env.TEST_FIREBASE_TOKEN,
};

/**
 * Helper to skip tests that require Firebase authentication
 */
export function skipIfNoFirebase() {
    return TEST_CONFIG.skipAuthTests ? test.skip : test;
}

// Re-export test from Playwright
export { test, expect } from '@playwright/test';
