#!/bin/bash

# StackLens AI - Production-Ready Restructure Script
# This script safely reorganizes the codebase without breaking functionality

set -e  # Exit on error

echo "🚀 StackLens AI - Production Restructure"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Backup current state
print_info "Creating backup of current state..."
BACKUP_DIR="../stacklens-ai-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
print_success "Backup created at: $BACKUP_DIR"

# Phase 1: Create new directory structure
print_info "Phase 1: Creating new directory structure..."

# Create main directories
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
mkdir -p dist/{web,api,python}

print_success "Directory structure created"

# Phase 2: Move Frontend (Web App)
print_info "Phase 2: Moving frontend files..."

# Move client files to apps/web
cp -r client/src/* apps/web/src/
cp client/index.html apps/web/
print_success "Frontend files moved"

# Phase 3: Move Backend (API)
print_info "Phase 3: Moving backend files..."

# Move server files to apps/api/src
cp server/index.ts apps/api/src/
cp server/vite.ts apps/api/src/
cp server/db.ts apps/api/src/config/database.ts
cp server/firebase-auth.ts apps/api/src/config/firebase.ts

# Move routes
if [ -d "server/routes" ]; then
    cp -r server/routes/* apps/api/src/routes/
fi
cp server/routes.ts apps/api/src/routes/legacy-routes.ts

# Move services
if [ -d "server/services" ]; then
    for file in server/services/*.ts; do
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

# Move middleware
if [ -d "server/middleware" ]; then
    cp -r server/middleware/* apps/api/src/middleware/
fi

print_success "Backend files moved"

# Phase 4: Move Python Services
print_info "Phase 4: Moving Python services..."

# Move Python service files
if [ -d "python-services" ]; then
    # Move main app
    [ -f "python-services/app.py" ] && cp python-services/app.py services/python/src/
    
    # Move service files
    for file in python-services/*_service.py; do
        [ -f "$file" ] && cp "$file" services/python/src/services/
    done
    
    # Move API files
    for file in python-services/*_api.py; do
        [ -f "$file" ] && cp "$file" services/python/src/api/
    done
    
    # Move model files
    for file in python-services/deep_learning*.py; do
        [ -f "$file" ] && cp "$file" services/python/src/models/deep_learning/
    done
    
    # Copy requirements
    [ -f "python-services/requirements.txt" ] && cp python-services/requirements.txt services/python/
    [ -f "python-services/Dockerfile" ] && cp python-services/Dockerfile services/python/
    [ -f "python-services/docker-compose.yml" ] && cp python-services/docker-compose.yml services/python/
fi

print_success "Python services moved"

# Phase 5: Move Shared Code & Database
print_info "Phase 5: Moving shared code and database..."

# Move shared schema files
if [ -d "shared" ]; then
    for file in shared/*.ts; do
        filename=$(basename "$file")
        if [[ "$filename" == *"schema"* ]]; then
            cp "$file" packages/database/src/schema/
        else
            cp "$file" packages/shared/src/
        fi
    done
fi

# Move database files
[ -d "db" ] && cp -r db/* data/database/
[ -d "drizzle" ] && cp -r drizzle/* packages/database/src/migrations/
[ -f "drizzle.config.ts" ] && cp drizzle.config.ts packages/database/

# Move uploads
[ -d "uploads" ] && cp -r uploads/* data/uploads/ 2>/dev/null || true

print_success "Shared code and database moved"

# Phase 6: Move Infrastructure & Deployment
print_info "Phase 6: Moving infrastructure and deployment files..."

# Move PowerShell scripts to Windows deployment
for file in *.ps1; do
    [ -f "$file" ] && cp "$file" infrastructure/deployment/windows/scripts/
done

# Move bash scripts to Linux deployment
for file in *.sh; do
    [ -f "$file" ] && cp "$file" infrastructure/deployment/linux/scripts/
done

# Move deployment folder
if [ -d "deployment" ]; then
    cp -r deployment/* infrastructure/deployment/
fi

# Move SQL scripts
if [ -d "scripts" ]; then
    cp -r scripts/* tools/scripts/
fi

print_success "Infrastructure files moved"

# Phase 7: Move Documentation
print_info "Phase 7: Moving documentation files..."

# Categorize and move documentation
for file in *.md; do
    case "$file" in
        README.md|LICENSE.md|CHANGELOG.md)
            # Keep in root
            ;;
        WINDOWS*|DEPLOY*|*DEPLOYMENT*)
            cp "$file" docs/deployment/
            ;;
        BUILD*|QUICK*|IMPLEMENTATION*|CODEBASE*)
            cp "$file" docs/development/
            ;;
        STORE*|FIX*|*INTEGRATION*|*SUMMARY*)
            cp "$file" docs/architecture/
            ;;
        *)
            cp "$file" docs/
            ;;
    esac
done

# Move Python service docs
if [ -d "python-services/docs" ]; then
    cp -r python-services/docs/* docs/api/
fi

print_success "Documentation moved"

# Phase 8: Move Configuration Files
print_info "Phase 8: Moving configuration files..."

# Move environment files
cp .env config/environments/.env.development
cp .env.example config/environments/.env.example
[ -f ".env.simulation" ] && cp .env.simulation config/environments/.env.simulation

# Move TypeScript configs (will be created in next step)
# Move other configs
[ -f "postcss.config.js" ] && cp postcss.config.js apps/web/
[ -f "tailwind.config.ts" ] && cp tailwind.config.ts apps/web/
[ -f ".gitignore" ] && cp .gitignore .gitignore.backup

print_success "Configuration files moved"

# Phase 9: Move Test Files
print_info "Phase 9: Moving test files..."

for file in test-*.{sh,js,html}; do
    [ -f "$file" ] && cp "$file" tests/integration/
done

for file in debug*.html react-test.html; do
    [ -f "$file" ] && cp "$file" tests/
done

print_success "Test files moved"

# Phase 10: Create new configuration files
print_info "Phase 10: Creating new configuration files..."

# Create root tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "incremental": true,
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.cache/typescript/tsbuildinfo",
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ESNext"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "files": [],
  "references": [
    { "path": "./apps/web" },
    { "path": "./apps/api" },
    { "path": "./packages/shared" },
    { "path": "./packages/database" }
  ]
}
EOF

# Create apps/web/tsconfig.json
cat > apps/web/tsconfig.json << 'EOF'
{
  "extends": "../../config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.cache/typescript/web-tsbuildinfo",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../packages/shared/src/*"],
      "@db/*": ["../../packages/database/src/*"]
    },
    "types": ["vite/client", "node"]
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../../packages/shared" },
    { "path": "../../packages/database" }
  ]
}
EOF

# Create apps/api/tsconfig.json
cat > apps/api/tsconfig.json << 'EOF'
{
  "extends": "../../config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.cache/typescript/api-tsbuildinfo",
    "module": "ESNext",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../packages/shared/src/*"],
      "@db/*": ["../../packages/database/src/*"]
    },
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../../packages/shared" },
    { "path": "../../packages/database" }
  ]
}
EOF

# Create base TypeScript config
mkdir -p config/typescript
cat > config/typescript/tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
EOF

# Create packages/shared/tsconfig.json
cat > packages/shared/tsconfig.json << 'EOF'
{
  "extends": "../../config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.cache/typescript/shared-tsbuildinfo",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF

# Create packages/database/tsconfig.json
cat > packages/database/tsconfig.json << 'EOF'
{
  "extends": "../../config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.cache/typescript/database-tsbuildinfo",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }
  ]
}
EOF

print_success "Configuration files created"

# Phase 11: Create new vite.config.ts for web app
print_info "Phase 11: Creating Vite configuration..."

cat > apps/web/vite.config.ts << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async () => {
  const plugins = [react()];

  // Only load cartographer in Replit development environment
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    const cartographerModule = await import("@replit/vite-plugin-cartographer");
    plugins.push(cartographerModule.cartographer());
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "../../packages/shared/src"),
        "@db": path.resolve(__dirname, "../../packages/database/src"),
      },
    },
    root: path.resolve(__dirname),
    build: {
      outDir: path.resolve(__dirname, "../../dist/web"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        allow: ["../.."],
      },
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
EOF

print_success "Vite configuration created"

# Phase 12: Update package.json
print_info "Phase 12: Updating package.json..."

# Create backup of original package.json
cp package.json package.json.backup

# Update scripts in package.json (using Node.js for JSON manipulation)
node << 'EOJS'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update scripts
pkg.scripts = {
  ...pkg.scripts,
  "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
  "dev:web": "cd apps/web && vite",
  "dev:api": "cross-env NODE_ENV=development node --import tsx --no-warnings apps/api/src/index.ts",
  "build": "npm run build:web && npm run build:api",
  "build:web": "cd apps/web && vite build",
  "build:api": "esbuild apps/api/src/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/api",
  "start": "cross-env NODE_ENV=production node dist/api/index.js",
  "db:push": "cd packages/database && drizzle-kit push",
  "db:generate": "cd packages/database && drizzle-kit generate",
  "db:migrate": "cd packages/database && drizzle-kit migrate",
  "test": "vitest",
  "test:e2e": "cd tests/e2e && npm test",
  "lint": "eslint apps packages --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "lint:fix": "eslint apps packages --ext ts,tsx --fix",
  "clean": "rm -rf dist node_modules/.cache apps/*/node_modules/.cache",
  "reset": "npm run clean && npm install"
};

// Add workspaces
pkg.workspaces = [
  "apps/*",
  "packages/*",
  "services/*"
];

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
EOJS

print_success "package.json updated"

# Phase 13: Create index files for packages
print_info "Phase 13: Creating package index files..."

# Create packages/shared/src/index.ts
cat > packages/shared/src/index.ts << 'EOF'
// Re-export all shared types and utilities
export * from './types';
export * from './constants';
export * from './utils';
export * from './validators';
EOF

# Create packages/database/src/index.ts
cat > packages/database/src/index.ts << 'EOF'
// Re-export all database schemas and utilities
export * from './schema';
export * from './client';
EOF

# Create packages/shared/package.json
cat > packages/shared/package.json << 'EOF'
{
  "name": "@stacklens/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*"
  }
}
EOF

# Create packages/database/package.json
cat > packages/database/package.json << 'EOF'
{
  "name": "@stacklens/database",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*"
  }
}
EOF

print_success "Package index files created"

# Phase 14: Create .gitkeep files
print_info "Phase 14: Creating .gitkeep files for empty directories..."

touch data/uploads/.gitkeep
touch data/ml-models/.gitkeep
touch data/cache/.gitkeep
touch dist/.gitkeep

print_success ".gitkeep files created"

# Phase 15: Update .gitignore
print_info "Phase 15: Updating .gitignore..."

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
**/node_modules/

# Build outputs
dist/
**/dist/
build/
.next/
out/

# Environment files
.env
.env.local
.env.*.local
config/environments/.env.development
config/environments/.env.production
config/environments/.env.staging

# Database
data/database/*.db
data/database/*.db-shm
data/database/*.db-wal
*.db
*.db-shm
*.db-wal

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
**/*.log

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
services/python/venv/

# ML Models & Data
data/ml-models/*.pkl
data/ml-models/*.h5
data/ml-models/*.pth
*.pkl
*.h5
*.pth

# Cache
.cache/
.vite/
.turbo/
data/cache/*
!data/cache/.gitkeep
node_modules/.cache/

# Uploads
data/uploads/*
!data/uploads/.gitkeep
uploads/*
!uploads/.gitkeep

# IDE
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
.idea/
*.swp
*.swo
*~
.DS_Store

# Testing
coverage/
.nyc_output/

# TypeScript
*.tsbuildinfo
.tsbuildinfo
**/node_modules/.cache/typescript/

# Backup files
*.backup
*.bak
*-backup-*/

# OS
.DS_Store
Thumbs.db

# Temporary
tmp/
temp/
*.tmp
EOF

print_success ".gitignore updated"

# Phase 16: Create README files
print_info "Phase 16: Creating README files..."

# Apps README
cat > apps/README.md << 'EOF'
# Applications

This directory contains the main applications of the StackLens AI platform.

## Structure

- `web/` - React frontend application (Vite + TypeScript)
- `api/` - Express backend API (Node.js + TypeScript)

## Development

```bash
# Start all apps
npm run dev

# Start individual apps
npm run dev:web
npm run dev:api
```

## Building

```bash
# Build all apps
npm run build

# Build individual apps
npm run build:web
npm run build:api
```
EOF

# Services README
cat > services/README.md << 'EOF'
# Services

This directory contains microservices for the StackLens AI platform.

## Structure

- `python/` - Python ML/AI microservices (FastAPI/Flask)

## Development

```bash
cd services/python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python src/app.py
```
EOF

# Packages README
cat > packages/README.md << 'EOF'
# Packages

This directory contains shared packages used across the application.

## Structure

- `database/` - Database schemas, migrations, and ORM (Drizzle)
- `shared/` - Shared TypeScript types, utilities, and constants

## Usage

These packages are referenced by the apps using TypeScript path aliases:

```typescript
import { User } from '@db/schema';
import { formatDate } from '@shared/utils';
```
EOF

print_success "README files created"

print_success "🎉 Restructure complete!"
echo ""
print_info "Next steps:"
echo "1. Review the new structure in your editor"
echo "2. Update import paths (automated script will be provided)"
echo "3. Test the build: npm run build"
echo "4. Test the application: npm run dev"
echo ""
print_warning "Note: Original files are preserved. After testing, you can remove old directories."
print_info "Backup location: $BACKUP_DIR"
