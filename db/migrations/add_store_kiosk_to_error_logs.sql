-- Migration: Add store_number and kiosk_number to error_logs table
-- Run this against data/Database/stacklens.db if needed

-- Check if columns exist first
SELECT CASE 
  WHEN COUNT(*) > 0 THEN 'Columns already exist'
  ELSE 'Need to add columns'
END as status
FROM pragma_table_info('error_logs')
WHERE name IN ('store_number', 'kiosk_number');

-- Add columns if they don't exist
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS directly, so we need to check first

-- To add the columns, run these commands if the check shows they're missing:
-- ALTER TABLE error_logs ADD COLUMN store_number TEXT;
-- ALTER TABLE error_logs ADD COLUMN kiosk_number TEXT;
