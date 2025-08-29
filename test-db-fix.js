// Quick test to verify the database schema fix
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "db/stacklens.db");
const db = new sqlite3.Database(dbPath);

console.log("🔍 Testing database schema fix...");

// Test the occurrence_count column query
db.all(
  "SELECT id, pattern, occurrence_count, success_rate, avg_resolution_time FROM error_patterns LIMIT 5",
  (err, rows) => {
    if (err) {
      console.error("❌ Database query failed:", err.message);
      process.exit(1);
    } else {
      console.log("✅ Database query successful!");
      console.log("📊 Sample data:");
      rows.forEach((row) => {
        console.log(
          `  - ID: ${row.id}, Pattern: ${row.pattern}, Count: ${row.occurrence_count}, Success Rate: ${row.success_rate}`
        );
      });
      console.log("\n🎉 Database schema fix verified successfully!");
      console.log("✅ occurrence_count column is working");
      console.log("✅ success_rate column is working");
      console.log("✅ avg_resolution_time column is working");
    }

    db.close();
  }
);
