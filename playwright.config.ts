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
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['list'],
    ],

    // Shared settings for all projects
    use: {
        baseURL: 'http://localhost:5173',
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
                baseURL: 'http://localhost:5000',
                storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // Unit Tests (Component Testing)
        {
            name: 'unit-tests',
            testMatch: /tests\/unit\/.*\.test\.ts/,
            use: {
                storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // Integration Tests
        {
            name: 'integration-tests',
            testMatch: /tests\/integration\/.*\.test\.ts/,
            use: {
                storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // E2E Tests - Desktop Chrome
        {
            name: 'e2e-chromium',
            testMatch: /tests\/e2e\/.*\.test\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // E2E Tests - Desktop Firefox
        {
            name: 'e2e-firefox',
            testMatch: /tests\/e2e\/.*\.test\.ts/,
            use: {
                ...devices['Desktop Firefox'],
                storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // E2E Tests - Desktop Safari
        {
            name: 'e2e-webkit',
            testMatch: /tests\/e2e\/.*\.test\.ts/,
            use: {
                ...devices['Desktop Safari'],
                storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // Mobile Tests - iPhone
        {
            name: 'mobile-safari',
            testMatch: /tests\/e2e\/.*\.mobile\.test\.ts/,
            use: {
                ...devices['iPhone 13'],
                storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // Mobile Tests - Android
        {
            name: 'mobile-chrome',
            testMatch: /tests\/e2e\/.*\.mobile\.test\.ts/,
            use: {
                ...devices['Pixel 5'],
                storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // Accessibility Tests
        {
            name: 'accessibility',
            testMatch: /tests\/accessibility\/.*\.test\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // Performance Tests
        {
            name: 'performance',
            testMatch: /tests\/performance\/.*\.test\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
        },
    ],

    // Web server configuration - auto-start servers for local development
    // Backend API server runs on port 5000, Frontend client on port 5173
    // In CI, SKIP_SERVER env var is checked - servers are started manually in workflow
    webServer: process.env.SKIP_SERVER ? undefined : [
        // Backend API server
        {
            command: 'PORT=5000 npm run dev:server',
            url: 'http://localhost:5000/health',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
            stdout: 'ignore',
            stderr: 'pipe',
        },
        // Frontend client server
        {
            command: 'npm run dev:client',
            url: 'http://localhost:5173',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
            stdout: 'ignore',
            stderr: 'pipe',
        },
    ],
});
