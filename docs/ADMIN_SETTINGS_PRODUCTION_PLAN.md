# Admin Settings Production-Ready Implementation Plan

## Current Issues Identified

### 1. **API & Integration Settings Page**
**Issues:**
- Save button shows API errors (handler not properly implemented)
- No proper error handling and validation
- API keys are not securely stored/encrypted
- No validation for webhook URLs
- File size validation missing
- Auto-analysis toggle not persisted correctly

### 2. **UI Settings Page**
**Issues:**
- Save button not working properly
- Navigation settings mutual exclusivity not enforced on backend
- Color pickers not validated
- Settings not properly synchronized between frontend and backend
- No validation for numeric inputs (items per page, refresh interval)
- Theme changes not applied in real-time

### 3. **Security Settings Page**
**Issues:**
- **MISSING ENTIRELY** - Needs complete implementation
- No 2FA implementation
- No session management
- No account recovery options

---

## Implementation Plan

### Phase 1: Fix Existing API & Integration Settings (Priority: HIGH)

#### 1.1 Backend API Fixes

**File**: `apps/api/src/routes/main-routes.ts`

**Tasks:**
- [ ] Add input validation using Zod schemas
- [ ] Implement secure API key encryption/decryption
- [ ] Add webhook URL validation (valid URL format, HTTPS enforcement)
- [ ] Add file size limits validation (1-100 MB range)
- [ ] Proper error handling with descriptive messages
- [ ] Add audit logging for settings changes

**Implementation:**
```typescript
// Add Zod schemas for validation
const apiSettingsSchema = z.object({
  geminiApiKey: z.string().min(10, "API key must be at least 10 characters").optional(),
  webhookUrl: z.string().url("Invalid webhook URL").startsWith("https://", "Webhook must use HTTPS").optional().or(z.literal("")),
  maxFileSize: z.string().refine((val) => {
    const num = parseInt(val);
    return num >= 1 && num <= 100;
  }, "File size must be between 1 and 100 MB"),
  autoAnalysis: z.boolean(),
});

const systemSettingsSchema = z.object({
  defaultTimezone: z.string(),
  defaultLanguage: z.string(),
  emailNotifications: z.boolean(),
  weeklyReports: z.boolean(),
});
```

#### 1.2 Frontend Fixes

**File**: `apps/web/src/pages/settings.tsx`

**Tasks:**
- [ ] Create API settings form with react-hook-form + Zod
- [ ] Add proper loading states
- [ ] Add success/error toast notifications
- [ ] Implement form validation (client-side)
- [ ] Add password/key masking with show/hide toggle
- [ ] Implement proper error display from API responses

**Components Needed:**
```tsx
// API Settings Form Component
const apiSettingsSchema = z.object({
  geminiApiKey: z.string().min(10).optional(),
  webhookUrl: z.string().url().startsWith("https://").optional().or(z.literal("")),
  maxFileSize: z.string().refine((val) => parseInt(val) >= 1 && parseInt(val) <= 100),
  autoAnalysis: z.boolean(),
});

// System Settings Form Component
const systemSettingsSchema = z.object({
  defaultTimezone: z.string(),
  defaultLanguage: z.string(),
  emailNotifications: z.boolean(),
  weeklyReports: z.boolean(),
});
```

---

### Phase 2: Fix UI Settings (Priority: HIGH)

#### 2.1 Backend Implementation

**File**: `apps/api/src/routes/main-routes.ts`

**Tasks:**
- [ ] Add validation for navigation settings (top/side mutual exclusivity)
- [ ] Validate color codes (hex format)
- [ ] Validate numeric ranges (items per page: 5-100, refresh interval: 10-300)
- [ ] Add proper error responses
- [ ] Implement settings merge logic (don't lose existing settings)

**Schema:**
```typescript
const uiSettingsSchema = z.object({
  // Navigation
  showTopNav: z.boolean(),
  topNavStyle: z.enum(["fixed", "static", "sticky"]),
  topNavColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  
  showSideNav: z.boolean(),
  sideNavStyle: z.enum(["collapsible", "fixed", "overlay"]),
  sideNavPosition: z.enum(["left", "right"]),
  sideNavColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  
  enableBreadcrumbs: z.boolean(),
  
  // Theme
  theme: z.enum(["light", "dark", "system"]),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  denseMode: z.boolean(),
  autoRefresh: z.boolean(),
  refreshInterval: z.number().min(10).max(300),
  
  // Display
  itemsPerPage: z.number().min(5).max(100),
  defaultView: z.enum(["grid", "list", "table"]),
}).refine((data) => {
  // Ensure top nav and side nav are mutually exclusive
  return !(data.showTopNav && data.showSideNav);
}, {
  message: "Top Navigation and Side Navigation cannot both be enabled",
  path: ["showSideNav"],
});
```

#### 2.2 Frontend Implementation

**File**: `apps/web/src/pages/settings.tsx`

**Tasks:**
- [ ] Implement UI settings form with validation
- [ ] Add real-time preview for theme changes
- [ ] Implement color picker with validation
- [ ] Add mutual exclusivity logic for navigation
- [ ] Disable dependent fields when parent is disabled
- [ ] Add range sliders for numeric values
- [ ] Show current values clearly
- [ ] Implement save functionality with optimistic updates

---

### Phase 3: Implement Security Settings (Priority: CRITICAL)

#### 3.1 Two-Factor Authentication (2FA)

**Backend Tasks:**
- [ ] Install and configure `speakeasy` library for TOTP
- [ ] Install `qrcode` library for QR code generation
- [ ] Create 2FA endpoints:
  - `POST /api/auth/2fa/enable` - Generate secret and QR code
  - `POST /api/auth/2fa/verify` - Verify TOTP code
  - `POST /api/auth/2fa/disable` - Disable 2FA
  - `GET /api/auth/2fa/status` - Check 2FA status
- [ ] Update login flow to handle 2FA verification
- [ ] Store 2FA secret securely (encrypted)
- [ ] Generate backup codes

**Database Schema Update:**
```sql
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT;
```

**Frontend Tasks:**
- [ ] Create 2FA setup modal/dialog
- [ ] Display QR code for scanning
- [ ] Show manual entry key option
- [ ] Implement verification code input
- [ ] Display and allow copying backup codes
- [ ] Add 2FA verification step in login flow

#### 3.2 Session Management

**Backend Tasks:**
- [ ] Create sessions table in database
- [ ] Implement session tracking on login
- [ ] Create endpoints:
  - `GET /api/auth/sessions` - List active sessions
  - `DELETE /api/auth/sessions/:id` - Revoke specific session
  - `DELETE /api/auth/sessions/all` - Revoke all other sessions
- [ ] Track session metadata (device, location, IP, browser)
- [ ] Implement session expiration and cleanup

**Database Schema:**
```sql
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  browser_info TEXT,
  ip_address TEXT,
  location TEXT,
  created_at INTEGER NOT NULL,
  last_active INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Frontend Tasks:**
- [ ] Create sessions list component
- [ ] Show device, location, IP, last active
- [ ] Highlight current session
- [ ] Add "Revoke" button for each session
- [ ] Add "Revoke All Other Sessions" button
- [ ] Show session creation date and last activity

#### 3.3 Account Recovery

**Backend Tasks:**
- [ ] Implement email service integration (SendGrid/AWS SES/Nodemailer)
- [ ] Create password reset flow:
  - `POST /api/auth/forgot-password` - Request reset token
  - `POST /api/auth/reset-password` - Reset with token
  - `POST /api/auth/verify-email` - Send verification email
- [ ] Generate and store secure reset tokens (short expiry)
- [ ] Implement rate limiting on password reset requests
- [ ] Create recovery email update flow

**Database Schema:**
```sql
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users ADD COLUMN recovery_email TEXT;
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
```

**Frontend Tasks:**
- [ ] Create recovery email configuration UI
- [ ] Add email verification flow
- [ ] Show verification status
- [ ] Add "Send Verification Email" button
- [ ] Create password reset request form
- [ ] Create password reset confirmation page

---

## Phase 4: Additional Production Requirements

### 4.1 Security Enhancements

**Tasks:**
- [ ] Implement API key encryption at rest
- [ ] Add environment variable for encryption key
- [ ] Use bcrypt/argon2 for password hashing
- [ ] Implement rate limiting on all settings endpoints
- [ ] Add CSRF protection
- [ ] Implement input sanitization
- [ ] Add audit logging for all settings changes
- [ ] Implement role-based access control (RBAC) for settings

**Encryption Utility:**
```typescript
// apps/api/src/utils/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### 4.2 Testing

**Unit Tests:**
- [ ] Test all validation schemas
- [ ] Test encryption/decryption utilities
- [ ] Test 2FA generation and verification
- [ ] Test session management logic
- [ ] Test password reset token generation

**Integration Tests:**
- [ ] Test complete settings save flow
- [ ] Test 2FA setup and login flow
- [ ] Test session revocation
- [ ] Test password reset flow
- [ ] Test API key storage and retrieval

**E2E Tests:**
- [ ] Test user updating API settings
- [ ] Test user updating UI settings
- [ ] Test user enabling 2FA
- [ ] Test user managing sessions
- [ ] Test password reset from email

### 4.3 Documentation

**Tasks:**
- [ ] API documentation for all new endpoints
- [ ] User guide for settings configuration
- [ ] Security best practices document
- [ ] 2FA setup guide
- [ ] Session management guide
- [ ] Password reset guide

---

## Implementation Timeline

### Week 1: Fix Existing Issues
- **Days 1-2**: Fix API & Integration Settings backend (validation, error handling)
- **Days 3-4**: Fix API & Integration Settings frontend (forms, validation, UX)
- **Day 5**: Fix UI Settings backend and frontend

### Week 2: Security Features - 2FA
- **Days 1-2**: Implement 2FA backend (endpoints, database)
- **Days 3-4**: Implement 2FA frontend (setup flow, verification)
- **Day 5**: Testing and bug fixes

### Week 3: Security Features - Sessions & Recovery
- **Days 1-2**: Implement session management
- **Days 2-3**: Implement account recovery
- **Days 4-5**: Security enhancements (encryption, rate limiting)

### Week 4: Testing & Documentation
- **Days 1-2**: Write unit and integration tests
- **Days 3-4**: E2E testing and bug fixes
- **Day 5**: Documentation and deployment

---

## File Structure

```
apps/
├── api/
│   └── src/
│       ├── routes/
│       │   ├── settings-routes.ts (NEW - extract from main-routes)
│       │   ├── auth-routes.ts (ENHANCE - add 2FA, sessions)
│       │   └── main-routes.ts (UPDATE)
│       ├── services/
│       │   ├── encryption-service.ts (NEW)
│       │   ├── two-factor-service.ts (NEW)
│       │   ├── session-service.ts (NEW)
│       │   ├── email-service.ts (NEW)
│       │   └── settings-service.ts (NEW)
│       ├── middleware/
│       │   ├── rate-limit.ts (NEW)
│       │   └── validate.ts (ENHANCE)
│       └── utils/
│           └── encryption.ts (NEW)
└── web/
    └── src/
        ├── pages/
        │   └── settings.tsx (REFACTOR)
        ├── components/
        │   ├── settings/
        │   │   ├── api-settings-form.tsx (NEW)
        │   │   ├── ui-settings-form.tsx (NEW)
        │   │   ├── security-settings.tsx (NEW)
        │   │   ├── two-factor-setup.tsx (NEW)
        │   │   ├── session-manager.tsx (NEW)
        │   │   └── account-recovery.tsx (NEW)
        │   └── ui/
        │       └── color-picker.tsx (NEW)
        └── lib/
            └── settings-api.ts (NEW)

packages/
└── shared/
    └── src/
        ├── schemas/
        │   ├── settings-schemas.ts (NEW)
        │   └── security-schemas.ts (NEW)
        └── types/
            └── settings.ts (UPDATE)
```

---

## Environment Variables Required

Add to `.env`:
```bash
# Security
ENCRYPTION_KEY=your-32-byte-encryption-key-here-must-be-32-chars!!
SESSION_SECRET=your-session-secret-key-here

# Email Service (choose one)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@stacklens.com

# OR SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key

# OR AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_SES_FROM=noreply@stacklens.com

# Rate Limiting
RATE_LIMIT_WINDOW=15 # minutes
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_EXPIRY=86400000 # 24 hours in ms
```

---

## Success Criteria

### API & Integration Settings
- ✅ All fields validate correctly (client + server)
- ✅ API keys are encrypted in database
- ✅ Webhook URLs are validated (HTTPS only)
- ✅ File size validation works (1-100 MB)
- ✅ Save button works without errors
- ✅ Success/error messages display correctly
- ✅ Settings persist across sessions

### UI Settings
- ✅ All fields validate correctly
- ✅ Navigation mutual exclusivity enforced
- ✅ Color picker validates hex codes
- ✅ Numeric inputs have proper ranges
- ✅ Theme changes apply in real-time
- ✅ Save button works without errors
- ✅ Dependent fields disabled/enabled correctly

### Security Settings
- ✅ 2FA can be enabled/disabled
- ✅ QR code displays correctly
- ✅ Backup codes generated and downloadable
- ✅ 2FA verification works on login
- ✅ Active sessions display correctly
- ✅ Sessions can be revoked individually or all at once
- ✅ Password reset email sends successfully
- ✅ Password can be reset with valid token
- ✅ Recovery email can be configured

### General
- ✅ All changes are audited
- ✅ Rate limiting prevents abuse
- ✅ All endpoints have proper error handling
- ✅ All forms have loading states
- ✅ All tests pass (unit, integration, E2E)
- ✅ Documentation is complete

---

## Priority Order

1. **CRITICAL** - Fix existing save button errors (API & UI Settings)
2. **HIGH** - Implement proper validation and error handling
3. **HIGH** - Implement 2FA
4. **MEDIUM** - Implement session management
5. **MEDIUM** - Implement account recovery
6. **LOW** - Enhanced security features (encryption, rate limiting)
7. **LOW** - Comprehensive testing and documentation

---

## Next Steps

1. Review and approve this plan
2. Set up project board with tasks
3. Assign developers to phases
4. Begin Week 1 implementation
5. Daily standups to track progress
6. Code reviews for each completed task
7. QA testing before merging to main

---

**Document Version**: 1.0  
**Last Updated**: October 6, 2025  
**Status**: PENDING APPROVAL
