import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('data/Database/stacklens.db');
console.log(`Opening DB at: ${dbPath}`);

try {
    const db = new Database(dbPath);
    const stmt = db.prepare('SELECT * FROM users');
    const users = stmt.all();
    console.log(`✅ Success! Found ${users.length} users.`);
} catch (error) {
    console.error("❌ Database Error:", error);
}
