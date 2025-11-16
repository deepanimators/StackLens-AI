# StackLens AI - Comprehensive Data Flow Analysis
## AI Analysis, ML Prediction Models & Data Customization

---

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Data Upload Pipeline](#data-upload-pipeline)
3. [Data Processing & Feature Engineering](#data-processing--feature-engineering)
4. [ML Prediction Model Flow](#ml-prediction-model-flow)
5. [AI Analysis Pipeline](#ai-analysis-pipeline)
6. [Data Customization & Transformations](#data-customization--transformations)
7. [Database Schema](#database-schema)
8. [End-to-End Example](#end-to-end-example)

---

## System Architecture Overview

StackLens AI is a multi-layered system that processes log files through various AI/ML components:

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE (Web/Mobile)                 │
│                   Frontend (React - apps/web)                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (Node.js Express)                   │
│              apps/api/src/routes/main-routes.ts                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌──────────┐   ┌──────────┐
   │ Upload │    │ Analysis │   │   ML     │
   │Service │    │ Service  │   │ Service  │
   └────────┘    └──────────┘   └──────────┘
        │              │              │
        ▼              ▼              ▼
   ┌──────────────────────────────────────┐
   │    Feature Engineering & Processing  │
   │  (LogParser, FeatureEngineer, etc.)  │
   └──────────────────────────────────────┘
        │
        ▼
   ┌──────────────────────────────────────┐
   │   Python AI/ML Services (Optional)   │
   │  (Deep Learning, Embeddings, etc.)   │
   └──────────────────────────────────────┘
        │
        ▼
   ┌──────────────────────────────────────┐
   │      SQLite Database Storage         │
   │   (error_logs, predictions, etc.)    │
   └──────────────────────────────────────┘
```

### Key Components
- **Frontend**: React-based UI at `apps/web/src/pages/ai-analysis.tsx`
- **API Server**: Express server at `apps/api/src/routes/main-routes.ts`
- **Services**: TypeScript services for analysis, ML, and feature engineering
- **Python Backend**: Optional deep learning models at `python-services/`
- **Database**: SQLite database with schema defined in `packages/shared/src/schema.ts`

---

## Data Upload Pipeline

### 1. **File Upload Endpoint**
```
POST /api/files/upload
└── Handler: apps/api/src/routes/main-routes.ts (Line 4538)
```

**Request:**
```javascript
{
  file: <File>,           // Multipart form data
  storeNumber: "S001",   // Optional: Store identifier
  kioskNumber: "K001"    // Optional: Kiosk identifier
}
```

**Process:**
1. File received and stored in `uploads/` directory
2. File metadata extracted (name, size, MIME type, upload time)
3. Log file record created in database
4. File content read and passed to analysis service

### 2. **File Storage**
- **Location**: `uploads/` directory (local filesystem)
- **Database Record**: Stored in `logFiles` table with metadata:
  ```typescript
  {
    id: number,
    filename: string,
    originalName: string,
    fileType: string,           // 'log', 'json', 'csv', 'txt', etc.
    fileSize: number,           // in bytes
    mimeType: string,
    uploadedBy: number,         // User ID
    storeNumber?: string,       // For multi-store deployments
    kioskNumber?: string,       // For multi-kiosk deployments
    uploadTimestamp: Date,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  }
  ```

---

## Data Processing & Feature Engineering

### 1. **Log Parser Service**
**File**: `apps/api/src/services/log-parser.ts`

#### Purpose
Parses raw log file content and extracts individual error entries.

#### Process Flow
```
Raw Log Content
        │
        ▼
    Line-by-line parsing
        │
        ├─ Check against known error patterns (regex matching)
        │
        ├─ Generic error detection (keyword search)
        │       └─ Keywords: 'error', 'exception', 'failed', 'fatal', 
        │                    'critical', 'severe', 'panic', 'abort',
        │                    'crash', 'warn', 'warning', 'alert'
        │
        ▼
    Extract for each line:
    ├─ Line number
    ├─ Timestamp (if available)
    ├─ Severity level (critical, high, medium, low)
    ├─ Error type (database, network, permission, etc.)
    ├─ Error message
    ├─ Full text context
    └─ Pattern matching result
        │
        ▼
    ParsedError[] array
```

#### Severity Detection Logic
```typescript
function detectSeverity(line: string): string {
  // Priority 1: Extract explicit log level (FATAL, CRITICAL, ERROR, WARN, etc.)
  const logLevel = line.match(/\b(FATAL|CRITICAL|ERROR|WARN|WARNING|INFO|DEBUG|TRACE)\b/i);
  
  if (logLevel) {
    switch (logLevel[1].toUpperCase()) {
      case "FATAL":
      case "CRITICAL":
        return "critical";
      case "ERROR":
        return "high";
      case "WARN":
      case "WARNING":
        return "medium";
      default:
        return "low";
    }
  }
  
  // Priority 2: Keyword-based fallback detection
  if (line.includes("critical") || line.includes("fatal") || line.includes("panic"))
    return "critical";
  if (line.includes("error") || line.includes("severe") || line.includes("exception"))
    return "high";
  if (line.includes("warn") || line.includes("warning"))
    return "medium";
  
  return "low";
}
```

#### Error Type Detection
```
Error Type Classification:
├─ Database Error: Contains 'database', 'sql', 'query', 'connection'
├─ Network Error: Contains 'network', 'connection', 'socket', 'http'
├─ Permission Error: Contains 'permission', 'access', 'denied', 'unauthorized'
├─ Memory Error: Contains 'memory', 'heap', 'stack', 'oom'
├─ File System Error: Contains 'file', 'path', 'directory', 'folder'
├─ Timeout Error: Contains 'timeout', 'timed out'
├─ Format Error: Contains 'format', 'parse', 'json', 'xml', 'csv'
└─ Runtime Error: Contains 'exception', 'throw', 'catch'
```

### 2. **Feature Engineering**
**File**: `apps/api/src/services/feature-engineer.ts`

#### Purpose
Transform raw error logs into numerical features for ML models.

#### Extracted Features (ExtractedFeatures Interface)

```typescript
interface ExtractedFeatures {
  // Raw Data
  errorMessage: string;              // Original error message
  severity: string;                  // critical|high|medium|low
  errorType: string;                 // Type classification
  
  // Message Statistics
  messageLength: number;             // Character count
  wordCount: number;                 // Word count
  uppercaseRatio: number;            // % of uppercase characters
  digitRatio: number;                // % of digits
  specialCharRatio: number;          // % of special characters
  
  // Binary Features (boolean → 0/1 in ML)
  hasException: boolean;             // Contains 'exception', 'throw', 'catch'
  hasTimeout: boolean;               // Contains 'timeout', 'timed out'
  hasMemory: boolean;                // Contains 'memory', 'heap', 'stack', 'oom'
  hasDatabase: boolean;              // Contains 'database', 'sql', 'query', 'connection'
  hasNetwork: boolean;               // Contains 'network', 'connection', 'socket', 'http'
  hasPermission: boolean;            // Contains 'permission', 'access', 'denied'
  hasNull: boolean;                  // Contains 'null', 'undefined', 'nil'
  hasConnection: boolean;            // Contains 'connection', 'connect'
  hasFile: boolean;                  // Contains 'file', 'path', 'directory'
  hasFormat: boolean;                // Contains 'format', 'parse', 'json', 'xml'
  
  // Scoring Metrics
  keywordScore: number;              // 0-20+ based on keyword severity
                                     // CRITICAL_KEYWORDS (+4): exception, error, failed, 
                                     //                         timeout, memory, null, 
                                     //                         crash, fatal, critical
                                     // HIGH_KEYWORDS (+3): warning, denied, permission, 
                                     //                     unauthorized, connection, network
                                     // MEDIUM_KEYWORDS (+2): deprecated, invalid, missing,
                                     //                       'not found', format, parse
                                     // LOW_KEYWORDS (+1): info, debug, trace, notice, log
  
  // Pattern Recognition
  contextualPatterns: string[];      // ['stack_trace', 'url_reference', 'file_path',
                                     //  'error_code', 'memory_address', 'time_pattern']
  
  // Metadata
  timestamp?: string;                // When error occurred
  lineNumber?: number;               // Line in log file
  fileType?: string;                 // Source file type
}
```

#### Keyword Scoring System

```
CRITICAL_KEYWORDS (Value: 4):
├─ exception
├─ error
├─ failed
├─ timeout
├─ memory
├─ null
├─ crash
├─ fatal
└─ critical

HIGH_KEYWORDS (Value: 3):
├─ warning
├─ denied
├─ permission
├─ unauthorized
├─ forbidden
├─ connection
└─ network

MEDIUM_KEYWORDS (Value: 2):
├─ deprecated
├─ invalid
├─ missing
├─ not found
├─ format
├─ parse
└─ syntax

LOW_KEYWORDS (Value: 1):
├─ info
├─ debug
├─ trace
├─ notice
└─ log

Example Scoring:
"ERROR: Database connection timeout" 
  → error (4) + connection (3) + timeout (4) = 11 points
```

#### Contextual Pattern Recognition

```
Patterns Detected:
├─ Stack Trace: Contains "at " and "line "
├─ URL Reference: Matches http://, https://, etc.
├─ File Path: Matches file path patterns
├─ Error Code: Matches pattern like "ERROR123"
├─ Memory Address: Matches "0x[hexadecimal]"
└─ Time Pattern: Matches time formats (e.g., "12:34:56")
```

---

## ML Prediction Model Flow

### 1. **Model Architecture**
**Main Files**:
- `apps/api/src/services/predictor.ts` - ML prediction logic
- `apps/api/src/services/ml-service.ts` - ML model management
- `apps/api/src/services/model-trainer.ts` - Training orchestration

### 2. **Prediction Pipeline**

```
Error Log
    │
    ├─ Extract Features (FeatureEngineer.extractFeatures)
    │   └─ Produces: ExtractedFeatures
    │
    ├─ Load Active ML Model
    │   └─ Query: SELECT * FROM ml_models WHERE isActive = true
    │
    ▼
Predictor.predictSingle(error) OR predictBatch(errors)
    │
    ├─ Calculate Severity Probabilities
    │   ├─ Input: Extracted features
    │   └─ Output: {critical: 0.2, high: 0.5, medium: 0.2, low: 0.1}
    │
    ├─ Calculate Error Type Probabilities
    │   ├─ Input: Extracted features
    │   └─ Output: {
    │       'Runtime Error': 0.1,
    │       'Database Error': 0.6,
    │       'Network Error': 0.05,
    │       'Memory Error': 0.1,
    │       ...
    │     }
    │
    ├─ Select Predicted Classes
    │   ├─ predictedSeverity = argmax(severityProbabilities)
    │   └─ predictedErrorType = argmax(errorTypeProbabilities)
    │
    ├─ Calculate Confidence Score
    │   └─ confidence = max(severity_prob, errorType_prob)
    │
    ├─ Generate Reasoning
    │   └─ "Based on feature analysis: high memory footprint + timeout 
    │       keywords indicate Memory Error with high severity"
    │
    ├─ Generate Suggested Actions
    │   └─ Based on error type and severity
    │
    └─ Calculate Feature Importance
        └─ Which features contributed most to prediction
        
    ▼
PredictionResult
    ├─ predictedSeverity: string
    ├─ predictedErrorType: string
    ├─ confidence: number (0-1)
    ├─ probability: number (combined probability)
    ├─ reasoning: string
    ├─ suggestedActions: string[]
    ├─ modelUsed: string
    └─ featureImportance: [{feature, contribution}]
```

### 3. **Severity Probability Calculation**

```typescript
function calculateSeverityProbabilities(features): Record<string, number> {
  const scores = { critical: 0, high: 0, medium: 0, low: 0 };
  
  // 1. Keyword Score Impact (0.4x contribution)
  if (features.keywordScore > 8)      scores.critical += 0.4;
  else if (features.keywordScore > 6) scores.high += 0.3;
  else if (features.keywordScore > 3) scores.medium += 0.2;
  else                                 scores.low += 0.1;
  
  // 2. Exception Indicators
  if (features.hasException)           scores.critical += 0.3;
  if (features.hasTimeout)             scores.high += 0.2;
  if (features.hasMemory)              scores.critical += 0.25;
  if (features.hasDatabase)            scores.high += 0.15;
  if (features.hasNetwork)             scores.medium += 0.1;
  
  // 3. Message Length Impact
  if (features.messageLength > 200)    scores.high += 0.1;
  else if (features.messageLength < 50) scores.low += 0.1;
  
  // 4. Contextual Patterns
  if (features.contextualPatterns.includes('stack_trace'))
    scores.critical += 0.2;
  if (features.contextualPatterns.includes('error_code'))
    scores.high += 0.15;
  
  // 5. Normalize to probabilities (sum = 1.0)
  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  if (total > 0) {
    Object.keys(scores).forEach(key => {
      scores[key] = scores[key] / total;
    });
  }
  
  return scores;
}
```

### 4. **Error Type Classification**

```typescript
function calculateErrorTypeProbabilities(features): Record<string, number> {
  const types = {
    'Runtime Error': 0,
    'Database Error': 0,
    'Network Error': 0,
    'Memory Error': 0,
    'Permission Error': 0,
    'File System Error': 0,
    'Format Error': 0,
    'Timeout Error': 0,
    'Logic Error': 0,
    'Configuration Error': 0
  };
  
  // Feature-based type detection
  if (features.hasException)    types['Runtime Error'] += 0.3;
  if (features.hasDatabase)     types['Database Error'] += 0.4;
  if (features.hasNetwork)      types['Network Error'] += 0.35;
  if (features.hasMemory)       types['Memory Error'] += 0.4;
  if (features.hasPermission)   types['Permission Error'] += 0.45;
  if (features.hasFile)         types['File System Error'] += 0.3;
  if (features.hasFormat)       types['Format Error'] += 0.35;
  if (features.hasTimeout)      types['Timeout Error'] += 0.4;
  if (features.hasNull)         types['Logic Error'] += 0.25;
  
  // Normalize to probabilities
  const total = Object.values(types).reduce((s, v) => s + v, 0);
  if (total > 0) {
    Object.keys(types).forEach(key => {
      types[key] = types[key] / total;
    });
  }
  
  return types;
}
```

### 5. **Model Training**

**Endpoint**: `POST /api/ml/train`

**Training Process**:
```
1. Fetch all user's error logs from database
2. Extract features from each error (FeatureEngineer.extractFeatures)
3. Prepare training data format
4. Train ML model using:
   - RandomForest classifier
   - Cross-validation for accuracy estimation
   - Feature importance calculation
5. Calculate metrics:
   - Accuracy
   - Precision
   - Recall
   - F1 Score
   - Confusion Matrix
6. Save trained model to database
7. Update active model reference
```

---

## AI Analysis Pipeline

### 1. **AI Suggestion Generation**
**File**: `apps/api/src/services/suggestor.ts` / AI Service

#### Data Flow
```
Error Log
    │
    ├─ Try ML Prediction First
    │   ├─ If confidence >= MEDIUM threshold (0.6) → Use ML suggestion
    │   └─ Else → Try next method
    │
    ├─ Try Static Error Map
    │   ├─ Match against pre-built error_map.json
    │   ├─ If match found → Use static suggestion
    │   └─ Else → Try next method
    │
    ├─ Try AI Service (Google Gemini)
    │   ├─ Send error context to Gemini API
    │   ├─ Get AI-generated root cause & resolution steps
    │   └─ If successful → Use AI suggestion
    │
    └─ Fallback to Generic Suggestion
        └─ Provide basic suggestion based on error type

    ▼
SuggestionResult
    ├─ source: 'ml_model' | 'static_map' | 'ai_service' | 'fallback'
    ├─ confidence: number (0-1)
    ├─ rootCause: string
    ├─ resolutionSteps: string[]
    ├─ codeExample?: string
    ├─ preventionMeasures: string[]
    ├─ reasoning: string
    ├─ relatedPatterns: string[]
    ├─ estimatedResolutionTime: string
    └─ priority: 'immediate' | 'urgent' | 'normal' | 'low'
```

### 2. **Google Gemini AI Integration**
**File**: `apps/api/src/ai-service.ts`

#### Configuration
```
API Key: GEMINI_API_KEY (from environment)
Model: gemini-2.0-flash-exp
Rate Limiting: 6-second minimum between calls
```

#### Prompt Structure
```
User provides:
├─ Error message
├─ Error type
├─ Error severity
└─ Optional context (log file, surrounding code)

Gemini analyzes and returns:
├─ Root cause analysis
├─ Resolution steps (numbered list)
├─ Code example (if applicable)
├─ Prevention measures
├─ Confidence score
└─ Additional context
```

---

## Data Customization & Transformations

### 1. **Raw Data → Processed Data**

#### Original Log Entry
```
[2024-01-15 14:23:45] ERROR [DatabasePool:123] - Connection timeout: Failed to acquire database connection within 5000ms
```

#### Parsed Error
```json
{
  "lineNumber": 142,
  "timestamp": "2024-01-15T14:23:45Z",
  "severity": "high",
  "errorType": "Database Error",
  "message": "Connection timeout: Failed to acquire database connection within 5000ms",
  "fullText": "[2024-01-15 14:23:45] ERROR [DatabasePool:123] - Connection timeout: Failed to acquire database connection within 5000ms",
  "pattern": "DATABASE_CONNECTION_TIMEOUT"
}
```

#### Extracted Features
```json
{
  "errorMessage": "Connection timeout: Failed to acquire database connection within 5000ms",
  "severity": "high",
  "errorType": "Database Error",
  "messageLength": 89,
  "wordCount": 14,
  "uppercaseRatio": 0.06,
  "digitRatio": 0.09,
  "specialCharRatio": 0.15,
  "hasException": false,
  "hasTimeout": true,
  "hasMemory": false,
  "hasDatabase": true,
  "hasNetwork": false,
  "hasPermission": false,
  "hasNull": false,
  "hasConnection": true,
  "hasFile": false,
  "hasFormat": false,
  "wordCount": 14,
  "keywordScore": 7,  // 'connection'(3) + 'timeout'(4)
  "contextualPatterns": ["error_code"],
  "timestamp": "2024-01-15T14:23:45Z",
  "lineNumber": 142,
  "fileType": "log"
}
```

#### ML Prediction
```json
{
  "predictedSeverity": "high",
  "predictedErrorType": "Database Error",
  "confidence": 0.85,
  "probability": 0.78,
  "reasoning": "High keyword score (7) with presence of 'connection' and 'timeout' keywords indicates database connectivity issue. Message length (89 chars) and error code pattern support high severity classification.",
  "suggestedActions": [
    "Check database server status and connectivity",
    "Verify connection pool configuration (currently 5000ms timeout)",
    "Review recent database migration or deployment changes",
    "Monitor database CPU and memory usage"
  ],
  "modelUsed": "Enhanced ML Model v1.0",
  "featureImportance": [
    { "feature": "hasConnection", "contribution": 0.25 },
    { "feature": "hasTimeout", "contribution": 0.22 },
    { "feature": "hasDatabase", "contribution": 0.18 },
    { "feature": "keywordScore", "contribution": 0.20 },
    { "feature": "messageLength", "contribution": 0.15 }
  ]
}
```

#### AI Suggestion
```json
{
  "source": "ai_service",
  "confidence": 0.88,
  "rootCause": "The application is unable to acquire a connection from the database connection pool within the configured timeout period. This typically indicates either:\n1. Database server is unreachable or overloaded\n2. Connection pool is exhausted due to connection leaks\n3. Network latency is too high for the configured timeout",
  "resolutionSteps": [
    "Verify database server is running: mysql -u user -p -h dbhost -e 'SELECT 1'",
    "Check current connections: SHOW PROCESSLIST; (on database)",
    "Review connection pool settings in application config",
    "Increase timeout temporarily to isolate if it's a timing issue",
    "Implement connection pooling best practices and monitoring"
  ],
  "codeExample": "// Connection pool configuration\nconst pool = mysql.createPool({\n  host: 'localhost',\n  user: 'root',\n  password: 'password',\n  database: 'mydb',\n  connectionLimit: 10,\n  waitForConnections: true,\n  queueLimit: 0,\n  enableKeepAlive: true,\n  keepAliveInitialDelayMs: 0\n});",
  "preventionMeasures": [
    "Implement database connection pooling with proper monitoring",
    "Set up health checks for database connectivity",
    "Use circuit breaker pattern for database calls",
    "Implement proper error handling and retry logic",
    "Monitor connection pool metrics in production"
  ],
  "reasoning": "AI-powered analysis of error context and recent industry practices",
  "relatedPatterns": ["Database Error", "high"],
  "estimatedResolutionTime": "30-60 minutes",
  "priority": "urgent"
}
```

### 2. **Data Customizations Applied**

#### Customization Layer 1: Log Parsing
| Transformation | Purpose | Example |
|---|---|---|
| **Timestamp Extraction** | Standardize date formats | `[2024-01-15 14:23:45]` → ISO 8601 |
| **Severity Classification** | Map log levels to categories | `ERROR` → `high`, `WARN` → `medium` |
| **Error Type Detection** | Categorize error source | Keywords → Database/Network/Memory |
| **Noise Removal** | Filter non-error lines | Remove DEBUG, INFO, TRACE unless critical |
| **Context Extraction** | Get surrounding code | Lines before/after error occurrence |

#### Customization Layer 2: Feature Engineering
| Feature | Raw→Processed | Purpose |
|---|---|---|
| **Message Length** | 89 chars → normalized | Indicates verbosity/complexity |
| **Keyword Scoring** | Text analysis → 0-20 score | Quantifies severity keywords |
| **Binary Features** | Text search → True/False | Machine learning input |
| **Pattern Recognition** | Regex matching → Pattern list | Detects stack traces, URLs, etc. |
| **Statistical Features** | Character analysis → Ratios | Uppercase, digit, special char % |

#### Customization Layer 3: ML Prediction
| Transformation | Input | Output | Purpose |
|---|---|---|---|
| **Probability Calculation** | Features + weights | {critical: 0.2, high: 0.5, ...} | ML classification |
| **Confidence Scoring** | Probabilities → Max | 0-1 score | Trustworthiness metric |
| **Feature Importance** | Model weights | Ranked features | Explainability |
| **Reasoning Generation** | Features + rules | Natural language | Human understanding |

#### Customization Layer 4: AI Enhancement
| Transformation | Input | Output | Purpose |
|---|---|---|---|
| **Context Enrichment** | Basic suggestion | Detailed analysis | Add domain knowledge |
| **Code Examples** | Error type | Runnable code | Practical guidance |
| **Prevention Measures** | Error patterns | Best practices | Long-term improvement |
| **Priority Adjustment** | ML confidence + AI analysis | Updated priority | Better prioritization |

---

## Database Schema

### Core Tables

#### 1. **error_logs Table**
```sql
CREATE TABLE error_logs (
  id INTEGER PRIMARY KEY,
  fileId INTEGER,              -- References logFiles.id
  storeNumber TEXT,            -- Store identifier
  kioskNumber TEXT,            -- Kiosk identifier
  lineNumber INTEGER NOT NULL,
  timestamp INTEGER,           -- Unix timestamp
  severity TEXT NOT NULL,      -- critical|high|medium|low
  errorType TEXT NOT NULL,     -- Error classification
  message TEXT NOT NULL,       -- Error message
  fullText TEXT NOT NULL,      -- Complete error context
  pattern TEXT,                -- Matched error pattern
  resolved INTEGER DEFAULT 0,  -- Is error resolved?
  aiSuggestion JSON,           -- AI-generated suggestion
  mlPrediction JSON,           -- ML model prediction
  mlConfidence REAL DEFAULT 0, -- ML confidence (0-1)
  createdAt INTEGER            -- Timestamp
);
```

#### 2. **logFiles Table**
```sql
CREATE TABLE logFiles (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL,
  originalName TEXT NOT NULL,
  fileType TEXT NOT NULL,      -- Type of file
  fileSize INTEGER NOT NULL,   -- Size in bytes
  mimeType TEXT NOT NULL,
  uploadedBy INTEGER,          -- References users.id
  storeNumber TEXT,            -- Optional: store ID
  kioskNumber TEXT,            -- Optional: kiosk ID
  uploadTimestamp INTEGER,
  analysisTimestamp INTEGER,
  errorsDetected TEXT,         -- JSON array
  anomalies TEXT,              -- JSON array
  predictions TEXT,            -- JSON array
  suggestions TEXT,            -- JSON array
  totalErrors INTEGER DEFAULT 0,
  criticalErrors INTEGER DEFAULT 0,
  highErrors INTEGER DEFAULT 0,
  mediumErrors INTEGER DEFAULT 0,
  lowErrors INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- processing|completed|failed
  errorMessage TEXT,
  analysisResult TEXT
);
```

#### 3. **mlModels Table**
```sql
CREATE TABLE mlModels (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,          -- Model name
  version TEXT NOT NULL,       -- Version string
  modelPath TEXT NOT NULL,     -- Path to model file
  modelType TEXT,              -- classification|regression
  accuracy REAL,               -- Model accuracy (0-1)
  precision REAL,
  recall REAL,
  f1Score REAL,
  trainingDataSize INTEGER,    -- Size of training dataset
  trainedAt INTEGER,           -- Training timestamp
  isActive INTEGER DEFAULT 0,  -- Is this the active model?
  trainingMetrics JSON,        -- Additional metrics
  createdAt INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
```

---

## End-to-End Example

### Scenario: Database Connection Timeout Error

#### Step 1: File Upload
```
User uploads: app_errors_2024_01_15.log
File size: 2.5 MB
Upload time: 2024-01-15T16:30:00Z
```

#### Step 2: File Storage
```
Database record created:
- fileId: 42
- filename: app_errors_2024_01_15.log
- uploadedBy: 5
- status: pending
- totalErrors: 0 (to be updated after analysis)
```

#### Step 3: Log Parsing
```
File content analyzed line by line:
...
Line 142: "[2024-01-15 14:23:45] ERROR [DatabasePool:123] - Connection timeout: Failed to acquire database connection within 5000ms"
...

Parsed result:
- lineNumber: 142
- severity: high (extracted from "ERROR" log level)
- errorType: Database Error (detected from keywords)
- message: "Connection timeout: Failed to acquire database connection within 5000ms"
```

#### Step 4: Feature Engineering
```
FeatureEngineer.extractFeatures() produces:

ExtractedFeatures {
  errorMessage: "Connection timeout: Failed to acquire database connection within 5000ms",
  severity: "high",
  errorType: "Database Error",
  messageLength: 89,
  wordCount: 14,
  hasConnection: true,
  hasTimeout: true,
  hasDatabase: true,
  keywordScore: 7,  // 'connection' (3) + 'timeout' (4)
  contextualPatterns: ["error_code"]
  // ... 20+ more features
}
```

#### Step 5: ML Prediction
```
Predictor.predictSingle(error) executes:

1. Load active ML model: "Enhanced ML Model v1.0"
2. Calculate severity probabilities:
   {
     critical: 0.15,
     high: 0.55,      ← Selected (highest)
     medium: 0.20,
     low: 0.10
   }

3. Calculate error type probabilities:
   {
     'Runtime Error': 0.05,
     'Database Error': 0.60,  ← Selected (highest)
     'Network Error': 0.10,
     'Memory Error': 0.05,
     // ... others
   }

4. Generate prediction result:
   {
     predictedSeverity: "high",
     predictedErrorType: "Database Error",
     confidence: 0.58,  // max(0.55, 0.60)
     probability: 0.33,  // 0.55 * 0.60
     reasoning: "High keyword score (7) with connection + timeout + database keywords...",
     suggestedActions: [
       "Check database server status",
       "Verify connection pool configuration",
       // ... more actions
     ]
   }
```

#### Step 6: AI Suggestion Generation
```
Suggestor.getSuggestion(error) executes:

1. Try ML prediction first:
   - confidence (0.58) >= MEDIUM threshold (0.6)? NO
   - Continue to next method

2. Try static error map:
   - Match against DATABASE_CONNECTION_TIMEOUT pattern
   - Found! Return static suggestion

3. If not found or low confidence, try Gemini AI:
   - Send error context to Google Gemini
   - Receive AI-generated analysis with:
     * Root cause explanation
     * Step-by-step resolution
     * Code examples
     * Prevention measures

Final suggestion saved with source: 'static_map' or 'ai_service'
```

#### Step 7: Database Storage
```
Error log record created/updated:

error_logs {
  fileId: 42,
  lineNumber: 142,
  severity: "high",
  errorType: "Database Error",
  message: "Connection timeout: Failed to acquire database connection within 5000ms",
  mlPrediction: JSON.stringify({
    predictedSeverity: "high",
    predictedErrorType: "Database Error",
    confidence: 0.58,
    // ... full prediction
  }),
  mlConfidence: 0.58,
  aiSuggestion: JSON.stringify({
    rootCause: "Database connection pool exhaustion...",
    resolutionSteps: [...],
    // ... full suggestion
  }),
  createdAt: timestamp
}

logFiles record updated:
- totalErrors: 1
- highErrors: 1
- status: "completed"
- analysisResult: JSON with all analysis
```

#### Step 8: Frontend Display
```
User sees in AI Analysis dashboard:

Error Card:
┌─────────────────────────────────────┐
│ Database Connection Timeout (HIGH)   │
│ Line 142 - 2024-01-15 14:23:45      │
├─────────────────────────────────────┤
│                                     │
│ ML Confidence: 58%                  │
│ Source: Static Pattern + AI         │
│                                     │
│ Root Cause:                         │
│ Database connection pool is         │
│ unable to provide a connection      │
│ within the 5000ms timeout period    │
│                                     │
│ Resolution Steps:                   │
│ 1. Check database server status    │
│ 2. Verify connection pool config   │
│ 3. Review pool metrics             │
│ 4. Increase timeout if needed      │
│                                     │
│ Prevention Measures:                │
│ • Implement connection pooling     │
│ • Set up health checks             │
│ • Use circuit breaker pattern      │
│                                     │
│ Code Example: [View Code]          │
│                                     │
└─────────────────────────────────────┘
```

---

## Summary: Data Transformation Journey

```
RAW LOG FILE
     ↓
   [1] File Upload & Storage
     ↓
   [2] Log Parsing
       - Extract lines
       - Detect severity
       - Identify error type
     ↓
   [3] Feature Engineering
       - Calculate metrics
       - Keyword scoring
       - Pattern recognition
     ↓
   [4] ML Prediction
       - Compute probabilities
       - Generate confidence score
       - Create reasoning
     ↓
   [5] AI Suggestion Layer
       - Try ML first
       - Try static map
       - Try Gemini AI
       - Fallback to generic
     ↓
   [6] Database Storage
       - Save error log
       - Store predictions
       - Store suggestions
     ↓
   [7] Frontend Presentation
       - Display in dashboard
       - Show confidence
       - Provide actions
     ↓
ACTIONABLE INSIGHTS FOR USER
```

---

## Data Flow Customization Recap

### No Customization
- Direct pass-through of parsed data

### Customization 1: Severity Classification
- Raw log level → Standardized severity category
- Rules-based mapping from log keywords

### Customization 2: Error Type Detection
- Keywords analysis → Error category
- Multiple keywords can indicate type

### Customization 3: Feature Extraction
- Raw message → 25+ numerical features
- Text analysis, statistical measures

### Customization 4: ML Scoring
- Features → Probabilistic predictions
- Weighted keyword scoring (4 levels)

### Customization 5: AI Enhancement
- Initial prediction → Detailed contextual analysis
- Google Gemini API for domain expertise

### Customization 6: Confidence Adjustment
- Multiple sources → Weighted confidence score
- Priority recalculation based on combined intelligence

---

**End of Document**
