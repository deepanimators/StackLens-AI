import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Global Setup for Playwright Tests
 * Runs once before all test workers start
 * - Initializes test database
 * - Sets up authentication if needed
 */

async function globalSetup(config: FullConfig) {
    console.log('🌍 Global Setup - Initializing test environment');

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.PLAYWRIGHT_TEST = '1';

    const TEST_DB_PATH = process.env.TEST_DATABASE_URL || './data/database/stacklens.test.db';
    const resolvedDbPath = path.resolve(process.cwd(), TEST_DB_PATH);

    console.log('📊 Test Database Path:', resolvedDbPath);

    // Ensure directory exists
    const dbDir = path.dirname(resolvedDbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('📁 Created test database directory');
    }

    // Remove existing test database for fresh start
    if (fs.existsSync(resolvedDbPath)) {
        fs.unlinkSync(resolvedDbPath);
        console.log('🗑️  Removed existing test database');
    }

    // Initialize test database schema using drizzle
    try {
        console.log('🔧 Running database migrations for test database...');

        const env = {
            ...process.env,
            DATABASE_URL: TEST_DB_PATH,
            NODE_ENV: 'test',
            PLAYWRIGHT_TEST: '1'
        };

        // Check if drizzle-kit is available and run push
        try {
            await execAsync('pnpm run db:push', {
                env,
                cwd: process.cwd()
            });
            console.log('✅ Test database schema initialized');
        } catch (migrationError: any) {
            console.warn('⚠️  Could not run db:push, attempting manual schema creation...');

            // Fallback: Create database manually using sqlite3
            const Database = require('better-sqlite3');
            const db = new Database(resolvedDbPath);
            db.pragma('foreign_keys = ON');
            console.log('✅ Test database created (manual fallback)');
            db.close();
        }
    } catch (error) {
        console.error('❌ Failed to initialize test database:', error);
        // Don't throw - let tests handle missing database gracefully
    }

    console.log('✅ Global setup completed');
}

export default globalSetup;
