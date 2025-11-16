# StackLens AI - Data Customization & Feature Engineering Quick Reference

## Quick Overview: How Data Transforms

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLETE DATA TRANSFORMATION FLOW                 │
└─────────────────────────────────────────────────────────────────────┘

[RAW LOG LINE]
    ↓
"[2024-01-15 14:23:45] ERROR [DB:123] - Connection timeout: Failed 
 to acquire database connection within 5000ms"
    │
    ├─→ [LOG PARSER] ──────────────────────────────────────────────────┐
    │   • Extract timestamp: 2024-01-15T14:23:45Z                      │
    │   • Detect severity: ERROR → "high"                             │
    │   • Identify keywords: connection, timeout, database             │
    │   • Error type: Database Error                                  │
    │   • Classify severity level: HIGH                               │
    └───────────────────────────────────────────────────────────────────┘
    ↓
[PARSED ERROR]
    {
      lineNumber: 142,
      severity: "high",
      errorType: "Database Error",
      message: "Connection timeout: Failed to acquire...",
      fullText: "..."
    }
    │
    ├─→ [FEATURE ENGINEER] ─────────────────────────────────────────────┐
    │   TRANSFORMATION: Raw text → 25+ ML features                     │
    │                                                                   │
    │   Statistical Features:                                          │
    │   • messageLength: 89 (raw) → normalized                         │
    │   • wordCount: 14                                                │
    │   • uppercaseRatio: 0.06 (6%)                                    │
    │   • digitRatio: 0.09 (9%)                                        │
    │   • specialCharRatio: 0.15 (15%)                                 │
    │                                                                   │
    │   Binary Features (Text Matching):                               │
    │   • hasConnection: True (keyword found)                          │
    │   • hasTimeout: True (keyword found)                             │
    │   • hasDatabase: True (keyword found)                            │
    │   • hasMemory: False (not found)                                 │
    │   • ... (10+ more binary features)                               │
    │                                                                   │
    │   Scored Features:                                               │
    │   • keywordScore: 7 (calculation below)                          │
    │   • contextualPatterns: ["error_code"]                           │
    │                                                                   │
    │   SCORING LOGIC:                                                 │
    │   "Connection" keyword = +3 (HIGH_KEYWORDS)                      │
    │   "Timeout" keyword = +4 (CRITICAL_KEYWORDS)                     │
    │   "Database" keyword = matched                                   │
    │   Total Score: 3 + 4 = 7                                         │
    └───────────────────────────────────────────────────────────────────┘
    ↓
[EXTRACTED FEATURES]
    {
      errorMessage: "Connection timeout: Failed...",
      severity: "high",
      errorType: "Database Error",
      messageLength: 89,
      wordCount: 14,
      uppercaseRatio: 0.06,
      digitRatio: 0.09,
      specialCharRatio: 0.15,
      hasException: false,
      hasTimeout: true,
      hasMemory: false,
      hasDatabase: true,
      hasNetwork: false,
      hasPermission: false,
      hasNull: false,
      hasConnection: true,
      hasFile: false,
      hasFormat: false,
      keywordScore: 7,
      contextualPatterns: ["error_code"],
      timestamp: "2024-01-15T14:23:45Z",
      lineNumber: 142,
      fileType: "log"
    }
    │
    ├─→ [ML PREDICTOR] ────────────────────────────────────────────────┐
    │   TRANSFORMATION: Features → Probabilities → Prediction          │
    │                                                                   │
    │   Step 1: Calculate Severity Probabilities                       │
    │   ┌─ Feature Input: {keywordScore: 7, hasTimeout: T, ...}       │
    │   │  Scoring Rules:                                              │
    │   │  • keywordScore 7 → high += 0.3                              │
    │   │  • hasTimeout (true) → high += 0.2                           │
    │   │  • hasDatabase (true) → high += 0.15                         │
    │   │  • hasConnection (true) → (implicit)                         │
    │   │  • messageLength 89 → high += 0.1                            │
    │   │                                                              │
    │   │  Raw Scores: {critical: 0.1, high: 0.75, medium: 0.1, ...} │
    │   │  Normalize (÷sum): {critical: 0.15, high: 0.55, ...}        │
    │   └─ Output: Severity Probabilities                              │
    │                                                                   │
    │   Step 2: Calculate Error Type Probabilities                     │
    │   ┌─ Feature Input: Same 25+ features                            │
    │   │  Scoring Rules:                                              │
    │   │  • hasDatabase (true) → Database Error += 0.4                │
    │   │  • hasTimeout (true) → Timeout Error += 0.4                  │
    │   │  • hasNetwork (false) → Network Error += 0                   │
    │   │  • hasMemory (false) → Memory Error += 0                     │
    │   │  • hasPermission (false) → Permission Error += 0             │
    │   │                                                              │
    │   │  Raw Scores: {Database: 0.4, Timeout: 0.4, Network: 0, ...} │
    │   │  Normalize: {Database: 0.33, Timeout: 0.33, ...}            │
    │   └─ Output: Error Type Probabilities                            │
    │                                                                   │
    │   Step 3: Select Predicted Classes                               │
    │   • argmax(severity): high (0.55)                                │
    │   • argmax(error_type): Database Error (0.33)                    │
    │                                                                   │
    │   Step 4: Calculate Confidence                                   │
    │   • confidence = max(0.55, 0.33) = 0.55                          │
    │                                                                   │
    │   Step 5: Generate Feature Importance                            │
    │   • hasConnection: 25% contribution                              │
    │   • hasTimeout: 22% contribution                                 │
    │   • keywordScore: 20% contribution                               │
    │   • messageLength: 15% contribution                              │
    │   • hasDatabase: 18% contribution                                │
    └───────────────────────────────────────────────────────────────────┘
    ↓
[ML PREDICTION]
    {
      predictedSeverity: "high",
      predictedErrorType: "Database Error",
      confidence: 0.55,
      probability: 0.1815,  // 0.55 * 0.33
      reasoning: "High keyword score (7) with connection and timeout...",
      suggestedActions: [
        "Check database server status",
        "Verify connection pool configuration",
        "Review recent database changes"
      ],
      featureImportance: [
        {feature: "hasConnection", contribution: 0.25},
        {feature: "hasTimeout", contribution: 0.22},
        {feature: "keywordScore", contribution: 0.20},
        {feature: "messageLength", contribution: 0.15},
        {feature: "hasDatabase", contribution: 0.18}
      ]
    }
    │
    ├─→ [SUGGESTOR / AI SERVICE] ───────────────────────────────────────┐
    │   TRANSFORMATION: Initial Prediction → AI-Enhanced Suggestion   │
    │                                                                   │
    │   Method Selection Chain:                                        │
    │   1. ML Prediction: confidence 0.55 < threshold 0.6 ✗            │
    │   2. Static Map: Match pattern → ✓ FOUND                         │
    │      └─ Use pre-built DATABASE_CONNECTION_TIMEOUT suggestion    │
    │                                                                   │
    │   If Static Map failed, would try:                               │
    │   3. Gemini AI: Send to Google API with context:                 │
    │      "Error: Database connection timeout (high severity)"        │
    │      → Receive AI analysis with root causes, fixes, examples    │
    │   4. Fallback: Generic suggestion for database errors            │
    │                                                                   │
    │   AI Enrichment (if used):                                       │
    │   • Add code examples                                            │
    │   • Add prevention measures                                      │
    │   • Refine root cause explanation                                │
    │   • Suggest best practices                                       │
    │   • Estimate resolution time                                     │
    └───────────────────────────────────────────────────────────────────┘
    ↓
[AI SUGGESTION]
    {
      source: "static_map",  // or "ai_service", "ml_model", "fallback"
      confidence: 0.88,
      rootCause: "Database connection pool unable to provide connection...",
      resolutionSteps: [
        "Step 1: Verify database server is running",
        "Step 2: Check current connections (SHOW PROCESSLIST;)",
        "Step 3: Review connection pool settings",
        "Step 4: Increase timeout to isolate issue",
        "Step 5: Implement proper connection pooling"
      ],
      codeExample: "// Connection pool configuration\n...",
      preventionMeasures: [
        "Implement database connection pooling",
        "Set up health checks",
        "Use circuit breaker pattern",
        "Implement retry logic",
        "Monitor pool metrics"
      ],
      reasoning: "Based on pattern analysis and industry practices",
      priority: "urgent",
      estimatedResolutionTime: "30-60 minutes"
    }
    │
    ├─→ [DATABASE STORAGE] ────────────────────────────────────────────┐
    │   Store all transformations:                                     │
    │   • Original parsed error (errorType, severity, message)         │
    │   • ML prediction (JSON)                                         │
    │   • ML confidence score (0.55)                                   │
    │   • AI suggestion (JSON)                                         │
    │   • Timestamps and metadata                                      │
    └───────────────────────────────────────────────────────────────────┘
    ↓
[USER INTERFACE]
    Dashboard displays:
    ├─ Error Card with severity badge (HIGH)
    ├─ ML Confidence: 55%
    ├─ Source: Static Pattern + AI
    ├─ Root Cause Analysis
    ├─ Step-by-step Resolution
    ├─ Code Examples
    ├─ Prevention Measures
    └─ Priority & Estimated Time

```

---

## Feature Engineering Details: Keyword Scoring System

```
CRITICAL_KEYWORDS (Score +4 each):
├─ "exception"       (language construct indicating error)
├─ "error"           (explicit error marker)
├─ "failed"          (failure indication)
├─ "timeout"         (operation exceeded time limit) ← FOUND
├─ "memory"          (memory-related issue)
├─ "null"            (null/nil reference)
├─ "crash"           (system crash)
├─ "fatal"           (fatal error)
└─ "critical"        (critical severity)

HIGH_KEYWORDS (Score +3 each):
├─ "warning"         (warning level)
├─ "denied"          (access denied)
├─ "permission"      (permission issue)
├─ "unauthorized"    (unauthorized access)
├─ "forbidden"       (forbidden resource)
├─ "connection"      (connection issue) ← FOUND
└─ "network"         (network issue)

MEDIUM_KEYWORDS (Score +2 each):
├─ "deprecated"      (deprecated feature)
├─ "invalid"         (invalid input)
├─ "missing"         (missing resource)
├─ "not found"       (resource not found)
├─ "format"          (format issue)
├─ "parse"           (parse error)
└─ "syntax"          (syntax error)

LOW_KEYWORDS (Score +1 each):
├─ "info"            (info level)
├─ "debug"           (debug level)
├─ "trace"           (trace level)
├─ "notice"          (notice level)
└─ "log"             (log entry)

CALCULATION FOR: "Connection timeout: Failed..."
"Connection" ∈ HIGH_KEYWORDS         = +3
"Timeout" ∈ CRITICAL_KEYWORDS        = +4
"Failed" ∈ CRITICAL_KEYWORDS         = +4
Total Keyword Score = 11

But in example, effective contribution:
- Top 2 keywords considered: connection(3) + timeout(4) = 7
```

---

## Customization Points in Data Flow

### Point 1: Log Parsing Customization
```
Raw Input: "[2024-01-15 14:23:45] ERROR [DB:123] - Connection timeout..."

Customization Options:
├─ Timestamp Format: Configure expected format
├─ Severity Mapping: Define log level → severity class mapping
├─ Error Type Rules: Customize keywords for error type detection
├─ Context Extraction: Lines before/after to include
└─ Filtering: Which lines to include/exclude

Current Implementation:
├─ Timestamp: Auto-detect various formats (ISO 8601, Unix, etc.)
├─ Severity: FATAL/CRITICAL → critical, ERROR → high, WARN → medium, etc.
├─ Error Types: 8 pre-defined categories with keyword lists
├─ Context: Current line is parsed as full text
└─ Filter: Lines matching error keywords
```

### Point 2: Feature Engineering Customization
```
Raw Features Available: 25+ different features

Customization Options:
├─ Feature Selection: Choose which features to compute
├─ Weighting: Assign importance weights to features
├─ Normalization: Scale features to different ranges
├─ New Features: Add custom feature extraction logic
└─ Thresholds: Adjust sensitivity of binary features

Current Implementation:
├─ All 25+ features computed
├─ Binary features: Simple keyword matching (on/off)
├─ Ratios: Percent-based (0-1 range)
├─ Keyword Score: 0-20+ (unbounded)
├─ Patterns: 6 contextual pattern types
```

### Point 3: ML Model Customization
```
Model Configuration:

Customization Options:
├─ Severity Weights: Adjust how features affect severity prediction
├─ Error Type Weights: Customize error type classification
├─ Confidence Threshold: Change minimum confidence for predictions
├─ Feature Contributions: Reweight individual feature impacts
└─ Model Retraining: Train on organization's specific error patterns

Current Implementation:
├─ Fixed weighting for severity calculation
├─ Fixed weighting for error type calculation
├─ MIN_CONFIDENCE_THRESHOLD = 0.6
├─ SEVERITY_WEIGHTS = {critical: 1.0, high: 0.8, medium: 0.6, low: 0.4}
└─ Trained on uploaded error data
```

### Point 4: AI Suggestion Customization
```
AI Provider: Google Gemini (configurable)

Customization Options:
├─ Prompt Template: Customize AI prompts
├─ Response Format: Define AI output structure
├─ Rate Limiting: Adjust API call frequency
├─ Fallback Strategy: Customize fallback behavior
└─ Cost Control: Implement cost management

Current Implementation:
├─ Prompt: Contextual analysis of error + expected output format
├─ Format: JSON with root_cause, steps, examples, prevention
├─ Rate Limit: 6-second minimum between calls
├─ Fallback: Static map → Gemini AI → Generic suggestion
└─ Cost: Can use cached suggestions to reduce API calls
```

### Point 5: Data Storage Customization
```
Database: SQLite (currently)

Customization Options:
├─ Schema Modifications: Add custom fields to error_logs
├─ Audit Trail: Log all transformations
├─ Retention Policy: Configure data retention
├─ Archiving: Move old data to archive storage
└─ Backup: Implement backup strategy

Current Implementation:
├─ Schema: error_logs, logFiles, mlModels tables
├─ Stored Fields: Predictions, suggestions, confidence scores
├─ Retention: No automatic cleanup (manual management)
└─ Audit: timestamp, userId tracking
```

---

## Data Transformation Summary Table

| Stage | Input | Transformation | Output | Keys |
|-------|-------|-----------------|--------|------|
| **Parse** | Raw log line | Regex matching, keyword extraction | ParsedError | severity, errorType |
| **Engineer** | ParsedError | Text analysis, scoring | ExtractedFeatures | 25+ numeric features |
| **Predict** | ExtractedFeatures | Probability calculation | PredictionResult | predictedSeverity, confidence |
| **Suggest** | PredictionResult | Method selection + AI | SuggestionResult | rootCause, steps |
| **Store** | SuggestionResult | JSON serialization | DB record | aiSuggestion JSON |
| **Display** | DB record | Format & render | UI components | Visual insights |

---

## Customization Complexity Levels

### Level 1: Low Complexity (Easy to Customize)
```
✓ Keyword lists for error type detection
✓ Severity level mapping
✓ Confidence thresholds
✓ UI display preferences
✓ Notification settings
```

### Level 2: Medium Complexity (Moderate Customization)
```
✓ Feature engineering rules
✓ Weighting schemes
✓ Pattern definitions
✓ Database schema additions
✓ API prompt templates
```

### Level 3: High Complexity (Advanced Customization)
```
✓ Model retraining with custom data
✓ Custom ML algorithms
✓ Alternative AI providers
✓ Complex business rules
✓ Integration with external systems
```

---

## Performance Considerations

### Data Processing Timeline
```
100 MB log file with 50,000 errors:

Parsing:           ~2-3 seconds  (line-by-line analysis)
Feature Engineering: ~1-2 seconds (50,000 x 25 features)
ML Prediction:     ~5-10 seconds (batch prediction)
AI Suggestions:    ~30-120 seconds (API rate limiting: 6s/call)
Database Storage:  ~2-3 seconds   (batch insert)
──────────────────────────────────
Total:             ~45-140 seconds

With AI caching:
- Duplicate error patterns: Skip AI call, use cached
- Potential speedup: 70-80% reduction in AI time
```

### Memory Usage
```
Per error log entry:
├─ Parsed data: ~500 bytes
├─ Features: ~1.5 KB
├─ Predictions: ~800 bytes
├─ Suggestions: ~2-5 KB
├─ Metadata: ~500 bytes
──────────────────────
Total per entry: ~5-8 KB

50,000 errors: 250-400 MB
```

---

**End of Quick Reference**
