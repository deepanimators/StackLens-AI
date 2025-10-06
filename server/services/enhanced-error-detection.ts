/**
 * Enhanced Error Detection Service
 * Based on error_analyzer.py patterns and categories
 *
 * This service:
 * 1. Properly identifies actual errors vs info/debug logs
 * 2. Categorizes errors by type and severity
 * 3. Provides accurate error classification for ML training
 */

interface ErrorPattern {
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  confidence: number;
}

interface ErrorAnalysisResult {
  isError: boolean;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  confidence: number;
  patterns: string[];
  suggestions: string[];
  lineNumber: number;
  timestamp?: string;
  message: string;
  context?: string[];
}

export class EnhancedErrorDetectionService {
  private errorPatterns: ErrorPattern[] = [];
  private categoryMappings: Map<string, any> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeCategoryMappings();
  }

  private initializePatterns() {
    this.errorPatterns = [
      // Critical Errors - Only for ERROR level logs
      {
        name: "FATAL_ERROR",
        pattern:
          /^[^|]*ERROR(?:[^|]*?\||[\s:]+).*(?:FATAL|CRITICAL|SEVERE|Object reference not set|NullPointerException|StackOverflowError)/i,
        severity: "critical",
        category: "APPLICATION",
        confidence: 0.95,
      },
      {
        name: "SYSTEM_FAILURE",
        pattern:
          /^[^|]*ERROR(?:[^|]*?\||[\s:]+).*(?:out of memory|disk full|permission denied|system overload|process killed)/i,
        severity: "critical",
        category: "SYSTEM",
        confidence: 0.9,
      },
      {
        name: "DATABASE_CRITICAL",
        pattern:
          /^[^|]*ERROR(?:[^|]*?\||[\s:]+).*(?:deadlock|database is locked|too many connections|foreign key violation)/i,
        severity: "critical",
        category: "DATABASE",
        confidence: 0.9,
      },

      // High Severity Errors - Only if log level is ERROR
      {
        name: "ERROR_LEVEL_HIGH",
        pattern: /^[^|]*ERROR(?:[^|]*?\||[\s:]+)/i,
        severity: "high",
        category: "APPLICATION",
        confidence: 0.9,
      },
      {
        name: "APPLICATION_ERROR",
        pattern:
          /^[^|]*ERROR[^|]*\|.*(?:Exception|Failed to|Cannot|Unable to|Invalid|Illegal)/i,
        severity: "high",
        category: "APPLICATION",
        confidence: 0.8,
      },
      {
        name: "NETWORK_ERROR",
        pattern:
          /^[^|]*ERROR[^|]*\|.*(?:connection refused|network timeout|host unreachable|socket error|ssl handshake failed)/i,
        severity: "high",
        category: "NETWORK",
        confidence: 0.85,
      },
      {
        name: "TRANSACTION_ERROR",
        pattern:
          /^[^|]*ERROR[^|]*\|.*(?:transaction failed|payment declined|insufficient funds|card declined)/i,
        severity: "high",
        category: "TRANSACTION",
        confidence: 0.85,
      },
      {
        name: "SECURITY_ERROR",
        pattern:
          /^[^|]*ERROR[^|]*\|.*(?:unauthorized access|authentication failed|access denied|invalid token)/i,
        severity: "high",
        category: "SECURITY",
        confidence: 0.85,
      },

      // Medium Severity Errors - Only if log level is WARN
      {
        name: "WARN_LEVEL",
        pattern: /^[^|]*WARN(?:[^|]*?\||[\s:]+)/i,
        severity: "medium",
        category: "APPLICATION",
        confidence: 0.8,
      },
      {
        name: "CONFIGURATION_WARNING",
        pattern:
          /^[^|]*WARN(?:[^|]*?\||[\s:]+).*(?:configuration|config|missing property|invalid setting)/i,
        severity: "medium",
        category: "APPLICATION",
        confidence: 0.7,
      },

      // Low Severity - INFO level logs (even if they mention "error" in text)
      {
        name: "INFO_LEVEL",
        pattern: /^[^|]*INFO(?:[^|]*?\||[\s:]+)/i,
        severity: "low",
        category: "APPLICATION",
        confidence: 0.6,
      },
      {
        name: "DEBUG_LEVEL",
        pattern: /^[^|]*DEBUG(?:[^|]*?\||[\s:]+)/i,
        severity: "low",
        category: "APPLICATION",
        confidence: 0.5,
      },

      // Low Severity - INFO level logs (even if they mention "error" in text)
      {
        name: "INFO_LEVEL",
        pattern: /^[^|]*INFO[^|]*\|/i,
        severity: "low",
        category: "APPLICATION",
        confidence: 0.6,
      },
      {
        name: "DEBUG_LEVEL",
        pattern: /^[^|]*DEBUG[^|]*\|/i,
        severity: "low",
        category: "APPLICATION",
        confidence: 0.5,
      },
    ];
  }

  private initializeCategoryMappings() {
    this.categoryMappings = new Map([
      [
        "NETWORK",
        {
          patterns: [
            "connection refused",
            "network timeout",
            "host unreachable",
            "socket error",
            "network is unreachable",
            "connection reset by peer",
          ],
          severity: "high",
          recovery_steps: [
            "Check network connectivity",
            "Verify firewall rules",
            "Restart network service",
          ],
        },
      ],
      [
        "DATABASE",
        {
          patterns: [
            "deadlock",
            "connection lost",
            "duplicate key",
            "database is locked",
            "too many connections",
            "foreign key violation",
          ],
          severity: "critical",
          recovery_steps: [
            "Check database connection",
            "Clear deadlocks",
            "Optimize queries",
          ],
        },
      ],
      [
        "TRANSACTION",
        {
          patterns: [
            "transaction failed",
            "invalid amount",
            "payment declined",
            "insufficient funds",
            "card declined",
          ],
          severity: "high",
          recovery_steps: [
            "Verify transaction data",
            "Check payment gateway",
            "Retry transaction",
          ],
        },
      ],
      [
        "SYSTEM",
        {
          patterns: [
            "out of memory",
            "disk full",
            "permission denied",
            "cpu usage high",
            "system overload",
          ],
          severity: "critical",
          recovery_steps: [
            "Clear memory",
            "Cleanup disk space",
            "Adjust permissions",
          ],
        },
      ],
      [
        "APPLICATION",
        {
          patterns: [
            "null pointer exception",
            "index out of bounds",
            "invalid configuration",
            "class not found",
            "method not found",
          ],
          severity: "high",
          recovery_steps: [
            "Validate input",
            "Check configuration",
            "Restart application",
          ],
        },
      ],
      [
        "SECURITY",
        {
          patterns: [
            "unauthorized access",
            "authentication failed",
            "invalid token",
            "sql injection attempt",
            "access denied",
          ],
          severity: "critical",
          recovery_steps: [
            "Block IP",
            "Reset auth tokens",
            "Update security rules",
          ],
        },
      ],
    ]);
  }

  /**
   * Analyze a single log line to determine if it's an error and classify it
   */
  public analyzeLogLine(
    line: string,
    lineNumber: number,
    context?: string[]
  ): ErrorAnalysisResult | null {
    // First, check if this is actually an error or just info/debug
    if (this.isInformationalLog(line)) {
      return null; // Not an error, just info
    }

    const result: ErrorAnalysisResult = {
      isError: false,
      severity: "low",
      category: "APPLICATION",
      confidence: 0,
      patterns: [],
      suggestions: [],
      lineNumber,
      message: line.trim(),
      context,
    };

    // Extract timestamp if present
    const timestampMatch = line.match(
      /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/
    );
    if (timestampMatch) {
      result.timestamp = timestampMatch[1];
    }

    // First, determine the actual log level from the line
    const logLevel = this.extractLogLevel(line);

    let maxConfidence = 0;
    let bestMatch: ErrorPattern | null = null;

    // Check against all error patterns
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(line)) {
        result.patterns.push(pattern.name);

        if (pattern.confidence > maxConfidence) {
          maxConfidence = pattern.confidence;
          bestMatch = pattern;
        }
      }
    }

    if (bestMatch && maxConfidence > 0.5) {
      result.isError = true;

      // Override severity based on log level to ensure correct classification
      result.severity = this.determineSeverityFromLogLevel(
        logLevel,
        bestMatch.severity
      );
      result.category = bestMatch.category;
      result.confidence = maxConfidence;
      result.suggestions = this.generateSuggestions(bestMatch.category, line);
    }

    return result.isError ? result : null;
  }

  /**
   * Extract log level from the log line
   */
  private extractLogLevel(line: string): string {
    // Handle different log formats:
    // 1. Pipe-separated: 2025-01-20|INFO|Message
    // 2. Space-separated: 2025-07-27/07:36:48.916/GMT-07:00  INFO ClassName:Line
    const logLevelMatch = line.match(
      /^[^|]*?(FATAL|ERROR|WARN|INFO|DEBUG|TRACE)(?:[^|]*?\||[\s:]+)/i
    );
    return logLevelMatch ? logLevelMatch[1].toUpperCase() : "UNKNOWN";
  }

  /**
   * Determine final severity based on log level precedence
   */
  private determineSeverityFromLogLevel(
    logLevel: string,
    patternSeverity: string
  ): "critical" | "high" | "medium" | "low" {
    // Log level takes precedence over pattern-based severity
    switch (logLevel) {
      case "FATAL":
        return "critical";
      case "ERROR":
        return patternSeverity === "critical" ? "critical" : "high";
      case "WARN":
        return "medium";
      case "INFO":
      case "DEBUG":
      case "TRACE":
        return "low";
      default:
        return (
          (patternSeverity as "critical" | "high" | "medium" | "low") ||
          "medium"
        );
    }
  }

  /**
   * Check if a log line is informational (not an error)
   */
  private isInformationalLog(line: string): boolean {
    // Extract the log level first
    const logLevel = this.extractLogLevel(line);

    // TRACE and DEBUG logs are always informational
    if (logLevel === "TRACE" || logLevel === "DEBUG") {
      return true;
    }

    // INFO logs are informational UNLESS they contain explicit error keywords
    if (logLevel === "INFO") {
      const errorKeywords = [
        /exception/i,
        /\berror\s*:/i,  // "error:" or "Error:"
        /\bfailed\s*:/i,  // "failed:" or "Failed:"
        /\bfailure\s*:/i, // "failure:" or "Failure:"
        /stack\s*trace/i,
        /\bcritical\s*:/i,
        /\bfatal\s*:/i,
        /null\s*pointer/i,
        /out\s*of\s*memory/i,
        /access\s*denied/i,
        /permission\s*denied/i,
        /\btimeout\b/i,
        /\bdeadlock\b/i,
        /\baborted\b/i,
        /\bcrashed\b/i,
      ];

      // If INFO log contains explicit error keywords, it's an error
      const hasErrorKeyword = errorKeywords.some(pattern => pattern.test(line));

      // INFO logs without error keywords are informational
      return !hasErrorKeyword;
    }

    // WARN and ERROR logs are not informational
    return false;
  }

  /**
   * Analyze multiple log lines (for context-aware analysis)
   */
  public analyzeLogContent(lines: string[]): ErrorAnalysisResult[] {
    const errors: ErrorAnalysisResult[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const context = this.getContext(lines, i, 2); // 2 lines before and after

      const result = this.analyzeLogLine(line, i + 1, context);
      if (result) {
        errors.push(result);
      }
    }

    return errors;
  }

  /**
   * Get context lines around an error
   */
  private getContext(
    lines: string[],
    errorIndex: number,
    contextLines: number
  ): string[] {
    const start = Math.max(0, errorIndex - contextLines);
    const end = Math.min(lines.length, errorIndex + contextLines + 1);
    return lines.slice(start, end);
  }

  /**
   * Generate suggestions based on error category and message
   */
  private generateSuggestions(category: string, message: string): string[] {
    const categoryData = this.categoryMappings.get(category);
    if (categoryData?.recovery_steps) {
      return categoryData.recovery_steps;
    }

    // Fallback suggestions based on message content
    const messageLower = message.toLowerCase();

    if (messageLower.includes("timeout")) {
      return [
        "Check network connectivity",
        "Increase timeout values",
        "Verify service availability",
      ];
    }

    if (
      messageLower.includes("permission") ||
      messageLower.includes("access denied")
    ) {
      return [
        "Check file permissions",
        "Verify user access rights",
        "Review security settings",
      ];
    }

    if (messageLower.includes("memory")) {
      return [
        "Check available memory",
        "Look for memory leaks",
        "Optimize memory usage",
      ];
    }

    if (messageLower.includes("connection")) {
      return [
        "Verify network connection",
        "Check firewall settings",
        "Test service availability",
      ];
    }

    return [
      "Review error logs for more details",
      "Check system resources",
      "Verify configuration settings",
    ];
  }

  /**
   * Get severity score for ML training
   */
  public getSeverityScore(severity: string): number {
    const scores = {
      critical: 1.0,
      high: 0.8,
      medium: 0.5,
      low: 0.2,
    };
    return scores[severity as keyof typeof scores] || 0.1;
  }

  /**
   * Prepare training data for ML model
   */
  public prepareTrainingData(errors: ErrorAnalysisResult[]) {
    return errors.map((error) => ({
      message: error.message,
      severity: error.severity,
      category: error.category,
      confidence: error.confidence,
      features: this.extractFeatures(error.message),
      patterns: error.patterns,
      timestamp: error.timestamp,
      lineNumber: error.lineNumber,
    }));
  }

  /**
   * Extract features from error message for ML training
   */
  private extractFeatures(message: string): Record<string, any> {
    const features: Record<string, any> = {};

    // Word count and length
    const words = message.toLowerCase().split(/\s+/);
    features.wordCount = words.length;
    features.messageLength = message.length;

    // Keyword presence
    const keywords = [
      "error",
      "exception",
      "failed",
      "timeout",
      "connection",
      "memory",
      "database",
      "null",
      "invalid",
      "permission",
    ];

    for (const keyword of keywords) {
      features[`has_${keyword}`] = words.includes(keyword) ? 1 : 0;
    }

    // Pattern matches
    features.hasNumbers = /\d/.test(message) ? 1 : 0;
    features.hasUpperCase = /[A-Z]/.test(message) ? 1 : 0;
    features.hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(message) ? 1 : 0;

    return features;
  }

  /**
   * Validate if detected error is actually an error (quality check)
   */
  public validateError(result: ErrorAnalysisResult): boolean {
    // Additional validation rules
    if (result.confidence < 0.3) {
      return false;
    }

    // Don't treat pure info logs as errors even if they contain error keywords
    if (
      result.message.toLowerCase().startsWith("info") &&
      result.severity === "low" &&
      result.confidence < 0.7
    ) {
      return false;
    }

    return true;
  }
}

export default EnhancedErrorDetectionService;
