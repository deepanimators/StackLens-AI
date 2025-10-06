#!/bin/bash

# Complete Migration Script - Move remaining files to correct locations
# This completes the restructure by moving all files to their proper directories

set -e  # Exit on error

echo "🔄 Completing Production Restructure - Moving Remaining Files"
echo "=============================================================="

# 1. Move deployment scripts to infrastructure/deployment/
echo ""
echo "📦 Phase 1: Moving deployment scripts..."

# Windows deployment scripts
mv -v *.ps1 infrastructure/deployment/windows/scripts/ 2>/dev/null || true
mv -v *.bat infrastructure/deployment/windows/scripts/ 2>/dev/null || true

# Linux deployment scripts
mv -v *.sh infrastructure/deployment/linux/scripts/ 2>/dev/null || true
mv -v deploy-prod.sh infrastructure/deployment/linux/scripts/ 2>/dev/null || true

echo "✅ Deployment scripts moved"

# 2. Move documentation files
echo ""
echo "📚 Phase 2: Moving documentation files..."

# Architecture docs
mv -v REFACTORING_PLAN.md docs/architecture/ 2>/dev/null || true
mv -v RESTRUCTURE_GUIDE.md docs/architecture/ 2>/dev/null || true
mv -v RESTRUCTURE_SUMMARY.md docs/architecture/ 2>/dev/null || true
mv -v FIX-INFO-LOG-SEVERITY-ISSUE.md docs/architecture/ 2>/dev/null || true
mv -v STORE_KIOSK_IMPLEMENTATION_COMPLETE.md docs/architecture/ 2>/dev/null || true
mv -v STORE_KIOSK_INTEGRATION_SUMMARY.md docs/architecture/ 2>/dev/null || true

# Development docs
mv -v BUILD-GUIDE.md docs/development/ 2>/dev/null || true
mv -v CODEBASE_ANALYSIS_REPORT.md docs/development/ 2>/dev/null || true
mv -v IMPLEMENTATION_PLAN_SUMMARY.md docs/development/ 2>/dev/null || true
mv -v QUICKSTART_PHASE1.md docs/development/ 2>/dev/null || true
mv -v QUICK_REFERENCE_STORE_KIOSK.md docs/development/ 2>/dev/null || true

# Deployment docs
mv -v DEPLOY-TO-SERVER.md docs/deployment/ 2>/dev/null || true
mv -v WINDOWS-DEPLOYMENT-README.md docs/deployment/ 2>/dev/null || true
mv -v WINDOWS-SERVER-DEPLOYMENT.md docs/deployment/ 2>/dev/null || true

# Testing docs
mv -v TESTING_FRAMEWORK_SUMMARY.md docs/architecture/ 2>/dev/null || true
mv -v TESTING_SETUP_GUIDE.md docs/ 2>/dev/null || true

# Task tracking
mv -v tasks-todo.md docs/ 2>/dev/null || true
mv -v todo.md docs/ 2>/dev/null || true

echo "✅ Documentation files moved"

# 3. Move remaining server files
echo ""
echo "🔧 Phase 3: Moving server files to apps/api/src/..."

# Create necessary directories
mkdir -p apps/api/src/core
mkdir -p apps/api/src/database
mkdir -p apps/api/src/processors
mkdir -p apps/api/src/training

# Move core server files (avoiding duplicates)
[ -f server/database-storage.ts ] && mv -v server/database-storage.ts apps/api/src/database/
[ -f server/storage.ts ] && mv -v server/storage.ts apps/api/src/database/
[ -f server/db.ts ] && mv -v server/db.ts apps/api/src/database/
[ -f server/sqlite-db.ts ] && mv -v server/sqlite-db.ts apps/api/src/database/

# Move processor files
[ -f server/background-processor.ts ] && mv -v server/background-processor.ts apps/api/src/processors/
[ -f server/excel-training-processor.ts ] && mv -v server/excel-training-processor.ts apps/api/src/processors/

# Move training files
[ -f server/advanced-training-system.ts ] && mv -v server/advanced-training-system.ts apps/api/src/training/
[ -f server/enhanced-ml-training-old.ts ] && mv -v server/enhanced-ml-training-old.ts apps/api/src/training/

# Move analysis files
[ -f server/error-pattern-analyzer.ts ] && mv -v server/error-pattern-analyzer.ts apps/api/src/services/analysis/

# Move routes (main routes file)
[ -f server/routes.ts ] && mv -v server/routes.ts apps/api/src/routes/main-routes.ts

# Move seed files
[ -f server/seed-data.ts ] && mv -v server/seed-data.ts apps/api/src/database/
[ -f server/seed-database.ts ] && mv -v server/seed-database.ts apps/api/src/database/
[ -f server/seed-sqlite.ts ] && mv -v server/seed-sqlite.ts apps/api/src/database/

# Move Firebase auth
[ -f server/firebase-auth.ts ] && mv -v server/firebase-auth.ts apps/api/src/services/auth/

# Move enterprise integration
[ -f server/enterprise-intelligence-integration.ts ] && mv -v server/enterprise-intelligence-integration.ts apps/api/src/services/

# Move vite config
[ -f server/vite.ts ] && mv -v server/vite.ts apps/api/src/

# Move database file to data
[ -f server/stacklens.db ] && mv -v server/stacklens.db data/database/

echo "✅ Server files moved"

# 4. Move remaining client files
echo ""
echo "🎨 Phase 4: Moving client files to apps/web/..."

# Move index.html if not already there
[ -f client/index.html ] && [ ! -f apps/web/index.html ] && mv -v client/index.html apps/web/

# Move client src files (check for duplicates)
if [ -d client/src ]; then
  # Only move if apps/web/src doesn't have content
  if [ "$(ls -A apps/web/src 2>/dev/null | wc -l)" -eq "0" ]; then
    echo "Moving client/src/* to apps/web/src/"
    cp -r client/src/* apps/web/src/
    rm -rf client/src
  else
    echo "apps/web/src already has content, comparing..."
    # Check for missing files
    for file in client/src/**/*; do
      if [ -f "$file" ]; then
        basename=$(basename "$file")
        if ! find apps/web/src -name "$basename" -type f | grep -q .; then
          echo "Missing: $basename - needs manual review"
        fi
      fi
    done
  fi
fi

echo "✅ Client files checked"

# 5. Move config files
echo ""
echo "⚙️  Phase 5: Moving configuration files..."

# Move drizzle config to packages/database
[ -f drizzle.config.ts ] && mv -v drizzle.config.ts packages/database/

# Move postcss and tailwind to apps/web
[ -f postcss.config.js ] && mv -v postcss.config.js apps/web/
[ -f tailwind.config.ts ] && mv -v tailwind.config.ts apps/web/

# Move migration script
[ -f migrate-ml-models-schema.js ] && mv -v migrate-ml-models-schema.js packages/database/src/migrations/

echo "✅ Configuration files moved"

# 6. Move test/debug files
echo ""
echo "🧪 Phase 6: Moving test and debug files..."

mkdir -p tools/debug

# Move debug HTML files
[ -f debug-frontend.html ] && mv -v debug-frontend.html tools/debug/
[ -f debug.html ] && mv -v debug.html tools/debug/
[ -f react-test.html ] && mv -v react-test.html tools/debug/
[ -f test-api.html ] && mv -v test-api.html tools/debug/

# Move test scripts
[ -f test-db-fix.js ] && mv -v test-db-fix.js tools/scripts/
[ -f test-patterns.js ] && mv -v test-patterns.js tools/scripts/
[ -f verify-schema-fix.js ] && mv -v verify-schema-fix.js tools/scripts/

echo "✅ Test files moved"

# 7. Move vite config files
echo ""
echo "🔨 Phase 7: Moving build configuration..."

# Move vite config copies
[ -f "vite.config - Copy.ts" ] && mv -v "vite.config - Copy.ts" config/vite/vite.config.backup.ts

echo "✅ Build config moved"

# 8. Move requirement files
echo ""
echo "📋 Phase 8: Organizing requirement files..."

mkdir -p infrastructure/deployment/python

[ -f requirements-minimal.txt ] && mv -v requirements-minimal.txt infrastructure/deployment/python/
[ -f requirements-python312.txt ] && mv -v requirements-python312.txt infrastructure/deployment/python/
[ -f requirements-python313.txt ] && mv -v requirements-python313.txt infrastructure/deployment/python/
[ -f requirements.txt ] && mv -v requirements.txt services/python/

echo "✅ Requirement files moved"

# 9. Summary
echo ""
echo "=============================================================="
echo "✅ File migration completed successfully!"
echo ""
echo "📊 Summary:"
echo "  - Deployment scripts → infrastructure/deployment/"
echo "  - Documentation → docs/"
echo "  - Server files → apps/api/src/"
echo "  - Client files → apps/web/"
echo "  - Config files → appropriate config directories"
echo "  - Test files → tools/"
echo ""
echo "🔄 Next Steps:"
echo "  1. Run: ./update-imports.sh"
echo "  2. Run: npm run build"
echo "  3. Test all flows"
echo ""
