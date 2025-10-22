-- Migration: 001_advanced_search_optimization.sql
-- v0.9.5 Advanced Search & Analytics Database Optimizations
-- Created: 2025-10-22
-- This migration enhances database performance for advanced search and analytics features

-- =====================================================
-- 1. SEARCH PERFORMANCE INDEXES
-- =====================================================

-- Full-text search index for error messages and stack traces
-- This enables fast semantic and keyword search across error content
CREATE INDEX IF NOT EXISTS idx_error_logs_fulltext 
ON error_logs USING gin(
  to_tsvector('english', COALESCE(error_message, '') || ' ' || COALESCE(stack_trace, '') || ' ' || COALESCE(error_type, ''))
);

-- Compound index for multi-criteria search (most common search patterns)
CREATE INDEX IF NOT EXISTS idx_error_logs_search_compound 
ON error_logs(severity, error_type, created_at DESC);

-- Temporal search index for date range queries
CREATE INDEX IF NOT EXISTS idx_error_logs_temporal 
ON error_logs(created_at DESC) 
WHERE severity IN ('critical', 'high', 'medium');

-- File-based search index for filtering by file names
CREATE INDEX IF NOT EXISTS idx_error_logs_filename 
ON error_logs(file_name) 
WHERE file_name IS NOT NULL;

-- Error pattern analysis index
CREATE INDEX IF NOT EXISTS idx_error_logs_pattern_analysis 
ON error_logs(error_type, severity, file_name, created_at DESC);

-- User-specific error search (for personalized results)
CREATE INDEX IF NOT EXISTS idx_error_logs_user_search 
ON error_logs(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- =====================================================
-- 2. ANALYTICS PERFORMANCE INDEXES  
-- =====================================================

-- Analytics aggregation index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_error_logs_analytics_agg 
ON error_logs(
  date_trunc('hour', created_at),
  severity,
  error_type
);

-- Trend analysis index for time-series data
CREATE INDEX IF NOT EXISTS idx_error_logs_trends 
ON error_logs(
  date_trunc('day', created_at) DESC,
  severity
);

-- Resolution tracking index
CREATE INDEX IF NOT EXISTS idx_error_logs_resolution 
ON error_logs(resolved, created_at DESC, severity);

-- =====================================================
-- 3. NEW TABLES FOR v0.9.5 FEATURES
-- =====================================================

-- Search analytics and caching
CREATE TABLE IF NOT EXISTS search_analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  search_query TEXT NOT NULL,
  search_filters JSONB DEFAULT '{}',
  search_options JSONB DEFAULT '{}',
  results_count INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  plugin_breakdown JSONB DEFAULT '{}',
  user_interactions JSONB DEFAULT '{}', -- clicks, dwells, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for search analytics
  INDEX idx_search_analytics_user (user_id, created_at DESC),
  INDEX idx_search_analytics_query (search_query),
  INDEX idx_search_analytics_performance (execution_time_ms, results_count)
);

-- Saved searches and search presets
CREATE TABLE IF NOT EXISTS saved_searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  search_query TEXT NOT NULL,
  search_filters JSONB DEFAULT '{}',
  search_options JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for saved searches
  INDEX idx_saved_searches_user (user_id, created_at DESC),
  INDEX idx_saved_searches_public (is_public, usage_count DESC) WHERE is_public = TRUE,
  UNIQUE KEY unique_user_search_name (user_id, name)
);

-- Real-time analytics snapshots
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_type VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'weekly'
  time_bucket TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL,
  aggregation_level VARCHAR(20) DEFAULT 'system', -- 'system', 'user', 'project'
  entity_id INTEGER, -- user_id or project_id for targeted snapshots
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for analytics snapshots
  INDEX idx_analytics_snapshots_time (snapshot_type, time_bucket DESC),
  INDEX idx_analytics_snapshots_entity (aggregation_level, entity_id, time_bucket DESC),
  UNIQUE KEY unique_snapshot (snapshot_type, time_bucket, aggregation_level, COALESCE(entity_id, 0))
);

-- Dashboard configurations (for custom dashboard feature)
CREATE TABLE IF NOT EXISTS dashboard_configurations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  layout_config JSONB NOT NULL,
  widget_config JSONB DEFAULT '{}',
  theme_config JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(64) UNIQUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for dashboard configurations
  INDEX idx_dashboard_configs_user (user_id, created_at DESC),
  INDEX idx_dashboard_configs_shared (is_shared, share_token) WHERE is_shared = TRUE,
  UNIQUE KEY unique_user_dashboard_name (user_id, name)
);

-- Performance monitoring (for system health tracking)
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL, -- 'search', 'api', 'database', 'frontend'
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  metric_unit VARCHAR(20), -- 'ms', 'mb', 'count', 'percentage'
  tags JSONB DEFAULT '{}',
  threshold_warning DECIMAL(10,4),
  threshold_critical DECIMAL(10,4),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance metrics
  INDEX idx_performance_metrics_type_time (metric_type, metric_name, recorded_at DESC),
  INDEX idx_performance_metrics_alerts (recorded_at DESC) 
    WHERE metric_value > threshold_warning OR metric_value > threshold_critical
);

-- =====================================================
-- 4. MOBILE AND PWA SUPPORT TABLES
-- =====================================================

-- User device/session tracking for mobile analytics
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(128) NOT NULL UNIQUE,
  device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
  device_info JSONB DEFAULT '{}', -- OS, browser, screen size, etc.
  is_pwa BOOLEAN DEFAULT FALSE,
  is_offline_capable BOOLEAN DEFAULT FALSE,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  activity_data JSONB DEFAULT '{}', -- page views, interactions, etc.
  
  -- Indexes for session tracking
  INDEX idx_user_sessions_user (user_id, session_start DESC),
  INDEX idx_user_sessions_device (device_type, is_pwa, session_start DESC),
  INDEX idx_user_sessions_active (session_start DESC) WHERE session_end IS NULL
);

-- PWA notification preferences and history
CREATE TABLE IF NOT EXISTS pwa_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'error_alert', 'system_update', 'reminder'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  push_subscription JSONB, -- Web Push subscription details
  delivery_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  delivery_attempts INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for notifications
  INDEX idx_pwa_notifications_user (user_id, created_at DESC),
  INDEX idx_pwa_notifications_delivery (delivery_status, scheduled_at),
  INDEX idx_pwa_notifications_type (notification_type, created_at DESC)
);

-- =====================================================
-- 5. PARTITIONING FOR LARGE TABLES (Future-proofing)
-- =====================================================

-- Partition error_logs by date for better performance with large datasets
-- This is optional and can be implemented later if needed

-- Create partitioned table structure (PostgreSQL 10+)
/*
CREATE TABLE error_logs_partitioned (
  LIKE error_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE error_logs_2025_10 PARTITION OF error_logs_partitioned
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE error_logs_2025_11 PARTITION OF error_logs_partitioned  
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE error_logs_2025_12 PARTITION OF error_logs_partitioned
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
*/

-- =====================================================
-- 6. SEARCH CACHE TABLE (Redis Alternative)
-- =====================================================

-- Search result caching (if Redis is not available)
CREATE TABLE IF NOT EXISTS search_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  search_query TEXT NOT NULL,
  search_filters JSONB DEFAULT '{}',
  search_results JSONB NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  access_count INTEGER DEFAULT 1,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for search cache
  INDEX idx_search_cache_key (cache_key),
  INDEX idx_search_cache_expiry (expires_at),
  INDEX idx_search_cache_popular (access_count DESC, last_accessed DESC)
);

-- Auto-cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_search_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM search_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. ANALYTICS MATERIALIZED VIEWS (For Fast Dashboards)
-- =====================================================

-- Hourly error statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_error_stats AS
SELECT 
  date_trunc('hour', created_at) as hour_bucket,
  severity,
  error_type,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT file_name) as affected_files,
  AVG(CASE WHEN resolved THEN 1 ELSE 0 END) as resolution_rate
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY hour_bucket, severity, error_type
ORDER BY hour_bucket DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_hourly_error_stats_time 
ON mv_hourly_error_stats(hour_bucket DESC, severity);

-- Daily error trends materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_error_trends AS
SELECT 
  date_trunc('day', created_at) as day_bucket,
  severity,
  COUNT(*) as error_count,
  COUNT(DISTINCT error_type) as unique_error_types,
  COUNT(DISTINCT user_id) as affected_users,
  LAG(COUNT(*)) OVER (PARTITION BY severity ORDER BY date_trunc('day', created_at)) as previous_day_count
FROM error_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day_bucket, severity
ORDER BY day_bucket DESC, severity;

-- Create index on daily trends view
CREATE INDEX IF NOT EXISTS idx_mv_daily_error_trends_time 
ON mv_daily_error_trends(day_bucket DESC, severity);

-- =====================================================
-- 8. FUNCTIONS FOR SEARCH OPTIMIZATION
-- =====================================================

-- Function to refresh analytics materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hourly_error_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_error_trends;
  
  -- Log the refresh
  INSERT INTO performance_metrics (metric_type, metric_name, metric_value, metric_unit)
  VALUES ('system', 'analytics_views_refresh', EXTRACT(EPOCH FROM NOW()), 'timestamp');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate search relevance score
CREATE OR REPLACE FUNCTION calculate_search_relevance(
  search_terms TEXT[],
  error_message TEXT,
  stack_trace TEXT,
  error_type TEXT
) RETURNS DECIMAL(5,4) AS $$
DECLARE
  relevance_score DECIMAL(5,4) := 0;
  term TEXT;
  content TEXT;
BEGIN
  -- Combine all searchable content
  content := LOWER(COALESCE(error_message, '') || ' ' || COALESCE(stack_trace, '') || ' ' || COALESCE(error_type, ''));
  
  -- Calculate relevance based on term matches
  FOREACH term IN ARRAY search_terms
  LOOP
    -- Exact phrase match (highest score)
    IF content LIKE '%' || LOWER(term) || '%' THEN
      relevance_score := relevance_score + 0.3;
      
      -- Bonus for matches in error message (most important)
      IF LOWER(COALESCE(error_message, '')) LIKE '%' || LOWER(term) || '%' THEN
        relevance_score := relevance_score + 0.2;
      END IF;
      
      -- Bonus for matches in error type
      IF LOWER(COALESCE(error_type, '')) LIKE '%' || LOWER(term) || '%' THEN
        relevance_score := relevance_score + 0.1;
      END IF;
    END IF;
  END LOOP;
  
  -- Normalize score to 0-1 range
  RETURN LEAST(relevance_score, 1.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 9. CLEANUP AND MAINTENANCE
-- =====================================================

-- Add constraints and checks
ALTER TABLE search_analytics ADD CONSTRAINT check_execution_time_positive 
  CHECK (execution_time_ms >= 0);

ALTER TABLE search_analytics ADD CONSTRAINT check_results_count_positive 
  CHECK (results_count >= 0);

ALTER TABLE saved_searches ADD CONSTRAINT check_name_not_empty 
  CHECK (length(trim(name)) > 0);

ALTER TABLE analytics_snapshots ADD CONSTRAINT check_valid_snapshot_type
  CHECK (snapshot_type IN ('hourly', 'daily', 'weekly', 'monthly'));

-- Add updated_at triggers for tables that need them
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_saved_searches_updated_at ON saved_searches;
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_configurations_updated_at ON dashboard_configurations;
CREATE TRIGGER update_dashboard_configurations_updated_at
  BEFORE UPDATE ON dashboard_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. PERFORMANCE MONITORING SETUP
-- =====================================================

-- Insert initial performance baselines
INSERT INTO performance_metrics (metric_type, metric_name, metric_value, metric_unit, threshold_warning, threshold_critical)
VALUES 
  ('search', 'average_response_time', 200.0, 'ms', 500.0, 1000.0),
  ('search', 'cache_hit_rate', 80.0, 'percentage', 60.0, 40.0),
  ('database', 'query_execution_time', 50.0, 'ms', 100.0, 500.0),
  ('api', 'average_response_time', 150.0, 'ms', 300.0, 1000.0),
  ('system', 'memory_usage', 70.0, 'percentage', 80.0, 90.0)
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
INSERT INTO performance_metrics (metric_type, metric_name, metric_value, metric_unit)
VALUES ('migration', 'v095_search_optimization', EXTRACT(EPOCH FROM NOW()), 'timestamp');

-- Display summary
SELECT 'v0.9.5 Advanced Search Optimization Migration Completed Successfully' as status;