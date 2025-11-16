# System Architecture - StackLens AI

**Version:** 1.0  
**Updated:** November 16, 2025  
**Difficulty:** Intermediate

---

## 🏗️ Complete Architecture Overview

StackLens AI is a distributed, event-driven system with real-time error detection and automated incident management.

---

## 📐 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        StackLens AI                             │
│                     End-to-End System                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                            │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Demo POS    │  │  Production  │  │  Other Applications    │  │
│  │ Application │  │  Systems     │  │  (Future)              │  │
│  └──────┬──────┘  └───────┬──────┘  └──────────┬─────────────┘  │
│         │ logs            │ logs              │ logs            │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                      LOG STORAGE LAYER                           │
├──────────────────────────────────────────────────────────────────┤
│  /data/pos-application.log │ /logs/*.log │ /var/log/syslog      │
└─────────────┬─────────────────────────┬───────────────────────┘
              │ file changes            │ file changes
              ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                     DETECTION LAYER (API)                        │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────┐  │
│  │  LogWatcher      │  │  Error Detection  │  │  Error       │  │
│  │  Service         │→ │  Engine           │→ │  Automation  │  │
│  │  (Real-time)     │  │  (Classification) │  │  (Decision)  │  │
│  └──────────────────┘  └───────────────────┘  └──────┬───────┘  │
└───────────────────────────────────────────────────────┼──────────┘
              ▼                    ▼                     ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Jira Cloud     │  │   PostgreSQL     │  │  Dashboard       │
│  API (Tickets)  │  │   Database       │  │  (Real-time)     │
└─────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 🔄 Data Flow Architecture

### Error Detection Pipeline

```
Application Error
      ↓
Written to Log File
      ↓
LogWatcher Detects
      ↓
Read New Content
      ↓
Parse Error Details
      ↓
Pattern Matching
      ↓
Error Classified
      ↓
Severity Assigned
      ↓
Confidence Scored
      ↓
Automation Engine
      ↓
Decision: Create Ticket?
      ├─→ Yes: Create Jira Ticket
      ├─→ Update Dashboard
      └─→ Store in Database
      ↓
Real-time SSE Update
      ↓
User Sees Error
```

---

## 🏢 Component Architecture

### Components Breakdown

| Component | Type | Purpose | Language |
|-----------|------|---------|----------|
| **Demo POS App** | Application | Generate test errors | TypeScript |
| **LogWatcher** | Service | Monitor log files | TypeScript |
| **Error Detection** | Service | Classify errors | TypeScript |
| **Error Automation** | Service | Decision engine | TypeScript |
| **Jira Integration** | Service | Ticket management | TypeScript |
| **Dashboard** | Frontend | Visualization | React |
| **API Server** | Backend | REST API | Express |
| **Database** | Storage | Data persistence | PostgreSQL |

### Service Communication Pattern

```
              ┌─────────────────────┐
              │  Event Emitter      │
              │  (Communication Bus)│
              └──────────┬──────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    LogWatcher      Detection          Automation
        │                │                │
        │  emit:          │  emit:         │  emit:
        │  "error        │  "classified"  │  "ticket:
        │  detected"     │                │   created"
        │                │                │
        └────────────────┼────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
       Logger          Database      Dashboard
```

---

## 📊 Data Model Architecture

### Entity Relationships

```
┌─────────────┐
│   Errors    │
├─────────────┤
│ id (PK)     │
│ type        │─────┐
│ severity    │     │
│ message     │     │
│ confidence  │     │  1:1
│ source      │     │
│ timestamp   │     ├───→ ┌──────────┐
└─────────────┘     │     │ Tickets  │
                    │     ├──────────┤
                    └────→│ id (PK)  │
                          │ error_id │
                          │ jira_key │
                          │ status   │
                          │ created  │
                          └──────────┘

┌─────────────────┐
│ Classification  │ (Rules/Config)
│ Rules           │
├─────────────────┤
│ id (PK)         │
│ pattern         │
│ error_type      │
│ severity        │
│ enabled         │
└─────────────────┘
```

### Database Schema

```sql
-- Errors Table
CREATE TABLE errors (
  id UUID PRIMARY KEY,
  type VARCHAR(100),
  severity VARCHAR(20),      -- LOW, MEDIUM, HIGH, CRITICAL
  message TEXT,
  source VARCHAR(255),
  confidence FLOAT,           -- 0.0 to 1.0
  stack_trace TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  jira_ticket_id VARCHAR(50)  -- Reference to Jira
);

-- Jira Tickets Table
CREATE TABLE jira_tickets (
  id UUID PRIMARY KEY,
  error_id UUID REFERENCES errors(id),
  jira_key VARCHAR(50),       -- e.g., STACK-1234
  status VARCHAR(20),         -- Open, In Progress, Done
  created_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Error Rules Table
CREATE TABLE error_rules (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  pattern VARCHAR(500),       -- Regex pattern
  error_type VARCHAR(100),
  severity VARCHAR(20),
  confidence_threshold FLOAT,
  enabled BOOLEAN,
  created_at TIMESTAMP
);
```

---

## 🔌 Integration Architecture

### External APIs

```
StackLens AI
    ↓
    ├─→ Jira Cloud API v3
    │   - Create issues
    │   - Update issues
    │   - Get issue details
    │   - Custom fields
    │
    ├─→ Firebase Auth (Optional)
    │   - User authentication
    │   - Token validation
    │
    └─→ PostgreSQL Database
        - Store errors
        - Track tickets
        - Audit logs
```

### Jira Integration Flow

```
Error Detected
      ↓
Automation Rules Match
      ↓
Prepare Ticket Data
      ↓
Jira API Call
      │
      ├─→ Authenticate (Basic Auth)
      ├─→ Format Issue Payload
      ├─→ Create Issue
      └─→ Get Issue Key (STACK-1234)
      ↓
Store Ticket Reference
      ↓
Link to Error in Database
      ↓
Dashboard Shows Ticket Link
```

---

## 🌐 Network Architecture

### Deployment Topology

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
└─────────────────────────────────────────────────────────┘
              ↓              ↓              ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ API Server 1 │   │ API Server 2 │   │ API Server 3 │
│ Port 4000    │   │ Port 4000    │   │ Port 4000    │
│ (Node.js)    │   │ (Node.js)    │   │ (Node.js)    │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │  Shared Database       │
              │  PostgreSQL            │
              │  (Production)          │
              └────────────────────────┘
```

### Client Connections

```
Web Browsers
    ↓
Load Balancer (Nginx/HAProxy)
    ↓
API Server (Express)
    ↓
├─ Static Files (React App)
├─ REST API Endpoints
├─ WebSocket/SSE (Live Updates)
└─ Database Connection
```

---

## 🔐 Security Architecture

### Authentication Flow

```
User Input (Email/Password)
      ↓
JWT Generation (or OAuth)
      ↓
Token Stored Client-side
      ↓
Subsequent Requests with Token
      ↓
Server Validates Token
      ├─ Valid → Process Request
      ├─ Expired → Refresh Token
      └─ Invalid → Reject Request
```

### API Security Layers

```
Request
  ↓
Rate Limiting (Prevent DDoS)
  ↓
Authentication (Verify User)
  ↓
Authorization (Check Permissions)
  ↓
Input Validation (Sanitize Data)
  ↓
Process Request
  ↓
Response
```

### Data Protection

- **Transit:** HTTPS/TLS encryption
- **Storage:** Hashed passwords, encrypted tokens
- **Access:** Role-based access control (RBAC)
- **Audit:** Activity logging

---

## ⚡ Performance Architecture

### Caching Strategy

```
Request
  ↓
Cache Check (Redis/Memory)
  ├─ Hit → Return Cached
  └─ Miss → Query Database
           ↓
           Store in Cache
           ↓
           Return Response
```

### Async Processing

```
API Request (Fast Path)
      ↓
Acknowledge Request
      ↓
Queue Slow Task
      ↓
Worker Process (Async)
  ├─ Create Jira Ticket
  ├─ Send Email
  └─ Generate Report
      ↓
Update when Complete
```

### Indexing Strategy

```
Frequently Queried Fields:
  - errors.created_at (Range queries)
  - errors.severity (Filtering)
  - errors.type (Filtering)
  - tickets.error_id (Joins)

Create Indexes:
  CREATE INDEX idx_errors_created_at
  CREATE INDEX idx_errors_severity
  CREATE INDEX idx_errors_type
  CREATE INDEX idx_tickets_error_id
```

---

## 🔄 Scalability Architecture

### Horizontal Scaling

```
           ┌─────────────────────────────────┐
           │     Load Balancer (Nginx)       │
           └──────────────┬──────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
    Instance 1      Instance 2        Instance 3
    (API Server)    (API Server)      (API Server)
                          │
                          ▼
                   Shared Database
                   (PostgreSQL)
```

### Database Scaling

- **Read Replicas:** Multiple read-only copies
- **Sharding:** Split data across multiple databases
- **Caching:** Redis for frequently accessed data
- **Archiving:** Move old data to separate storage

---

## 🔍 Monitoring Architecture

### Metrics Collection

```
Application
    ↓
Metrics Emitted
    ├─ Response Time
    ├─ Error Count
    ├─ Request Rate
    └─ CPU/Memory
    ↓
Prometheus (Metrics DB)
    ↓
Grafana (Visualization)
    ↓
Dashboards & Alerts
```

### Logging Architecture

```
Application → Winston Logger
    ↓
├─ Console (Development)
├─ File (logs/app.log)
└─ ELK Stack (Production)
    - Elasticsearch (Storage)
    - Logstash (Processing)
    - Kibana (Visualization)
    ↓
Searchable Logs
Central Dashboard
```

---

## 📚 Deployment Architecture

### Development Environment

```
Developer Machine
├─ Node.js Runtime
├─ SQLite Database
├─ LogWatcher (Watching Local Logs)
├─ React Dev Server
└─ API Server (Hot Reload)
```

### Production Environment

```
┌─────────────────────────────────────────┐
│         Production Infrastructure        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐  │
│  │      Docker Containers          │  │
│  │ ┌──────────────┐  ┌───────────┐ │  │
│  │ │ API Server   │  │ Worker    │ │  │
│  │ │ (replicas)   │  │ Processes │ │  │
│  │ └──────────────┘  └───────────┘ │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │   Managed Services              │  │
│  │  - PostgreSQL RDS               │  │
│  │  - Redis Cache                  │  │
│  │  - S3 Storage (Optional)        │  │
│  └─────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🛠️ DevOps Architecture

### CI/CD Pipeline

```
Developer Push
      ↓
GitHub Actions Triggered
      ↓
┌──────────────┐
│ Run Tests    │
└──────┬───────┘
       ├─ PASS → Build Docker Image
       │           ↓
       │        Push to Registry
       │           ↓
       │        Deploy to Staging
       │           ↓
       │        Run E2E Tests
       │           ↓
       │        Deploy to Production
       │
       └─ FAIL → Notify Developer
```

---

## 📊 Request Flow Example

### Complete Request Lifecycle

```
1. Error Occurs in Application
   │
   ├─ Write to Log File
   │
   ▼
2. LogWatcher Detects Change
   │
   ├─ Read New Content
   │
   ▼
3. Error Detection Service
   │
   ├─ Parse & Classify
   ├─ Assign Severity
   ├─ Calculate Confidence
   │
   ▼
4. Error Automation Service
   │
   ├─ Evaluate Rules
   ├─ Make Decision
   │
   ▼
5. Actions Taken
   │
   ├─ Jira API: Create Ticket
   ├─ Database: Store Error
   ├─ SSE: Broadcast to Dashboard
   │
   ▼
6. User Sees Update
   │
   └─ Dashboard Shows Error & Ticket
```

---

## 🎯 Architecture Principles

### 1. Separation of Concerns
Each component has a single, well-defined responsibility.

### 2. Event-Driven Design
Components communicate via events, not direct calls.

### 3. Stateless Services
Services don't depend on server-specific state.

### 4. Fault Tolerance
System continues if one component fails.

### 5. Scalability
Add more servers for load distribution.

### 6. Observability
Comprehensive logging and monitoring.

### 7. Security
Multiple layers of authentication and authorization.

---

## 🔗 Related Documentation

- [Core Components](../03_CORE_COMPONENTS/00_Component_Overview.md)
- [API Reference](../04_API_REFERENCE/00_API_INDEX.md)
- [Deployment Guide](../07_DEPLOYMENT/02_Production_Deployment.md)

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Complete  
**Complexity:** Intermediate
