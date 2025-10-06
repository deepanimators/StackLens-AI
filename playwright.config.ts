import { defineConfig, devices } from '@playwright/test';

/**
 * StackLens AI - Playwright Test Configuration
 * Comprehensive testing setup for E2E, Integration, and API tests
 */

export default defineConfig({
    testDir: './tests',

    // Maximum time one test can run
    timeout: 30 * 1000,

    // Test execution settings
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,

    // Reporter configuration
    reporter: [
        ['html', { outputFolder: 'test-results/html' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['list'],
    ],

    // Shared settings for all projects
    use: {
        baseURL: process.env.VITE_API_URL || 'http://localhost:4000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        // Browser context options
        locale: 'en-US',
        timezoneId: 'America/New_York',

        // API testing
        extraHTTPHeaders: {
            'Accept': 'application/json',
        },
    },

    // Test projects for different scenarios
    projects: [
        // Setup project - runs before all tests
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },

        // API Tests
        {
            name: 'api-tests',
            testMatch: /tests\/api\/.*\.test\.ts/,
            use: {
                baseURL: 'http://localhost:4000',
            },
            dependencies: ['setup'],
        },

        // Unit Tests (Component Testing)
        {
            name: 'unit-tests',
            testMatch: /tests\/unit\/.*\.test\.ts/,
            dependencies: ['setup'],
        },

        // Integration Tests
        {
            name: 'integration-tests',
            testMatch: /tests\/integration\/.*\.test\.ts/,
            dependencies: ['setup'],
        },

        // E2E Tests - Desktop Chrome
        {
            name: 'e2e-chromium',
            testMatch: /tests\/e2e\/.*\.test\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },

        // E2E Tests - Desktop Firefox
        {
            name: 'e2e-firefox',
            testMatch: /tests\/e2e\/.*\.test\.ts/,
            use: { ...devices['Desktop Firefox'] },
            dependencies: ['setup'],
        },

        // E2E Tests - Desktop Safari
        {
            name: 'e2e-webkit',
            testMatch: /tests\/e2e\/.*\.test\.ts/,
            use: { ...devices['Desktop Safari'] },
            dependencies: ['setup'],
        },

        // Mobile Tests - iPhone
        {
            name: 'mobile-safari',
            testMatch: /tests\/e2e\/.*\.mobile\.test\.ts/,
            use: { ...devices['iPhone 13'] },
            dependencies: ['setup'],
        },

        // Mobile Tests - Android
        {
            name: 'mobile-chrome',
            testMatch: /tests\/e2e\/.*\.mobile\.test\.ts/,
            use: { ...devices['Pixel 5'] },
            dependencies: ['setup'],
        },

        // Accessibility Tests
        {
            name: 'accessibility',
            testMatch: /tests\/accessibility\/.*\.test\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },

        // Performance Tests
        {
            name: 'performance',
            testMatch: /tests\/performance\/.*\.test\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
    ],

    // Web server configuration
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
