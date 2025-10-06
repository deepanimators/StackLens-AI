import { DatabaseStorage } from "./database-storage";
import { aiService } from "./ai-service";

interface ErrorPattern {
  pattern: string;
  regex: string;
  severity: string;
  category: string;
  description: string;
  solution: string;
  confidence: number;
}

interface DiscoveredPattern {
  errorType: string;
  messages: string[];
  frequency: number;
  severity: string;
  suggestedPattern: string;
  suggestedRegex: string;
  category: string;
  description: string;
  solution: string;
}

export class ErrorPatternAnalyzer {
  private db: DatabaseStorage;
  private aiService: typeof aiService;

  constructor() {
    this.db = new DatabaseStorage();
    this.aiService = aiService;
  }

  /**
   * Discover new error patterns from uploaded log files
   */
  async discoverPatterns(fileId: number): Promise<DiscoveredPattern[]> {
    try {
      // Get all error messages from the file
      const errors = await this.db.getErrorLogsByFile(fileId);

      if (!errors || errors.length === 0) {
        return [];
      }

      // Group errors by type and analyze patterns
      const groupedErrors = this.groupErrorsByType(errors);
      const discoveredPatterns: DiscoveredPattern[] = [];

      // Use Array.from to handle Map iteration
      for (const [errorType, errorMessages] of Array.from(
        groupedErrors.entries()
      )) {
        const pattern = await this.analyzeErrorGroup(errorType, errorMessages, fileId);
        if (pattern) {
          discoveredPatterns.push(pattern);
        }
      }

      return discoveredPatterns;
    } catch (error) {
      console.error("Error discovering patterns:", error);
      return [];
    }
  }

  /**
   * Group errors by similarity and type
   */
  private groupErrorsByType(errors: any[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const error of errors) {
      const key = this.extractErrorKey(error.message);

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(error.message);
    }

    // Filter groups with multiple occurrences (patterns)
    const filteredGroups = new Map();
    for (const [key, messages] of Array.from(groups.entries())) {
      if (messages.length >= 2) {
        // Only patterns that occur multiple times
        filteredGroups.set(key, messages);
      }
    }

    return filteredGroups;
  }

  /**
   * Extract key characteristics from error message to group similar errors
   */
  private extractErrorKey(message: string): string {
    // Remove timestamps and session IDs
    let cleaned = message.replace(
      /\d{4}-\d{2}-\d{2}\/\d{2}:\d{2}:\d{2}\.\d{3}\/\w+/g,
      "TIMESTAMP"
    );
    cleaned = cleaned.replace(/\[\w*-exec-\d+\]/g, "[THREAD]");
    cleaned = cleaned.replace(/:\[\w+\]/g, ":[SESSION]");

    // Extract core error message
    if (cleaned.includes("WARN")) {
      const match = cleaned.match(/WARN\s+[\w.]+:\d+.*?-\s*(.*)/);
      return match ? `WARN: ${match[1]}` : "WARN: Unknown";
    } else if (cleaned.includes("ERROR")) {
      const match = cleaned.match(/ERROR\s+[\w.]+:\d+.*?-\s*(.*)/);
      return match ? `ERROR: ${match[1]}` : "ERROR: Unknown";
    } else if (cleaned.includes("INFO")) {
      const match = cleaned.match(/INFO\s+[\w.]+:\d+.*?-\s*(.*)/);
      return match ? `INFO: ${match[1]}` : "INFO: Unknown";
    }

    return message.substring(0, 100); // Fallback
  }

  /**
   * Analyze a group of similar errors to create a pattern
   */
  private async analyzeErrorGroup(
    errorType: string,
    messages: string[],
    fileId: number
  ): Promise<DiscoveredPattern | null> {
    try {
      // Determine severity
      const severity = this.determineSeverity(errorType, messages);

      // Create regex pattern for this error type
      const regex = this.createRegexPattern(errorType, messages);

      // Use AI to get better description and solution
      const aiAnalysis = await this.getAIAnalysis(errorType, messages, fileId);

      return {
        errorType: errorType,
        messages: messages.slice(0, 3), // Sample messages
        frequency: messages.length,
        severity: severity,
        suggestedPattern: this.cleanPattern(errorType),
        suggestedRegex: regex,
        category: this.categorizeError(errorType),
        description:
          aiAnalysis.description || this.getDefaultDescription(errorType),
        solution: aiAnalysis.solution || this.getDefaultSolution(errorType),
      };
    } catch (error) {
      console.error("Error analyzing error group:", error);
      return null;
    }
  }

  /**
   * Determine severity based on error type and content
   */
  private determineSeverity(errorType: string, messages: string[]): string {
    const firstMessage = messages[0].toLowerCase();

    // First check the log level in the error type or message
    if (
      errorType.toLowerCase().includes("info:") ||
      firstMessage.includes("info|")
    ) {
      return "low";
    } else if (
      errorType.toLowerCase().includes("warn:") ||
      firstMessage.includes("warn|")
    ) {
      return "medium";
    } else if (
      errorType.toLowerCase().includes("error:") ||
      firstMessage.includes("error|")
    ) {
      // For ERROR level, check content for critical indicators
      if (
        firstMessage.includes("fatal") ||
        firstMessage.includes("critical") ||
        firstMessage.includes("severe")
      ) {
        return "critical";
      }
      return "high";
    }

    // Fallback to content-based analysis if log level not clear
    if (
      firstMessage.includes("fatal") ||
      firstMessage.includes("critical") ||
      firstMessage.includes("severe")
    ) {
      return "critical";
    } else if (
      firstMessage.includes("error") ||
      firstMessage.includes("exception") ||
      firstMessage.includes("failed")
    ) {
      return "high";
    } else if (
      firstMessage.includes("warn") ||
      firstMessage.includes("warning")
    ) {
      return "medium";
    } else if (firstMessage.includes("info")) {
      return "low";
    }

    return "medium";
  }

  /**
   * Create regex pattern for error matching
   */
  private createRegexPattern(errorType: string, messages: string[]): string {
    const coreMessage = this.extractCoreMessage(errorType);

    // Escape special regex characters
    const escaped = coreMessage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Replace variable parts with regex patterns
    let pattern = escaped
      .replace(
        /TIMESTAMP/g,
        "\\d{4}-\\d{2}-\\d{2}\\/\\d{2}:\\d{2}:\\d{2}\\.\\d{3}\\/\\w+"
      )
      .replace(/\\[THREAD\\]/g, "\\[\\w*-exec-\\d+\\]")
      .replace(/:\\[SESSION\\]/g, ":\\[\\w+\\]");

    return pattern;
  }

  /**
   * Extract core message from error type
   */
  private extractCoreMessage(errorType: string): string {
    if (errorType.includes(":")) {
      return errorType.split(":")[1].trim();
    }
    return errorType;
  }

  /**
   * Categorize error based on content
   */
  private categorizeError(errorType: string): string {
    const message = errorType.toLowerCase();

    if (
      message.includes("tax") ||
      message.includes("pos") ||
      message.includes("payment")
    ) {
      return "POS System";
    } else if (
      message.includes("database") ||
      message.includes("connection") ||
      message.includes("sql")
    ) {
      return "Database";
    } else if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection")
    ) {
      return "Network";
    } else if (message.includes("memory") || message.includes("performance")) {
      return "Performance";
    } else if (
      message.includes("authentication") ||
      message.includes("authorization") ||
      message.includes("security")
    ) {
      return "Security";
    }

    return "Application";
  }

  /**
   * Get AI analysis of error pattern
   */
  private async getAIAnalysis(
    errorType: string,
    messages: string[],
    fileId: number
  ): Promise<{ description: string; solution: string }> {
    try {
      // Fetch REAL error logs from database instead of using mock data
      const allErrors = await this.db.getErrorLogsByFile(fileId);

      // Find errors matching this type for context
      const matchingErrors = allErrors.filter(
        (err) => this.extractErrorKey(err.message) === errorType
      );

      // Use first matching error with real data, or create minimal fallback
      const errorLog = matchingErrors.length > 0
        ? matchingErrors[0]
        : {
          // Fallback only if absolutely no matching errors exist
          id: 0,
          timestamp: new Date(),
          createdAt: new Date(),
          fileId: fileId,
          lineNumber: 1,
          severity: this.determineSeverity(errorType, messages),
          errorType: errorType,
          message: messages[0],
          fullText: messages[0],
          pattern: null,
          resolved: false,
          aiSuggestion: null,
          mlPrediction: null,
          mlConfidence: null,
        };

      console.log(
        `🧠 AI Analysis using ${matchingErrors.length > 0 ? "REAL" : "FALLBACK"
        } error data for pattern: ${errorType.substring(0, 50)}...`
      );

      const response = await this.aiService.generateErrorSuggestion(
        errorLog
      );

      if (response) {
        return {
          description: `Pattern detected: ${this.cleanPattern(errorType)}`,
          solution:
            response.resolutionSteps.join("; ") ||
            this.getDefaultSolution(errorType),
        };
      }
    } catch (error) {
      console.error("AI analysis failed:", error);
    }

    return {
      description: this.getDefaultDescription(errorType),
      solution: this.getDefaultSolution(errorType),
    };
  }

  /**
   * Clean pattern name for display
   */
  private cleanPattern(errorType: string): string {
    if (errorType.includes(":")) {
      return errorType.split(":")[1].trim();
    }
    return errorType;
  }

  /**
   * Get default description for error type
   */
  private getDefaultDescription(errorType: string): string {
    const message = errorType.toLowerCase();

    if (message.includes("tax map") || message.includes("tax group")) {
      return "Tax configuration issue in POS system";
    } else if (message.includes("object reference not set")) {
      return "Null reference exception in application";
    } else if (message.includes("invalid child item type")) {
      return "Product configuration error";
    } else if (message.includes("could not get input for output")) {
      return "Product mapping issue";
    }

    return `Recurring ${message.includes("error") ? "error" : "warning"
      } pattern detected`;
  }

  /**
   * Get default solution for error type
   */
  private getDefaultSolution(errorType: string): string {
    const message = errorType.toLowerCase();

    if (message.includes("tax map") || message.includes("tax group")) {
      return "Check tax configuration in POS system settings. Verify tax groups are properly mapped.";
    } else if (message.includes("object reference not set")) {
      return "Review application code for null reference handling. Check object initialization.";
    } else if (message.includes("invalid child item type")) {
      return "Verify product configuration and item type mappings in the system.";
    } else if (message.includes("could not get input for output")) {
      return "Check product mapping configuration and ensure all required fields are present.";
    }

    return "Monitor error frequency and investigate root cause. Check system logs for additional context.";
  }

  /**
   * Save discovered patterns to database
   */
  async saveDiscoveredPatterns(patterns: DiscoveredPattern[]): Promise<void> {
    for (const pattern of patterns) {
      try {
        // Check if pattern already exists
        const existing = await this.db.getAllErrorPatterns();
        const exists = existing.some(
          (p: any) =>
            p.pattern === pattern.suggestedPattern ||
            p.regex === pattern.suggestedRegex
        );

        if (!exists) {
          await this.db.saveErrorPattern({
            pattern: pattern.suggestedPattern,
            regex: pattern.suggestedRegex,
            severity: pattern.severity,
            category: pattern.category,
            description: pattern.description,
            solution: pattern.solution,
          });

          console.log(`Saved new error pattern: ${pattern.suggestedPattern}`);
        }
      } catch (error) {
        console.error("Error saving pattern:", error);
      }
    }
  }

  /**
   * Static method to extract patterns from error logs
   */
  static extractPatterns(errors: any[]): any[] {
    if (!errors || errors.length === 0) {
      return [];
    }

    // Group errors by type and message similarity
    const patternGroups = new Map<string, any[]>();

    errors.forEach((error) => {
      // Create a pattern key based on error type and cleaned message
      const errorType = error.pattern || error.errorType || "Unknown";
      const cleanedMessage = ErrorPatternAnalyzer.cleanErrorMessage(
        error.message || error.fullText || ""
      );

      // Use only error type for consolidation to avoid too much fragmentation
      const key = errorType;

      if (!patternGroups.has(key)) {
        patternGroups.set(key, []);
      }
      patternGroups.get(key)!.push(error);
    });

    // Convert to pattern summary with statistics and consolidate similar patterns
    const patterns = Array.from(patternGroups.entries())
      .map(([patternType, errorList]) => {
        // Calculate severity distribution
        const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
        errorList.forEach((error) => {
          const severity = (error.severity || "medium").toLowerCase();
          if (severityCounts.hasOwnProperty(severity)) {
            severityCounts[severity as keyof typeof severityCounts]++;
          }
        });

        // Determine overall pattern severity based on majority and distribution
        let overallSeverity = "low";
        const totalErrors = errorList.length;

        // Calculate percentages
        const criticalPercent = (severityCounts.critical / totalErrors) * 100;
        const highPercent = (severityCounts.high / totalErrors) * 100;
        const mediumPercent = (severityCounts.medium / totalErrors) * 100;

        // Use a more nuanced approach for pattern severity
        // Fixed thresholds: ERROR logs are critical, even in small percentages
        if (criticalPercent > 10) overallSeverity = "critical";
        else if (severityCounts.critical > 0) overallSeverity = "critical";
        else if (highPercent > 10) overallSeverity = "high";
        else if (severityCounts.high > 0 && highPercent > 1)
          overallSeverity = "high";
        // Even 1% ERROR logs should be high priority
        else if (mediumPercent > 20) overallSeverity = "medium";
        else if (severityCounts.medium > 0 && mediumPercent > 5)
          overallSeverity = "medium"; // 5% WARN logs should be medium priority
        else overallSeverity = "low";

        // Remove the 10:1 override rule that was incorrectly downgrading ERROR patterns
        // ERROR logs should always result in high pattern severity regardless of volume

        // Get unique examples (avoid duplicates and prioritize high-severity errors)
        const examplesByMessage = new Map<string, any>();
        errorList.forEach((error) => {
          const message = error.message || error.fullText || "No message";
          if (!examplesByMessage.has(message)) {
            examplesByMessage.set(message, error);
          }
        });

        // Sort examples by severity (high first) to show most relevant examples
        const sortedExamples = Array.from(examplesByMessage.values())
          .sort((a, b) => {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const aSeverity =
              severityOrder[a.severity as keyof typeof severityOrder] || 1;
            const bSeverity =
              severityOrder[b.severity as keyof typeof severityOrder] || 1;
            return bSeverity - aSeverity; // High severity first
          })
          .slice(0, 3)
          .map((error) => error.message || error.fullText || "No message");

        return {
          pattern: patternType,
          errorType: patternType,
          severity: overallSeverity,
          count: errorList.length,
          examples: sortedExamples,
          severityBreakdown: severityCounts,
          firstSeen: errorList[0].createdAt || errorList[0].timestamp,
          lastSeen:
            errorList[errorList.length - 1].createdAt ||
            errorList[errorList.length - 1].timestamp,
          description: ErrorPatternAnalyzer.generatePatternDescription(
            patternType,
            errorList
          ),
          suggestions: ErrorPatternAnalyzer.generatePatternSuggestions(
            patternType,
            errorList
          ),
        };
      })
      .sort((a, b) => {
        // Sort by severity first (Critical → High → Medium → Low)
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aSeverity =
          severityOrder[a.severity as keyof typeof severityOrder] || 1;
        const bSeverity =
          severityOrder[b.severity as keyof typeof severityOrder] || 1;

        if (aSeverity !== bSeverity) {
          return bSeverity - aSeverity; // Higher severity first
        }

        // If same severity, sort by frequency (count)
        return b.count - a.count;
      });

    // Further consolidate similar patterns
    const consolidated = new Map<string, any>();

    patterns.forEach((pattern) => {
      const normalizedType = pattern.errorType.toLowerCase().trim();

      if (consolidated.has(normalizedType)) {
        const existing = consolidated.get(normalizedType)!;
        // Merge patterns
        existing.count += pattern.count;
        const exampleSet = new Set([...existing.examples, ...pattern.examples]);
        existing.examples = Array.from(exampleSet).slice(0, 3);

        // Update severity to highest
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        if (
          (severityOrder[pattern.severity as keyof typeof severityOrder] || 0) >
          (severityOrder[existing.severity as keyof typeof severityOrder] || 0)
        ) {
          existing.severity = pattern.severity;
        }

        // Merge severity breakdown
        const validKeys = ["critical", "high", "medium", "low"] as const;
        validKeys.forEach((key) => {
          if (pattern.severityBreakdown[key]) {
            existing.severityBreakdown[key] += pattern.severityBreakdown[key];
          }
        });
      } else {
        consolidated.set(normalizedType, { ...pattern });
      }
    });

    return Array.from(consolidated.values()).sort((a, b) => {
      // Sort by severity first (Critical → High → Medium → Low)
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aSeverity =
        severityOrder[a.severity as keyof typeof severityOrder] || 1;
      const bSeverity =
        severityOrder[b.severity as keyof typeof severityOrder] || 1;

      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity; // Higher severity first
      }

      // If same severity, sort by frequency (count)
      return b.count - a.count;
    });
  }

  /**
   * Clean error message for pattern matching
   */
  static cleanErrorMessage(message: string): string {
    if (!message) return "";

    // Remove timestamps, IDs, and variable parts but keep meaningful context
    let cleaned = message
      .replace(/\d{4}-\d{2}-\d{2}\/\d{2}:\d{2}:\d{2}\.\d{3}\/\w+/g, "TIMESTAMP")
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, "TIMESTAMP")
      .replace(/\[\w*-exec-\d+\]/g, "[THREAD]")
      .replace(/:\[\w+\]/g, ":[SESSION]")
      .replace(/\b\w+@\w+\.\w+\b/g, "EMAIL")
      // Replace large numbers but be more selective
      .replace(/\b\d{6,}\b/g, "LARGE_NUM")
      // Replace timestamps like 2025-07-26/06:00:08.260/GMT-07:00
      .replace(
        /\d{4}-\d{2}-\d{2}\/\d{2}:\d{2}:\d{2}\.\d{3}\/\w+-\d{2}:\d{2}/g,
        "DATETIME"
      )
      // Replace only very long number sequences that look like IDs
      .replace(/\b\d{4,}\b/g, "ID")
      // Keep small meaningful numbers like port numbers, etc.
      // Only replace numbers in specific patterns that look like variables
      .replace(/\[\w+:\d+\]/g, "[LOCATION]")
      .replace(/line:\s*\d+/gi, "line:NUM")
      .replace(/version\s*\d+(\.\d+)*/gi, "version:X")
      .replace(
        /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
        "UUID"
      );

    // Keep only first 200 characters for grouping (increased for even better context)
    return cleaned.substring(0, 200);
  }

  /**
   * Generate pattern description
   */
  static generatePatternDescription(
    patternType: string,
    errors: any[]
  ): string {
    const count = errors.length;
    const errorType = errors[0]?.errorType || patternType;

    return `${errorType} pattern occurring ${count} times. This appears to be a recurring issue that may require attention.`;
  }

  /**
   * Generate pattern suggestions
   */
  static generatePatternSuggestions(
    patternType: string,
    errors: any[]
  ): string[] {
    const suggestions = [
      "Review the error logs to identify the root cause",
      "Check for recent code changes that might have introduced this pattern",
      "Verify system configuration and dependencies",
      "Consider implementing proper error handling for this scenario",
    ];

    // Add specific suggestions based on pattern type
    if (patternType.toLowerCase().includes("timeout")) {
      suggestions.unshift("Increase timeout values or optimize performance");
    } else if (patternType.toLowerCase().includes("connection")) {
      suggestions.unshift(
        "Check network connectivity and database connections"
      );
    } else if (
      patternType.toLowerCase().includes("null") ||
      patternType.toLowerCase().includes("undefined")
    ) {
      suggestions.unshift("Add null checks and input validation");
    }

    return suggestions.slice(0, 4); // Return top 4 suggestions
  }
}
