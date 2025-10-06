#!/bin/bash

# StackLens AI - Production-Ready Restructure Script (No Backup)
# This script reorganizes the codebase without creating backup (Git is your backup)

set -e

echo "🚀 StackLens AI - Production Restructure (No Backup Mode)"
echo "==========================================================="
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_warning "Skipping backup due to disk space - Git history is your backup!"
print_info "Make sure you have committed your changes: git add . && git commit -m 'pre-restructure'"

# Phase 1: Create new directory structure
print_info "Phase 1: Creating new directory structure..."

mkdir -p apps/web/src
mkdir -p apps/api/src/{routes,controllers,services/{ai,ml,analysis,auth,storage},middleware,utils,config}
mkdir -p services/python/src/{api,models/{deep_learning,rag,vector_db},services,utils}
mkdir -p packages/database/src/{schema,migrations,seeders}
mkdir -p packages/shared/src/{types,constants,utils,validators}
mkdir -p infrastructure/{docker,deployment/{windows/scripts,linux/scripts,cloud},nginx}
mkdir -p tools/{scripts,generators,validators}
mkdir -p tests/{e2e,integration/{api,services},unit/{api,web}}
mkdir -p docs/{api,architecture,deployment,development,user}
mkdir -p data/{database,uploads,ml-models,cache}
mkdir -p config/{environments,eslint,typescript,vite}

print_success "Directory structure created"

# Phase 2: Move Frontend
print_info "Phase 2: Moving frontend files..."
cp -r client/src/* apps/web/src/
cp client/index.html apps/web/
print_success "Frontend files moved"

# Phase 3: Move Backend
print_info "Phase 3: Moving backend files..."
cp server/index.ts apps/api/src/
cp server/vite.ts apps/api/src/
cp server/db.ts apps/api/src/config/database.ts 2>/dev/null || true
cp server/firebase-auth.ts apps/api/src/config/firebase.ts 2>/dev/null || true

if [ -d "server/routes" ]; then
    cp -r server/routes/* apps/api/src/routes/
fi
cp server/routes.ts apps/api/src/routes/legacy-routes.ts 2>/dev/null || true

if [ -d "server/services" ]; then
    for file in server/services/*.ts; do
        [ -f "$file" ] || continue
        filename=$(basename "$file")
        case "$filename" in
            ai-service.ts|enhanced-rag-*.ts)
                cp "$file" apps/api/src/services/ai/
                ;;
            ml-service.ts|model-trainer.ts|predictor.ts|enhanced-ml-*.ts|prediction-*.ts|suggestion-*.ts)
                cp "$file" apps/api/src/services/ml/
                ;;
            enhanced-error-detection.ts|log-parser.ts|pattern-analyzer.ts|error-*.ts)
                cp "$file" apps/api/src/services/analysis/
                ;;
            auth-service.ts)
                cp "$file" apps/api/src/services/auth/
                ;;
            *)
                cp "$file" apps/api/src/services/
                ;;
        esac
    done
fi

if [ -d "server/middleware" ]; then
    cp -r server/middleware/* apps/api/src/middleware/ 2>/dev/null || true
fi

print_success "Backend files moved"

# Phase 4: Move Python Services
print_info "Phase 4: Moving Python services..."
if [ -d "python-services" ]; then
    [ -f "python-services/app.py" ] && cp python-services/app.py services/python/src/
    
    for file in python-services/*_service.py; do
        [ -f "$file" ] && cp "$file" services/python/src/services/
    done
    
    for file in python-services/*_api.py; do
        [ -f "$file" ] && cp "$file" services/python/src/api/
    done
    
    for file in python-services/deep_learning*.py; do
        [ -f "$file" ] && cp "$file" services/python/src/models/deep_learning/
    done
    
    [ -f "python-services/requirements.txt" ] && cp python-services/requirements.txt services/python/
    [ -f "python-services/Dockerfile" ] && cp python-services/Dockerfile services/python/
    [ -f "python-services/docker-compose.yml" ] && cp python-services/docker-compose.yml services/python/
fi
print_success "Python services moved"

# Phase 5: Move Shared & Database
print_info "Phase 5: Moving shared code and database..."
if [ -d "shared" ]; then
    for file in shared/*.ts; do
        [ -f "$file" ] || continue
        filename=$(basename "$file")
        if [[ "$filename" == *"schema"* ]]; then
            cp "$file" packages/database/src/schema/
        else
            cp "$file" packages/shared/src/
        fi
    done
fi

[ -d "db" ] && cp -r db/* data/database/ 2>/dev/null || true
[ -d "drizzle" ] && cp -r drizzle/* packages/database/src/migrations/ 2>/dev/null || true
[ -f "drizzle.config.ts" ] && cp drizzle.config.ts packages/database/

print_success "Shared code and database moved"

# Phase 6: Move Infrastructure
print_info "Phase 6: Moving infrastructure..."
for file in *.ps1; do
    [ -f "$file" ] && cp "$file" infrastructure/deployment/windows/scripts/
done

for file in *.sh; do
    [ -f "$file" ] && [ "$file" != "restructure-no-backup.sh" ] && [ "$file" != "update-imports.sh" ] && cp "$file" infrastructure/deployment/linux/scripts/
done

if [ -d "scripts" ]; then
    cp -r scripts/* tools/scripts/
fi

print_success "Infrastructure files moved"

# Phase 7: Move Documentation
print_info "Phase 7: Moving documentation..."
for file in *.md; do
    case "$file" in
        README.md|LICENSE.md|CHANGELOG.md)
            ;;
        WINDOWS*|DEPLOY*|*DEPLOYMENT*)
            cp "$file" docs/deployment/
            ;;
        BUILD*|QUICK*|IMPLEMENTATION*|CODEBASE*)
            cp "$file" docs/development/
            ;;
        RESTRUCTURE*|REFACTORING*)
            cp "$file" docs/architecture/
            ;;
        STORE*|FIX*|*INTEGRATION*|*SUMMARY*)
            cp "$file" docs/architecture/
            ;;
        *)
            cp "$file" docs/
            ;;
    esac
done

print_success "Documentation moved"

# Phase 8: Move Configuration
print_info "Phase 8: Moving configuration files..."
cp .env config/environments/.env.development 2>/dev/null || true
cp .env.example config/environments/.env.example 2>/dev/null || true
[ -f "postcss.config.js" ] && cp postcss.config.js apps/web/
[ -f "tailwind.config.ts" ] && cp tailwind.config.ts apps/web/

print_success "Configuration files moved"

# Phase 9: Create .gitkeep files
print_info "Phase 9: Creating .gitkeep files..."
touch data/uploads/.gitkeep
touch data/ml-models/.gitkeep
touch data/cache/.gitkeep

print_success ".gitkeep files created"

print_success "🎉 Restructure complete!"
print_info "Next: Run ./update-imports.sh to fix import paths"
