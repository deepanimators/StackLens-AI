# 🎯 Production-Ready Demo: POS + StackLens AI + Jira Integration

## Executive Summary

This document outlines a **production-ready MVP approach** to showcase StackLens AI as an intelligent error monitoring and automated ticket creation system. The demo will feature:

1. **Demo POS Application** - A lightweight point-of-sale system
2. **Real-time Error Logging** - Continuous log monitoring
3. **StackLens AI Analysis** - Intelligent error detection & prediction
4. **Jira Automation** - Automatic ticket creation with solutions
5. **Live Monitoring UI** - Real-time error dashboard

---

## Part 1: Current State Analysis

### ✅ What Exists in Your Codebase

Your StackLens AI application already has:

#### 1. **Core Analysis Pipeline** ✓
- Log parsing service (`apps/api/src/services/log-parser.ts`)
- Feature engineering (`apps/api/src/services/feature-engineer.ts`)
- ML prediction models (`apps/api/src/services/predictor.ts`)
- AI suggestion service (`apps/api/src/services/suggestor.ts`)
- Error pattern detection (`apps/api/src/services/pattern-analyzer.ts`)

#### 2. **File Upload & Processing** ✓
- File upload endpoint: `POST /api/files/upload`
- Background job processor (`apps/api/src/processors/background-processor.ts`)
- Database storage layer (`apps/api/src/database/storage.ts`)

#### 3. **Database** ✓
- SQLite schema with error logs table
- Analysis history tracking
- Error pattern storage

#### 4. **API Endpoints** ✓
- Dashboard stats: `GET /api/dashboard/stats`
- Error listing: `GET /api/errors`
- Analysis endpoints: `GET /api/analysis/history`

#### 5. **Web UI** ✓
- File upload page (`apps/web/src/pages/upload.tsx`)
- Dashboard (`apps/web/src/pages/dashboard.tsx`)
- Analysis history (`apps/web/src/pages/analysis-history.tsx`)
- Settings/Admin panel (`apps/web/src/pages/admin.tsx`)

---

### ❌ What Needs to Be Built

#### 1. **Demo POS Application** (NOT IMPLEMENTED)
- Simple Node.js/Express POS system
- Product management with pricing
- Order processing
- Real-time log output

#### 2. **Real-time Log Monitoring** (PARTIAL)
- File upload is manual, needs continuous streaming
- Need file watcher for real-time ingestion
- WebSocket support for live updates

#### 3. **Jira Integration** (NOT IMPLEMENTED)
- Jira API connection module
- Automatic ticket creation
- Issue linking and updates
- Custom field mapping

#### 4. **Enhanced Monitoring UI** (PARTIAL)
- Dashboard exists but needs real-time updates
- Need live error stream visualization
- Jira ticket status display

---

## Part 2: MVP Architecture

### High-Level Flow Diagram

```
┌─────────────────┐
│   Demo POS App  │  (Node.js + Express)
│  - Orders       │
│  - Pricing      │
│  - Logs         │
└────────┬────────┘
         │
         │ writes logs
         ▼
┌──────────────────────┐
│  Log File Watcher    │  (Real-time)
│  (chokidar module)   │
│  - Monitors file     │
│  - Stream to API     │
└────────┬─────────────┘
         │
         │ HTTP/WebSocket
         ▼
┌──────────────────────────────────┐
│   StackLens AI API               │
│  (Your existing application)     │
│  ┌────────────────────────────┐  │
│  │ Log Parser                 │  │
│  │ Feature Engineer           │  │
│  │ ML Predictor               │  │
│  │ Error Analyzer             │  │
│  └────────────────────────────┘  │
└────────┬─────────────────────────┘
         │
         │ Analysis result
         ▼
┌──────────────────────────────────┐
│   Jira Integration Module        │  (NEW)
│  - Create tickets               │
│  - Add descriptions             │
│  - Link to errors               │
└────────┬─────────────────────────┘
         │
         │ API call
         ▼
┌──────────────────────┐
│   Jira Cloud API     │
│  - Creates tickets   │
│  - Tracks issues     │
└──────────────────────┘
         │
         ▲
         │
    triggers
         │
┌──────────────────────────────────┐
│   Web Dashboard UI               │  (ENHANCED)
│  - Live error stream             │
│  - AI analysis display           │
│  - Jira ticket status            │
│  - Automation controls           │
└──────────────────────────────────┘
```

---

## Part 3: Implementation Roadmap

### Phase 1: Demo POS Application (3-4 hours)

#### 1.1 Create Demo POS Service

**File to Create:** `demo-services/pos-application.ts`

```typescript
import express from 'express';
import { createWriteStream, appendFileSync } from 'fs';
import { join } from 'path';

const app = express();
app.use(express.json());

// Product database
const products = [
  { id: 1, name: "Coffee", price: 2.50, quantity: 100 },
  { id: 2, name: "Tea", price: 1.50, quantity: 100 },
  { id: 3, name: "Snack", price: 3.00, quantity: 50 },
  { id: 999, name: "Premium Item", price: null, quantity: 10 }, // NO PRICE
];

// Order log file
const LOG_FILE = join(process.cwd(), 'data', 'pos-application.log');

function logEvent(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} [${level}] ${message}${data ? ': ' + JSON.stringify(data) : ''}`;
  console.log(logEntry);
  appendFileSync(LOG_FILE, logEntry + '\n');
}

// API: Create order
app.post('/api/orders', (req, res) => {
  const { items } = req.body;
  const orderId = Math.random().toString(36);
  
  try {
    logEvent('INFO', 'Order received', { orderId, itemCount: items.length });
    
    let total = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        logEvent('ERROR', 'Product not found', { productId: item.productId, orderId });
        throw { code: 'PRODUCT_NOT_FOUND', message: `Product ${item.productId} not found` };
      }
      
      if (product.price === null) {
        logEvent('ERROR', 'Product has no price', { productId: item.productId, productName: product.name, orderId });
        throw {
          code: 'MISSING_PRICE',
          message: `Product "${product.name}" (ID: ${item.productId}) does not have a price configured`,
          severity: 'HIGH'
        };
      }
      
      total += product.price * item.quantity;
      orderItems.push({ ...item, price: product.price });
    }
    
    logEvent('INFO', 'Order total calculated', { orderId, total, itemCount: items.length });
    res.json({ orderId, total, items: orderItems, status: 'completed' });
    
  } catch (error: any) {
    logEvent('ERROR', 'Order processing failed', { orderId, error: error.message, code: error.code });
    res.status(400).json(error);
  }
});

// API: Get products
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.listen(3001, () => {
  logEvent('INFO', 'Demo POS Application started on port 3001');
});
```

**Key Features:**
- ✓ Simple product management
- ✓ Order processing with validation
- ✓ Real-time logging to file
- ✓ Deliberate error: Product 999 has NO PRICE (triggers our demo)
- ✓ Detailed error messages with severity

#### 1.2 Create Log Watcher Service

**File to Create:** `apps/api/src/services/log-watcher.ts`

```typescript
import { watch } from 'chokidar';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class LogWatcher extends EventEmitter {
  private watcher: any;
  private lastPosition: Map<string, number> = new Map();
  private watchDir: string;

  constructor(watchDir: string = 'data') {
    super();
    this.watchDir = watchDir;
  }

  start(logFile: string) {
    console.log(`🔍 Starting log watcher for: ${logFile}`);

    this.watcher = watch(logFile, {
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    this.watcher.on('change', (filePath: string) => {
      this.handleFileChange(filePath);
    });

    this.watcher.on('error', (error: any) => {
      console.error('❌ Log watcher error:', error);
      this.emit('error', error);
    });
  }

  private handleFileChange(filePath: string) {
    try {
      const fileSize = fs.statSync(filePath).size;
      const lastPos = this.lastPosition.get(filePath) || 0;

      if (fileSize < lastPos) {
        // File was truncated
        this.lastPosition.set(filePath, 0);
      }

      if (fileSize > lastPos) {
        // New data added
        const stream = fs.createReadStream(filePath, {
          start: lastPos,
          encoding: 'utf8',
        });

        let newLines = '';
        stream.on('data', (chunk) => {
          newLines += chunk;
        });

        stream.on('end', () => {
          this.lastPosition.set(filePath, fileSize);
          
          // Emit each new line as an event
          const lines = newLines.split('\n').filter(l => l.trim());
          for (const line of lines) {
            if (line.includes('[ERROR]') || line.includes('[WARN]')) {
              this.emit('error-detected', { line, filePath, timestamp: new Date() });
            }
          }
        });
      }
    } catch (error) {
      console.error('❌ Error handling file change:', error);
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('✓ Log watcher stopped');
    }
  }
}
```

---

### Phase 2: Real-time Monitoring Integration (4-5 hours)

#### 2.1 Real-time Analysis Endpoint

**File to Modify:** `apps/api/src/routes/main-routes.ts`

Add these endpoints:

```typescript
// NEW: Stream analysis endpoint
app.post("/api/stream/analyze", requireAuth, async (req: any, res: any) => {
  const { logLine, source } = req.body;

  try {
    // Parse and analyze the log line
    const logParser = new LogParser([]);
    const parsed = logParser.parseLogFile(logLine, source || "stream");
    
    if (parsed.length === 0) {
      return res.json({ type: 'info', message: 'No errors detected' });
    }

    const errorLog = parsed[0];

    // Get analysis
    const featureEngineer = new FeatureEngineer();
    const features = featureEngineer.extractFeatures(errorLog);
    
    const predictor = new Predictor();
    const prediction = predictor.predictSingle(features);
    
    const suggestor = new Suggestor();
    const suggestion = await suggestor.getSuggestion(errorLog);

    // Return comprehensive analysis
    res.json({
      type: 'error',
      severity: prediction.severity,
      errorType: prediction.errorType,
      confidence: prediction.confidence,
      message: errorLog.message,
      suggestion: suggestion,
      timestamp: new Date(),
      shouldCreateJiraTicket: prediction.severity === 'critical' || prediction.severity === 'high'
    });
  } catch (error) {
    console.error("Stream analysis error:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

// NEW: WebSocket-like endpoint for real-time updates
app.get("/api/monitoring/live", requireAuth, (req: any, res: any) => {
  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Create a unique connection ID
  const connectionId = Math.random().toString(36);
  
  // Store the response object for event pushing
  // This is handled via EventEmitter in production
  res.write(`data: ${JSON.stringify({ type: 'connected', connectionId })}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});
```

#### 2.2 Add Jira Service

**File to Create:** `apps/api/src/services/jira-integration.ts`

```typescript
import axios, { AxiosInstance } from 'axios';

export interface JiraConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
  projectKey: string;
  defaultAssignee?: string;
}

export interface JiraTicketData {
  errorType: string;
  severity: string;
  message: string;
  rootCause: string;
  resolutionSteps: string[];
  affectedSystem?: string;
  frequency?: number;
  firstOccurrence?: Date;
  lastOccurrence?: Date;
}

export class JiraIntegration {
  private client: AxiosInstance;
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
    
    // Create Axios client with basic auth
    const auth = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
    
    this.client = axios.create({
      baseURL: `${config.baseUrl}/rest/api/3`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a Jira ticket from an error analysis
   */
  async createTicket(errorData: JiraTicketData): Promise<{ issueKey: string; issueId: string; issueUrl: string }> {
    try {
      const description = this.buildTicketDescription(errorData);
      const priority = this.mapSeverityToPriority(errorData.severity);

      const payload = {
        fields: {
          project: { key: this.config.projectKey },
          summary: `[${errorData.severity.toUpperCase()}] ${errorData.errorType}: ${errorData.message.substring(0, 50)}...`,
          description: {
            version: 3,
            type: 'doc',
            content: description,
          },
          issuetype: { name: 'Bug' },
          priority: { name: priority },
          labels: [
            'stacklens-auto',
            `severity-${errorData.severity}`,
            `type-${errorData.errorType.toLowerCase().replace(/\s+/g, '-')}`,
          ],
          customfield_10000: errorData.affectedSystem || 'Unknown',
          ...(this.config.defaultAssignee && {
            assignee: { name: this.config.defaultAssignee }
          }),
        },
      };

      const response = await this.client.post('/issues', payload);
      
      console.log(`✅ Jira ticket created: ${response.data.key}`);

      return {
        issueKey: response.data.key,
        issueId: response.data.id,
        issueUrl: `${this.config.baseUrl}/browse/${response.data.key}`,
      };
    } catch (error: any) {
      console.error('❌ Failed to create Jira ticket:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update existing ticket with new error occurrence
   */
  async updateTicket(issueKey: string, newOccurrence: any): Promise<void> {
    try {
      const update = {
        fields: {
          customfield_10001: (newOccurrence.frequency || 1), // error count
          customfield_10002: new Date().toISOString(), // last occurrence
        },
      };

      await this.client.put(`/issues/${issueKey}`, update);
      console.log(`✅ Jira ticket updated: ${issueKey}`);
    } catch (error: any) {
      console.error('❌ Failed to update Jira ticket:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Build formatted description for Jira ticket
   */
  private buildTicketDescription(errorData: JiraTicketData): any {
    const sections = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Error Analysis Report', marks: [{ type: 'strong' }] }],
      },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'paragraph', content: [{ type: 'text', text: `Type: ${errorData.errorType}`, marks: [{ type: 'code' }] }] },
      { type: 'paragraph', content: [{ type: 'text', text: `Severity: ${errorData.severity}` }] },
      { type: 'paragraph', content: [{ type: 'text', text: `Root Cause: ${errorData.rootCause}` }] },
      { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Resolution Steps:', marks: [{ type: 'strong' }] }] },
      {
        type: 'bulletList',
        content: errorData.resolutionSteps.map(step => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: step }] }],
        })),
      },
    ];

    return { type: 'doc', version: 3, content: sections };
  }

  /**
   * Map StackLens severity to Jira priority
   */
  private mapSeverityToPriority(severity: string): string {
    const mapping: Record<string, string> = {
      'critical': 'Blocker',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low',
    };
    return mapping[severity.toLowerCase()] || 'Medium';
  }

  /**
   * Search for existing tickets related to this error
   */
  async findExistingTicket(errorType: string): Promise<string | null> {
    try {
      const jql = `project = "${this.config.projectKey}" AND text ~ "${errorType}" AND resolution = EMPTY`;
      const response = await this.client.get('/search', { params: { jql } });

      if (response.data.issues && response.data.issues.length > 0) {
        return response.data.issues[0].key;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to search Jira:', error);
      return null;
    }
  }
}
```

---

### Phase 3: Enhanced UI for Real-time Monitoring (3-4 hours)

#### 3.1 Create Real-time Monitoring Page

**File to Create:** `apps/web/src/pages/real-time-monitoring.tsx`

```typescript
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { authenticatedRequest } from '@/lib/auth';

interface StreamEvent {
  timestamp: Date;
  type: 'error' | 'info' | 'success';
  severity?: string;
  message: string;
  errorType?: string;
  confidence?: number;
  suggestion?: any;
  shouldCreateJiraTicket?: boolean;
  jiraTicket?: { issueKey: string; issueUrl: string };
}

export default function RealTimeMonitoring() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, ticketsCreated: 0 });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startMonitoring = async () => {
    setIsMonitoring(true);
    
    // Connect to SSE endpoint
    const eventSource = new EventSource('/api/monitoring/live');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'error' || data.type === 'info') {
          const newEvent: StreamEvent = {
            timestamp: new Date(),
            ...data,
          };
          
          setEvents(prev => [newEvent, ...prev].slice(0, 100)); // Keep last 100 events

          // Update stats
          if (data.type === 'error') {
            setStats(prev => ({
              ...prev,
              total: prev.total + 1,
              critical: data.severity === 'critical' ? prev.critical + 1 : prev.critical,
              high: data.severity === 'high' ? prev.high + 1 : prev.high,
              ticketsCreated: data.jiraTicket ? prev.ticketsCreated + 1 : prev.ticketsCreated,
            }));
          }
        }
      } catch (error) {
        console.error('Error parsing event:', error);
      }
    };

    eventSource.onerror = () => {
      console.error('EventSource error');
      eventSource.close();
      setIsMonitoring(false);
    };
  };

  const stopMonitoring = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsMonitoring(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Real-time Error Monitoring</h1>
        <p className="text-muted-foreground">Live monitoring of application errors with AI analysis</p>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Monitoring Control</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          {!isMonitoring ? (
            <Button onClick={startMonitoring} size="lg">
              <AlertCircle className="mr-2 h-4 w-4" />
              Start Monitoring
            </Button>
          ) : (
            <Button onClick={stopMonitoring} variant="destructive" size="lg">
              Stop Monitoring
            </Button>
          )}
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            {isMonitoring ? 'MONITORING ACTIVE' : 'MONITORING INACTIVE'}
          </Badge>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-600">High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Jira Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ticketsCreated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Event Stream */}
      <Card>
        <CardHeader>
          <CardTitle>Error Stream</CardTitle>
          <CardDescription>Real-time analysis of detected errors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Waiting for errors...</p>
            ) : (
              events.map((event, idx) => (
                <div key={idx} className="border rounded p-3 hover:bg-accent">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {event.type === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        <span className="text-sm font-medium">{event.errorType || 'Info'}</span>
                        {event.severity && (
                          <Badge variant="outline" className={`text-xs`}>
                            {event.severity.toUpperCase()}
                          </Badge>
                        )}
                        {event.jiraTicket && (
                          <Badge className="text-xs">
                            <a href={event.jiraTicket.issueUrl} target="_blank" rel="noreferrer">
                              {event.jiraTicket.issueKey}
                            </a>
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{event.message}</p>
                      {event.suggestion && (
                        <div className="mt-2 text-xs bg-blue-50 p-2 rounded">
                          <strong>Suggestion:</strong> {event.suggestion.rootCause}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Phase 4: Workflow Integration (2-3 hours)

#### 4.1 Add Automation Service

**File to Create:** `apps/api/src/services/error-automation.ts`

```typescript
import { JiraIntegration, JiraTicketData } from './jira-integration';
import { ErrorLog } from '@shared/schema';

export class ErrorAutomationService {
  private jiraService: JiraIntegration;

  constructor(jiraConfig: any) {
    this.jiraService = new JiraIntegration(jiraConfig);
  }

  /**
   * Orchestrate error handling: Analysis → Decision → Automation
   */
  async processErrorWithAutomation(
    errorLog: ErrorLog,
    prediction: any,
    suggestion: any
  ): Promise<{ automated: boolean; ticketUrl?: string; decision: string }> {
    try {
      // Decision: Should we create a Jira ticket?
      const shouldAutomate = this.shouldCreateTicket(prediction, suggestion);

      if (!shouldAutomate) {
        return { automated: false, decision: 'LOW_SEVERITY - No automation needed' };
      }

      // Check if ticket already exists for this error type
      const existingTicket = await this.jiraService.findExistingTicket(prediction.errorType);

      if (existingTicket) {
        // Update existing ticket
        await this.jiraService.updateTicket(existingTicket, {
          frequency: 1,
          lastOccurrence: new Date(),
        });
        return {
          automated: true,
          ticketUrl: `https://your-jira-instance/browse/${existingTicket}`,
          decision: `UPDATED_EXISTING - Ticket ${existingTicket} updated`,
        };
      }

      // Create new ticket
      const ticketData: JiraTicketData = {
        errorType: prediction.errorType,
        severity: prediction.severity,
        message: errorLog.message,
        rootCause: suggestion.rootCause,
        resolutionSteps: suggestion.resolutionSteps,
        affectedSystem: 'POS System',
        frequency: 1,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
      };

      const ticket = await this.jiraService.createTicket(ticketData);

      return {
        automated: true,
        ticketUrl: ticket.issueUrl,
        decision: `CREATED_NEW - Ticket ${ticket.issueKey} created with full analysis`,
      };
    } catch (error: any) {
      console.error('❌ Automation error:', error);
      return {
        automated: false,
        decision: `ERROR - ${error.message}`,
      };
    }
  }

  /**
   * Determine if error should trigger automation
   */
  private shouldCreateTicket(prediction: any, suggestion: any): boolean {
    // Create tickets for:
    // 1. Critical severity errors
    // 2. High severity with high confidence (>0.75)
    // 3. Medium severity with very high confidence (>0.9) AND repeating

    if (prediction.severity === 'critical') return true;
    if (prediction.severity === 'high' && prediction.confidence > 0.75) return true;
    if (prediction.severity === 'medium' && prediction.confidence > 0.9) return true;

    return false;
  }
}
```

---

## Part 4: Configuration & Setup

### Step 1: Environment Variables

Add to `.env`:

```env
# Jira Configuration
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token-here
JIRA_PROJECT_KEY=STACK
JIRA_DEFAULT_ASSIGNEE=devops-team

# Demo POS Configuration
DEMO_POS_LOG_FILE=data/pos-application.log
DEMO_POS_PORT=3001

# Real-time Monitoring
ENABLE_REAL_TIME_MONITORING=true
LOG_WATCHER_ENABLED=true
```

### Step 2: Database Schema Update

Add to `packages/shared/src/schema.ts`:

```typescript
export const jiraTickets = sqliteTable("jira_tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  errorLogId: integer("error_log_id").references(() => errorLogs.id),
  issueKey: text("issue_key").notNull().unique(),
  issueId: text("issue_id").notNull(),
  issueUrl: text("issue_url").notNull(),
  status: text("status").default("open"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
});

export const automationLogs = sqliteTable("automation_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  errorLogId: integer("error_log_id").references(() => errorLogs.id),
  action: text("action").notNull(), // "ticket_created", "ticket_updated", "skipped"
  reason: text("reason"),
  resultTicketKey: text("result_ticket_key"),
  success: integer("success", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch() * 1000)`),
});
```

---

## Part 5: Demo Script & Flow

### Complete Demo Scenario (15-20 minutes)

```bash
#!/bin/bash

echo "🎬 StackLens AI Demo: POS System Error Handling"
echo "=================================================="

# 1. Start Demo POS
echo "1️⃣  Starting Demo POS Application..."
npm run demo:pos &
POS_PID=$!
sleep 2

# 2. Start StackLens API
echo "2️⃣  Starting StackLens AI API..."
npm run dev:server &
API_PID=$!
sleep 3

# 3. Start Web UI
echo "3️⃣  Starting Web Dashboard..."
npm run dev:client &
sleep 5

# 4. Start log watcher
echo "4️⃣  Activating Real-time Log Watcher..."
# Call API endpoint to activate watcher

# 5. Generate test order (this will trigger the NO PRICE error)
echo "5️⃣  Triggering Test Order with Missing Price..."
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"productId": 1, "quantity": 1},
      {"productId": 999, "quantity": 2}
    ]
  }'

# 6. Wait for analysis
sleep 3

# 7. Open dashboard
echo "6️⃣  Opening Dashboard for Live Monitoring..."
open http://localhost:5173/real-time-monitoring

echo ""
echo "✅ Demo started! Check the dashboard to see:"
echo "   - Real-time error detection"
echo "   - AI analysis with root cause"
echo "   - Jira ticket creation"
echo "   - Suggested fixes"
echo ""

# Keep processes running
wait
```

---

## Part 6: What's Implemented vs. What's Needed

### ✅ Already in Your Codebase

1. **Error Detection & Analysis** - 100%
2. **File Upload & Processing** - 100%
3. **ML Predictions** - 100%
4. **AI Suggestions** - 100%
5. **Database Storage** - 100%
6. **API Endpoints** - 90%
7. **Web Dashboard** - 60%

### 🔨 Needs to Be Built (Priority Order)

| Component | Priority | Effort | Files |
|-----------|----------|--------|-------|
| Demo POS App | P0 | 2-3h | 1 file |
| Log Watcher | P0 | 2h | 1 file |
| Jira Integration | P0 | 3h | 1 file |
| Error Automation | P1 | 2h | 1 file |
| Real-time UI | P1 | 3h | 1 file |
| API Endpoints | P1 | 2h | routes update |
| DB Schema | P1 | 1h | schema.ts |

**Total Effort:** 16-18 hours for complete MVP

---

## Part 7: Production Readiness Checklist

### For Demo/MVP Stage ✓

- [ ] Demo POS app working with deliberate error
- [ ] Log watcher detecting errors in real-time
- [ ] StackLens AI analyzing logs instantly
- [ ] AI generating accurate suggestions
- [ ] Jira integration creating tickets
- [ ] Real-time dashboard updating live
- [ ] Error automation triggering correctly

### For Production Deployment

- [ ] Error handling and retry logic
- [ ] Jira API rate limiting
- [ ] Database transaction handling
- [ ] Comprehensive logging
- [ ] Performance monitoring
- [ ] Backup and recovery procedures
- [ ] Security: API key encryption, token management
- [ ] Load testing and scaling

---

## Part 8: Key Integration Points

### API Endpoints to Add/Modify

```
NEW ENDPOINTS:

POST /api/stream/analyze           - Analyze streaming log line
GET  /api/monitoring/live          - SSE stream for real-time updates
POST /api/automation/create-jira   - Create Jira ticket
PUT  /api/automation/update-jira   - Update Jira ticket
GET  /api/jira/tickets             - List created tickets
GET  /api/jira/ticket/:key         - Get ticket details

MODIFIED ENDPOINTS:

POST /api/files/upload             - Add automation flag
POST /api/analysis/:fileId         - Add automation decision
```

### Database Relationships

```
ErrorLogs (existing)
    ↓
Analysis Results (existing)
    ↓
JiraTickets (NEW) ←─ 1:1 relationship
    ↓
AutomationLogs (NEW) ←─ 1:1 relationship
```

---

## Part 9: Testing Strategy

### Unit Tests

```typescript
// Test Jira integration
describe('JiraIntegration', () => {
  test('should create ticket with correct fields');
  test('should map severity to priority');
  test('should find existing tickets');
});

// Test automation service
describe('ErrorAutomationService', () => {
  test('should create ticket for critical errors');
  test('should update existing ticket');
  test('should skip low severity');
});
```

### Integration Tests

```typescript
describe('Demo Flow', () => {
  test('POS → Error → Analysis → Jira');
  test('Real-time monitoring detects new errors');
  test('Dashboard updates with automation results');
});
```

---

## Part 10: Demo Success Metrics

### What to Showcase

1. **Error Detection**: "System detected pricing error in <500ms"
2. **AI Analysis**: "AI identified root cause: Product 999 missing price"
3. **Automation**: "Jira ticket created automatically: STACK-1234"
4. **Suggestion**: "System recommends: Add price validation before order processing"
5. **Dashboard**: "Real-time view showing all errors and resolutions"

### Expected Demo Outcomes

- ✅ Error occurs in POS
- ✅ Detected within milliseconds
- ✅ AI provides root cause analysis
- ✅ Jira ticket created automatically
- ✅ Dev team gets actionable solution
- ✅ Zero manual intervention needed

---

## Summary: Implementation Order

1. **Day 1 Morning**: Demo POS + Log Watcher (4h)
2. **Day 1 Afternoon**: Jira Integration (3h)
3. **Day 2 Morning**: Automation Service + API Updates (4h)
4. **Day 2 Afternoon**: Real-time UI + Testing (3h)
5. **Day 3**: Final testing and demo script (1-2h)

**Total**: 15-18 hours

This is a **production-ready approach** that:
- Reuses 90% of your existing code
- Adds clear, modular new components
- Follows best practices for integration
- Provides complete end-to-end automation
- Enables easy Jira/Slack/other integrations later

Let me know which component you'd like me to build first!
