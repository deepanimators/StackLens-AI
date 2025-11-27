import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { logger } from '../utils/logger';

let db: Database;

export const getDb = async () => {
    if (!db) {
        logger.info('Initializing database...');
        db = await open({
            filename: process.env.DB_PATH || ':memory:',
            driver: sqlite3.Database
        });

        await db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        sku TEXT,
        price REAL,
        stock INTEGER
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        user_id TEXT,
        qty INTEGER,
        total_amount REAL,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        scenario TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
        logger.info('Database initialized');
    }
    return db;
};
