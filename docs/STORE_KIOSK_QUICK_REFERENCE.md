# Store & Kiosk Management - Quick Reference

## Multi-Select Usage

### Selecting Items

**Individual Selection:**
- Click checkbox next to any store/kiosk row

**Select All:**
- Click checkbox in table header
- Selects/deselects all items on current tab

**Mixed Selection:**
- Use individual checkboxes for specific items
- Combine with existing selections

### Bulk Operations

**Bulk Delete:**
1. Select one or more stores/kiosks using checkboxes
2. Click "Delete Selected (X)" button (X = count)
3. Confirm deletion in dialog
4. Selected items are deleted in parallel
5. Table refreshes automatically
6. Selection is cleared

**Individual Delete:**
- Still available via trash icon in Actions column
- Works independently of multi-select

## Data Management

### Adding Data

**Add Store:**
1. Click "Add Store" button
2. Fill in required fields (Store Number*, Name*)
3. Optional: Location, Address, City, State, etc.
4. Click "Create Store"
5. Store appears in table immediately

**Add Kiosk:**
1. Click "Add Kiosk" button (requires at least one store)
2. Fill in required fields (Kiosk Number*, Name*, Store*)
3. Optional: Location, Device Type, IP Address
4. Click "Create Kiosk"
5. Kiosk appears in table immediately

### Editing Data

**Edit Store/Kiosk:**
1. Click edit icon (pencil) in Actions column
2. Modify desired fields
3. Click "Update Store" or "Update Kiosk"
4. Changes saved to database immediately

### About Data Storage

**Real vs Demo Data:**
- All data is stored in SQLite database (`data/database/stacklens.db`)
- "Demo data" you see is seeded test data, not hardcoded
- You can delete demo data and add your own
- All data persists across application restarts
- Data is queried in real-time from database

**Database Queries:**
- Stores: `SELECT * FROM stores ORDER BY storeNumber`
- Kiosks: `SELECT * FROM kiosks ORDER BY kioskNumber`
- Uses Drizzle ORM with proper TypeScript types

## Keyboard Shortcuts

No specific shortcuts implemented yet. Potential future additions:
- `Ctrl/Cmd + A` - Select all
- `Ctrl/Cmd + D` - Delete selected
- `Delete` key - Delete selected

## Tips & Tricks

1. **Efficient Deletion**: Use bulk delete to remove multiple test/demo items at once

2. **Data Organization**: Use store numbers and kiosk numbers for easy sorting and identification

3. **Status Management**: Use Active/Inactive status to temporarily disable stores/kiosks without deleting

4. **Relationship**: Kiosks are linked to stores. Deleting a store may affect associated kiosks (check foreign key constraints)

5. **Tab Switching**: Selections are cleared when switching between Stores and Kiosks tabs

## API Endpoints Used

- `GET /api/stores` - Fetch all stores
- `GET /api/stores/:id` - Fetch single store
- `POST /api/stores` - Create store (Admin only)
- `PUT /api/stores/:id` - Update store (Admin only)
- `DELETE /api/stores/:id` - Delete store (Admin only)

- `GET /api/kiosks` - Fetch all kiosks
- `GET /api/kiosks/:id` - Fetch single kiosk
- `POST /api/kiosks` - Create kiosk (Admin only)
- `PUT /api/kiosks/:id` - Update kiosk (Admin only)
- `DELETE /api/kiosks/:id` - Delete kiosk (Admin only)

## Troubleshooting

**Bulk delete not working:**
- Ensure you have admin permissions
- Check authentication token is valid
- Verify network connectivity

**"Demo data" concerns:**
- Data is real, just seeded for testing
- Delete demo entries and create your own
- Check database file: `data/database/stacklens.db`

**Selections not persisting:**
- This is intentional - selections clear after operations
- Selections clear when switching tabs

**Can't create kiosk:**
- Must create at least one store first
- Kiosks require a parent store

## Component Structure

```
AdaptiveLayout (Header + Navigation)
└── Container
    └── Tabs (Stores / Kiosks)
        ├── Stores Tab
        │   ├── Card Header
        │   │   ├── Title & Description
        │   │   └── Actions (Delete Selected + Add Store)
        │   └── Card Content
        │       └── Table
        │           ├── Header (with select-all checkbox)
        │           └── Body (rows with checkboxes)
        │
        └── Kiosks Tab
            ├── Card Header
            │   ├── Title & Description
            │   └── Actions (Delete Selected + Add Kiosk)
            └── Card Content
                └── Table
                    ├── Header (with select-all checkbox)
                    └── Body (rows with checkboxes)
```

## State Management

```tsx
// Multi-select state
selectedStores: number[]       // Array of selected store IDs
selectedKiosks: number[]       // Array of selected kiosk IDs

// Data state
stores: StoreData[]           // All stores from database
kiosks: KioskData[]           // All kiosks from database

// UI state
storeDialogOpen: boolean      // Create/Edit store dialog
kioskDialogOpen: boolean      // Create/Edit kiosk dialog
editingStore: StoreData | null
editingKiosk: KioskData | null
```

## Permissions Required

**Admin Only:**
- Create stores/kiosks
- Update stores/kiosks
- Delete stores/kiosks (individual or bulk)

**Regular Users:**
- View stores/kiosks only (read-only)

Check `requireAdmin` middleware in API routes for enforcement.
