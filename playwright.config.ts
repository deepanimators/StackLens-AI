import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PLAYWRIGHT_TEST = '1';
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || './data/database/stacklens.test.db';

/**
 * StackLens AI - Playwright Test Configuration
 * Comprehensive testing setup for E2E, Integration, and API tests
 */

export default defineConfig({
    testDir: './tests',

    // Global setup and teardown
    globalSetup: require.resolve('./tests/global-setup.ts'),
    globalTeardown: require.resolve('./tests/global-teardown.ts'),

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
                baseURL: 'http://127.0.0.1:4001',
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
    // Backend API server runs on port 4001, Frontend client on port 5173
    // In CI, SKIP_SERVER env var is checked - servers are started manually in workflow
    webServer: process.env.SKIP_SERVER ? undefined : [
        // Backend API server (using test:server to disable rate limiting)
        {
            command: `NODE_ENV=test PLAYWRIGHT_TEST=1 TEST_DATABASE_URL=${process.env.TEST_DATABASE_URL} PORT=4001 pnpm run test:server`,
            url: 'http://127.0.0.1:4001/health',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
            stdout: 'pipe',
            stderr: 'pipe',
            env: {
                NODE_ENV: 'test',
                PLAYWRIGHT_TEST: '1',
                TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
            }
        },
        // Frontend client server
        {
            command: 'VITE_API_URL=http://localhost:4001 pnpm run dev:client',
            url: 'http://localhost:5173',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
            stdout: 'ignore',
            stderr: 'pipe',
        },
    ],
});
