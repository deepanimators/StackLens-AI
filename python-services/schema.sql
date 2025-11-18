/**
 * StackLens OTEL Pipeline - Phase 2 Database Schema
 * 
 * This schema defines the tables for storing enriched logs and processing metadata.
 * 
 * Tables:
 * - enriched_logs: Stores parsed and enriched logs from the pipeline
 * - parser_metadata: Metadata about parser runs
 * - dlq_messages: Dead letter queue for failed processing
 * - audit_log: Audit trail for important events
 * 
 * Run with:
 *   psql -U stacklens -d stacklens -f python-services/schema.sql
 */

-- =====================================================================
-- Enriched Logs Table
-- =====================================================================

CREATE TABLE IF NOT EXISTS enriched_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- Core fields
    timestamp TIMESTAMPTZ NOT NULL,
    service VARCHAR(255) NOT NULL,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    
    -- Correlation fields
    trace_id VARCHAR(32),
    span_id VARCHAR(16),
    request_id UUID,
    
    -- Business context
    user_id VARCHAR(255),
    product_id VARCHAR(255),
    action VARCHAR(255),
    app_version VARCHAR(20),
    
    -- Error tracking
    error_code VARCHAR(50),
    status INTEGER,
    
    -- Enrichment fields
    hostname VARCHAR(255),
    environment VARCHAR(50),
    geo_country VARCHAR(2),
    geo_region VARCHAR(100),
    
    -- Metadata
    parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enriched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    parser_version VARCHAR(20),
    
    -- System fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_enriched_logs_timestamp ON enriched_logs(timestamp DESC);
CREATE INDEX idx_enriched_logs_service ON enriched_logs(service);
CREATE INDEX idx_enriched_logs_level ON enriched_logs(level);
CREATE INDEX idx_enriched_logs_trace_id ON enriched_logs(trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX idx_enriched_logs_request_id ON enriched_logs(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_enriched_logs_error_code ON enriched_logs(error_code) WHERE error_code IS NOT NULL;
CREATE INDEX idx_enriched_logs_action ON enriched_logs(action) WHERE action IS NOT NULL;
CREATE INDEX idx_enriched_logs_timestamp_service ON enriched_logs(timestamp DESC, service);

-- Create composite index for common query pattern
CREATE INDEX idx_enriched_logs_service_level_timestamp ON enriched_logs(service, level, timestamp DESC);

-- =====================================================================
-- Dead Letter Queue (DLQ) Table
-- =====================================================================

CREATE TABLE IF NOT EXISTS dlq_messages (
    id BIGSERIAL PRIMARY KEY,
    
    -- Original message
    original_message JSONB NOT NULL,
    
    -- Error information
    error_message TEXT NOT NULL,
    error_code VARCHAR(50),
    
    -- Metadata
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Status for reprocessing
    status VARCHAR(20) DEFAULT 'pending', -- pending, reprocessed, archived
    retry_count INTEGER DEFAULT 0
);

CREATE INDEX idx_dlq_messages_created_at ON dlq_messages(created_at DESC);
CREATE INDEX idx_dlq_messages_status ON dlq_messages(status);
CREATE INDEX idx_dlq_messages_error_code ON dlq_messages(error_code);

-- =====================================================================
-- Parser Metadata Table
-- =====================================================================

CREATE TABLE IF NOT EXISTS parser_metadata (
    id BIGSERIAL PRIMARY KEY,
    
    -- Run information
    run_id UUID NOT NULL UNIQUE,
    service_version VARCHAR(20) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    stopped_at TIMESTAMPTZ,
    
    -- Statistics
    total_consumed BIGINT DEFAULT 0,
    total_processed BIGINT DEFAULT 0,
    total_valid BIGINT DEFAULT 0,
    total_invalid BIGINT DEFAULT 0,
    total_enriched BIGINT DEFAULT 0,
    total_dlq BIGINT DEFAULT 0,
    
    -- Performance
    avg_processing_time_ms DECIMAL(10, 2),
    min_processing_time_ms DECIMAL(10, 2),
    max_processing_time_ms DECIMAL(10, 2),
    
    -- Status
    status VARCHAR(20) NOT NULL, -- running, stopped, failed
    error_message TEXT,
    
    -- Metadata
    hostname VARCHAR(255),
    environment VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parser_metadata_run_id ON parser_metadata(run_id);
CREATE INDEX idx_parser_metadata_created_at ON parser_metadata(created_at DESC);

-- =====================================================================
-- Audit Log Table
-- =====================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    
    -- Event information
    event_type VARCHAR(50) NOT NULL, -- schema_change, rule_update, config_change, etc.
    event_description TEXT NOT NULL,
    
    -- What changed
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    changes JSONB,
    
    -- Who/what made the change
    actor VARCHAR(255), -- service name or user
    ip_address INET,
    
    -- Status
    status VARCHAR(20) NOT NULL, -- success, error
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- =====================================================================
-- Raw Logs Table (for archival)
-- =====================================================================

CREATE TABLE IF NOT EXISTS raw_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- Raw log data
    raw_data JSONB NOT NULL,
    
    -- Parsing status
    parsing_status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
    parsing_error TEXT,
    
    -- Enriched log reference
    enriched_log_id BIGINT REFERENCES enriched_logs(id),
    
    -- Metadata
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    parsed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_logs_parsing_status ON raw_logs(parsing_status);
CREATE INDEX idx_raw_logs_enriched_log_id ON raw_logs(enriched_log_id);
CREATE INDEX idx_raw_logs_received_at ON raw_logs(received_at DESC);

-- =====================================================================
-- Partitioning for Large Tables (Optional)
-- =====================================================================

-- Partition enriched_logs by week for better performance
-- This should be set up after initial table creation

-- ALTER TABLE enriched_logs ADD COLUMN date_partition DATE GENERATED ALWAYS AS (DATE(timestamp)) STORED;
-- CREATE INDEX idx_enriched_logs_date_partition ON enriched_logs(date_partition);

-- =====================================================================
-- Views for Common Queries
-- =====================================================================

-- Logs by service
CREATE OR REPLACE VIEW v_logs_by_service AS
SELECT 
    service,
    level,
    COUNT(*) as count,
    DATE_TRUNC('minute', timestamp) as bucket
FROM enriched_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY service, level, bucket
ORDER BY bucket DESC, service, level;

-- Error logs
CREATE OR REPLACE VIEW v_error_logs AS
SELECT 
    id, timestamp, service, message, error_code, status,
    request_id, trace_id, user_id
FROM enriched_logs
WHERE level IN ('error', 'critical') AND error_code IS NOT NULL
ORDER BY timestamp DESC
LIMIT 10000;

-- DLQ summary
CREATE OR REPLACE VIEW v_dlq_summary AS
SELECT 
    error_code,
    COUNT(*) as count,
    MAX(created_at) as last_occurred
FROM dlq_messages
GROUP BY error_code
ORDER BY count DESC;

-- =====================================================================
-- Functions
-- =====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for enriched_logs
DROP TRIGGER IF EXISTS update_enriched_logs_updated_at ON enriched_logs;
CREATE TRIGGER update_enriched_logs_updated_at
BEFORE UPDATE ON enriched_logs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to get recent error count
CREATE OR REPLACE FUNCTION get_recent_error_count(minutes INT DEFAULT 5)
RETURNS TABLE(service VARCHAR, error_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        enriched_logs.service,
        COUNT(*)
    FROM enriched_logs
    WHERE level = 'error' 
        AND timestamp > NOW() - (minutes || ' minutes')::INTERVAL
    GROUP BY service
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- Cleanup Policies (Optional)
-- =====================================================================

-- Comment out retention policies if not needed
-- These can be managed at the application level instead

-- DELETE from enriched_logs WHERE timestamp < NOW() - INTERVAL '90 days';
-- DELETE from dlq_messages WHERE created_at < NOW() - INTERVAL '7 days' AND status != 'pending';
-- DELETE from audit_log WHERE created_at < NOW() - INTERVAL '365 days';

-- =====================================================================
-- Grants (if using separate roles)
-- =====================================================================

-- GRANT SELECT, INSERT, UPDATE ON enriched_logs TO stacklens_app;
-- GRANT SELECT, INSERT ON dlq_messages TO stacklens_app;
-- GRANT SELECT, INSERT ON parser_metadata TO stacklens_parser;
-- GRANT SELECT ON audit_log TO stacklens_app;

-- =====================================================================
-- Initial Data (Optional)
-- =====================================================================

-- Insert initial parser run metadata template
-- (Can be used for monitoring service health)
