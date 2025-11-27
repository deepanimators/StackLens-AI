import { test as baseTest, expect as baseExpect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Test Database Setup
 * Manages test database lifecycle - initialization, reset, and cleanup
 */

const TEST_DB_PATH = path.resolve(process.cwd(), 'data/database/stacklens.test.db');

/**
 * Initialize test database with schema
 */
export async function initTestDatabase() {
    console.log('🔧 Initializing test database...');

    // Ensure the directory exists
    const dbDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    // Remove existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
        console.log('🗑️  Removed existing test database');
    }

    try {
        // Run drizzle migrations on test database
        const env = {
            ...process.env,
            DATABASE_URL: TEST_DB_PATH,
            NODE_ENV: 'test',
            PLAYWRIGHT_TEST: '1'
        };

        // Run migration (assuming drizzle is configured)
        await execAsync('pnpm run db:push', { env });
        console.log('✅ Test database schema created');
    } catch (error) {
        console.error('❌ Failed to initialize test database:', error);
        throw error;
    }
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase() {
    console.log('🧹 Cleaning up test database...');

    if (fs.existsSync(TEST_DB_PATH)) {
        try {
            fs.unlinkSync(TEST_DB_PATH);
            console.log('✅ Test database removed');
        } catch (error) {
            console.error('⚠️  Failed to remove test database:', error);
        }
    }
}

/**
 * Seed test database with initial data
 */
export async function seedTestDatabase() {
    // This can be implemented to add test users, stores, etc.
    console.log('🌱 Seeding test database (optional)...');
}

/**
 * Export configured test that handles database lifecycle
 */
export const test = baseTest;
export const expect = baseExpect;

// Global setup - runs once before all tests
test.beforeAll(async () => {
    console.log('🚀 Starting test suite - Setting up test database');
    await initTestDatabase();
    await seedTestDatabase();
});

// Global teardown - runs once after all tests
test.afterAll(async () => {
    console.log('🏁 Test suite completed - Cleaning up test database');
    await cleanupTestDatabase();
});
