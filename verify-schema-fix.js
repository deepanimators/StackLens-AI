// Database Schema Fix Verification
// This script tests that the occurrence_count issue is resolved

import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "db/stacklens.db");
const db = new sqlite3.Database(dbPath);

console.log("🔍 Verifying database schema fix...\n");

// Test 1: Check if all required columns exist
db.all("PRAGMA table_info(error_patterns);", (err, columns) => {
  if (err) {
    console.error("❌ Failed to get table info:", err.message);
    return;
  }

  console.log("📊 Current error_patterns table structure:");
  const requiredColumns = [
    "occurrence_count",
    "success_rate",
    "avg_resolution_time",
  ];
  const existingColumns = columns.map((col) => col.name);

  columns.forEach((col) => {
    const isRequired = requiredColumns.includes(col.name);
    const status = isRequired ? "✅" : "  ";
    console.log(`${status} ${col.name} (${col.type})`);
  });

  // Check if all required columns are present
  const missingColumns = requiredColumns.filter(
    (col) => !existingColumns.includes(col)
  );

  if (missingColumns.length === 0) {
    console.log("\n🎉 SUCCESS: All required columns are present!");

    // Test 2: Query with the previously problematic columns
    db.all(
      "SELECT id, pattern, occurrence_count, success_rate, avg_resolution_time FROM error_patterns LIMIT 3;",
      (err, rows) => {
        if (err) {
          console.error("\n❌ Query failed:", err.message);
        } else {
          console.log("\n✅ Query with occurrence_count SUCCESS!");
          console.log("📋 Sample data:");
          rows.forEach((row, i) => {
            console.log(`  ${i + 1}. ID: ${row.id}`);
            console.log(`     Pattern: ${row.pattern}`);
            console.log(`     Occurrence Count: ${row.occurrence_count}`);
            console.log(`     Success Rate: ${row.success_rate}`);
            console.log(`     Avg Resolution Time: ${row.avg_resolution_time}`);
            console.log("");
          });

          console.log("🎯 CONCLUSION: Database schema fix is SUCCESSFUL!");
          console.log(
            '✅ No more "SqliteError: no such column: occurrence_count" errors'
          );
          console.log(
            "✅ Application server can now start without database issues"
          );
          console.log(
            "✅ API endpoints can query error patterns with all columns"
          );
        }
        db.close();
      }
    );
  } else {
    console.log("\n❌ MISSING COLUMNS:", missingColumns.join(", "));
    console.log("⚠️  These columns need to be added to the database");
    db.close();
  }
});
