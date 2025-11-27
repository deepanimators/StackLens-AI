import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/sqlite-schema';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

config();

/**
 * Test Database Configuration
 * Creates and manages a separate test database to avoid contaminating production data
 */

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

// Determine database path
const getDbPath = () => {
    if (isTestEnv && process.env.TEST_DATABASE_URL) {
        // Use test database when in test mode
        return process.env.TEST_DATABASE_URL.replace(/^file:/, '');
    }

    if (process.env.DATABASE_URL) {
        // Use production database
        return process.env.DATABASE_URL.replace(/^file:/, '');
    }

    throw new Error('DATABASE_URL must be set');
};

const dbPath = getDbPath();

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create the SQLite connection
let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;

/**
 * Initialize database connection
 */
export const initializeDatabase = () => {
    if (!sqlite) {
        sqlite = new Database(dbPath);
        sqlite.pragma('foreign_keys = ON');
        db = drizzle(sqlite, { schema });
    }
    return { db, sqlite };
};

/**
 * Get database instance (lazy initialization)
 */
export const getDatabase = () => {
    if (!db) {
        initializeDatabase();
    }
    return { db, sqlite };
};

/**
 * Close database connection
 */
export const closeDatabase = () => {
    if (sqlite) {
        sqlite.close();
    }
};

/**
 * Reset test database - removes all data
 */
export const resetTestDatabase = async () => {
    if (!isTestEnv) {
        throw new Error('resetTestDatabase can only be called in test environment');
    }

    const { db } = getDatabase();

    // Delete all data from tables (in reverse order to respect foreign keys)
    await db.delete(schema.auditLogs);
    await db.delete(schema.notifications);
    await db.delete(schema.userSettings);
    await db.delete(schema.userTraining);
    await db.delete(schema.trainingModules);
    await db.delete(schema.modelDeployments);
    await db.delete(schema.modelTrainingSessions);
    await db.delete(schema.aiTrainingData);
    await db.delete(schema.errorPatterns);
    await db.delete(schema.mlModels);
    await db.delete(schema.analysisHistory);
    await db.delete(schema.errorLogs);
    await db.delete(schema.logFiles);
    await db.delete(schema.userRoles);
    await db.delete(schema.roles);
    await db.delete(schema.kiosks);
    await db.delete(schema.stores);
    await db.delete(schema.users);

    console.log('✅ Test database reset successfully');
};

/**
 * Delete test database file
 */
export const deleteTestDatabase = () => {
    if (!isTestEnv) {
        throw new Error('deleteTestDatabase can only be called in test environment');
    }

    closeDatabase();

    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log(`✅ Test database deleted: ${dbPath}`);
    }
};

/**
 * Create a fresh test database with schema
 */
export const createTestDatabase = async () => {
    if (!isTestEnv) {
        throw new Error('createTestDatabase can only be called in test environment');
    }

    // Delete existing test database
    if (fs.existsSync(dbPath)) {
        deleteTestDatabase();
    }

    // Initialize new database
    initializeDatabase();

    console.log(`✅ Test database created: ${dbPath}`);

    return getDatabase();
};

// Export the database instances
const { db: defaultDb, sqlite: defaultSqlite } = getDatabase();
export { defaultDb as db, defaultSqlite as sqlite };
export { isTestEnv };
