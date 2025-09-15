#!/usr/bin/env node

import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

console.log("🔄 Starting ML Models schema migration...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, "db", "stacklens.db");
const db = new Database(dbPath);

try {
  console.log("📊 Checking current ml_models table structure...");

  // Get current table info
  const tableInfo = db.prepare("PRAGMA table_info(ml_models)").all();
  const existingColumns = tableInfo.map((col) => col.name);

  console.log("📋 Current columns:", existingColumns);

  // Columns that should exist
  const requiredColumns = [
    { name: "cv_score", type: "REAL" },
    { name: "training_loss", type: "REAL" },
    { name: "validation_loss", type: "REAL" },
    { name: "top_features", type: "TEXT" },
  ];

  let needsMigration = false;

  // Check which columns are missing
  for (const column of requiredColumns) {
    if (!existingColumns.includes(column.name)) {
      console.log(`❌ Missing column: ${column.name}`);
      needsMigration = true;
    } else {
      console.log(`✅ Column exists: ${column.name}`);
    }
  }

  if (!needsMigration) {
    console.log("🎉 All required columns exist! No migration needed.");
    db.close();
    process.exit(0);
  }

  console.log("🔧 Starting migration...");

  // Add missing columns
  db.transaction(() => {
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        const sql = `ALTER TABLE ml_models ADD COLUMN ${column.name} ${column.type}`;
        console.log(`🔧 Running: ${sql}`);
        db.prepare(sql).run();
        console.log(`✅ Added column: ${column.name}`);
      }
    }
  })();

  console.log("🎯 Migration completed successfully!");

  // Verify the migration
  const updatedTableInfo = db.prepare("PRAGMA table_info(ml_models)").all();
  console.log("📊 Updated table structure:");
  updatedTableInfo.forEach((col, index) => {
    console.log(`  ${index + 1}. ${col.name} (${col.type})`);
  });
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
} finally {
  db.close();
}

console.log("✅ Database migration completed successfully!");
