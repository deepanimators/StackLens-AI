# Excel Training Data Directory

This directory is used to store Excel files containing AI/ML training data for error pattern recognition and suggestion generation.

## Purpose

The StackLens AI system can learn from Excel spreadsheets containing:
- Error messages and patterns
- Error types and severities
- Root causes
- Resolution steps
- Code examples
- Prevention measures

## Excel File Format

Your Excel files should contain the following columns (column names are flexible, the system will auto-detect):

### Required Columns:
- **Error Message** / **Error** / **Message**: The actual error text
- **Error Type** / **Type**: Classification (e.g., API, Database, Network, etc.)
- **Severity**: Critical, High, Medium, or Low
- **Category**: General category for grouping

### Recommended Columns:
- **Root Cause**: What caused the error
- **Resolution Steps** / **Solution**: How to fix it (can be multiple steps)
- **Code Example**: Sample code demonstrating the issue/fix
- **Prevention Measures**: How to prevent this error in future
- **Confidence**: How confident the solution is (0.0 to 1.0)

## File Naming

- Use `.xlsx` format (Excel 2007+)
- Avoid starting filenames with `~$` (temporary files)
- Examples:
  - `error_patterns_2024.xlsx`
  - `api_errors_training.xlsx`
  - `database_issues.xlsx`

## How to Use

1. **Place Excel files** in this directory
2. **Go to AI Analysis page** in the web UI
3. **Click "Manual Training"** button
4. **Select "Train from Excel Data"**
5. The system will:
   - Read all `.xlsx` files in this directory
   - Process the data
   - Save to the `ai_training_data` database table
   - Train the ML model with the new data

## Example Excel Structure

| Error Message | Error Type | Severity | Root Cause | Resolution Steps | Confidence |
|--------------|------------|----------|------------|------------------|------------|
| Connection timeout | Network | High | Network latency | Check network; Increase timeout; Retry logic | 0.9 |
| NullPointerException | Runtime | Critical | Uninitialized variable | Add null check; Initialize properly | 0.95 |
| 404 Not Found | API | Medium | Invalid endpoint | Verify URL; Check API docs | 0.85 |

## Processing Details

- **Multiple sheets**: All sheets in a workbook are processed
- **Column detection**: Automatic mapping of column names to expected fields
- **Data validation**: Invalid records are skipped with errors logged
- **Metrics**: After processing, you'll see:
  - Total records processed
  - Records successfully saved
  - Error count
  - Severity distribution
  - Average confidence score

## Troubleshooting

### No files processed?
- Ensure files end with `.xlsx` extension
- Check files aren't temporary (don't start with `~$`)
- Verify files contain data (not just headers)

### Import errors?
- Check column names match expected format
- Ensure required columns are present
- Verify data types are correct

### Low confidence scores?
- Add more detailed resolution steps
- Include code examples
- Provide prevention measures
- Increase training data volume

## Database Table

Processed data is stored in: `ai_training_data` table with columns:
- error_type, severity, suggested_solution
- source_file, line_number
- context_before, context_after
- confidence, source
- is_validated, validated_by, validated_at
- features, original_data
- created_at, updated_at

## Best Practices

1. **Organize by domain**: Separate files for API errors, DB errors, etc.
2. **Regular updates**: Add new patterns as you encounter them
3. **Quality over quantity**: Focus on accurate, detailed records
4. **Validation**: Review and validate imported data in the Admin panel
5. **Incremental training**: Retrain the model after adding new data

## Current Status

- Directory: `/Users/deepak/Downloads/Projects/StackLens-AI-Deploy/attached_assets`
- Files ready: Check this directory for `.xlsx` files
- Last processed: See training logs in server console

---

**Need help?** Check the documentation or contact the development team.
