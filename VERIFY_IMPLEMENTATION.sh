#!/bin/bash

echo "🔍 Verifying Phase 1 Week 1-2 Implementation..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Check 1: Branch exists
echo -n "✓ Checking branch... "
if git branch | grep -q "feature/pos-integration"; then
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}FAIL${NC}"
  ((FAIL++))
fi

# Check 2: Source files exist
echo -n "✓ Checking source files... "
FILES=(
  "demo-pos-app/src/types/index.ts"
  "demo-pos-app/src/logger.ts"
  "demo-pos-app/src/index.ts"
  "demo-pos-app/src/db/seed.ts"
  "demo-pos-app/src/routes/products.ts"
  "demo-pos-app/src/routes/orders.ts"
  "demo-pos-app/test/orders.test.ts"
)
MISSING=0
for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING=$((MISSING + 1))
  fi
done
if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}FAIL ($MISSING files missing)${NC}"
  ((FAIL++))
fi

# Check 3: Docker builds
echo -n "✓ Checking Docker image... "
if docker image inspect stacklens/pos-demo:1.0.0 > /dev/null 2>&1; then
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}FAIL (image not found)${NC}"
  ((FAIL++))
fi

# Check 4: Tests pass
echo -n "✓ Running tests... "
cd demo-pos-app
if npm test -- --passWithNoTests > /tmp/test-output.txt 2>&1; then
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}FAIL${NC}"
  ((FAIL++))
fi
cd ..

# Check 5: Documentation exists
echo -n "✓ Checking documentation... "
DOCS=(
  "WEEK_1_2_COMPLETION_REPORT.md"
  "IMPLEMENTATION_COMPLETE.md"
  "demo-pos-app/quickstart.sh"
)
MISSING_DOCS=0
for doc in "${DOCS[@]}"; do
  if [ ! -f "$doc" ]; then
    MISSING_DOCS=$((MISSING_DOCS + 1))
  fi
done
if [ $MISSING_DOCS -eq 0 ]; then
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}FAIL ($MISSING_DOCS docs missing)${NC}"
  ((FAIL++))
fi

# Check 6: Git commits
echo -n "✓ Checking git history... "
COMMITS=$(git log --oneline feature/pos-integration | wc -l)
if [ $COMMITS -ge 4 ]; then
  echo -e "${GREEN}PASS${NC}"
  ((PASS++))
else
  echo -e "${RED}FAIL (only $COMMITS commits)${NC}"
  ((FAIL++))
fi

# Summary
echo ""
echo "════════════════════════════════════════"
echo "Verification Summary"
echo "════════════════════════════════════════"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "Ready for: Pull Request → Code Review → Merge to develop"
  exit 0
else
  echo -e "${RED}❌ Some checks failed${NC}"
  exit 1
fi
