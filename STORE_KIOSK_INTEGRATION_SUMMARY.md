# Store and Kiosk Integration - Implementation Summary

## Overview
This document summarizes the implementation of store and kiosk information throughout the StackLens-AI application.

## Changes Made

### 1. Database Schema Updates

#### File: `shared/schema.ts`
- **Updated `error_logs` table** to include:
  - `storeNumber: text("store_number")` - Store identifier from log file
  - `kioskNumber: text("kiosk_number")` - Kiosk identifier from log file

#### Migration: `drizzle/0002_add_store_kiosk_to_error_logs.sql`
- Added `store_number` and `kiosk_number` columns to `error_logs` table
- Created indexes for better query performance:
  - `idx_error_logs_store_number`
  - `idx_error_logs_kiosk_number`
  - `idx_error_logs_store_kiosk` (composite index)
- Updated existing error_logs with store/kiosk info from their parent log_files

**Status**: ✅ Migrated successfully

### 2. Backend API Updates

#### File: `server/routes.ts`

**Upload Endpoint (`/api/files/upload`):**
- Extracts `storeNumber` and `kioskNumber` from request body
- Fetches store and kiosk details for filename standardization
- Renames uploaded files to format: `StoreName_KioskName_OriginalFilename`
- Stores `storeNumber` and `kioskNumber` in `log_files` table

**Errors Endpoint (`/api/errors`):**
- Added query parameters:
  - `storeNumber` - Filter errors by store
  - `kioskNumber` - Filter errors by kiosk
- Updated error response to include:
  - `storeNumber`
  - `kioskNumber`
- Implemented filtering logic for store/kiosk filters

#### File: `server/background-processor.ts`
- Updated error log creation to include `storeNumber` and `kioskNumber` from parent log file
- Ensures all parsed errors inherit store/kiosk information

#### File: `server/services/analysis-service.ts`
- Updated error log creation to include `storeNumber` and `kioskNumber`
- Maintains store/kiosk association during analysis process

### 3. Frontend Updates

#### File: `client/src/pages/upload.tsx`
- **Already had** store and kiosk selection dropdowns
- Cascading selection: Kiosks filtered by selected store
- Validation: Requires both store and kiosk before upload
- Sends `storeNumber` and `kioskNumber` with upload request

**Status**: ✅ Already implemented

#### File: `client/src/pages/all-errors.tsx`
- **Updated interface** to include `storeNumber` and `kioskNumber`
- **Added filter dropdowns:**
  - Store filter dropdown
  - Kiosk filter dropdown (cascading - filtered by selected store)
- **Updated query logic:**
  - Sends `storeNumber` and `kioskNumber` to API
  - Filters errors by store/kiosk
- **Transform function** updated to include store/kiosk fields

#### File: `client/src/components/error-table.tsx`
- **Updated interface** to include `storeNumber` and `kioskNumber`
- **Added columns:**
  - Store column (displays `storeNumber`)
  - Kiosk column (displays `kioskNumber`)
- **Added prop:** `showStoreKiosk` (default: true)

#### File: `client/src/pages/ai-analysis.tsx`
- **Updated interface** to include `storeNumber`, `kioskNumber`, and `filename`
- Errors fetched from API will automatically include store/kiosk info

#### File: `client/src/pages/reports.tsx`
- Errors fetched from API will automatically include store/kiosk info
- No changes needed - reports will automatically reflect store/kiosk data

### 4. Filename Standardization

**Format**: `StoreName_KioskName_OriginalFilename`

**Implementation:**
- Store and kiosk names are sanitized (special characters replaced with `_`)
- Physical file on disk is renamed
- Database stores standardized filename
- Applied across:
  - Upload endpoint
  - File displays in UI
  - Analysis results
  - Reports

**Example:**
- Original: `error-log.txt`
- Standardized: `Burger_King_Downtown_Kiosk_1_error-log.txt`

## Testing Checklist

### Upload Flow
- [ ] Select store from dropdown
- [ ] Verify kiosks are filtered by selected store
- [ ] Upload cannot proceed without store and kiosk selection
- [ ] Upload file with store/kiosk selected
- [ ] Verify file is renamed to `StoreName_KioskName_FileName` format
- [ ] Verify store/kiosk info is saved in database

### All Errors Page
- [ ] Verify Store and Kiosk columns appear in error table
- [ ] Test Store filter dropdown
- [ ] Test Kiosk filter dropdown (should cascade from store)
- [ ] Verify filtering works correctly
- [ ] Check that store/kiosk info displays for each error

### AI Analysis Page
- [ ] Verify errors display with store/kiosk information
- [ ] Check error cards include store/kiosk details
- [ ] Verify AI suggestions reference correct store/kiosk

### Reports Page
- [ ] Verify reports include store/kiosk breakdown
- [ ] Check charts reflect store/kiosk data
- [ ] Test export includes store/kiosk columns

### Data Persistence
- [ ] Upload multiple files with different store/kiosk combinations
- [ ] Verify all error logs have correct store/kiosk associations
- [ ] Test database queries with store/kiosk filters
- [ ] Verify indexes improve query performance

## API Endpoints

### Upload File with Store/Kiosk
```http
POST /api/files/upload
Content-Type: multipart/form-data

files: <file>
storeNumber: BK-001
kioskNumber: BK-001-K1
```

### Get Errors with Store/Kiosk Filters
```http
GET /api/errors?storeNumber=BK-001&kioskNumber=BK-001-K1&page=1&limit=25
```

### Get Stores
```http
GET /api/stores
```

### Get Kiosks
```http
GET /api/kiosks
```

## Database Queries

### Get errors for specific store
```sql
SELECT * FROM error_logs 
WHERE store_number = 'BK-001'
ORDER BY created_at DESC;
```

### Get errors for specific kiosk
```sql
SELECT * FROM error_logs 
WHERE kiosk_number = 'BK-001-K1'
ORDER BY created_at DESC;
```

### Get error counts by store
```sql
SELECT store_number, COUNT(*) as error_count
FROM error_logs
WHERE store_number IS NOT NULL
GROUP BY store_number
ORDER BY error_count DESC;
```

### Get error counts by kiosk
```sql
SELECT kiosk_number, COUNT(*) as error_count
FROM error_logs
WHERE kiosk_number IS NOT NULL
GROUP BY kiosk_number
ORDER BY error_count DESC;
```

## File Structure

```
Modified Files:
├── shared/
│   └── schema.ts                           # Added store/kiosk to error_logs schema
├── drizzle/
│   └── 0002_add_store_kiosk_to_error_logs.sql  # Migration script
├── server/
│   ├── routes.ts                           # Upload & errors endpoint updates
│   ├── background-processor.ts             # Error log creation updates
│   └── services/
│       └── analysis-service.ts             # Analysis with store/kiosk
└── client/src/
    ├── pages/
    │   ├── upload.tsx                      # Already had store/kiosk selection
    │   ├── all-errors.tsx                  # Added filters & display
    │   ├── ai-analysis.tsx                 # Updated interface
    │   └── reports.tsx                     # Auto-includes data
    └── components/
        └── error-table.tsx                 # Added store/kiosk columns
```

## Migration Notes

### Automatic Migration
The migration script automatically:
1. Adds new columns to error_logs table
2. Creates performance indexes
3. Updates existing error_logs with store/kiosk from parent log_files

### Manual Verification
After migration, verify:
```sql
-- Check schema
PRAGMA table_info(error_logs);

-- Check indexes
SELECT name FROM sqlite_master 
WHERE type='index' AND tbl_name='error_logs';

-- Verify data
SELECT COUNT(*) FROM error_logs WHERE store_number IS NOT NULL;
SELECT COUNT(*) FROM error_logs WHERE kiosk_number IS NOT NULL;
```

## Performance Considerations

### Indexes Created
- `idx_error_logs_store_number` - Single column index for store filtering
- `idx_error_logs_kiosk_number` - Single column index for kiosk filtering
- `idx_error_logs_store_kiosk` - Composite index for combined filtering

### Query Optimization
- Store/kiosk filters use indexed columns
- Pagination limits result set size
- Cascading dropdowns reduce unnecessary queries

## Future Enhancements

1. **Store/Kiosk Analytics Dashboard**
   - Dedicated page showing error trends by store/kiosk
   - Heat maps of error frequency
   - Comparative analysis between stores

2. **Store/Kiosk Grouping**
   - Group stores by region/district
   - Aggregate kiosk errors by store
   - Cross-store error pattern detection

3. **Alerting by Store/Kiosk**
   - Set error thresholds per store
   - Per-kiosk anomaly detection
   - Automated notifications for specific locations

4. **Export Enhancements**
   - CSV export with store/kiosk columns
   - Store-specific error reports
   - Kiosk maintenance reports

## Compliance & Standards

### Filename Standard
**Format**: `StoreName_KioskName_OriginalFilename`
- Applied at upload time
- Stored in database
- Displayed consistently across UI
- Used in exports and reports

### Data Consistency
- Store/kiosk info propagated from log_files to error_logs
- Foreign key constraints maintained
- Cascade updates through background jobs
- Validation at upload prevents orphaned records

---

**Implementation Date**: October 6, 2025  
**Status**: ✅ Complete - Ready for Testing
