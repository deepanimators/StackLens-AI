# Multipart Form-Data Fix Applied

## Problem
Tests were failing with: `SyntaxError: Unexpected token '-', "------WebK"... is not valid JSON`

This occurred because the Express.js JSON body parser was attempting to parse multipart/form-data requests before Multer could handle them.

## Root Cause
The middleware order in `/apps/api/src/index.ts` allowed the JSON parser to run globally on ALL requests, including multipart requests. When a multipart request arrived with boundary markers like `------WebKitFormBoundary...`, the JSON parser tried to parse it as JSON and failed.

## Solution Applied
Modified `/apps/api/src/index.ts` to add Content-Type checking middleware that:

1. **Skips JSON parsing for multipart requests**: Before calling `express.json()`, check if Content-Type is `multipart/form-data`
2. **Skips URL parsing for multipart requests**: Similar check for URL-encoded parser
3. **Registers Multer on upload paths**: Use `app.use()` to register multer middleware on `/api/upload`, `/api/files/upload`, and `/api/files/:id/upload` paths

## Code Changes

### File: `/apps/api/src/index.ts` (Lines 25-62)

**BEFORE:**
```typescript
app.post('/api/upload', memoryUpload.single('file'), (req, res, next) => next());
app.post('/api/files/upload', memoryUpload.any(), (req, res, next) => next());
app.post('/api/files/:id/upload', memoryUpload.single('file'), (req, res, next) => next());

// Then body parser middleware...
app.use((req: any, res: any, next: any) => {
  // Conditional JSON parsing
});
```

**AFTER:**
```typescript
// CRITICAL FIX: Skip body parsing for multipart/form-data ENTIRELY
app.use((req: any, res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  
  if (contentType.startsWith('multipart/form-data')) {
    return next(); // Skip JSON parsing for multipart
  }
  
  if (contentType.startsWith('application/octet-stream')) {
    return next(); // Skip for binary data
  }
  
  const jsonParser = express.json({ limit: '50mb' });
  jsonParser(req, res, next);
});

// URL-encoded parser with same Content-Type check
app.use((req: any, res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  
  if (contentType.startsWith('multipart/form-data')) {
    return next();
  }
  
  const urlencodedParser = express.urlencoded({ extended: false, limit: '50mb' });
  urlencodedParser(req, res, next);
});

// Register multer on upload paths - AFTER body parsers
app.use('/api/upload', memoryUpload.single('file'));
app.use('/api/files/upload', memoryUpload.any());
app.use('/api/files/:id/upload', memoryUpload.single('file'));
```

## Why This Works

1. **Content-Type checking middleware runs first**: When a multipart request arrives, the Content-Type header is checked
2. **Multipart requests bypass JSON parser**: If `Content-Type: multipart/form-data`, the middleware calls `next()` without invoking the JSON parser
3. **Multer gets the raw request**: The untouched multipart request reaches Multer middleware, which properly processes the multipart data
4. **Non-multipart requests still parse JSON**: Requests with `application/json` or `application/x-www-form-urlencoded` Content-Types are parsed normally

## Middleware Execution Order

1. CORS middleware
2. **Content-Type checking middleware** (NEW - skips JSON for multipart)
3. **Content-Type checking middleware** (NEW - skips URL encoding for multipart)
4. Rate limiter
5. **Multer routes** (app.use for specific paths)
6. Route handlers from main-routes.ts

## Expected Test Results

After this fix, the following tests should pass:
- `POST /api/upload - should upload Excel file`
- `POST /api/upload - should upload CSV file`
- `POST /api/upload - should reject invalid file type`
- File-related tests in comprehensive.test.ts

##Tests Still Needing Investigation

- Rate limiting tests (10+ failures): May need adjustment of rate limit thresholds
- Database-related tests (3+ failures): Disk full errors - system resource issue
- Data handling tests (2-3 failures): Search filtering, notes field persistence
- Pagination tests (7 failures): Edge case validation

## Verification

To verify the fix works:
```bash
npm run test:api 2>&1 | grep -E "passed|failed|✓|✗"
```

Look for multipart-related tests to start passing, specifically any test that uploads files.
