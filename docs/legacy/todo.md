# 🔧 StackLens AI - Improvement & Fix Plan

**Generated:** October 6, 2025  
**Project:** StackLens-AI Platform  
**Version:** 1.0.0  
**Purpose:** Production-ready improvements based on comprehensive codebase analysis  
**Engineer:** Senior Developer Review  
**Approach:** Think → Plan → Test → Execute

---

## 🧭 CODE INTEGRITY & WORKFLOW RULES (MUST FOLLOW)

### Core Principles:
1. ✅ **Do not modify or break existing working functionality**
2. ✅ **Think before coding** - Read files carefully, verify assumptions
3. ✅ **Plan first, then execute** - Create TODO checklist, wait for confirmation
4. ✅ **Keep every change simple** - One change = one feature or file
5. ✅ **Explain each change clearly** - Like teaching a 16-year-old
6. ✅ **Maintain strong security** - No secrets in frontend or repo
7. ✅ **Before committing** - Recheck syntax, run tests, confirm no regressions
8. ✅ **Developer Mindset** - Think like shipping to millions of users

---

## 🔍 CURRENT STATE ANALYSIS

### What's Working:
- ✅ Authentication system (localStorage-based JWT tokens)
- ✅ File upload and analysis pipeline
- ✅ Database schema with proper relationships
- ✅ AI integration with Google Gemini API
- ✅ Settings endpoints exist (`/api/settings` GET/PUT)
- ✅ Theme persistence via localStorage
- ✅ Layout preferences saved to localStorage

### What's Broken/Missing:
- ❌ **Mock data in production** - Reports page uses `generateMockTrendsData()` fallback
- ❌ **mockErrorLog** - Pattern analyzer uses fake error data (line 291)
- ❌ **Settings not persisting** - `/api/settings` returns hardcoded values, doesn't save
- ❌ **No i18n support** - All text hardcoded in English
- ❌ **Security holes** - `.env` file with exposed secrets NOT in `.gitignore`
- ❌ **Missing store/kiosk fields** - Database schema lacks metadata fields
- ❌ **No user settings table** - Settings endpoint has no database backing

---

## 📋 COMPREHENSIVE FIX PLAN

## PHASE 1: CRITICAL SECURITY FIXES (Priority 1 - DO FIRST)

### Task 1.1: Fix .env Security Exposure 🔴 CRITICAL
**File:** `.env`, `.gitignore`  
**Problem:** 
- `.env` contains exposed API keys (Gemini, Firebase)
- `.gitignore` is NOT properly configured to ignore `.env`
- Production IP address exposed: `13.235.73.106`

**Current `.gitignore`:**
```ignore
# Ignore build output
dist/

# Ignore node_modules
node_modules/
package-lock.json

# db files
*.sqlite
*.db
db/
```

**Missing:** `.env` is NOT in `.gitignore`

**Fix Plan:**
- [x] **Already committed** - User already pushed .env (need to rotate keys)
- [ ] Add `.env` to `.gitignore` immediately
- [ ] Create `.env.example` template without real values
- [ ] Rotate ALL exposed API keys:
  - [ ] Generate new Gemini API key
  - [ ] Rotate Firebase project credentials
  - [ ] Update production server with new keys
- [ ] Remove `.env` from git history using `git filter-branch` or BFG Repo-Cleaner
- [ ] Add pre-commit hook to prevent future .env commits

**Test Commands:**
```bash
# Verify .env is ignored
git status  # Should NOT show .env

# Test app with new keys
npm run dev
# Login and verify Firebase auth works
# Upload file and verify Gemini AI works
```

**Files to Change:**
```
.gitignore          # Add .env
.env.example        # Create new (no secrets)
```

---

### Task 1.2: Fix mockErrorLog in Pattern Analyzer 🔴 CRITICAL
**File:** `server/error-pattern-analyzer.ts:291`  
**Problem:** Using mock object instead of real database error for AI analysis

**Current Code (Line 280-310):**
```typescript
private async getAIAnalysis(
  errorType: string,
  messages: string[]
): Promise<{ description: string; solution: string }> {
  try {
    // Create a mock error log for AI analysis  ← 🔴 PROBLEM HERE
    const mockErrorLog = {
      id: 0,
      timestamp: new Date(),
      createdAt: new Date(),
      fileId: 0,
      lineNumber: 1,
      severity: this.determineSeverity(errorType, messages),
      errorType: errorType,
      message: messages[0],
      fullText: messages[0],
      pattern: null,
      resolved: false,
      aiSuggestion: null,
      mlPrediction: null,
      mlConfidence: null,
    };

    const response = await this.aiService.generateErrorSuggestion(
      mockErrorLog  ← 🔴 PASSING MOCK DATA
    );
```

**Root Cause Analysis:**
- Method signature doesn't receive `fileId` or actual error log ID
- No way to fetch real error from database
- AI gets placeholder data instead of actual error context

**Fix Strategy:**
1. Add `fileId` parameter to `getAIAnalysis()` method
2. Fetch real error logs from database using `fileId` and `errorType`
3. Use first matching error log for AI analysis (or aggregate context)
4. Add error handling if no real errors found

**Fixed Code:**
```typescript
private async getAIAnalysis(
  errorType: string,
  messages: string[],
  fileId: number  // ← NEW PARAMETER
): Promise<{ description: string; solution: string }> {
  try {
    // Fetch real error log from database
    const realErrors = await this.storage.getErrorLogsByFileId(fileId);
    
    // Find errors matching this type
    const matchingErrors = realErrors.filter(
      (err) => err.errorType === errorType
    );
    
    // Use first matching error, or create minimal context if none found
    const errorLog = matchingErrors.length > 0
      ? matchingErrors[0]
      : {
          // Fallback only if absolutely no errors exist
          id: 0,
          timestamp: new Date(),
          createdAt: new Date(),
          fileId: fileId,
          lineNumber: 1,
          severity: this.determineSeverity(errorType, messages),
          errorType: errorType,
          message: messages[0],
          fullText: messages[0],
          pattern: null,
          resolved: false,
          aiSuggestion: null,
          mlPrediction: null,
          mlConfidence: null,
        };

    console.log(`🧠 AI Analysis using ${matchingErrors.length > 0 ? 'REAL' : 'FALLBACK'} error data for ${errorType}`);

    const response = await this.aiService.generateErrorSuggestion(errorLog);
```

**Caller Update Required:**
Find where `getAIAnalysis()` is called and pass `fileId`:
```typescript
// Before:
const aiResult = await this.getAIAnalysis(errorType, messages);

// After:
const aiResult = await this.getAIAnalysis(errorType, messages, fileId);
```

**Checklist:**
- [ ] Add `fileId` parameter to `getAIAnalysis()` signature
- [ ] Fetch real error logs from database
- [ ] Filter errors by errorType
- [ ] Use real error for AI analysis
- [ ] Keep fallback only for edge case (no errors)
- [ ] Update all callers to pass `fileId`
- [ ] Add logging to confirm real vs fallback data usage
- [ ] Test with real uploaded log file

**Test Plan:**
```bash
# Test Steps:
1. Upload a real log file with errors
2. Wait for analysis to complete
3. Check server logs for "🧠 AI Analysis using REAL error data"
4. Verify AI suggestions are contextually accurate
5. Check pattern detection uses real error messages
```

---

## PHASE 2: FIX MOCK DATA ISSUES (Priority 1)

### Task 2.1: Fix Reports Page Mock Data Fallback
**File:** `client/src/pages/reports.tsx:195-370`  
**Problem:** Falls back to `generateMockTrendsData()` when API fails or returns empty data

**Current Behavior (Line 231-348):**
```typescript
} catch (error) {
  console.error(
    "❌ Failed to fetch real report data, falling back to mock:",
    error
  );
  // Fallback to basic mock data if API fails  ← 🔴 PROBLEM
}

// Later...
if (!dashboardResponse?.recentErrors || dashboardResponse.recentErrors.length === 0) {
  // API call failed (auth error, server error, etc.) - use mock data
  console.log("🚨 API call failed, using mock data:", error);
  setTrendsData(generateMockTrendsData(selectedTimeframe));  ← 🔴 MOCK DATA
}
```

**Root Cause:**
1. API might be returning 200 but with empty/null data
2. Error handling is too aggressive (treats empty as failure)
3. Mock data generator creates fake trends instead of showing "No data"

**Fix Strategy:**
1. Distinguish between **API error** vs **No data available**
2. Show proper "No data" state instead of mock data
3. Improve error messages for debugging
4. Only use mock in development mode (never production)

**Fixed Code:**
```typescript
} catch (error) {
  console.error("❌ Failed to fetch real report data:", error);
  
  // In production, show error state - NO MOCK DATA
  if (import.meta.env.PROD) {
    toast({
      title: "Error Loading Report Data",
      description: "Unable to fetch report data. Please try again.",
      variant: "destructive",
    });
    setReportData(null);  // Triggers "No data" UI
    return;
  }
  
  // In development, we can use mock for testing UI only
  console.warn("⚠️ DEV MODE: Using mock data for UI testing only");
  setReportData(generateMockReportData());
}

// Check for empty data
if (!dashboardResponse?.recentErrors || dashboardResponse.recentErrors.length === 0) {
  console.log("ℹ️ No errors found in selected timeframe");
  setTrendsData([]);  // Empty array shows "No data available" UI
  return;  // Don't generate mock
}
```

**Checklist:**
- [ ] Remove mock data fallback in production
- [ ] Add proper "No data" UI state
- [ ] Distinguish API errors from empty results
- [ ] Add environment check (`import.meta.env.PROD`)
- [ ] Improve error logging for debugging
- [ ] Test with empty database (new user)
- [ ] Test with API errors (server down)
- [ ] Test with real data

**Test Commands:**
```bash
# Test 1: Empty database (new user)
# Expected: "No data available" message, NOT mock charts

# Test 2: Real data
# Expected: Real charts with actual numbers

# Test 3: API error (stop server)
npm run dev  # Start client only
# Expected: Error toast, no mock data in production
```

---

### Task 2.2: Remove All Mock Data References
**Files:** Multiple files with mock/demo/test data  
**Problem:** Mock data scattered across codebase

**Search Results:**
```
client/src/pages/reports.tsx - generateMockTrendsData()
client/src/pages/settings.tsx - Mock API call comments
client/src/pages/settings-backup.tsx - Mock API test
client/src/pages/settings-clean.tsx - Mock API call
client/src/lib/firebase.ts - demo-api-key, demo-project checks
```

**Fix Plan:**
- [ ] Audit all files with "mock", "demo", "test" keywords
- [ ] Remove or comment out mock data generators
- [ ] Replace with proper loading/empty states
- [ ] Keep mock data only for Storybook/unit tests (separate files)

**Checklist:**
- [ ] Search: `grep -r "mock\|demo\|simulation" client/src/`
- [ ] Review each occurrence
- [ ] Remove production mock data
- [ ] Add "No data" UI components
- [ ] Keep dev-only mocks behind `import.meta.env.DEV` checks

---

## PHASE 3: FIX SETTINGS PERSISTENCE (Priority 2)

### Task 3.1: Create User Settings Database Table
**File:** `shared/schema.ts`  
**Problem:** `/api/settings` endpoint returns hardcoded values, no database table exists

**Current Schema:** Has `apiSettings` table but no `userSettings` table  
**Current API:** Returns hardcoded JSON (line 2930-2969 in `server/routes.ts`)

**Missing Table:**
```typescript
// Add to shared/schema.ts
export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  
  // UI Preferences
  theme: text("theme").default("light"), // light, dark, system
  language: text("language").default("en"), // en, es, fr, hi, etc.
  
  // Layout Settings
  sidebarCollapsed: integer("sidebar_collapsed", { mode: "boolean" }).default(false),
  topNavStyle: text("top_nav_style").default("fixed"),
  sideNavPosition: text("side_nav_position").default("left"),
  
  // Notification Preferences
  emailNotifications: integer("email_notifications", { mode: "boolean" }).default(true),
  criticalAlerts: integer("critical_alerts", { mode: "boolean" }).default(true),
  weeklyReports: integer("weekly_reports", { mode: "boolean" }).default(false),
  analysisComplete: integer("analysis_complete", { mode: "boolean" }).default(true),
  alertThreshold: text("alert_threshold").default("critical"),
  
  // Feature Preferences
  enableRealTimeUpdates: integer("enable_real_time_updates", { mode: "boolean" }).default(true),
  autoRefresh: integer("auto_refresh", { mode: "boolean" }).default(true),
  refreshInterval: integer("refresh_interval").default(30), // seconds
  defaultPageSize: integer("default_page_size").default(20),
  
  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
});

// Zod schema for validation
export const insertUserSettingsSchema = createInsertSchema(userSettings);
export const selectUserSettingsSchema = z.object({
  id: z.number(),
  userId: z.number(),
  theme: z.enum(["light", "dark", "system"]),
  language: z.string(),
  // ... rest of fields
});
```

**Migration Script:**
Create `drizzle/migrations/0001_add_user_settings.sql`:
```sql
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id" integer NOT NULL REFERENCES users(id),
  "theme" text DEFAULT 'light',
  "language" text DEFAULT 'en',
  "sidebar_collapsed" integer DEFAULT 0,
  "top_nav_style" text DEFAULT 'fixed',
  "side_nav_position" text DEFAULT 'left',
  "email_notifications" integer DEFAULT 1,
  "critical_alerts" integer DEFAULT 1,
  "weekly_reports" integer DEFAULT 0,
  "analysis_complete" integer DEFAULT 1,
  "alert_threshold" text DEFAULT 'critical',
  "enable_real_time_updates" integer DEFAULT 1,
  "auto_refresh" integer DEFAULT 1,
  "refresh_interval" integer DEFAULT 30,
  "default_page_size" integer DEFAULT 20,
  "created_at" integer DEFAULT (unixepoch() * 1000),
  "updated_at" integer DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX "user_settings_user_id_unique" ON "user_settings" ("user_id");
```

**Checklist:**
- [ ] Add `userSettings` table to `shared/schema.ts`
- [ ] Create Zod validation schemas
- [ ] Create migration SQL file
- [ ] Run migration: `npm run db:generate && npm run db:migrate`
- [ ] Update `server/database-storage.ts` with CRUD methods:
  - [ ] `getUserSettings(userId)`
  - [ ] `createUserSettings(userId, settings)`
  - [ ] `updateUserSettings(userId, settings)`

---

### Task 3.2: Update Settings API to Use Database
**File:** `server/routes.ts:2930-2985`  
**Problem:** API returns hardcoded JSON, doesn't read/write database

**Current Code:**
```typescript
app.get("/api/settings", async (req, res) => {
  try {
    // Return default UI settings  ← 🔴 HARDCODED
    res.json({
      theme: "light",
      layout: { showTopNav: true, ... },
      // ... all hardcoded
    });
```

**Fixed Code:**
```typescript
app.get("/api/settings", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    // Fetch user settings from database
    let settings = await storage.getUserSettings(userId);
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await storage.createUserSettings(userId, {
        theme: "light",
        language: "en",
        sidebarCollapsed: false,
        // ... defaults
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

app.put("/api/settings", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const newSettings = req.body;
    
    // Validate settings
    const validated = insertUserSettingsSchema.parse(newSettings);
    
    // Update in database
    const updated = await storage.updateUserSettings(userId, validated);
    
    res.json({
      message: "Settings updated successfully",
      settings: updated,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
});
```

**Checklist:**
- [ ] Update GET `/api/settings` to read from database
- [ ] Update PUT `/api/settings` to write to database
- [ ] Add `requireAuth` middleware
- [ ] Add validation with Zod schema
- [ ] Handle first-time users (create defaults)
- [ ] Update `updatedAt` timestamp on changes
- [ ] Test settings persistence across sessions

**Test Plan:**
```bash
# 1. Login as user
# 2. Change theme to "dark"
# 3. Logout
# 4. Login again
# 5. Verify theme is still "dark" (persisted)

# API Test:
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/settings
# Should return user's saved settings from database
```

---

## PHASE 4: MULTI-LANGUAGE SUPPORT (Priority 3)

### Task 4.1: Install i18n Framework
**File:** `package.json`  
**Problem:** No internationalization library installed

**Current State:** No i18n detected in codebase  
**Required:** Add `react-i18next` for React internationalization

**Installation:**
```bash
npm install react-i18next i18next i18next-browser-languagedetector
npm install --save-dev @types/react-i18next
```

**Checklist:**
- [ ] Install `react-i18next`
- [ ] Install `i18next`
- [ ] Install `i18next-browser-languagedetector` (auto-detect user language)
- [ ] Add TypeScript types

---

### Task 4.2: Setup i18n Configuration
**File:** `client/src/lib/i18n.ts` (NEW FILE)  
**Problem:** No i18n configuration exists

**Create i18n Config:**
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '@/locales/en.json';
import esTranslations from '@/locales/es.json';
import frTranslations from '@/locales/fr.json';
import hiTranslations from '@/locales/hi.json';

i18n
  .use(LanguageDetector) // Auto-detect user language
  .use(initReactI18next) // Pass i18n to React
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
      fr: { translation: frTranslations },
      hi: { translation: hiTranslations },
    },
    fallbackLng: 'en', // Default language
    debug: import.meta.env.DEV, // Enable debug in development
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
```

**Checklist:**
- [ ] Create `client/src/lib/i18n.ts`
- [ ] Configure supported languages
- [ ] Set up language detector
- [ ] Add debug mode for development

---

### Task 4.3: Create Translation Files
**Files:** `client/src/locales/*.json` (NEW FILES)  
**Problem:** No translation files exist

**Directory Structure:**
```
client/src/locales/
  ├── en.json     # English (default)
  ├── es.json     # Spanish
  ├── fr.json     # French
  ├── hi.json     # Hindi
  └── ... (add more as needed)
```

**Sample Translation File (`client/src/locales/en.json`):**
```json
{
  "common": {
    "appName": "StackLens AI",
    "login": "Login",
    "logout": "Logout",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "upload": "Upload",
    "download": "Download",
    "search": "Search",
    "filter": "Filter",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "dashboard": {
    "title": "Dashboard",
    "totalFiles": "Total Files",
    "totalErrors": "Total Errors",
    "criticalErrors": "Critical Errors",
    "recentActivity": "Recent Activity"
  },
  "upload": {
    "title": "Upload Files",
    "subtitle": "Upload log files for AI-powered analysis",
    "dragDrop": "Drag and drop files here, or click to select",
    "uploadSuccess": "File uploaded successfully",
    "uploadError": "Failed to upload file"
  },
  "settings": {
    "title": "Settings",
    "profile": "Profile",
    "notifications": "Notifications",
    "theme": "Theme",
    "language": "Language",
    "save": "Save Settings",
    "saveSuccess": "Settings saved successfully"
  },
  "errors": {
    "unauthorized": "Unauthorized access",
    "notFound": "Page not found",
    "serverError": "Server error occurred",
    "networkError": "Network connection error"
  }
}
```

**Checklist:**
- [ ] Create `client/src/locales/` directory
- [ ] Create `en.json` with all UI text
- [ ] Extract all hardcoded strings from components
- [ ] Translate to Spanish (`es.json`)
- [ ] Translate to Hindi (`hi.json`)
- [ ] Translate to French (`fr.json`)
- [ ] Add more languages as needed

---

### Task 4.4: Update Components to Use Translations
**Files:** All component files (`.tsx`)  
**Problem:** All UI text is hardcoded in English

**Example Update:**

**Before (`client/src/pages/dashboard.tsx`):**
```typescript
<h1>Dashboard</h1>
<p>Total Files: {totalFiles}</p>
<Button>Upload</Button>
```

**After:**
```typescript
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  
  return (
    <>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.totalFiles')}: {totalFiles}</p>
      <Button>{t('common.upload')}</Button>
    </>
  );
}
```

**Checklist:**
- [ ] Import `useTranslation` hook in all components
- [ ] Replace hardcoded text with `t('key.path')`
- [ ] Update all page components:
  - [ ] `dashboard.tsx`
  - [ ] `upload.tsx`
  - [ ] `settings.tsx`
  - [ ] `reports.tsx`
  - [ ] `login.tsx`
  - [ ] etc.
- [ ] Update all common components:
  - [ ] Navigation
  - [ ] Buttons
  - [ ] Forms
  - [ ] Toasts/Alerts

---

### Task 4.5: Add Language Selector to Settings
**File:** `client/src/pages/settings.tsx`  
**Problem:** No UI to change language

**Add Language Selector:**
```typescript
import { useTranslation } from 'react-i18next';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    // Also save to user settings in database
    updateUserSettings({ language: lang });
  };
  
  return (
    <Select value={i18n.language} onValueChange={changeLanguage}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="es">Español</SelectItem>
        <SelectItem value="fr">Français</SelectItem>
        <SelectItem value="hi">हिन्दी</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

**Checklist:**
- [ ] Add language dropdown to Settings page
- [ ] Load saved language from user settings
- [ ] Update language in real-time when changed
- [ ] Persist language preference to database
- [ ] Test language switching across all pages

---

## PHASE 5: STORE & KIOSK METADATA (Priority 2)

### Task 5.1: Update Database Schema for Store/Kiosk
**File:** `shared/schema.ts`  
**Problem:** `logFiles` table missing store/kiosk fields

**Add Fields to logFiles Table:**
```typescript
export const logFiles = sqliteTable("log_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  
  // 🆕 NEW FIELDS
  storeNumber: text("store_number"),  // e.g., "ST001", "STORE-42"
  kioskNumber: text("kiosk_number"),  // e.g., "KIOSK-001", "K42"
  
  fileType: text("file_type").notNull(),
  // ... rest of existing fields
});
```

**Migration Script (`drizzle/migrations/0002_add_store_kiosk.sql`):**
```sql
-- Add store and kiosk columns to log_files table
ALTER TABLE log_files ADD COLUMN store_number TEXT;
ALTER TABLE log_files ADD COLUMN kiosk_number TEXT;

-- Create indexes for faster searching
CREATE INDEX idx_log_files_store_number ON log_files(store_number);
CREATE INDEX idx_log_files_kiosk_number ON log_files(kiosk_number);
```

**Checklist:**
- [ ] Add `storeNumber` field to schema
- [ ] Add `kioskNumber` field to schema
- [ ] Create migration SQL
- [ ] Run migration
- [ ] Update TypeScript types
- [ ] Update Zod validation schema

---

### Task 5.2: Create Store/Kiosk Management Tables
**File:** `shared/schema.ts`  
**Problem:** No tables to manage store and kiosk master data

**New Tables:**
```typescript
export const stores = sqliteTable("stores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storeNumber: text("store_number").notNull().unique(),
  storeName: text("store_name").notNull(),
  location: text("location"),
  region: text("region"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
});

export const kiosks = sqliteTable("kiosks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kioskNumber: text("kiosk_number").notNull().unique(),
  kioskName: text("kiosk_name").notNull(),
  storeId: integer("store_id").references(() => stores.id),
  location: text("location"),
  ipAddress: text("ip_address"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
});
```

**Checklist:**
- [ ] Create `stores` table
- [ ] Create `kiosks` table with foreign key to stores
- [ ] Add validation schemas
- [ ] Create migration
- [ ] Add CRUD endpoints in routes.ts:
  - [ ] GET `/api/stores` - List all stores
  - [ ] POST `/api/stores` - Create store
  - [ ] PUT `/api/stores/:id` - Update store
  - [ ] DELETE `/api/stores/:id` - Delete store
  - [ ] GET `/api/kiosks` - List all kiosks
  - [ ] GET `/api/kiosks?storeId=X` - Filter by store
  - [ ] POST `/api/kiosks` - Create kiosk
  - [ ] PUT `/api/kiosks/:id` - Update kiosk

---

### Task 5.3: Create Store/Kiosk Management Page
**File:** `client/src/pages/store-kiosk-management.tsx` (NEW)  
**Problem:** No UI to manage stores and kiosks

**Page Features:**
- View all stores in table
- Add new store (modal/form)
- Edit store details
- View kiosks per store
- Add/edit kiosks
- Assign kiosks to stores

**Component Structure:**
```typescript
export default function StoreKioskManagement() {
  const [stores, setStores] = useState([]);
  const [kiosks, setKiosks] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  
  // Fetch stores and kiosks from API
  // Display in tables with actions (edit, delete)
  // Add forms for creating new entries
}
```

**Checklist:**
- [ ] Create management page component
- [ ] Add to navigation menu (admin only)
- [ ] Build stores table view
- [ ] Build kiosks table view
- [ ] Add create/edit/delete functionality
- [ ] Add search and filtering
- [ ] Implement role-based access (admin only)

---

### Task 5.4: Update Upload UI with Store/Kiosk Dropdowns
**File:** `client/src/pages/upload.tsx`  
**Problem:** No fields to capture store/kiosk metadata during upload

**Add Dropdowns Before File Upload:**
```typescript
export default function UploadPage() {
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedKiosk, setSelectedKiosk] = useState("");
  const [stores, setStores] = useState([]);
  const [kiosks, setKiosks] = useState([]);
  
  // Fetch stores on mount
  useEffect(() => {
    fetch('/api/stores').then(r => r.json()).then(setStores);
  }, []);
  
  // Fetch kiosks when store selected
  useEffect(() => {
    if (selectedStore) {
      fetch(`/api/kiosks?storeId=${selectedStore}`)
        .then(r => r.json())
        .then(setKiosks);
    }
  }, [selectedStore]);
  
  const uploadFile = () => {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("storeNumber", selectedStore);
    formData.append("kioskNumber", selectedKiosk);
    
    // Upload with metadata
    authenticatedRequest("POST", "/api/files/upload", formData);
  };
  
  return (
    <>
      {/* Store Dropdown */}
      <Select value={selectedStore} onValueChange={setSelectedStore}>
        <SelectTrigger>
          <SelectValue placeholder="Select Store" />
        </SelectTrigger>
        <SelectContent>
          {stores.map(store => (
            <SelectItem key={store.id} value={store.storeNumber}>
              {store.storeName} ({store.storeNumber})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Kiosk Dropdown (filtered by store) */}
      <Select value={selectedKiosk} onValueChange={setSelectedKiosk} disabled={!selectedStore}>
        <SelectTrigger>
          <SelectValue placeholder="Select Kiosk" />
        </SelectTrigger>
        <SelectContent>
          {kiosks.map(kiosk => (
            <SelectItem key={kiosk.id} value={kiosk.kioskNumber}>
              {kiosk.kioskName} ({kiosk.kioskNumber})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Rest of upload UI */}
    </>
  );
}
```

**Checklist:**
- [ ] Add store dropdown to upload page
- [ ] Add kiosk dropdown (filtered by selected store)
- [ ] Make kiosk dropdown dependent on store selection
- [ ] Validate both fields selected before upload
- [ ] Include metadata in FormData
- [ ] Update server upload handler to save store/kiosk
- [ ] Display store/kiosk in file lists

---

## PHASE 6: DATA PERSISTENCE & DEV MODE FIXES (Priority 2)

### Task 6.1: Investigate Dev Mode Data Not Storing
**Problem:** "Data not storing in dev mode"  
**Possible Causes:**
1. CORS issues blocking API calls
2. API endpoints not saving to database
3. Authentication token issues
4. Database locked/permissions

**Investigation Checklist:**
- [ ] Check browser console for CORS errors
- [ ] Verify API responses return 200 (not 500/401)
- [ ] Check server logs for database errors
- [ ] Verify `db/stacklens.db` file exists and is writable
- [ ] Test with simple curl command:
  ```bash
  curl -X POST http://localhost:4000/api/files/upload \
    -H "Authorization: Bearer <token>" \
    -F "files=@test.log"
  ```
- [ ] Check if data appears in database:
  ```bash
  sqlite3 db/stacklens.db "SELECT * FROM log_files LIMIT 5;"
  ```

**Common Fixes:**
- [ ] Ensure database file has write permissions: `chmod 666 db/stacklens.db`
- [ ] Check CORS configuration allows `localhost:5173`
- [ ] Verify `DATABASE_URL` in `.env` points to correct file
- [ ] Add more logging to API endpoints

---

### Task 6.2: Add Better Error Logging
**Files:** `server/routes.ts`, `server/database-storage.ts`  
**Problem:** Insufficient error logging makes debugging hard

**Add Structured Logging:**
```typescript
// In every API endpoint
app.post("/api/files/upload", requireAuth, async (req, res) => {
  console.log(`📤 [UPLOAD] User ${req.user.id} uploading files`);
  
  try {
    // ... upload logic
    console.log(`✅ [UPLOAD] Success: ${files.length} files uploaded`);
    res.json({ success: true, files });
  } catch (error) {
    console.error(`❌ [UPLOAD] Error:`, error);
    console.error(`❌ [UPLOAD] Stack:`, error.stack);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});
```

**Checklist:**
- [ ] Add emoji-prefixed logs for visibility
- [ ] Log user ID for all authenticated requests
- [ ] Log request body (sanitized, no passwords)
- [ ] Log database queries in development
- [ ] Add stack traces for errors
- [ ] Create log levels (DEBUG, INFO, ERROR)

---

## PHASE 7: SECURITY HARDENING (Priority 1)

### Task 7.1: Environment Variables Best Practices
**Files:** `.env`, `.env.example`, server config  
**Problem:** Secrets exposed, no rotation strategy

**Create .env.example Template:**
```properties
# Server Configuration
SERVER_IP=localhost
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=./db/stacklens.db

# AI/ML Services (Get from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# Client API URL
VITE_API_URL=http://localhost:4000

# Firebase Auth (Get from Firebase Console)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Update .gitignore:**
```ignore
# Ignore build output
dist/

# Ignore node_modules
node_modules/
package-lock.json

# Environment files
.env
.env.local
.env.*.local

# Database files
*.sqlite
*.db
db/

# Logs
*.log
server.log
test-ml.log
```

**Checklist:**
- [ ] Create `.env.example` without secrets
- [ ] Update `.gitignore` to ignore `.env*` files
- [ ] Remove `.env` from git history:
  ```bash
  git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch .env" \
    --prune-empty --tag-name-filter cat -- --all
  
  git push origin --force --all
  ```
- [ ] Rotate all API keys in production
- [ ] Add secrets validation on server startup
- [ ] Document key rotation process

---

### Task 7.2: Add Rate Limiting
**File:** `server/index.ts`  
**Problem:** No rate limiting, vulnerable to abuse

**Install Dependencies:**
```bash
npm install express-rate-limit
```

**Add Rate Limiter:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Apply to all routes
app.use('/api/', limiter);

// Stricter limits for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

**Checklist:**
- [ ] Install `express-rate-limit`
- [ ] Add general rate limiter (100 req/15min)
- [ ] Add strict auth rate limiter (5 req/15min)
- [ ] Test rate limiting works
- [ ] Add rate limit headers to responses

---

## 📝 FINAL REVIEW CHECKLIST

### Before Committing:
- [ ] Run TypeScript check: `npm run check`
- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm test` (when tests exist)
- [ ] Test in browser:
  - [ ] Login/logout works
  - [ ] Upload file works
  - [ ] Settings save and persist
  - [ ] Language switching works (when implemented)
  - [ ] Store/kiosk selection works (when implemented)
- [ ] Check server logs for errors
- [ ] Verify database changes applied
- [ ] Confirm no `.env` in git: `git status`

### Security Verification:
- [ ] No API keys in code
- [ ] `.env` in `.gitignore`
- [ ] Production secrets rotated
- [ ] Rate limiting enabled
- [ ] Auth middleware on all protected routes

### Performance Check:
- [ ] No N+1 queries
- [ ] Database indexes added for store/kiosk
- [ ] API responses cached where appropriate
- [ ] File uploads limited to reasonable size

---

## 🎯 IMPLEMENTATION ORDER (RECOMMENDED)

### Week 1: Critical Fixes
1. ✅ Day 1: Fix `.env` security (Task 1.1)
2. ✅ Day 2: Fix mockErrorLog (Task 1.2)
3. ✅ Day 3: Fix reports mock data (Task 2.1)
4. ✅ Day 4: Create user settings table (Task 3.1)
5. ✅ Day 5: Update settings API (Task 3.2)

### Week 2: Features
6. ✅ Day 1-2: Install and configure i18n (Tasks 4.1-4.2)
7. ✅ Day 3-4: Create translation files and update components (Tasks 4.3-4.4)
8. ✅ Day 5: Add language selector (Task 4.5)

### Week 3: Store/Kiosk System
9. ✅ Day 1: Database schema updates (Tasks 5.1-5.2)
10. ✅ Day 2-3: Create management page (Task 5.3)
11. ✅ Day 4-5: Update upload UI (Task 5.4)

### Week 4: Polish & Security
12. ✅ Day 1-2: Investigate dev mode issues (Tasks 6.1-6.2)
13. ✅ Day 3-4: Security hardening (Tasks 7.1-7.2)
14. ✅ Day 5: Final testing and documentation

---

## ❓ QUESTIONS TO CLARIFY

### Business Logic:
1. **Store/Kiosk Format:** What format for store/kiosk numbers? (e.g., "ST001", "STORE-42", numeric only?)
2. **Permissions:** Who can create/edit stores and kiosks? (Admin only? Or store managers?)
3. **Required Fields:** Are store/kiosk required for all uploads or optional?
4. **Languages Priority:** Which languages should we support first? (en, es, fr, hi, others?)

### Technical:
5. **Database Migration:** Safe to run migrations on production database?
6. **API Keys:** Who has access to rotate production API keys?
7. **Testing:** Do we have a staging environment or test directly in production?
8. **Deployment:** How are changes deployed? (Manual, CI/CD, Docker?)

### Data:
9. **Store Data Source:** Where does Sharon's store/kiosk mapping data come from? (CSV, API, manual entry?)
10. **Existing Logs:** Do we need to backfill store/kiosk data for existing uploaded files?

---

## 📊 SUCCESS METRICS

### How to Verify Each Fix:

**Task 1.1 (Security):**
- ✅ `.env` not in `git status`
- ✅ New API keys working
- ✅ No secrets in public files

**Task 1.2 (mockErrorLog):**
- ✅ Server logs show "🧠 AI Analysis using REAL error data"
- ✅ AI suggestions contextually accurate
- ✅ No "mock" or "fallback" in production logs

**Task 2.1 (Reports Mock Data):**
- ✅ Reports show real data or "No data" message
- ✅ No mock charts in production
- ✅ API errors show proper error toast

**Task 3.1-3.2 (Settings):**
- ✅ Settings save to database (check SQLite)
- ✅ Settings persist after logout/login
- ✅ Each user has own settings

**Task 4.1-4.5 (i18n):**
- ✅ Language selector appears in settings
- ✅ Changing language updates all UI text
- ✅ Language preference saved across sessions

**Task 5.1-5.4 (Store/Kiosk):**
- ✅ Can create stores and kiosks in management page
- ✅ Upload page shows dropdowns
- ✅ Uploaded files have store/kiosk metadata
- ✅ Can filter logs by store/kiosk

---

## 📚 TESTING GUIDE

### Manual Testing Steps:

**Full User Journey:**
```
1. Register new account
2. Login
3. Create store "ST001"
4. Create kiosk "K42" under ST001
5. Upload log file with ST001/K42 selected
6. View dashboard (real data, no mocks)
7. Change language to Spanish
8. Change theme to dark
9. Logout
10. Login again
11. Verify: Spanish language persists
12. Verify: Dark theme persists
13. View uploaded file shows ST001/K42
14. Export report (PDF/CSV)
15. Verify real data in export, no mocks
```

**API Testing:**
```bash
# Test settings persistence
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/settings

# Test store creation
curl -X POST http://localhost:4000/api/stores \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"storeNumber": "ST001", "storeName": "Main Store"}'

# Test kiosk creation
curl -X POST http://localhost:4000/api/kiosks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"kioskNumber": "K42", "kioskName": "Kiosk 42", "storeId": 1}'

# Test file upload with metadata
curl -X POST http://localhost:4000/api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "files=@test.log" \
  -F "storeNumber=ST001" \
  -F "kioskNumber=K42"
```

---

## 🔄 ROLLBACK PLAN

If anything breaks:

1. **Database Issues:**
   ```bash
   # Restore from backup
   cp db/stacklens.db.backup db/stacklens.db
   
   # Or rollback migrations
   npm run db:rollback
   ```

2. **Code Issues:**
   ```bash
   # Revert to last working commit
   git revert HEAD
   git push
   ```

3. **Environment Issues:**
   ```bash
   # Restore old .env from secure backup
   # Restart server
   npm run dev
   ```

---

**END OF COMPREHENSIVE IMPROVEMENT & FIX PLAN**

*This document serves as the complete implementation guide. Each task is designed to be simple, reversible, and thoroughly tested before moving to the next.*

*Follow the order, test each change, and update this document with progress.*

### 6. Performance Optimization - Target: 30-60s Analysis
- [ ] **Current:** 3-5 minutes analysis time
- [ ] **Target:** 30-60 seconds
- [ ] **Optimization Strategies:**
  - [ ] Implement parallel error processing
  - [ ] Add database indexing on common queries
  - [ ] Optimize AI batch processing
  - [ ] Implement caching layer (Redis)
  - [ ] Use worker threads for CPU-intensive tasks
  - [ ] Profile slow queries and optimize
- [ ] **Metrics to Track:**
  - Upload time
  - Parsing time
  - AI analysis time
  - Database write time
  - Total end-to-end time
- [ ] **Files to Optimize:**
  - `server/background-processor.ts`
  - `server/ai-service.ts`
  - `server/database-storage.ts`

### 7. Multi-Language Support (i18n)
- [ ] **Current:** English only
- [ ] **Requirement:** Support multiple languages
- [ ] **Implementation:**
  - [ ] Add i18next library
  - [ ] Create language files: `/locales/en.json`, `/locales/hi.json`, etc.
  - [ ] Wrap all UI text in translation keys
  - [ ] Add language selector in settings
  - [ ] Persist language preference
- [ ] **Files to Modify:**
  - All client components with hardcoded text
  - Add `client/src/i18n.ts` config
  - Add `client/public/locales/` directory
- [ ] **Languages to Support:**
  - English (default)
  - India English
  - UK English
  - Hindi
  - Tamil
  - Spanish
  - French
  - German
  - Chinese (Simplified)
  - Japanese
  - German
  - Portuguese
  - Russian
  - Arabic
  - (Others as needed)

### 8. Settings Persistence
- [ ] **Current:** Settings not persisted across reloads
- [ ] **Requirement:** Save user preferences locally
- [ ] **Implementation:**
  - [ ] Create `localStorage` wrapper utility
  - [ ] Save theme, language, UI preferences
  - [ ] Load on app mount
  - [ ] Sync with backend for cross-device (future)
- [ ] **Files to Create/Modify:**
  - `client/src/utils/settingsStorage.ts`
  - `client/src/contexts/SettingsContext.tsx`
  - Update settings components to use context

---

## 🧪 TESTING INFRASTRUCTURE (Priority 3)

### 9. Add Fixture Specs for Feature Testing
- [ ] **Test Framework:** Vitest (already installed)
- [ ] **Test Files to Create:**
  - [ ] `tests/fixtures/mock-error-logs.ts` - Sample error data
  - [ ] `tests/fixtures/mock-users.ts` - Test users/roles
  - [ ] `tests/unit/error-pattern-analyzer.test.ts`
  - [ ] `tests/unit/ai-service.test.ts`
  - [ ] `tests/integration/upload-flow.test.ts`
  - [ ] `tests/integration/team-visibility.test.ts`
- [ ] **Coverage Goals:**
  - Unit tests: 80% coverage
  - Integration tests for all critical flows
  - E2E tests for user journeys
- [ ] **Run Commands:**
  ```bash
  npm run test           # Run all tests
  npm run test:ui        # Interactive test UI
  npm run test:coverage  # Generate coverage report
  ```

### 10. End-to-End Testing Setup
- [ ] **Tool:** Playwright or Cypress
- [ ] **Test Scenarios:**
  - [ ] User registration/login flow
  - [ ] File upload with store/kiosk metadata
  - [ ] Error analysis workflow
  - [ ] Team log visibility
  - [ ] Export functionality
  - [ ] Admin user management
- [ ] **Files to Create:**
  - `tests/e2e/user-flows.spec.ts`
  - `tests/e2e/admin-flows.spec.ts`
  - `playwright.config.ts` or `cypress.config.ts`

---

## 🔧 TECHNICAL DEBT & REFACTORING

### 11. Remove Duplicate/Legacy Files
- [ ] **Files to Review:**
  - Multiple QUICK-DEPLOY*.ps1 scripts (consolidate)
  - `enhanced-ml-training-old.ts` (remove if not used)
  - `vite.config - Copy.ts` (remove backup file)
  - Multiple SETUP-PYTHON*.ps1 scripts
- [ ] **Action:** Consolidate or archive unused deployment scripts

### 12. Database Migration Strategy
- [ ] **Current:** Using drizzle-kit
- [ ] **Improvements:**
  - [ ] Document all migrations
  - [ ] Add rollback scripts
  - [ ] Version control for schema changes
  - [ ] Add migration testing
- [ ] **Commands to Document:**
  ```bash
  npm run db:generate  # Generate migration
  npm run db:migrate   # Apply migration
  npm run db:push      # Push schema changes
  ```

### 13. Code Organization Improvements
- [ ] **Server Structure:**
  - [ ] Move all routes to `/server/routes/` directory
  - [ ] Consolidate middleware in `/server/middleware/`
  - [ ] Separate concerns: controllers, services, repositories
- [ ] **Client Structure:**
  - [ ] Organize components by feature
  - [ ] Extract shared utilities
  - [ ] Create consistent naming conventions

---

## 🛡️ SECURITY & COMPLIANCE

### 14. Infosec Review Preparation
- [ ] **Data Privacy Concerns:**
  - [ ] Audit: What customer data is in logs?
  - [ ] Implement PII detection/redaction
  - [ ] Add data retention policies
  - [ ] Implement GDPR-compliant deletion
- [ ] **Access Control:**
  - [ ] Implement 2FA (exists but not integrated)
  - [ ] Add session management
  - [ ] Implement rate limiting
  - [ ] Add IP whitelisting for admin
- [ ] **Audit Logging:**
  - [ ] Log all file uploads
  - [ ] Log all user access
  - [ ] Log admin actions
  - [ ] Export audit logs

### 15. VPN & Network Security
- [ ] **Concerns:** Client visibility risks
- [ ] **Actions:**
  - [ ] Review network architecture
  - [ ] Implement VPN-only access if needed
  - [ ] Add request authentication
  - [ ] Implement TLS/SSL certificates

---

## 📚 DOCUMENTATION

### 16. Developer Onboarding Guide
- [ ] **Create:** `docs/DEVELOPER_GUIDE.md`
- [ ] **Contents:**
  - Architecture overview
  - Setup instructions
  - Code style guide
  - Testing guidelines
  - Deployment process

### 17. API Documentation
- [ ] **Create:** `docs/API.md`
- [ ] **Tool:** Consider Swagger/OpenAPI
- [ ] **Contents:**
  - All endpoints documented
  - Request/response examples
  - Authentication flow
  - Error codes

### 18. User Manual
- [ ] **Create:** `docs/USER_MANUAL.md`
- [ ] **Contents:**
  - How to upload logs
  - Understanding analysis results
  - Team collaboration features
  - Troubleshooting guide

---

## 🚀 INTEGRATION ROADMAP

### 19. Jira Integration
- [ ] **Requirements:**
  - Auto-create tickets from critical errors
  - Link errors to existing tickets
  - Sync status updates
- [ ] **Implementation:**
  - Jira API integration
  - Webhook setup
  - UI for ticket creation

### 20. Slack Integration
- [ ] **Requirements:**
  - Alert on critical errors
  - Daily summary reports
  - Team notifications
- [ ] **Implementation:**
  - Slack webhook setup
  - Message formatting
  - Alert configuration UI

---

## ✅ REVIEW & VALIDATION CHECKLIST

### Before Committing Changes:
- [ ] All tests pass
- [ ] No linting errors
- [ ] No exposed secrets
- [ ] Code reviewed by peer
- [ ] Documentation updated
- [ ] Backward compatibility verified

### Before Production Deployment:
- [ ] Security scan completed
- [ ] Performance tested
- [ ] Database backed up
- [ ] Rollback plan prepared
- [ ] Monitoring in place

---

## 📊 PROGRESS TRACKING

**Last Updated:** October 6, 2025

| Category | Total Tasks | Completed | In Progress | Not Started |
|----------|-------------|-----------|-------------|-------------|
| Critical Fixes | 3 | 0 | 0 | 3 |
| Feature Development | 8 | 0 | 0 | 8 |
| Testing | 2 | 0 | 0 | 2 |
| Technical Debt | 3 | 0 | 0 | 3 |
| Security | 2 | 0 | 0 | 2 |
| Documentation | 3 | 0 | 0 | 3 |
| Integrations | 2 | 0 | 0 | 2 |
| **TOTAL** | **23** | **0** | **0** | **23** |

---

## 🎯 SPRINT PLANNING RECOMMENDATION

### Sprint 1 (Week 1-2): Critical Fixes
1. Fix mockErrorLog issue
2. Security audit & key rotation
3. Add store/kiosk fields

### Sprint 2 (Week 3-4): Core Features
4. Team log visibility
5. Performance optimization (Phase 1)
6. Settings persistence

### Sprint 3 (Week 5-6): Testing & Quality
7. Test infrastructure setup
8. i18n implementation
9. Code refactoring

### Sprint 4 (Week 7-8): Advanced Features
10. Auto-fetch logs design
11. Jira/Slack integrations
12. Final security review

---

## 📝 NOTES & QUESTIONS

### Open Questions:
1. What is the exact store/kiosk number format?
2. Who provides the store/kiosk mappings (Sharon)?
3. What are the exact PII concerns in logs?
4. When is the Infosec review scheduled?
5. What is the target user base size?
6. Are there any compliance requirements (HIPAA, PCI-DSS)?
7. What is the VPN configuration?
8. Are there existing Jira/Slack webhooks?
9. What is the database backup strategy?
10. What monitoring tools are in use?

---

*This document will be updated as tasks progress and new requirements emerge.*
