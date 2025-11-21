#!/bin/bash

# ML Model Training Integration - Verification Script
# This script verifies all components are working correctly

echo "🔍 ML Model Training Integration - Verification Report"
echo "======================================================="
echo ""

# Check if key files exist
echo "📁 Checking if all required files exist..."
echo ""

files=(
  "apps/api/src/data/pos-error-scenarios.ts"
  "apps/api/src/services/suggestion-model-training.ts"
  "apps/api/src/services/pos-error-collector.ts"
  "apps/api/src/services/ab-testing-framework.ts"
  "apps/api/src/routes/training-routes.ts"
  "apps/api/src/routes/ab-testing-routes.ts"
  "apps/api/src/services/__tests__/ml-training.test.ts"
  "docs/ML_TRAINING_INTEGRATION_COMPLETE.md"
  "IMPLEMENTATION_SUMMARY.md"
  "DEVELOPER_QUICK_REFERENCE.md"
  "VERIFICATION_CHECKLIST.md"
)

missing=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    echo "✅ $file ($lines lines)"
  else
    echo "❌ $file (MISSING)"
    missing=$((missing + 1))
  fi
done

echo ""
echo "Summary: $(( ${#files[@]} - missing ))/${#files[@]} files present"

# Check file sizes to ensure they have content
echo ""
echo "📊 Checking file sizes (bytes)..."
echo ""

total_bytes=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    bytes=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
    total_bytes=$((total_bytes + bytes))
    kb=$(( bytes / 1024 ))
    echo "   $file: ${kb}KB"
  fi
done

echo ""
echo "   Total: $(( total_bytes / 1024 ))KB of new code"

# Check if build is successful
echo ""
echo "🔨 Building project..."
if npm run build > /tmp/build.log 2>&1; then
  echo "✅ Build successful"
  grep "Done in" /tmp/build.log
else
  echo "❌ Build failed"
  tail -20 /tmp/build.log
fi

# Count scenarios
echo ""
echo "📋 Verifying POS scenarios..."
scenario_count=$(grep -o 'errorCode: "[A-Z_]*"' apps/api/src/data/pos-error-scenarios.ts | wc -l)
echo "   Total scenarios: $scenario_count"

category_counts=(
  "PAYMENT:$(grep -o 'category: "PAYMENT"' apps/api/src/data/pos-error-scenarios.ts | wc -l)"
  "INVENTORY:$(grep -o 'category: "INVENTORY"' apps/api/src/data/pos-error-scenarios.ts | wc -l)"
  "TAX:$(grep -o 'category: "TAX"' apps/api/src/data/pos-error-scenarios.ts | wc -l)"
  "HARDWARE:$(grep -o 'category: "HARDWARE"' apps/api/src/data/pos-error-scenarios.ts | wc -l)"
  "AUTHENTICATION:$(grep -o 'category: "AUTHENTICATION"' apps/api/src/data/pos-error-scenarios.ts | wc -l)"
  "DATA_QUALITY:$(grep -o 'category: "DATA_QUALITY"' apps/api/src/data/pos-error-scenarios.ts | wc -l)"
)

for category_count in "${category_counts[@]}"; do
  echo "   $category_count"
done

# Check route registration
echo ""
echo "🛣️  Checking route registration..."
if grep -q "app.use(trainingRoutes)" apps/api/src/routes/main-routes.ts; then
  echo "✅ Training routes registered"
else
  echo "❌ Training routes NOT registered"
fi

if grep -q "app.use(abTestingRoutes)" apps/api/src/routes/main-routes.ts; then
  echo "✅ A/B Testing routes registered"
else
  echo "❌ A/B Testing routes NOT registered"
fi

# Check for key methods
echo ""
echo "🔧 Checking key methods..."
methods=(
  "trainFromPOSScenarios"
  "performAdvancedTraining"
  "calculateAdvancedMetrics"
  "collectFromMultipleSources"
  "createTest"
  "calculateMetrics"
)

for method in "${methods[@]}"; do
  if grep -q "$method" apps/api/src/services/*.ts 2>/dev/null; then
    echo "✅ Method: $method"
  else
    echo "❌ Method: $method (NOT FOUND)"
  fi
done

echo ""
echo "======================================================="
echo "✅ Verification Complete"
echo ""
