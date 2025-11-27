import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/sqlite-schema';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

config();

// Check if running in test mode
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1';

// Determine which database URL to use
const getDatabaseUrl = () => {
  if (isTestEnv && process.env.TEST_DATABASE_URL) {
    console.log('📋 Using test database:', process.env.TEST_DATABASE_URL);
    return process.env.TEST_DATABASE_URL;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  return process.env.DATABASE_URL;
};

// Extract the file path from the DATABASE_URL (remove "file:" prefix if present)
const dbPath = getDatabaseUrl().replace(/^file:/, '');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 Created database directory:', dbDir);
}

// Create the SQLite connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create the database instance
export const db = drizzle(sqlite, { schema });
export { sqlite };

// Log which database is being used
console.log(`🗄️  Database initialized: ${dbPath} (${isTestEnv ? 'TEST' : 'PRODUCTION'} mode)`);
