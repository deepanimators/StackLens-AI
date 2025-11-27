-- Phase 5: ML & Anomaly Detection Schema
-- Time-series anomaly tracking, model management, and pattern analytics
-- NO sample data - production schema only

-- Create schema for ML components
CREATE SCHEMA IF NOT EXISTS ml;

-- ============================================================================
-- Anomaly Detection Tables
-- ============================================================================

-- Raw anomalies detected by ML models
CREATE TABLE IF NOT EXISTS ml_anomalies (
    anomaly_id VARCHAR(255) PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    anomaly_type VARCHAR(50) NOT NULL,  -- outlier, trend_change, spike, dip, pattern_shift, seasonality_break
    severity VARCHAR(20) NOT NULL,      -- low, medium, high, critical
    timestamp TIMESTAMPTZ NOT NULL,
    metric_name VARCHAR(255),
    metric_value NUMERIC(12, 4),
    baseline_value NUMERIC(12, 4),
    deviation_percent NUMERIC(10, 2),
    confidence_score NUMERIC(5, 4),     -- 0-1 confidence
    description TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_ml_anomalies_service_timestamp 
    ON ml_anomalies(service, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ml_anomalies_severity 
    ON ml_anomalies(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_anomalies_anomaly_type 
    ON ml_anomalies(anomaly_type, timestamp DESC);

-- ============================================================================
-- Anomaly History & Audit Trail
-- ============================================================================

-- Anomaly resolution history
CREATE TABLE IF NOT EXISTS ml_anomaly_history (
    history_id BIGSERIAL PRIMARY KEY,
    anomaly_id VARCHAR(255) REFERENCES ml_anomalies(anomaly_id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    resolved_at TIMESTAMPTZ,
    resolution_reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255)
);

-- Index for audit trail
CREATE INDEX IF NOT EXISTS idx_ml_anomaly_history_anomaly_id 
    ON ml_anomaly_history(anomaly_id, changed_at DESC);

-- ============================================================================
-- Model Management
-- ============================================================================

-- ML model metadata and versioning
CREATE TABLE IF NOT EXISTS ml_models (
    model_id VARCHAR(255) PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL,    -- isolation_forest, one_class_svm, pattern_analyzer
    service VARCHAR(255),
    version VARCHAR(20),
    status VARCHAR(20),                 -- active, inactive, training, deprecated
    accuracy NUMERIC(5, 4),
    precision NUMERIC(5, 4),
    recall NUMERIC(5, 4),
    f1_score NUMERIC(5, 4),
    training_samples INTEGER,
    trained_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    parameters JSONB,                   -- hyperparameters
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for model tracking
CREATE INDEX IF NOT EXISTS idx_ml_models_service_status 
    ON ml_models(service, status);
CREATE INDEX IF NOT EXISTS idx_ml_models_model_type 
    ON ml_models(model_type, trained_at DESC);

-- ============================================================================
-- Pattern Analytics
-- ============================================================================

-- Detected service behavior patterns
CREATE TABLE IF NOT EXISTS ml_patterns (
    pattern_id VARCHAR(255) PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    pattern_name VARCHAR(255),
    pattern_type VARCHAR(50),           -- daily, weekly, error_spike, latency_increase
    window_size INTEGER,                -- minutes
    confidence NUMERIC(5, 4),           -- 0-1 pattern confidence
    feature_vector FLOAT8[],            -- n-dimensional feature vector
    occurrences INTEGER DEFAULT 0,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for pattern queries
CREATE INDEX IF NOT EXISTS idx_ml_patterns_service_active 
    ON ml_patterns(service, is_active);
CREATE INDEX IF NOT EXISTS idx_ml_patterns_pattern_type 
    ON ml_patterns(pattern_type, confidence DESC);

-- ============================================================================
-- Trend Analysis
-- ============================================================================

-- Detected trends in service metrics
CREATE TABLE IF NOT EXISTS ml_trends (
    trend_id VARCHAR(255) PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    trend_direction VARCHAR(20),        -- upward, downward, stable
    trend_magnitude NUMERIC(10, 4),
    seasonality_score NUMERIC(5, 4),    -- 0-1
    autocorrelation_lag1 NUMERIC(5, 4),
    start_timestamp TIMESTAMPTZ,
    end_timestamp TIMESTAMPTZ,
    prediction_confidence NUMERIC(5, 4),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for trend queries
CREATE INDEX IF NOT EXISTS idx_ml_trends_service_metric 
    ON ml_trends(service, metric_name, created_at DESC);

-- ============================================================================
-- Anomaly Statistics & Aggregations
-- ============================================================================

-- Hourly anomaly statistics
CREATE TABLE IF NOT EXISTS ml_anomaly_stats_hourly (
    stats_id BIGSERIAL PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    total_anomalies INTEGER,
    critical_count INTEGER,
    high_count INTEGER,
    medium_count INTEGER,
    low_count INTEGER,
    avg_confidence NUMERIC(5, 4),
    max_deviation NUMERIC(10, 2),
    resolution_rate NUMERIC(5, 4),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service, timestamp)
);

-- Index for stats queries
CREATE INDEX IF NOT EXISTS idx_ml_anomaly_stats_service_timestamp 
    ON ml_anomaly_stats_hourly(service, timestamp DESC);

-- Daily anomaly statistics
CREATE TABLE IF NOT EXISTS ml_anomaly_stats_daily (
    stats_id BIGSERIAL PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    total_anomalies INTEGER,
    critical_count INTEGER,
    high_count INTEGER,
    medium_count INTEGER,
    low_count INTEGER,
    avg_confidence NUMERIC(5, 4),
    max_deviation NUMERIC(10, 2),
    resolution_rate NUMERIC(5, 4),
    trend_detected VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service, date)
);

-- Index for daily stats
CREATE INDEX IF NOT EXISTS idx_ml_anomaly_stats_daily_service 
    ON ml_anomaly_stats_daily(service, date DESC);

-- ============================================================================
-- ML Predictions & Forecasting
-- ============================================================================

-- Time-series predictions (ARIMA, Prophet, etc.)
CREATE TABLE IF NOT EXISTS ml_forecasts (
    forecast_id VARCHAR(255) PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    forecast_timestamp TIMESTAMPTZ,
    predicted_value NUMERIC(12, 4),
    prediction_lower_bound NUMERIC(12, 4),
    prediction_upper_bound NUMERIC(12, 4),
    confidence_interval NUMERIC(5, 4),  -- 0.95 = 95% CI
    actual_value NUMERIC(12, 4),
    prediction_error NUMERIC(10, 4),
    model_type VARCHAR(50),             -- arima, prophet, exponential_smoothing
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- Index for forecasts
CREATE INDEX IF NOT EXISTS idx_ml_forecasts_service_metric 
    ON ml_forecasts(service, metric_name, forecast_timestamp DESC);

-- ============================================================================
-- Model Performance Tracking
-- ============================================================================

-- Track model performance over time
CREATE TABLE IF NOT EXISTS ml_model_performance (
    performance_id BIGSERIAL PRIMARY KEY,
    model_id VARCHAR(255) REFERENCES ml_models(model_id),
    evaluation_date DATE,
    true_positives INTEGER,
    false_positives INTEGER,
    true_negatives INTEGER,
    false_negatives INTEGER,
    precision NUMERIC(5, 4),
    recall NUMERIC(5, 4),
    f1_score NUMERIC(5, 4),
    roc_auc NUMERIC(5, 4),
    test_samples INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance queries
CREATE INDEX IF NOT EXISTS idx_ml_model_performance_model_date 
    ON ml_model_performance(model_id, evaluation_date DESC);

-- ============================================================================
-- Alerting & Actions
-- ============================================================================

-- Predictive alerts (anomalies predicted for future)
CREATE TABLE IF NOT EXISTS ml_predictive_alerts (
    alert_id VARCHAR(255) PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    predicted_event VARCHAR(255),       -- description of predicted event
    prediction_confidence NUMERIC(5, 4),
    predicted_time_start TIMESTAMPTZ,
    predicted_time_end TIMESTAMPTZ,
    recommended_action TEXT,
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMPTZ,
    materialized BOOLEAN DEFAULT FALSE, -- did prediction occur?
    materialized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for predictive alerts
CREATE INDEX IF NOT EXISTS idx_ml_predictive_alerts_service 
    ON ml_predictive_alerts(service, predicted_time_start DESC);
CREATE INDEX IF NOT EXISTS idx_ml_predictive_alerts_materialized 
    ON ml_predictive_alerts(materialized, alert_sent DESC);

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- View: Recent anomalies by service
CREATE OR REPLACE VIEW ml_v_recent_anomalies AS
SELECT 
    service,
    anomaly_type,
    severity,
    COUNT(*) as count,
    MAX(timestamp) as latest,
    AVG(confidence_score) as avg_confidence,
    SUM(CASE WHEN resolved THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as resolution_rate
FROM ml_anomalies
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY service, anomaly_type, severity
ORDER BY count DESC, latest DESC;

-- View: Critical anomalies
CREATE OR REPLACE VIEW ml_v_critical_anomalies AS
SELECT 
    anomaly_id,
    service,
    anomaly_type,
    timestamp,
    metric_name,
    confidence_score,
    description,
    resolved
FROM ml_anomalies
WHERE severity = 'critical'
AND resolved = FALSE
AND timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY timestamp DESC, confidence_score DESC;

-- View: Anomaly trends
CREATE OR REPLACE VIEW ml_v_anomaly_trends AS
SELECT 
    service,
    DATE(timestamp) as date,
    COUNT(*) as total_anomalies,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_count,
    AVG(confidence_score) as avg_confidence,
    MAX(deviation_percent) as max_deviation
FROM ml_anomalies
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY service, DATE(timestamp)
ORDER BY service, date DESC;

-- View: Model health
CREATE OR REPLACE VIEW ml_v_model_health AS
SELECT 
    model_name,
    model_type,
    service,
    status,
    accuracy,
    precision,
    recall,
    f1_score,
    trained_at,
    CASE 
        WHEN last_used_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 'active'
        WHEN last_used_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'stale'
        ELSE 'inactive'
    END as usage_status
FROM ml_models
ORDER BY service, trained_at DESC;

-- ============================================================================
-- Functions for Operations
-- ============================================================================

-- Calculate anomaly statistics for given period
CREATE OR REPLACE FUNCTION ml_calculate_anomaly_stats(
    p_service VARCHAR,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
) RETURNS TABLE (
    total_anomalies BIGINT,
    critical_count BIGINT,
    high_count BIGINT,
    medium_count BIGINT,
    low_count BIGINT,
    avg_confidence NUMERIC,
    resolution_rate NUMERIC,
    detection_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*),
        COUNT(CASE WHEN severity = 'critical' THEN 1 END),
        COUNT(CASE WHEN severity = 'high' THEN 1 END),
        COUNT(CASE WHEN severity = 'medium' THEN 1 END),
        COUNT(CASE WHEN severity = 'low' THEN 1 END),
        AVG(confidence_score),
        SUM(CASE WHEN resolved THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0),
        COUNT(*)::FLOAT / NULLIF(
            (SELECT COUNT(*) FROM analytics_alerts 
             WHERE timestamp BETWEEN p_start_time AND p_end_time
             AND service = p_service), 0
        )
    FROM ml_anomalies
    WHERE service = p_service
    AND timestamp BETWEEN p_start_time AND p_end_time;
END;
$$ LANGUAGE plpgsql;

-- Get top anomalies for a service
CREATE OR REPLACE FUNCTION ml_get_top_anomalies(
    p_service VARCHAR,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    anomaly_id VARCHAR,
    anomaly_type VARCHAR,
    severity VARCHAR,
    timestamp TIMESTAMPTZ,
    confidence_score NUMERIC,
    deviation_percent NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.anomaly_id, a.anomaly_type, a.severity, a.timestamp,
           a.confidence_score, a.deviation_percent
    FROM ml_anomalies a
    WHERE a.service = p_service
    ORDER BY a.confidence_score DESC, a.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Archive old anomalies
CREATE OR REPLACE FUNCTION ml_archive_old_anomalies(
    p_days_to_keep INTEGER DEFAULT 90
) RETURNS TABLE (
    anomalies_archived BIGINT,
    earliest_archived TIMESTAMPTZ,
    latest_archived TIMESTAMPTZ
) AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_count BIGINT;
BEGIN
    v_cutoff := CURRENT_TIMESTAMP - (p_days_to_keep || ' days')::INTERVAL;
    
    DELETE FROM ml_anomaly_history
    WHERE anomaly_id IN (
        SELECT anomaly_id FROM ml_anomalies
        WHERE created_at < v_cutoff
    );
    
    v_count := (
        SELECT COUNT(*) FROM ml_anomalies
        WHERE created_at < v_cutoff
    );
    
    DELETE FROM ml_anomalies
    WHERE created_at < v_cutoff
    RETURNING COUNT(*);
    
    RETURN QUERY
    SELECT v_count, v_cutoff, CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers for Auditing
-- ============================================================================

-- Trigger: Log anomaly status changes
CREATE OR REPLACE FUNCTION ml_log_anomaly_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.resolved IS DISTINCT FROM NEW.resolved THEN
        INSERT INTO ml_anomaly_history
        (anomaly_id, old_status, new_status, resolved_at, changed_at)
        VALUES (
            NEW.anomaly_id,
            CASE WHEN OLD.resolved THEN 'resolved' ELSE 'open' END,
            CASE WHEN NEW.resolved THEN 'resolved' ELSE 'open' END,
            NEW.resolved_at,
            CURRENT_TIMESTAMP
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ml_anomaly_status_change
AFTER UPDATE ON ml_anomalies
FOR EACH ROW
EXECUTE FUNCTION ml_log_anomaly_change();

-- Trigger: Update model metadata timestamp
CREATE OR REPLACE FUNCTION ml_update_model_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ml_model_update_timestamp
BEFORE UPDATE ON ml_models
FOR EACH ROW
EXECUTE FUNCTION ml_update_model_timestamp();

-- ============================================================================
-- Initial Index Creation
-- ============================================================================

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ml TO stacklens_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ml TO stacklens_user;
