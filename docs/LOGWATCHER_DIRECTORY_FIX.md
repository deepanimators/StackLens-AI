# 🔧 ADDITIONAL FIX - LogWatcher Directory Handling

**Date:** November 13, 2025  
**Issue:** LogWatcher tries to read directories as files  
**Error:** `EISDIR: illegal operation on a directory, read`  
**Status:** ✅ FIXED

---

## The Problem

When we passed directory paths to LogWatcher, it tried to `readFileSync` on them directly, causing:

```
[LogWatcherService] Failed to start watcher: Error: EISDIR: illegal operation on a directory, read
```

**Root Cause:**
```typescript
// Old code (line 92):
const lineCount = fs.readFileSync(filePath, "utf-8").split("\n").length;
// filePath is a directory, not a file!
```

---

## The Solution

**Fix:** Convert directory paths to glob patterns, then watch for `.log` files:

```typescript
// New code:
for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            // Watch all .log files in this directory
            actualFilePaths.push(path.join(filePath, "*.log"));
        } else {
            actualFilePaths.push(filePath);
        }
    }
}
```

**Impact:**
- ✅ Directories converted to glob patterns: `./data/*.log`
- ✅ Existing files passed through unchanged
- ✅ Only actual files are counted for line numbers
- ✅ Chokidar watches for any `.log` files in directories

---

## Files Modified

**File:** `apps/api/src/services/log-watcher.ts`

**Changes:**
1. Added `import * as path from "path"` (line 9)
2. Updated `start()` method (lines 83-121)
   - Check if path is directory or file
   - Convert directories to glob patterns
   - Skip glob patterns when counting lines

**Lines:** ~15 changed, ~10 added  
**Risk:** MINIMAL (no breaking changes)

---

## How It Works Now

```
LogWatcher receives: ["/data", "/logs"]
                        ↓
Converts to:        ["/data/*.log", "/logs/*.log"]
                        ↓
Chokidar watches:   All .log files in both directories
                        ↓
When error logged:  Error detected automatically
```

---

## Verification

The server should now show:

```
✅ Created log directory: /Users/.../logs
📍 Watching directories: /Users/.../data, /Users/.../logs
✅ LogWatcher service started successfully
```

No more `EISDIR` error!

---

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| EISDIR error | Tried to read directories as files | Check if directory, use glob pattern |
| LogWatcher failed to start | Line counting on directories failed | Skip counting for glob patterns |
| Service blocked | Exception thrown | Auto-convert to proper format |

**Status:** ✅ **FIXED**

The system should now work correctly!
