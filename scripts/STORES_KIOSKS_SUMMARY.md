# Burger King Stores & Kiosks - Database Import Summary

## 📊 Import Status: ✅ COMPLETED

**Date:** October 6, 2025  
**Total Stores:** 10  
**Total Kiosks:** 23

---

## 🏪 Stores Added

| Store Number | Franchise Name | Brand | Kiosk Count |
|-------------|----------------|-------|-------------|
| BK-14959 | Applegreen BK Ltd | Burger King US | 3 |
| BK-1782 | Quikserve Enterprises Inc. | Burger King US | 2 |
| BK-10 | BKC | Burger King US | 4 |
| BK-5402 | Jan King Inc | Burger King US | 2 |
| BK-6416 | Humboldt Restaurants Inc | Burger King US | 2 |
| BK-30927 | Shere | Burger King US | 2 |
| BK-2598 | Carrols | Burger King US | 2 |
| BK-1015 | Vanmar Inc | Burger King US | 2 |
| BK-9801 | California Food Management LLC | Burger King US | 2 |
| BK-4188 | Carrols | Burger King US | 2 |

---

## 🖥️ Kiosks Added (by Store)

### BK-14959 - Applegreen BK Ltd
- **BK-14959-K1** - Kiosk 1
- **BK-14959-K2** - Kiosk 2
- **BK-14959-K3** - Kiosk 3

### BK-1782 - Quikserve Enterprises Inc.
- **BK-1782-K1** - Kiosk 1
- **BK-1782-K2** - Kiosk 2

### BK-10 - BKC
- **BK-10-K1** - Kiosk 1
- **BK-10-K2** - Kiosk 2
- **BK-10-K3** - Kiosk 3
- **BK-10-K4** - Kiosk 4

### BK-5402 - Jan King Inc
- **BK-5402-K1** - Kiosk 1
- **BK-5402-K2** - Kiosk 2

### BK-6416 - Humboldt Restaurants Inc
- **BK-6416-K1** - Kiosk 1
- **BK-6416-K2** - Kiosk 2

### BK-30927 - Shere
- **BK-30927-K1** - Kiosk 1
- **BK-30927-K2** - Kiosk 2

### BK-2598 - Carrols
- **BK-2598-K1** - Kiosk 1
- **BK-2598-K2** - Kiosk 2

### BK-1015 - Vanmar Inc
- **BK-1015-K1** - Kiosk 1
- **BK-1015-K2** - Kiosk 2

### BK-9801 - California Food Management LLC
- **BK-9801-K1** - Kiosk 1
- **BK-9801-K2** - Kiosk 2

### BK-4188 - Carrols
- **BK-4188-K1** - Kiosk 1
- **BK-4188-K2** - Kiosk 2

---

## 🔧 Technical Details

### Database Tables Updated
- **stores** - 10 new records
- **kiosks** - 23 new records

### Kiosk Numbering Convention
To ensure uniqueness across all kiosks, the kiosk numbers follow this pattern:
```
{StoreNumber}-{KioskNumber}
```

Example: `BK-14959-K1` = Store BK-14959, Kiosk K1

This prevents conflicts since the `kiosk_number` field has a UNIQUE constraint.

### Import Script Location
```
scripts/seed-stores-kiosks.sql
```

### How to Re-run Import
```bash
cd /Users/deepak/Downloads/Projects/StackLens-AI-Deploy
sqlite3 db/stacklens.db < scripts/seed-stores-kiosks.sql
```

---

## ✅ Verification Queries

### Check all stores
```sql
SELECT store_number, name, COUNT(k.id) as kiosk_count
FROM stores s
LEFT JOIN kiosks k ON k.store_id = s.id
WHERE store_number LIKE 'BK-%'
GROUP BY s.id
ORDER BY store_number;
```

### Check all kiosks for a specific store
```sql
SELECT k.kiosk_number, k.name, s.store_number, s.name as store_name
FROM kiosks k
JOIN stores s ON k.store_id = s.id
WHERE s.store_number = 'BK-14959';
```

### Get total counts
```sql
SELECT 
  (SELECT COUNT(*) FROM stores WHERE store_number LIKE 'BK-%') as total_stores,
  (SELECT COUNT(*) FROM kiosks WHERE kiosk_number LIKE 'BK-%') as total_kiosks;
```

---

## 📍 Access in Application

The stores and kiosks can be accessed via:

1. **Frontend UI:**
   - Navigate to: **Settings → Stores & Kiosks** (Admin only)
   - View/Edit stores in "Stores" tab
   - View/Edit kiosks in "Kiosks" tab

2. **API Endpoints:**
   - GET `/api/stores` - List all stores
   - GET `/api/kiosks` - List all kiosks
   - GET `/api/kiosks?storeId={id}` - List kiosks for specific store
   - POST `/api/stores` - Create new store (Admin)
   - POST `/api/kiosks` - Create new kiosk (Admin)

---

## 🎯 Next Steps

1. ✅ Data imported successfully
2. ✅ Stores visible in Settings → Stores & Kiosks
3. ✅ Kiosks associated with correct stores
4. 📋 You can now:
   - Upload log files and associate them with stores/kiosks
   - Filter error logs by store or kiosk
   - Generate store-specific analytics
   - Track kiosk-level error patterns

---

## 📝 Notes

- All stores and kiosks are set to **Active** status by default
- Kiosk numbers use store-prefixed format for uniqueness
- The `location` field in stores is set to "Burger King US" (the brand name)
- Additional fields (address, city, state, phone) can be added later via the UI

