# API Reference Index - StackLens AI

**Version:** 1.0  
**Updated:** November 16, 2025  
**API Version:** v1  
**Base URL:** `http://localhost:4000/api`

---

## 📚 API Documentation

Complete reference for all StackLens AI API endpoints.

---

## 🚀 Quick Start

### Making Your First Request

```bash
# Health Check
curl http://localhost:4000/api/health

# Get All Errors
curl http://localhost:4000/api/errors \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create Jira Integration
curl -X POST http://localhost:4000/api/jira/configure \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "apiUrl": "https://your-domain.atlassian.net",
    "username": "your-email@example.com",
    "apiToken": "your-api-token"
  }'
```

---

## 📋 API Endpoints Overview

### Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **GET** | `/health` | System health check |
| **GET** | `/version` | API version |
| **POST** | `/auth/login` | User authentication |
| **POST** | `/auth/logout` | User logout |
| **GET** | `/auth/me` | Current user info |

### Error Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **GET** | `/errors` | List all errors |
| **GET** | `/errors/:id` | Get error details |
| **POST** | `/errors` | Create error manually |
| **PUT** | `/errors/:id` | Update error |
| **DELETE** | `/errors/:id` | Delete error |
| **GET** | `/errors/stats/summary` | Error statistics |
| **GET** | `/errors/stats/timeline` | Error timeline |

### Jira Integration

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **GET** | `/jira/status` | Jira connection status |
| **POST** | `/jira/configure` | Configure Jira |
| **GET** | `/jira/projects` | List Jira projects |
| **GET** | `/jira/issues/:issueKey` | Get Jira issue |
| **POST** | `/jira/issues/:issueKey/comment` | Add comment to issue |

### Admin & Configuration

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **GET** | `/admin/settings` | Get system settings |
| **POST** | `/admin/settings` | Update settings |
| **GET** | `/admin/rules` | Get error rules |
| **POST** | `/admin/rules` | Create error rule |
| **PUT** | `/admin/rules/:id` | Update error rule |
| **DELETE** | `/admin/rules/:id` | Delete error rule |

### Dashboard & Real-Time

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **GET** | `/dashboard/summary` | Dashboard summary |
| **GET** | `/dashboard/metrics` | Dashboard metrics |
| **GET** | `/sse/events` | Real-time SSE stream |

---

## 🔐 Authentication

### Bearer Token

All authenticated endpoints require a Bearer token:

```bash
curl http://localhost:4000/api/errors \
  -H "Authorization: Bearer eyJhbGc..."
```

### Token Header Format

```
Authorization: Bearer <jwt_token>
```

### Getting a Token

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## 📊 Error Endpoints

### List Errors

**GET** `/api/errors`

Query Parameters:
```
severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
type: string (error type to filter)
limit: number (default: 50)
offset: number (default: 0)
sortBy: "created_at" | "severity" | "confidence"
sortOrder: "asc" | "desc"
```

**Example:**
```bash
curl "http://localhost:4000/api/errors?severity=CRITICAL&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": "err_abc123",
      "type": "DATABASE_ERROR",
      "severity": "CRITICAL",
      "message": "Database connection refused",
      "source": "database.js:45",
      "confidence": 0.95,
      "timestamp": "2025-11-16T10:30:45Z",
      "jiraTicket": "STACK-1234",
      "status": "open"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0
  }
}
```

### Get Error Details

**GET** `/api/errors/:id`

**Example:**
```bash
curl http://localhost:4000/api/errors/err_abc123 \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "id": "err_abc123",
  "type": "DATABASE_ERROR",
  "severity": "CRITICAL",
  "message": "Database connection refused",
  "source": "database.js:45",
  "stack_trace": "Error: ECONNREFUSED...",
  "confidence": 0.95,
  "timestamp": "2025-11-16T10:30:45Z",
  "created_at": "2025-11-16T10:30:45Z",
  "updated_at": "2025-11-16T10:30:45Z",
  "jiraTicket": {
    "key": "STACK-1234",
    "status": "In Progress",
    "created_at": "2025-11-16T10:31:00Z"
  },
  "metadata": {
    "requestId": "req_xyz789",
    "userId": "user_123",
    "context": {}
  }
}
```

### Error Statistics

**GET** `/api/errors/stats/summary`

**Response:**
```json
{
  "total": 1523,
  "critical": 12,
  "high": 45,
  "medium": 234,
  "low": 1232,
  "unresolvedTickets": 8,
  "ticketCreationRate": {
    "perHour": 2.3,
    "perDay": 55
  },
  "topErrorTypes": [
    {
      "type": "DATABASE_ERROR",
      "count": 456,
      "percentage": 29.9
    },
    {
      "type": "AUTH_ERROR",
      "count": 234,
      "percentage": 15.4
    }
  ]
}
```

---

## 🎫 Jira Endpoints

### Check Jira Status

**GET** `/api/jira/status`

**Response:**
```json
{
  "configured": true,
  "connected": true,
  "projectKey": "STACK",
  "url": "https://your-domain.atlassian.net",
  "lastSync": "2025-11-16T10:30:45Z"
}
```

### Configure Jira Integration

**POST** `/api/jira/configure`

**Request:**
```json
{
  "apiUrl": "https://your-domain.atlassian.net",
  "username": "your-email@example.com",
  "apiToken": "your-api-token-here",
  "projectKey": "STACK"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Jira configured successfully",
  "projectKey": "STACK",
  "verified": true
}
```

### Get Jira Issue

**GET** `/api/jira/issues/:issueKey`

**Example:**
```bash
curl http://localhost:4000/api/jira/issues/STACK-1234 \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "key": "STACK-1234",
  "title": "CRITICAL: Database connection refused",
  "status": "In Progress",
  "priority": "Highest",
  "assignee": "john.doe@example.com",
  "created": "2025-11-16T10:31:00Z",
  "updated": "2025-11-16T11:15:00Z",
  "linkedError": "err_abc123"
}
```

---

## ⚙️ Admin Endpoints

### Get System Settings

**GET** `/api/admin/settings`

**Response:**
```json
{
  "systemName": "StackLens AI",
  "errorRetention": 90,
  "logLevel": "info",
  "features": {
    "jiraIntegration": true,
    "firebaseAuth": true,
    "emailNotifications": true
  },
  "automationRules": {
    "enabled": true,
    "autoCreateTickets": true,
    "confidenceThreshold": 0.8
  }
}
```

### Create Error Rule

**POST** `/api/admin/rules`

**Request:**
```json
{
  "name": "Database Error Rule",
  "pattern": "database|sql|connection",
  "errorType": "DATABASE_ERROR",
  "severity": "CRITICAL",
  "confidenceThreshold": 0.85,
  "action": {
    "createJiraTicket": true,
    "sendNotification": true,
    "updateDashboard": true
  }
}
```

**Response:**
```json
{
  "id": "rule_abc123",
  "name": "Database Error Rule",
  "created": "2025-11-16T10:30:45Z",
  "enabled": true
}
```

---

## 📡 Real-Time Endpoints

### Server-Sent Events (SSE)

**GET** `/api/sse/events`

Subscribe to real-time updates:

```javascript
const eventSource = new EventSource(
  'http://localhost:4000/api/sse/events',
  {
    headers: {
      'Authorization': 'Bearer TOKEN'
    }
  }
);

eventSource.addEventListener('error:detected', (event) => {
  const error = JSON.parse(event.data);
  console.log('New error:', error);
});

eventSource.addEventListener('ticket:created', (event) => {
  const ticket = JSON.parse(event.data);
  console.log('Ticket created:', ticket);
});
```

### Event Types

```
- error:detected       // New error detected
- error:classified     // Error classified
- ticket:created       // Jira ticket created
- ticket:updated       // Ticket status updated
- rule:applied         // Automation rule applied
- system:status        // System status changed
```

---

## 🔄 Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* ... */ },
  "timestamp": "2025-11-16T10:30:45Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication token",
    "details": {}
  },
  "timestamp": "2025-11-16T10:30:45Z"
}
```

### Pagination Response

```json
{
  "data": [ /* ... */ ],
  "pagination": {
    "total": 1000,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## ⚠️ Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `SUCCESS` | 200 | Request succeeded |
| `BAD_REQUEST` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing/invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |
| `UNAVAILABLE` | 503 | Service unavailable |

---

## 🔗 Related Documentation

- [Complete API Reference](./00_API_INDEX.md)
- [Authentication Guide](./01_Authentication.md)
- [Error Operations](./02_Errors_Endpoint.md)
- [Jira Operations](./03_Jira_Endpoint.md)
- [Admin Operations](./04_Admin_Endpoint.md)

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Complete
