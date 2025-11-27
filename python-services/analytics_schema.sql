-- Phase 4: Real-Time Analytics Schema
-- Time-series and aggregation tables for analytics service
-- No mock data - production schema only

-- Create extension for time-series if needed
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ============================================================================
-- Analytics Metrics Tables
-- ============================================================================

-- Raw analytics events (hot storage - 1 day retention)
CREATE TABLE IF NOT EXISTS analytics_events (
    event_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    service VARCHAR(255) NOT NULL,
    level VARCHAR(20) NOT NULL,  -- debug, info, warning, error, critical
    
    -- Request metrics
    request_id UUID,
    user_id VARCHAR(255),
    source_ip INET,
    
    -- Latency (milliseconds)
    latency_ms NUMERIC(10, 2),
    
    -- Error info
    error_message TEXT,
    error_count INT DEFAULT 0,
    
    -- Enrichment data
    geo_country VARCHAR(255),
    user_subscription_tier VARCHAR(50),
    business_risk_score NUMERIC(5, 2),
    
    -- Metadata
    trace_id UUID,
    span_id UUID,
    
    CONSTRAINT valid_level CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
    CONSTRAINT valid_risk CHECK (business_risk_score >= 0 AND business_risk_score <= 1)
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('analytics_events', 'timestamp', if_not_exists => TRUE);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_service_timestamp 
    ON analytics_events (service, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_level 
    ON analytics_events (level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id 
    ON analytics_events (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_service_level 
    ON analytics_events (service, level, timestamp DESC);

-- Retention policy: 1 day for raw events
-- SELECT add_retention_policy('analytics_events', INTERVAL '1 day', if_not_exists => true);

-- ============================================================================
-- Aggregated Metrics Tables
-- ============================================================================

-- 1-minute aggregations
CREATE TABLE IF NOT EXISTS analytics_metrics_1min (
    metric_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    service VARCHAR(255) NOT NULL,
    
    -- Request counts
    total_requests INT DEFAULT 0,
    successful_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    
    -- Error metrics
    error_rate NUMERIC(5, 2) DEFAULT 0,  -- percentage
    
    -- Latency metrics
    latency_min NUMERIC(10, 2) DEFAULT 0,
    latency_p50 NUMERIC(10, 2) DEFAULT 0,
    latency_p95 NUMERIC(10, 2) DEFAULT 0,
    latency_p99 NUMERIC(10, 2) DEFAULT 0,
    latency_max NUMERIC(10, 2) DEFAULT 0,
    latency_mean NUMERIC(10, 2) DEFAULT 0,
    
    -- Context metrics
    unique_users INT DEFAULT 0,
    unique_ips INT DEFAULT 0,
    
    -- Risk metrics
    avg_risk_score NUMERIC(5, 2) DEFAULT 0,
    high_risk_count INT DEFAULT 0,
    
    -- Aggregation info
    aggregated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (service, timestamp),
    CONSTRAINT valid_error_rate CHECK (error_rate >= 0 AND error_rate <= 100),
    CONSTRAINT valid_percentile CHECK (latency_p99 >= latency_p95 AND latency_p95 >= latency_p50)
);

-- Create hypertable
SELECT create_hypertable('analytics_metrics_1min', 'timestamp', if_not_exists => TRUE);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_metrics_1min_service_timestamp 
    ON analytics_metrics_1min (service, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_1min_error_rate 
    ON analytics_metrics_1min (error_rate DESC, timestamp DESC);

-- 5-minute aggregations (warm storage - 7 days)
CREATE TABLE IF NOT EXISTS analytics_metrics_5min (
    metric_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    service VARCHAR(255) NOT NULL,
    
    total_requests INT DEFAULT 0,
    successful_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    error_rate NUMERIC(5, 2) DEFAULT 0,
    
    latency_min NUMERIC(10, 2) DEFAULT 0,
    latency_p50 NUMERIC(10, 2) DEFAULT 0,
    latency_p95 NUMERIC(10, 2) DEFAULT 0,
    latency_p99 NUMERIC(10, 2) DEFAULT 0,
    latency_max NUMERIC(10, 2) DEFAULT 0,
    latency_mean NUMERIC(10, 2) DEFAULT 0,
    
    unique_users INT DEFAULT 0,
    unique_ips INT DEFAULT 0,
    
    avg_risk_score NUMERIC(5, 2) DEFAULT 0,
    high_risk_count INT DEFAULT 0,
    
    aggregated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (service, timestamp)
);

SELECT create_hypertable('analytics_metrics_5min', 'timestamp', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_5min_service_timestamp 
    ON analytics_metrics_5min (service, timestamp DESC);

-- 1-hour aggregations (cold storage - 30 days)
CREATE TABLE IF NOT EXISTS analytics_metrics_1hour (
    metric_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    service VARCHAR(255) NOT NULL,
    
    total_requests INT DEFAULT 0,
    successful_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    error_rate NUMERIC(5, 2) DEFAULT 0,
    
    latency_min NUMERIC(10, 2) DEFAULT 0,
    latency_p50 NUMERIC(10, 2) DEFAULT 0,
    latency_p95 NUMERIC(10, 2) DEFAULT 0,
    latency_p99 NUMERIC(10, 2) DEFAULT 0,
    latency_max NUMERIC(10, 2) DEFAULT 0,
    latency_mean NUMERIC(10, 2) DEFAULT 0,
    
    unique_users INT DEFAULT 0,
    unique_ips INT DEFAULT 0,
    
    avg_risk_score NUMERIC(5, 2) DEFAULT 0,
    high_risk_count INT DEFAULT 0,
    
    aggregated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (service, timestamp)
);

SELECT create_hypertable('analytics_metrics_1hour', 'timestamp', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_metrics_1hour_service_timestamp 
    ON analytics_metrics_1hour (service, timestamp DESC);

-- ============================================================================
-- Alert Tables
-- ============================================================================

-- Alert rules configuration
CREATE TABLE IF NOT EXISTS analytics_alert_rules (
    rule_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service VARCHAR(255) DEFAULT '*',  -- "*" means all services
    
    metric VARCHAR(100) NOT NULL,  -- error_rate, latency_p99, request_count, etc.
    operator VARCHAR(10) NOT NULL,  -- >, <, >=, <=, ==
    threshold NUMERIC(10, 2) NOT NULL,
    duration_seconds INT DEFAULT 60,  -- How long violation must persist
    severity VARCHAR(50) NOT NULL,  -- info, warning, critical
    
    -- Notification channels
    notify_slack BOOLEAN DEFAULT FALSE,
    notify_email BOOLEAN DEFAULT FALSE,
    notify_pagerduty BOOLEAN DEFAULT FALSE,
    
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_operator CHECK (operator IN ('>', '<', '>=', '<=', '==')),
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON analytics_alert_rules(enabled);

-- Alert instances (triggered alerts)
CREATE TABLE IF NOT EXISTS analytics_alerts (
    alert_id VARCHAR(255) PRIMARY KEY,
    rule_id VARCHAR(255) NOT NULL REFERENCES analytics_alert_rules(rule_id),
    service VARCHAR(255) NOT NULL,
    
    metric VARCHAR(100) NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    threshold NUMERIC(10, 2) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    
    message TEXT,
    details JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',  -- active, resolved, acknowledged
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'resolved', 'acknowledged'))
);

SELECT create_hypertable('analytics_alerts', 'triggered_at', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_alerts_service_triggered 
    ON analytics_alerts (service, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status 
    ON analytics_alerts (status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity 
    ON analytics_alerts (severity, triggered_at DESC);

-- Alert history/audit log
CREATE TABLE IF NOT EXISTS analytics_alert_history (
    history_id BIGSERIAL PRIMARY KEY,
    alert_id VARCHAR(255) NOT NULL,
    rule_id VARCHAR(255),
    service VARCHAR(255),
    severity VARCHAR(50),
    
    event_type VARCHAR(100) NOT NULL,  -- triggered, resolved, acknowledged
    event_message TEXT,
    event_data JSONB,
    
    event_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('analytics_alert_history', 'event_at', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id 
    ON analytics_alert_history (alert_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_event_type 
    ON analytics_alert_history (event_type, event_at DESC);

-- ============================================================================
-- Analytics Views
-- ============================================================================

-- Current service health overview (1-minute window)
CREATE OR REPLACE VIEW v_service_health_current AS
SELECT
    service,
    timestamp,
    total_requests,
    error_rate,
    latency_p99,
    unique_users,
    CASE
        WHEN error_rate > 20 THEN 'critical'
        WHEN error_rate > 5 THEN 'warning'
        WHEN latency_p99 > 500 THEN 'warning'
        ELSE 'healthy'
    END AS health_status
FROM analytics_metrics_1min
WHERE timestamp >= NOW() - INTERVAL '1 minute'
ORDER BY timestamp DESC;

-- Service performance trends (5-minute aggregations)
CREATE OR REPLACE VIEW v_service_performance_trend AS
SELECT
    service,
    timestamp,
    total_requests,
    error_rate,
    latency_p99,
    latency_mean,
    unique_users,
    avg_risk_score
FROM analytics_metrics_5min
WHERE timestamp >= NOW() - INTERVAL '7 days'
ORDER BY service, timestamp DESC;

-- Active alerts summary
CREATE OR REPLACE VIEW v_active_alerts_summary AS
SELECT
    service,
    severity,
    COUNT(*) as alert_count,
    STRING_AGG(DISTINCT metric, ', ') as metrics,
    MAX(triggered_at) as latest_alert_time
FROM analytics_alerts
WHERE status = 'active'
GROUP BY service, severity
ORDER BY service, severity;

-- Top error services
CREATE OR REPLACE VIEW v_top_error_services AS
SELECT
    service,
    SUM(failed_requests) as total_errors,
    ROUND(AVG(error_rate), 2) as avg_error_rate,
    MAX(error_rate) as max_error_rate,
    COUNT(*) as measurement_count
FROM analytics_metrics_5min
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY service
ORDER BY avg_error_rate DESC NULLS LAST
LIMIT 20;

-- Slowest services
CREATE OR REPLACE VIEW v_slowest_services AS
SELECT
    service,
    ROUND(AVG(latency_p99), 2) as avg_p99_latency,
    MAX(latency_p99) as max_p99_latency,
    ROUND(AVG(latency_mean), 2) as avg_mean_latency,
    COUNT(*) as measurement_count
FROM analytics_metrics_5min
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY service
ORDER BY avg_p99_latency DESC NULLS LAST
LIMIT 20;

-- High risk events
CREATE OR REPLACE VIEW v_high_risk_events AS
SELECT
    service,
    timestamp,
    high_risk_count,
    avg_risk_score,
    ROUND((high_risk_count::NUMERIC / NULLIF(total_requests, 0) * 100), 2) as high_risk_percentage
FROM analytics_metrics_5min
WHERE timestamp >= NOW() - INTERVAL '24 hours'
    AND high_risk_count > 0
ORDER BY timestamp DESC, high_risk_count DESC;

-- ============================================================================
-- Analytics Functions
-- ============================================================================

-- Calculate service SLA (availability percentage)
CREATE OR REPLACE FUNCTION analytics_calculate_sla(
    p_service VARCHAR,
    p_interval INTERVAL DEFAULT '1 day'
)
RETURNS TABLE (
    service VARCHAR,
    uptime_percentage NUMERIC,
    total_requests BIGINT,
    failed_requests BIGINT,
    error_rate_avg NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        $1,
        100 - COALESCE(AVG(error_rate), 0)::NUMERIC,
        SUM(total_requests)::BIGINT,
        SUM(failed_requests)::BIGINT,
        COALESCE(AVG(error_rate), 0)::NUMERIC
    FROM analytics_metrics_1min
    WHERE service = $1
        AND timestamp >= NOW() - p_interval;
END;
$$ LANGUAGE plpgsql;

-- Get alert statistics for time period
CREATE OR REPLACE FUNCTION analytics_get_alert_stats(
    p_interval INTERVAL DEFAULT '24 hours'
)
RETURNS TABLE (
    service VARCHAR,
    severity VARCHAR,
    alert_count BIGINT,
    avg_resolution_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.service,
        a.severity,
        COUNT(*)::BIGINT,
        AVG(COALESCE(a.resolved_at, NOW()) - a.triggered_at)::INTERVAL
    FROM analytics_alerts a
    WHERE a.triggered_at >= NOW() - p_interval
    GROUP BY a.service, a.severity
    ORDER BY a.service, a.severity;
END;
$$ LANGUAGE plpgsql;

-- Archive old data to cold storage
CREATE OR REPLACE PROCEDURE analytics_archive_old_data()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Archive events older than 1 day
    DELETE FROM analytics_events
    WHERE timestamp < NOW() - INTERVAL '1 day';
    
    -- Archive alerts older than 30 days
    DELETE FROM analytics_alerts
    WHERE triggered_at < NOW() - INTERVAL '30 days'
        AND status = 'resolved';
    
    RAISE NOTICE 'Archive completed at %', NOW();
END;
$$;

-- ============================================================================
-- Triggers and Maintenance
-- ============================================================================

-- Auto-update timestamp on alert rule changes
CREATE OR REPLACE FUNCTION update_alert_rule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alert_rule_update
BEFORE UPDATE ON analytics_alert_rules
FOR EACH ROW
EXECUTE FUNCTION update_alert_rule_timestamp();

-- Log alert status changes
CREATE OR REPLACE FUNCTION log_alert_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO analytics_alert_history (
            alert_id, rule_id, service, severity,
            event_type, event_message, event_data
        )
        VALUES (
            NEW.alert_id,
            NEW.rule_id,
            NEW.service,
            NEW.severity,
            'status_change',
            'Alert status changed from ' || OLD.status || ' to ' || NEW.status,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'timestamp', NOW()
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alert_status_change
AFTER UPDATE ON analytics_alerts
FOR EACH ROW
EXECUTE FUNCTION log_alert_status_change();

-- Maintenance comments
COMMENT ON TABLE analytics_events IS 'Raw analytics events - hot storage (1 day retention)';
COMMENT ON TABLE analytics_metrics_1min IS '1-minute aggregated metrics';
COMMENT ON TABLE analytics_metrics_5min IS '5-minute aggregated metrics - warm storage (7 days)';
COMMENT ON TABLE analytics_metrics_1hour IS '1-hour aggregated metrics - cold storage (30 days)';
COMMENT ON TABLE analytics_alert_rules IS 'Alert rule definitions and configurations';
COMMENT ON TABLE analytics_alerts IS 'Alert instances triggered by rules';
