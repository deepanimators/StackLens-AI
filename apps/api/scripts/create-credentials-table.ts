import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';

const dbPath = './data/database/stacklens.db';
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

console.log('🔧 Creating api_credentials table...');

try {
    // Create the api_credentials table
    await db.run(sql`
    CREATE TABLE IF NOT EXISTS api_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      api_key TEXT,
      api_secret TEXT,
      endpoint TEXT,
      is_active INTEGER DEFAULT 1 NOT NULL,
      is_global INTEGER DEFAULT 1 NOT NULL,
      user_id INTEGER,
      rate_limit INTEGER,
      usage_count INTEGER DEFAULT 0 NOT NULL,
      current_month_usage INTEGER DEFAULT 0 NOT NULL,
      last_used INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

    console.log('✅ api_credentials table created successfully');

    // Verify the table was created
    const result = await db.all(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='api_credentials'`);
    console.log('✅ Table verification:', result);

} catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
} finally {
    sqlite.close();
}
