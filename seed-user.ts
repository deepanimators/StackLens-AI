import "dotenv/config";
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(__dirname, 'db', 'stacklens.db');

console.log(`📊 Connecting to database at: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

async function seedUser() {
    try {
        // Check if user exists
        const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get('deepanimators@gmail.com');

        if (existingUser) {
            console.log('ℹ️ User already exists, skipping creation');
            return;
        }

        // Hash password
        const password = 'PapuAchu@27';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const stmt = db.prepare(`
      INSERT INTO users (username, email, password, role, first_name, last_name, department, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

        const result = stmt.run(
            'deepanimators',
            'deepanimators@gmail.com',
            hashedPassword,
            'super_admin',
            'Deep',
            'Animators',
            'IT Administration',
            true
        );

        console.log(`✅ Created user successfully!`);
        console.log(`   Username: deepanimators`);
        console.log(`   Email: deepanimators@gmail.com`);
        console.log(`   Password: PapuAchu@27`);
        console.log(`   ID: ${result.lastInsertRowid}`);
    } catch (error) {
        console.error('❌ Error creating user:', error);
        throw error;
    } finally {
        db.close();
    }
}

seedUser().catch(process.exit);
