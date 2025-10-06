# 🚀 Store/Kiosk Integration - Quick Reference

## ⚡ Quick Test Commands

```bash
# 1. Run integration tests
./test-store-kiosk-integration.sh

# 2. Start the application
npm run dev

# 3. Check database
sqlite3 db/stacklens.db "SELECT store_number, kiosk_number FROM error_logs LIMIT 5;"
```

## 📍 Where to Find Features

| Feature | Location | Status |
|---------|----------|--------|
| **Upload with Store/Kiosk** | `/upload` page | ✅ Ready |
| **Store/Kiosk Filters** | `/all-errors` page | ✅ Ready |
| **Error Table Columns** | All Errors table | ✅ Ready |
| **Filename Standard** | Automatic on upload | ✅ Ready |
| **Database Schema** | `error_logs` table | ✅ Migrated |

## 🎯 Key Files Modified

```
Backend:
├── shared/schema.ts                    # Added store/kiosk to error_logs
├── server/routes.ts                    # Upload & filter endpoints
├── server/background-processor.ts      # Error log creation
└── server/services/analysis-service.ts # Analysis with store/kiosk

Frontend:
├── client/src/pages/upload.tsx         # Store/kiosk selection
├── client/src/pages/all-errors.tsx     # Filters & display
├── client/src/pages/ai-analysis.tsx    # Interface updates
└── client/src/components/error-table.tsx # Store/kiosk columns

Database:
└── drizzle/0002_add_store_kiosk_to_error_logs.sql # Migration
```

## 🔍 Verification Steps

### 1. Check Database Schema
```sql
PRAGMA table_info(error_logs);
-- Look for: store_number, kiosk_number
```

### 2. Check Stores & Kiosks
```sql
SELECT COUNT(*) FROM stores;   -- Should be: 10
SELECT COUNT(*) FROM kiosks;   -- Should be: 23
```

### 3. Test Upload
- Open `/upload` page
- Select store: "BK-14959 - Applegreen BK Ltd"
- Select kiosk: "BK-14959-K1"
- Upload a file
- Expected filename: `Applegreen_BK_Ltd_Kiosk_1_[original]`

### 4. Test Filters
- Open `/all-errors` page
- Use **Store** dropdown
- Use **Kiosk** dropdown
- Verify error table filters correctly

## 📊 Data Available

**Stores**: 10 locations
```
BK-14959 - Applegreen BK Ltd
BK-1782  - Quikserve Enterprises Inc.
BK-10    - BKC
BK-5402  - Jan King Inc
BK-6416  - Humboldt Restaurants Inc
... and 5 more
```

**Kiosks**: 23 kiosks across stores
```
BK-14959-K1, BK-14959-K2, BK-14959-K3 (Applegreen)
BK-1782-K1, BK-1782-K2 (Quikserve)
... and 18 more
```

## 🎨 UI Components

### Upload Page
```
[Select a store ▼]  →  [Select a kiosk ▼]
         ↓                      ↓
   Loads stores         Filters kiosks by store
         ↓                      ↓
      Required                Required
```

### All Errors Page
```
Filters: [Search] [Severity] [Files] [Type] [Store ▼] [Kiosk ▼]
                                              ↓           ↓
                                         Filter by    Cascades
                                          store      from store

Table Columns: Line | Timestamp | Store | Kiosk | Severity | Type | Message
```

## 🔗 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stores` | GET | Get all stores |
| `/api/kiosks` | GET | Get all kiosks |
| `/api/files/upload` | POST | Upload with store/kiosk |
| `/api/errors?storeNumber=X` | GET | Filter errors by store |
| `/api/errors?kioskNumber=X` | GET | Filter errors by kiosk |

## 📝 Filename Format

**Standard**: `StoreName_KioskName_OriginalFilename`

**Example Transformations**:
```
error.log          → Applegreen_BK_Ltd_Kiosk_1_error.log
app-debug.txt      → BKC_Kiosk_2_app-debug.txt
system-log.json    → Jan_King_Inc_Kiosk_3_system-log.json
```

## ⚠️ Important Notes

1. **Store + Kiosk Required**: Cannot upload without both selected
2. **Cascading Selection**: Kiosks auto-filter by selected store
3. **Automatic Inheritance**: All errors inherit store/kiosk from file
4. **Filename Sanitization**: Special chars → underscores
5. **Index Optimization**: 3 indexes for fast filtering

## 🧪 Test Scenarios

- [ ] Upload file with store/kiosk → Verify filename renamed
- [ ] Check All Errors page → See store/kiosk columns
- [ ] Filter by store → See only that store's errors
- [ ] Filter by kiosk → See only that kiosk's errors
- [ ] Change store → Kiosk dropdown updates
- [ ] Export errors → CSV includes store/kiosk columns

## 📚 Documentation

- **Full Details**: `STORE_KIOSK_INTEGRATION_SUMMARY.md`
- **Test Guide**: `STORE_KIOSK_IMPLEMENTATION_COMPLETE.md`
- **Test Script**: `./test-store-kiosk-integration.sh`

---

**Status**: ✅ **READY TO USE**  
**Last Updated**: October 6, 2025
