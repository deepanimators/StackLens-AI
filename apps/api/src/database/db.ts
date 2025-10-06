import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/sqlite-schema';
import { config } from 'dotenv';

config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

// Extract the file path from the DATABASE_URL (remove "file:" prefix if present)
const dbPath = process.env.DATABASE_URL.replace(/^file:/, '');

// Create the SQLite connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create the database instance
export const db = drizzle(sqlite, { schema });
export { sqlite };