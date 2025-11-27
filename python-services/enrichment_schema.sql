-- Phase 3: Enrichment Service Database Schema
-- Tables for caching, user profiles, business context, and enrichment tracking

-- Geo-IP Cache Table
CREATE TABLE IF NOT EXISTS geo_ip_cache (
    id BIGSERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,  -- IPv4 or IPv6
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    timezone VARCHAR(50),
    isp VARCHAR(255),
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ttl_hours INTEGER DEFAULT 24,
    lookup_count INTEGER DEFAULT 0,
    INDEX idx_geo_ip_cache_ipaddress (ip_address)
);

-- User Profile Cache
CREATE TABLE IF NOT EXISTS user_profile_cache (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255),
    email VARCHAR(255),
    country VARCHAR(2),
    account_age_days INTEGER,
    subscription_tier VARCHAR(50),  -- basic, premium, enterprise
    is_premium BOOLEAN,
    company VARCHAR(255),
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ttl_hours INTEGER DEFAULT 24,
    lookup_count INTEGER DEFAULT 0,
    INDEX idx_user_profile_userid (user_id)
);

-- Business Context Cache
CREATE TABLE IF NOT EXISTS business_context_cache (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID UNIQUE,
    user_id VARCHAR(255),
    transaction_type VARCHAR(100),  -- payment, query, transfer, etc
    risk_score DECIMAL(3, 2),  -- 0.0 - 1.0
    fraud_indicators TEXT[],  -- Array of fraud indicators
    business_unit VARCHAR(100),
    cost_center VARCHAR(100),
    project_id VARCHAR(100),
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ttl_minutes INTEGER DEFAULT 30,
    lookup_count INTEGER DEFAULT 0,
    INDEX idx_business_context_requestid (request_id),
    INDEX idx_business_context_userid (user_id)
);

-- Enrichment Job Tracking
CREATE TABLE IF NOT EXISTS enrichment_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID DEFAULT gen_random_uuid(),
    log_id BIGINT,
    enrichment_type VARCHAR(100),  -- geo-ip, user-profile, business-context
    status VARCHAR(50),  -- success, failed, pending
    enrichment_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time_ms INTEGER,
    INDEX idx_enrichment_jobs_jobid (job_id),
    INDEX idx_enrichment_jobs_status (status),
    INDEX idx_enrichment_jobs_created (created_at)
);

-- Enrichment Performance Metrics
CREATE TABLE IF NOT EXISTS enrichment_metrics (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID,
    service_name VARCHAR(255),
    batch_size INTEGER,
    processed_messages INTEGER,
    enriched_messages INTEGER,
    failed_messages INTEGER,
    dlq_messages INTEGER,
    avg_enrichment_time_ms DECIMAL(10, 2),
    geo_cache_hit_rate DECIMAL(5, 2),  -- percentage
    user_cache_hit_rate DECIMAL(5, 2),
    business_cache_hit_rate DECIMAL(5, 2),
    throughput_msgs_per_sec DECIMAL(10, 2),
    error_rate DECIMAL(5, 2),  -- percentage
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_enrichment_metrics_jobid (job_id),
    INDEX idx_enrichment_metrics_recorded (recorded_at)
);

-- Enrichment Audit Log
CREATE TABLE IF NOT EXISTS enrichment_audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100),  -- cache_hit, cache_miss, lookup_failed, enrichment_complete
    enrichment_type VARCHAR(100),
    source_service VARCHAR(100),
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_enrichment_audit_eventtype (event_type),
    INDEX idx_enrichment_audit_timestamp (timestamp)
);

-- Create Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_geo_ip_cache_country ON geo_ip_cache(country_name);
CREATE INDEX IF NOT EXISTS idx_geo_ip_cache_city ON geo_ip_cache(city);
CREATE INDEX IF NOT EXISTS idx_user_profile_email ON user_profile_cache(email);
CREATE INDEX IF NOT EXISTS idx_user_profile_company ON user_profile_cache(company);
CREATE INDEX IF NOT EXISTS idx_business_context_transtype ON business_context_cache(transaction_type);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_logid ON enrichment_jobs(log_id);

-- Create Views for common queries

-- Active cache entries (not expired)
CREATE OR REPLACE VIEW v_active_geo_cache AS
SELECT 
    ip_address,
    country_name,
    city,
    latitude,
    longitude,
    timezone,
    cached_at,
    lookup_count,
    CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - cached_at AS age
FROM geo_ip_cache
WHERE cached_at + (ttl_hours || ' hours')::INTERVAL > NOW()
ORDER BY lookup_count DESC;

-- User profile cache summary
CREATE OR REPLACE VIEW v_user_profile_summary AS
SELECT 
    subscription_tier,
    COUNT(*) AS user_count,
    AVG(account_age_days) AS avg_account_age,
    SUM(CASE WHEN is_premium THEN 1 ELSE 0 END) AS premium_count,
    MAX(cached_at) AS last_update
FROM user_profile_cache
GROUP BY subscription_tier
ORDER BY user_count DESC;

-- Enrichment job statistics
CREATE OR REPLACE VIEW v_enrichment_job_stats AS
SELECT 
    enrichment_type,
    status,
    COUNT(*) AS total_jobs,
    AVG(execution_time_ms) AS avg_execution_time_ms,
    MAX(execution_time_ms) AS max_execution_time_ms,
    MIN(execution_time_ms) AS min_execution_time_ms,
    COUNT(CASE WHEN status = 'success' THEN 1 END) AS successful_jobs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_jobs
FROM enrichment_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY enrichment_type, status
ORDER BY enrichment_type, status;

-- Enrichment performance trends (last 7 days)
CREATE OR REPLACE VIEW v_enrichment_performance_trend AS
SELECT 
    DATE_TRUNC('hour', recorded_at) AS hour,
    COUNT(*) AS metric_count,
    AVG(throughput_msgs_per_sec) AS avg_throughput,
    AVG(error_rate) AS avg_error_rate,
    AVG(geo_cache_hit_rate) AS avg_geo_cache_hit_rate,
    SUM(processed_messages) AS total_processed,
    SUM(failed_messages) AS total_failed
FROM enrichment_metrics
WHERE recorded_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', recorded_at)
ORDER BY hour DESC;

-- Business risk distribution
CREATE OR REPLACE VIEW v_business_risk_distribution AS
SELECT 
    CASE 
        WHEN risk_score < 0.2 THEN 'low'
        WHEN risk_score < 0.5 THEN 'medium'
        WHEN risk_score < 0.8 THEN 'high'
        ELSE 'critical'
    END AS risk_level,
    COUNT(*) AS transaction_count,
    AVG(risk_score) AS avg_risk_score,
    MAX(risk_score) AS max_risk_score
FROM business_context_cache
GROUP BY risk_level
ORDER BY risk_level;

-- Create Functions for automation

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_geo_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM geo_ip_cache
    WHERE cached_at + (ttl_hours || ' hours')::INTERVAL <= NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO enrichment_audit_log (event_type, enrichment_type, details)
    VALUES ('cache_cleanup', 'geo-ip', jsonb_build_object('cleaned_entries', deleted_count));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to record enrichment metric
CREATE OR REPLACE FUNCTION record_enrichment_metric(
    p_job_id UUID,
    p_service_name VARCHAR,
    p_processed INTEGER,
    p_enriched INTEGER,
    p_failed INTEGER,
    p_throughput DECIMAL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO enrichment_metrics (
        job_id, service_name, processed_messages, enriched_messages,
        failed_messages, throughput_msgs_per_sec
    ) VALUES (
        p_job_id, p_service_name, p_processed, p_enriched,
        p_failed, p_throughput
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS TABLE(
    cache_type VARCHAR,
    total_entries INTEGER,
    lookup_count BIGINT,
    avg_age_hours DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'geo-ip'::VARCHAR,
        COUNT(*)::INTEGER,
        SUM(lookup_count),
        AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - cached_at)) / 3600)::DECIMAL
    FROM geo_ip_cache
    UNION ALL
    SELECT 
        'user-profile'::VARCHAR,
        COUNT(*)::INTEGER,
        SUM(lookup_count),
        AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - cached_at)) / 3600)::DECIMAL
    FROM user_profile_cache
    UNION ALL
    SELECT 
        'business-context'::VARCHAR,
        COUNT(*)::INTEGER,
        SUM(lookup_count),
        AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - cached_at)) / 3600)::DECIMAL
    FROM business_context_cache;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-update of enrichment_audit_log
CREATE OR REPLACE FUNCTION log_enrichment_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'success' AND OLD.status != 'success' THEN
        INSERT INTO enrichment_audit_log (event_type, enrichment_type, details)
        VALUES ('enrichment_complete', NEW.enrichment_type, to_jsonb(NEW));
    ELSIF NEW.status = 'failed' THEN
        INSERT INTO enrichment_audit_log (event_type, enrichment_type, details)
        VALUES ('enrichment_failed', NEW.enrichment_type, 
                jsonb_build_object('error', NEW.error_message));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrichment_jobs_audit_trigger
AFTER UPDATE ON enrichment_jobs
FOR EACH ROW
EXECUTE FUNCTION log_enrichment_activity();

-- Scheduled maintenance tasks (PostgreSQL pg_cron extension recommended)
-- SELECT cron.schedule('clean_geo_cache', '0 */6 * * *', 'SELECT clean_expired_geo_cache()');
-- SELECT cron.schedule('clean_user_profile_cache', '0 */6 * * *', 
--     'DELETE FROM user_profile_cache WHERE cached_at + (ttl_hours || ' ' hours')::INTERVAL <= NOW()');
-- SELECT cron.schedule('clean_business_context_cache', '0 */4 * * *',
--     'DELETE FROM business_context_cache WHERE cached_at + (ttl_minutes || ' ' minutes')::INTERVAL <= NOW()');

-- Grant permissions (adjust as needed)
GRANT SELECT ON v_active_geo_cache TO stacklens_user;
GRANT SELECT ON v_user_profile_summary TO stacklens_user;
GRANT SELECT ON v_enrichment_job_stats TO stacklens_user;
GRANT SELECT ON v_enrichment_performance_trend TO stacklens_user;
GRANT SELECT ON v_business_risk_distribution TO stacklens_user;
