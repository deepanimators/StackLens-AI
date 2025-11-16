# Production-Ready Restructuring - Implementation Guide

## 📋 Overview

This guide provides a **safe, step-by-step** approach to restructure StackLens AI into a production-ready, scalable architecture **without breaking any existing functionality**.

## 🎯 Goals

1. ✅ **Organize** codebase into logical, scalable structure
2. ✅ **Maintain** all existing functionality
3. ✅ **Improve** developer experience and collaboration
4. ✅ **Enable** easier deployment and scaling
5. ✅ **Enhance** testability and maintainability

## 📁 Current vs New Structure

### Current (Cluttered):
```
root/
├── 30+ .ps1 files
├── 15+ .md files  
├── 5+ test files
├── client/, server/, python-services/ (at root level)
└── Configurations scattered everywhere
```

### New (Organized):
```
root/
├── apps/           # Applications (web, api)
├── services/       # Microservices (python)
├── packages/       # Shared code (database, shared)
├── infrastructure/ # Deployment, Docker, scripts
├── docs/          # All documentation
├── data/          # Database, uploads, models
├── config/        # All configurations
└── tests/         # All test files
```

## 🚀 Implementation Steps

### Phase 1: Preparation (5 minutes)

1. **Backup Everything**
   ```bash
   # Automatic backup will be created by script
   # Located at: ../stacklens-ai-backup-[timestamp]
   ```

2. **Ensure Clean Git State**
   ```bash
   git status
   git add .
   git commit -m "Pre-restructure checkpoint"
   ```

3. **Make Scripts Executable**
   ```bash
   chmod +x restructure.sh
   chmod +x update-imports.sh
   ```

### Phase 2: Restructure (10 minutes)

4. **Run Restructure Script**
   ```bash
   ./restructure.sh
   ```
   
   This will:
   - ✅ Create new directory structure
   - ✅ Copy files to new locations (originals preserved)
   - ✅ Create new configuration files
   - ✅ Update package.json scripts
   - ✅ Setup TypeScript project references

5. **Verify New Structure**
   ```bash
   # Check that key directories exist
   ls -la apps/web/src
   ls -la apps/api/src
   ls -la packages/database/src
   ls -la packages/shared/src
   ```

### Phase 3: Update Imports (15 minutes)

6. **Run Import Update Script**
   ```bash
   ./update-imports.sh
   ```
   
   This will:
   - ✅ Update all import paths in web app
   - ✅ Update all import paths in API
   - ✅ Update shared package imports
   - ✅ Update database package imports

7. **Manual Import Fixes (if needed)**
   
   Check for any remaining import issues:
   ```bash
   npm run check
   ```

### Phase 4: Configuration Updates (10 minutes)

8. **Update Environment Files**
   
   ```bash
   # Copy current .env to new location
   cp .env config/environments/.env.development
   
   # Update VITE_API_URL if needed
   # Edit config/environments/.env.development
   ```

9. **Update Drizzle Config**
   
   Edit `packages/database/drizzle.config.ts`:
   ```typescript
   import { defineConfig } from "drizzle-kit";
   
   export default defineConfig({
     schema: "./src/schema/*.ts",
     out: "./src/migrations",
     dialect: "sqlite",
     dbCredentials: {
       url: "../../data/database/stacklens.db",
     },
     verbose: true,
     strict: true,
   });
   ```

10. **Update Server Index**
    
    Edit `apps/api/src/index.ts` to use new paths:
    ```typescript
    import { registerRoutes } from "./routes/legacy-routes";
    import { setupVite, serveStatic, log } from "./vite";
    ```

### Phase 5: Build & Test (15 minutes)

11. **Install Dependencies**
    ```bash
    npm install
    ```

12. **Build the Application**
    ```bash
    npm run build
    ```
    
    Expected output:
    - ✅ `dist/web/` - Frontend built successfully
    - ✅ `dist/api/` - Backend built successfully

13. **Test Development Mode**
    ```bash
    npm run dev
    ```
    
    Verify:
    - ✅ Frontend loads at http://localhost:5173
    - ✅ API responds at http://localhost:4000/api
    - ✅ Authentication works
    - ✅ File upload works
    - ✅ Error analysis works

### Phase 6: Cleanup (5 minutes)

14. **Remove Old Directories** (Only after successful testing!)
    
    ```bash
    # ONLY run this after verifying everything works!
    rm -rf client/
    rm -rf server/
    rm -rf shared/
    rm -rf python-services/ # Move to services/python first
    rm *.ps1  # Now in infrastructure/deployment/windows/scripts
    rm *.sh   # Now in infrastructure/deployment/linux/scripts (except our new scripts)
    rm test-*.* debug-*.html react-test.html
    ```

15. **Update .gitignore**
    
    The script already created a new .gitignore, verify it includes:
    ```
    dist/
    node_modules/
    data/database/*.db
    data/uploads/*
    config/environments/.env.*
    ```

### Phase 7: Documentation (10 minutes)

16. **Update README.md**
    
    Update the main README to reflect new structure:
    ```markdown
    ## Project Structure
    
    ```
    stacklens-ai/
    ├── apps/           # Applications
    ├── services/       # Microservices
    ├── packages/       # Shared packages
    ├── infrastructure/ # Deployment
    ├── docs/          # Documentation
    ├── data/          # Data storage
    └── config/        # Configuration
    ```
    ```

17. **Update Build Guide**
    
    Update `docs/development/BUILD-GUIDE.md` with new commands:
    ```bash
    # Development
    npm run dev        # Start both web and API
    npm run dev:web    # Start only frontend
    npm run dev:api    # Start only backend
    
    # Building
    npm run build      # Build both
    npm run build:web  # Build frontend only
    npm run build:api  # Build backend only
    
    # Database
    npm run db:push    # Push schema changes
    npm run db:generate # Generate migrations
    ```

### Phase 8: Deployment Scripts (10 minutes)

18. **Update PowerShell Scripts**
    
    Edit `infrastructure/deployment/windows/scripts/02-SETUP.ps1`:
    ```powershell
    # Update paths to use new structure
    cd $PSScriptRoot\..\..\..\..\
    
    # Build command remains the same
    npm run build
    ```

19. **Test Deployment**
    
    Run the deployment script to ensure it works:
    ```powershell
    .\infrastructure\deployment\windows\scripts\02-SETUP.ps1
    ```

### Phase 9: Final Validation (15 minutes)

20. **Complete Feature Testing**
    
    Test all major features:
    
    - [ ] **Authentication**
      - [ ] Firebase Google Sign-in
      - [ ] User session persistence
      
    - [ ] **File Upload**
      - [ ] Excel file upload
      - [ ] Log file upload
      - [ ] CSV file upload
      
    - [ ] **Error Analysis**
      - [ ] AI-powered analysis
      - [ ] ML predictions
      - [ ] RAG suggestions
      
    - [ ] **Dashboard**
      - [ ] Error statistics
      - [ ] Charts and graphs
      - [ ] Filtering system
      
    - [ ] **Store/Kiosk Features**
      - [ ] Store selection
      - [ ] Kiosk filtering
      - [ ] File filtering by store/kiosk

21. **Performance Check**
    ```bash
    # Build size check
    du -sh dist/web
    du -sh dist/api
    
    # Startup time check
    time npm run start
    ```

22. **Git Commit**
    ```bash
    git add .
    git commit -m "refactor: Restructure to production-ready architecture
    
    - Organize code into apps/, services/, packages/ structure
    - Move deployment scripts to infrastructure/
    - Consolidate documentation in docs/
    - Update all import paths and configurations
    - Maintain backward compatibility
    
    BREAKING CHANGE: None - all functionality preserved"
    ```

## 📊 Success Criteria

### ✅ Must Pass:
- [ ] `npm run build` succeeds without errors
- [ ] `npm run dev` starts both frontend and API
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npm run check`
- [ ] All API endpoints respond correctly
- [ ] Authentication flow works end-to-end
- [ ] File upload and analysis works
- [ ] Dashboard displays data correctly

### ✅ Performance:
- [ ] Build time < 2 minutes
- [ ] Bundle size similar to previous
- [ ] API response time unchanged
- [ ] Frontend load time unchanged

### ✅ Developer Experience:
- [ ] Clear folder structure
- [ ] Easy to find files
- [ ] Intuitive import paths
- [ ] Good documentation

## 🔧 Troubleshooting

### Issue: Build Fails

**Solution:**
```bash
# Clean and reinstall
npm run clean
npm install
npm run build
```

### Issue: Import Errors

**Solution:**
```bash
# Check TypeScript path aliases in tsconfig files
# Verify apps/web/tsconfig.json has correct paths
# Verify apps/api/tsconfig.json has correct paths
```

### Issue: Vite Config Error

**Solution:**
```bash
# Check apps/web/vite.config.ts
# Ensure paths are correct:
# - alias "@" points to "./src"
# - alias "@shared" points to "../../packages/shared/src"
# - alias "@db" points to "../../packages/database/src"
```

### Issue: Database Connection Error

**Solution:**
```bash
# Check database path in apps/api/src/config/database.ts
# Should point to: ../../data/database/stacklens.db
# OR use relative path: path.resolve(__dirname, "../../../data/database/stacklens.db")
```

### Issue: Environment Variables Not Loading

**Solution:**
```bash
# Check .env location
# Should be: config/environments/.env.development
# Update apps to load from correct location
```

## 📝 Post-Restructure Tasks

1. **Update CI/CD Pipelines**
   - Update build commands in GitHub Actions
   - Update deployment paths
   - Update test commands

2. **Update Team Documentation**
   - Share new structure with team
   - Update onboarding docs
   - Create architecture diagrams

3. **Monitor Production**
   - Check for any runtime issues
   - Monitor error logs
   - Verify all features work

## 🎉 Benefits Achieved

After successful restructuring:

1. ✅ **Better Organization**
   - Clear separation of concerns
   - Easy to navigate codebase
   - Logical folder structure

2. ✅ **Improved Scalability**
   - Easy to add new apps
   - Easy to add new services
   - Easy to add new packages

3. ✅ **Enhanced Collaboration**
   - Clear ownership boundaries
   - Better code reviews
   - Easier onboarding

4. ✅ **Streamlined Deployment**
   - Organized deployment scripts
   - Clear build process
   - Better documentation

5. ✅ **Professional Codebase**
   - Industry-standard structure
   - Modern monorepo pattern
   - Production-ready architecture

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the backup at `../stacklens-ai-backup-[timestamp]`
3. Restore from backup if needed: `cp -r ../stacklens-ai-backup-[timestamp]/* .`
4. Check Git history: `git log --oneline`

## 🔄 Rollback Plan

If something goes wrong:

```bash
# Option 1: Restore from backup
rm -rf apps packages services infrastructure docs data config tests
cp -r ../stacklens-ai-backup-[timestamp]/* .
npm install
npm run build

# Option 2: Git reset
git reset --hard HEAD~1
npm install
npm run build
```

---

**Total Estimated Time: 1.5 - 2 hours**

**Risk Level: Low** (Backup created, originals preserved, gradual migration)

**Recommended: Run during low-traffic period or in development environment first**
