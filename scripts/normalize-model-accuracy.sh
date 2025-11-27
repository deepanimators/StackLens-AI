#!/bin/bash

# Database Model Accuracy Normalization Script
# Normalizes model_accuracy values in analysis_history table to percentage format (0-100)

echo "🔧 Normalizing model_accuracy values in analysis_history table..."

DB_PATH="data/database/stacklens.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found at $DB_PATH"
    exit 1
fi

echo "📊 Current statistics:"
sqlite3 "$DB_PATH" "
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN model_accuracy > 0 THEN 1 END) as with_accuracy,
  MIN(model_accuracy) as min_acc,
  MAX(model_accuracy) as max_acc,
  AVG(model_accuracy) as avg_acc
FROM analysis_history;
"

echo ""
echo "🔄 Normalizing values..."

# Update all decimal values (< 1) to percentage by multiplying by 100
sqlite3 "$DB_PATH" "
UPDATE analysis_history 
SET model_accuracy = model_accuracy * 100 
WHERE model_accuracy > 0 AND model_accuracy < 1;
"

UPDATED=$(sqlite3 "$DB_PATH" "SELECT changes();")
echo "✅ Updated $UPDATED records with decimal values"

echo ""
echo "📊 After normalization:"
sqlite3 "$DB_PATH" "
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN model_accuracy > 0 THEN 1 END) as with_accuracy,
  ROUND(MIN(model_accuracy), 2) as min_acc,
  ROUND(MAX(model_accuracy), 2) as max_acc,
  ROUND(AVG(model_accuracy), 2) as avg_acc
FROM analysis_history;
"

echo ""
echo "✅ Normalization complete!"
echo "📝 All model_accuracy values are now in percentage format (0-100)"
