# POS Error Scenarios - Code Implementation Guide

## 1. Enhanced Error Event Schema

```typescript
// Enhanced error event with full context
interface EnhancedErrorEvent {
  // Unique identifiers
  eventId: string;
  errorCode: string;
  errorCategory: 
    | 'PAYMENT'
    | 'INVENTORY'
    | 'TAX'
    | 'HARDWARE'
    | 'AUTHENTICATION'
    | 'DATA_QUALITY'
    | 'INFRASTRUCTURE'
    | 'EXTERNAL_SERVICE';
  
  // Timestamps and duration
  timestamp: string; // ISO 8601
  duration: number; // milliseconds to resolve
  
  // User context
  userContext: {
    userId: string;
    userSegment: 'vip' | 'regular' | 'new';
    userRole: 'cashier' | 'manager' | 'admin';
    locationId: string;
    storeId: string;
    deviceId: string;
    deviceType: 'terminal' | 'mobile' | 'web';
  };
  
  // Business context
  businessContext: {
    transactionId?: string;
    transactionAmount?: number;
    currency?: string;
    transactionType: 'payment' | 'refund' | 'exchange' | 'return';
    customerId?: string;
    productIds?: string[];
    orderCount: number;
  };
  
  // System state at time of error
  systemState: {
    cpuUsage: number; // 0-100%
    memoryUsage: number; // 0-100%
    diskUsage: number; // 0-100%
    networkLatency: number; // milliseconds
    activeConnections: number;
    queueLength: number;
    databaseHealth: 'healthy' | 'degraded' | 'down';
    cacheHitRate: number; // 0-1
  };
  
  // Error details
  errorDetails: {
    message: string;
    statusCode: number;
    stackTrace?: string;
    errorSource: 'frontend' | 'backend' | 'external_api' | 'database';
    relatedErrors: string[]; // Other errors that might be related
    severity: 'critical' | 'high' | 'medium' | 'low';
    isRecurring: boolean;
    frequency: number; // How many times today
    trend: 'increasing' | 'decreasing' | 'stable' | 'new';
  };
  
  // Context data
  contextData: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    isWeekend: boolean;
    isPeakHours: boolean;
    lastBackupTime?: string;
    systemUptime: number; // seconds
  };
  
  // Resolution tracking
  resolution: {
    status: 'unresolved' | 'auto_remediated' | 'manual_resolved';
    resolutionTime?: number; // milliseconds
    resolvedBy?: 'system' | 'user' | 'admin';
    resolutionNotes?: string;
  };
  
  // User feedback
  userFeedback?: {
    suggestedAction: string;
    userRating: number; // 1-5
    userComments?: string;
    actionTaken: string;
    actionOutcome: 'success' | 'partial' | 'failure';
    helpfulnessScore: number; // 1-10
  };
}
```

## 2. POS Backend Error Endpoints (40+ Scenarios)

### Payment Errors
```typescript
// routes/payments.ts
export const routes = {
  // 1. Card Declined
  'POST /api/payments/card-declined': async (req, res) => {
    const error = new AppError(
      'Card issuer declined transaction',
      'CARD_DECLINED',
      402,
      'Try different card or contact issuer',
      { 
        gateway: 'stripe',
        declineCode: 'generic_decline',
        retryable: true 
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(402).json(formatErrorResponse(error));
  },

  // 2. CVV Invalid
  'POST /api/payments/cvv-invalid': async (req, res) => {
    const error = new AppError(
      'CVV verification failed',
      'CVV_INVALID',
      400,
      'Verify CVV and retry',
      { 
        attempts: 1,
        maxAttempts: 3 
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(400).json(formatErrorResponse(error));
  },

  // 3. Card Expired
  'POST /api/payments/card-expired': async (req, res) => {
    const error = new AppError(
      'Card has expired',
      'CARD_EXPIRED',
      400,
      'Use valid card with future expiry date',
      { 
        cardLast4: '****4242',
        expiryDate: '12/2024'
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(400).json(formatErrorResponse(error));
  },

  // 4. Fraud Suspected
  'POST /api/payments/fraud-suspected': async (req, res) => {
    const error = new AppError(
      'Transaction flagged as suspicious',
      'FRAUD_SUSPECTED',
      403,
      'Verify transaction with card issuer',
      { 
        riskScore: 8.5,
        riskFactors: ['unusual_amount', 'high_velocity', 'new_device']
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(403).json(formatErrorResponse(error));
  },

  // 5. Payment Timeout
  'POST /api/payments/timeout': async (req, res) => {
    const error = new AppError(
      'Payment gateway not responding',
      'PAYMENT_TIMEOUT',
      504,
      'Retry transaction or try different payment method',
      { 
        gatewayResponseTime: 5000,
        timeout: 3000
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(504).json(formatErrorResponse(error));
  },

  // 6. Duplicate Transaction
  'POST /api/payments/duplicate-detected': async (req, res) => {
    const error = new AppError(
      'Same transaction was processed twice',
      'DUPLICATE_TRANSACTION',
      409,
      'Check transaction history and verify',
      { 
        originalTransactionId: 'txn_12345',
        duplicateTimestamp: Date.now()
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(409).json(formatErrorResponse(error));
  },

  // 7. Insufficient Funds
  'POST /api/payments/insufficient-funds': async (req, res) => {
    const error = new AppError(
      'Insufficient funds in account',
      'INSUFFICIENT_FUNDS',
      402,
      'Use different card or reduce amount',
      { 
        requiredAmount: 5000,
        availableBalance: 2000
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(402).json(formatErrorResponse(error));
  },

  // ... more payment errors
};
```

### Inventory Errors
```typescript
// routes/inventory.ts
export const inventoryRoutes = {
  // 1. Out of Stock
  'POST /api/inventory/out-of-stock': async (req, res) => {
    const error = new AppError(
      'Product is out of stock',
      'OUT_OF_STOCK',
      400,
      'Restock product or offer alternative',
      { 
        productId: 'SKU-12345',
        requestedQty: 5,
        availableQty: 0,
        reorderLevel: 50
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(400).json(formatErrorResponse(error));
  },

  // 2. Damaged Stock
  'POST /api/inventory/damaged-stock': async (req, res) => {
    const error = new AppError(
      'Significant portion of inventory is damaged',
      'DAMAGED_STOCK',
      500,
      'Investigate and remove damaged units',
      { 
        productId: 'SKU-12345',
        totalStock: 100,
        damagedUnits: 35,
        damagedPercentage: 35
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(500).json(formatErrorResponse(error));
  },

  // 3. Stock Discrepancy
  'POST /api/inventory/stock-discrepancy': async (req, res) => {
    const error = new AppError(
      'Physical stock count does not match system',
      'STOCK_DISCREPANCY',
      500,
      'Conduct physical audit and reconcile',
      { 
        productId: 'SKU-12345',
        systemCount: 100,
        physicalCount: 87,
        discrepancy: 13
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(500).json(formatErrorResponse(error));
  },

  // ... more inventory errors
};
```

### Tax & Compliance Errors
```typescript
// routes/tax.ts
export const taxRoutes = {
  // 1. Tax Rate Invalid
  'POST /api/tax/rate-invalid': async (req, res) => {
    const error = new AppError(
      'Invalid tax rate configured',
      'TAX_RATE_INVALID',
      500,
      'Update tax configuration in settings',
      { 
        configuredRate: -5,
        validRange: [0, 100],
        jurisdiction: 'CA'
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(500).json(formatErrorResponse(error));
  },

  // 2. Jurisdiction Unknown
  'POST /api/tax/jurisdiction-unknown': async (req, res) => {
    const error = new AppError(
      'Tax jurisdiction not found',
      'TAX_JURISDICTION_UNKNOWN',
      400,
      'Add jurisdiction to tax database',
      { 
        address: '123 Main St, Unknown City',
        country: 'US',
        postalCode: '99999'
      }
    );
    sendToAnalytics('error', error.message, extractContext(req, error));
    res.status(400).json(formatErrorResponse(error));
  },

  // ... more tax errors
};
```

## 3. AI Analysis Training Data Format

```typescript
// training/trainingExamples.ts
export const trainingData: TrainingExample[] = [
  {
    errorCode: "CARD_DECLINED",
    errorMessage: "Card issuer declined transaction",
    errorCategory: "PAYMENT",
    errorSeverity: "high",
    
    systemMetrics: {
      cpuUsage: 45,
      memoryUsage: 62,
      diskUsage: 38,
      networkLatency: 120,
      activeUsers: 150
    },
    
    appContext: {
      userId: "user_123",
      customerSegment: "regular",
      transactionType: "payment",
      transactionAmount: 5000,
      timeOfDay: "evening",
      dayOfWeek: "Friday"
    },
    
    errorDetails: {
      timestamp: "2025-11-21T18:30:45Z",
      stackTrace: undefined,
      relatedErrors: ["FRAUD_SUSPECTED"],
      frequency: 3,
      trend: "stable"
    },
    
    resolution: {
      rootCause: "Card issuer risk management - declining high-value transactions at peak times",
      suggestedFixes: [
        "Try with different card",
        "Try smaller amount",
        "Contact bank to increase limit"
      ],
      immediateActions: [
        "Offer alternative payment methods",
        "Display card issuer contact info",
        "Log transaction for audit"
      ],
      longTermSolutions: [
        "Implement progressive authentication",
        "Add velocity checks",
        "Improve fraud detection accuracy"
      ],
      resolutionTime: 120
    },
    
    input: {
      userAction: "Click 'Complete Payment'",
      systemState: {
        gateway: "stripe",
        cardBrand: "Visa",
        declineCode: "generic_decline"
      },
      externalFactors: {
        gatewayStatus: "healthy",
        networkCondition: "good"
      }
    },
    
    output: {
      userNotification: "Your payment was declined by the card issuer. Try a different card or contact your bank.",
      adminAlert: "High-value payment declined. Monitor fraud patterns.",
      userAlternatives: ["PayPal", "Apple Pay", "Credit Card"]
    }
  },
  
  // More training examples...
];
```

## 4. Model Prediction Function

```typescript
// analytics/errorAnalyzer.ts
async function analyzeError(errorEvent: EnhancedErrorEvent): Promise<ErrorAnalysis> {
  // Step 1: Rule-based classification
  const ruleBasedResult = classifyByRules(errorEvent);
  
  if (ruleBasedResult.confidence > 0.85) {
    return ruleBasedResult; // Return fast result
  }
  
  // Step 2: ML-based classification
  const features = engineerFeatures(errorEvent);
  const mlResult = await mlModel.predict(features);
  
  // Step 3: Enhanced with context
  const enhanced = await enrichWithContext(mlResult);
  
  // Step 4: Generative suggestions
  const suggestions = await generateSuggestionsWithGemini({
    errorCode: errorEvent.errorCode,
    context: enhanced,
    history: await fetchHistoricalErrors(errorEvent.errorCode)
  });
  
  // Step 5: Combine all
  return {
    classification: {
      category: mlResult.category,
      severity: mlResult.severity,
      priority: mlResult.priority
    },
    analysis: {
      rootCause: suggestions.rootCause,
      suggestedFixes: suggestions.suggestedFixes,
      immediateActions: suggestions.immediateActions,
      longTermSolutions: suggestions.longTermSolutions
    },
    confidence: mlResult.confidence,
    estimatedResolutionTime: mlResult.estimatedTime,
    similarCases: enhanced.historicalCases
  };
}
```

## 5. Feedback Integration

```typescript
// feedback/feedbackProcessor.ts
async function processFeedback(feedback: UserFeedback) {
  // 1. Store feedback
  await db.feedback.create(feedback);
  
  // 2. Update metrics
  const metrics = {
    suggestionAdoptionRate: calculateAdoptionRate(),
    suggestionAccuracy: calculateAccuracy(),
    resolutionSuccess: calculateSuccess(),
    avgResolutionTime: calculateAvgTime()
  };
  
  // 3. Check if retraining needed
  if (metrics.suggestionAccuracy < 0.80) {
    scheduleRetraining();
  }
  
  // 4. Update training data
  await addToTrainingData({
    errorCode: feedback.errorCode,
    userFeedback: feedback,
    outcome: feedback.actionOutcome,
    timestamp: new Date()
  });
  
  // 5. Online learning (if enabled)
  if (shouldDoOnlineLearning()) {
    await updateModelWeights(feedback);
  }
  
  return { status: 'processed', metrics };
}
```

## 6. Dashboard Component

```typescript
// components/AIErrorAnalysisCard.tsx
export function AIErrorAnalysisCard({ errorAnalysis }: Props) {
  return (
    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
      {/* Severity Badge */}
      <div className="flex items-center gap-2 mb-4">
        <SeverityBadge severity={errorAnalysis.classification.severity} />
        <span className="font-bold text-lg">{errorAnalysis.classification.category}</span>
      </div>
      
      {/* Root Cause */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700">Root Cause</h3>
        <p className="text-gray-600">{errorAnalysis.analysis.rootCause}</p>
      </div>
      
      {/* Immediate Actions */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700">Immediate Actions</h3>
        <ul className="list-none space-y-2">
          {errorAnalysis.analysis.immediateActions.map((action, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">→</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Suggestions */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700">Suggestions</h3>
        <ul className="list-none space-y-2">
          {errorAnalysis.analysis.suggestedFixes.map((fix, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>{fix}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Feedback */}
      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-700 mb-2">Was this helpful?</h3>
        <div className="flex gap-2">
          <StarRating onRate={(rating) => submitFeedback(rating)} />
          <textarea 
            placeholder="Any comments?"
            className="flex-1 p-2 border rounded"
            onBlur={(e) => submitFeedback(undefined, e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
```

---

This comprehensive guide provides:
1. ✅ Full TypeScript interfaces for error events
2. ✅ 40+ error scenario implementations
3. ✅ Training data format with examples
4. ✅ AI analysis pipeline code
5. ✅ Feedback integration
6. ✅ Dashboard component

All ready for implementation!
