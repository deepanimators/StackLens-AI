-- Advanced Search Infrastructure Migration
-- Non-breaking additions to existing schema

-- Saved searches for users
CREATE TABLE IF NOT EXISTS saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  criteria TEXT NOT NULL, -- JSON string
  is_public INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Search analytics for optimization
CREATE TABLE IF NOT EXISTS search_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  query TEXT NOT NULL,
  filters TEXT, -- JSON string
  results_count INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Full-text search index for better performance
CREATE VIRTUAL TABLE IF NOT EXISTS errors_fts USING fts5(
  message, 
  full_text, 
  error_type,
  content='error_logs',
  content_rowid='id'
);

-- Populate FTS index with existing data
INSERT OR IGNORE INTO errors_fts(rowid, message, full_text, error_type)
SELECT id, message, full_text, error_type FROM error_logs;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_errors_search_perf ON error_logs(user_id, severity, error_type, timestamp);