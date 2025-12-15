import { db, sqlite } from './db';
import * as schema from "@shared/sqlite-schema";

// Use the shared database connection
export { db, sqlite };

// Auto-migrate on startup
try {
  // For SQLite, we'll use db.run to create tables directly
  console.log('Setting up SQLite database...');

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      first_name TEXT,
      last_name TEXT,
      department TEXT,
      profile_image_url TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS log_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_path TEXT,
      store_number TEXT,
      kiosk_number TEXT,
      uploaded_by INTEGER NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      analysis_timestamp DATETIME,
      processed_at DATETIME,
      error_count INTEGER DEFAULT 0,
      total_errors INTEGER DEFAULT 0,
      critical_errors INTEGER DEFAULT 0,
      high_errors INTEGER DEFAULT 0,
      medium_errors INTEGER DEFAULT 0,
      low_errors INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      errors_detected TEXT,
      anomalies TEXT,
      predictions TEXT,
      suggestions TEXT,
      error_message TEXT,
      analysis_result TEXT,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER,
      store_number TEXT,
      kiosk_number TEXT,
      line_number INTEGER NOT NULL,
      timestamp DATETIME,
      severity TEXT NOT NULL,
      error_type TEXT NOT NULL,
      message TEXT NOT NULL,
      full_text TEXT NOT NULL,
      pattern TEXT,
      resolved BOOLEAN DEFAULT 0,
      notes TEXT,
      ai_suggestion TEXT,
      ml_prediction TEXT,
      ml_confidence REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES log_files(id)
    );

    CREATE TABLE IF NOT EXISTS analysis_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER,
      user_id INTEGER,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      upload_timestamp DATETIME NOT NULL,
      analysis_timestamp DATETIME NOT NULL,
      errors_detected TEXT,
      anomalies TEXT,
      predictions TEXT,
      suggestions TEXT,
      total_errors INTEGER NOT NULL,
      critical_errors INTEGER NOT NULL,
      high_errors INTEGER NOT NULL,
      medium_errors INTEGER NOT NULL,
      low_errors INTEGER NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      current_step TEXT DEFAULT 'Initializing',
      processing_time REAL,
      model_accuracy REAL,
      error_message TEXT,
      ai_suggestions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (file_id) REFERENCES log_files(id)
    );

    CREATE TABLE IF NOT EXISTS ml_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT,
      model_type TEXT NOT NULL,
      accuracy REAL,
      precision_score REAL,
      recall_score REAL,
      f1_score REAL,
      training_data TEXT,
      model_path TEXT,
      is_active BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS error_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL,
      category TEXT,
      suggested_fix TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (role_id) REFERENCES roles(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS training_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      difficulty_level TEXT DEFAULT 'beginner',
      estimated_duration INTEGER,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_training (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      progress INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT FALSE,
      score INTEGER,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (module_id) REFERENCES training_modules(id)
    );

    -- Drop and recreate model_training_sessions with correct schema
    DROP TABLE IF EXISTS model_training_sessions;
    CREATE TABLE model_training_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER,
      session_name TEXT NOT NULL,
      training_data TEXT NOT NULL,
      hyperparameters TEXT,
      metrics TEXT,
      status TEXT DEFAULT 'pending',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      initiated_by INTEGER NOT NULL,
      FOREIGN KEY (model_id) REFERENCES ml_models(id),
      FOREIGN KEY (initiated_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS model_deployments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER NOT NULL,
      deployment_name TEXT NOT NULL,
      environment TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      deployed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deployed_by INTEGER NOT NULL,
      FOREIGN KEY (model_id) REFERENCES ml_models(id),
      FOREIGN KEY (deployed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dense_mode BOOLEAN DEFAULT FALSE,
      auto_refresh BOOLEAN DEFAULT FALSE,
      refresh_interval INTEGER DEFAULT 30,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'en',
      timezone TEXT DEFAULT 'UTC',
      notification_preferences TEXT DEFAULT '{"email": true, "push": true, "sms": false}',
      display_preferences TEXT DEFAULT '{"itemsPerPage": 10, "defaultView": "grid"}',
      navigation_preferences TEXT DEFAULT '{"topNav": {"logo": true, "search": true, "notifications": true, "userMenu": true}, "sideNav": {"collapsed": false, "showLabels": true, "groupItems": true}}',
      api_settings TEXT DEFAULT '{"geminiApiKey": "", "webhookUrl": "", "maxFileSize": "10", "autoAnalysis": true}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      country TEXT DEFAULT 'USA',
      phone_number TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kiosks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kiosk_number TEXT UNIQUE NOT NULL,
      store_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      device_type TEXT,
      ip_address TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      last_check_in DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS api_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      api_secret TEXT,
      endpoint TEXT,
      model_name TEXT,
      priority INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      scope TEXT DEFAULT 'global',
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Add file_path column to log_files table if it doesn't exist (migration for existing databases)
  try {
    const tableInfo = sqlite.prepare("PRAGMA table_info(log_files)").all();
    const hasFilePathColumn = tableInfo.some((col: any) => col.name === 'file_path');

    if (!hasFilePathColumn) {
      console.log('🔄 Migrating: Adding file_path column to log_files table...');
      sqlite.exec(`
        ALTER TABLE log_files ADD COLUMN file_path TEXT;
      `);
      console.log('✅ Migration complete: file_path column added');
    }
  } catch (migrationError) {
    console.warn('⚠️ Could not check or add file_path column:', migrationError);
  }

  console.log('✅ SQLite database initialized successfully');
} catch (error) {
  console.error('❌ Error initializing SQLite database:', error);
}