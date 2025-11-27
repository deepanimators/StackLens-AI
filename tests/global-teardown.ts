import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Global Teardown for Playwright Tests
 * Runs once after all test workers complete
 * - Cleans up test database
 */

async function globalTeardown(config: FullConfig) {
    console.log('🧹 Global Teardown - Cleaning up test environment');

    const TEST_DB_PATH = process.env.TEST_DATABASE_URL || './data/database/stacklens.test.db';
    const resolvedDbPath = path.resolve(process.cwd(), TEST_DB_PATH);

    // Remove test database
    if (fs.existsSync(resolvedDbPath)) {
        try {
            fs.unlinkSync(resolvedDbPath);
            console.log('✅ Test database removed:', resolvedDbPath);
        } catch (error) {
            console.error('⚠️  Failed to remove test database:', error);
        }
    }

    // Clean up any test database WAL/SHM files
    const walPath = `${resolvedDbPath}-wal`;
    const shmPath = `${resolvedDbPath}-shm`;

    if (fs.existsSync(walPath)) {
        try {
            fs.unlinkSync(walPath);
            console.log('✅ Removed test database WAL file');
        } catch (error) {
            console.warn('⚠️  Could not remove WAL file');
        }
    }

    if (fs.existsSync(shmPath)) {
        try {
            fs.unlinkSync(shmPath);
            console.log('✅ Removed test database SHM file');
        } catch (error) {
            console.warn('⚠️  Could not remove SHM file');
        }
    }

    console.log('✅ Global teardown completed');
}

export default globalTeardown;
