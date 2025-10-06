-- Migration: Add store_number and kiosk_number to error_logs table
-- This allows error logs to be associated with specific stores and kiosks

ALTER TABLE error_logs ADD COLUMN store_number TEXT;
ALTER TABLE error_logs ADD COLUMN kiosk_number TEXT;

-- Create indexes for better query performance on store/kiosk filters
CREATE INDEX IF NOT EXISTS idx_error_logs_store_number ON error_logs(store_number);
CREATE INDEX IF NOT EXISTS idx_error_logs_kiosk_number ON error_logs(kiosk_number);
CREATE INDEX IF NOT EXISTS idx_error_logs_store_kiosk ON error_logs(store_number, kiosk_number);

-- Update existing error_logs with store/kiosk info from their parent log_files
UPDATE error_logs 
SET 
  store_number = (SELECT store_number FROM log_files WHERE log_files.id = error_logs.file_id),
  kiosk_number = (SELECT kiosk_number FROM log_files WHERE log_files.id = error_logs.file_id)
WHERE file_id IS NOT NULL;
