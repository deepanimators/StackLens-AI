import { ErrorPattern } from "@shared/schema";

export interface ParsedError {
  lineNumber: number;
  timestamp: Date | null;
  severity: string;
  errorType: string;
  message: string;
  fullText: string;
  pattern?: string;
}

export class LogParser {
  private errorPatterns: ErrorPattern[] = [];

  constructor(patterns: ErrorPattern[]) {
    this.errorPatterns = patterns;
  }

  parseLogFile(content: string, filename: string): ParsedError[] {
    const lines = content.split("\n");
    const errors: ParsedError[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parsedError = this.parseLine(line, i + 1);
      if (parsedError) {
        errors.push(parsedError);
      }
    }

    return errors;
  }

  private parseLine(line: string, lineNumber: number): ParsedError | null {
    // Check against known error patterns
    for (const pattern of this.errorPatterns) {
      const regex = new RegExp(pattern.regex, "i");
      if (regex.test(line)) {
        return {
          lineNumber,
          timestamp: this.extractTimestamp(line),
          severity: pattern.severity,
          errorType: pattern.errorType,
          message: this.extractMessage(line),
          fullText: line,
          pattern: pattern.pattern,
        };
      }
    }

    // Generic error detection
    if (this.isErrorLine(line)) {
      return {
        lineNumber,
        timestamp: this.extractTimestamp(line),
        severity: this.detectSeverity(line),
        errorType: this.detectErrorType(line),
        message: this.extractMessage(line),
        fullText: line,
      };
    }

    return null;
  }

  private isErrorLine(line: string): boolean {
    const errorKeywords = [
      "error",
      "exception",
      "failed",
      "failure",
      "fatal",
      "critical",
      "severe",
      "panic",
      "abort",
      "crash",
      "warn",
      "warning",
      "alert",
      "info", // Added 'info'
    ];

    const lowerLine = line.toLowerCase();
    return errorKeywords.some((keyword) => lowerLine.includes(keyword));
  }

  private detectSeverity(line: string): string {
    const lowerLine = line.toLowerCase();

    if (
      lowerLine.includes("critical") ||
      lowerLine.includes("fatal") ||
      lowerLine.includes("panic")
    ) {
      return "critical";
    }
    if (
      lowerLine.includes("error") ||
      lowerLine.includes("severe") ||
      lowerLine.includes("exception")
    ) {
      return "high";
    }
    if (lowerLine.includes("warn") || lowerLine.includes("warning")) {
      return "medium";
    }
    // INFO patterns should be marked as low priority
    if (lowerLine.includes("info")) {
      return "low";
    }
    return "low";
  }

  private detectErrorType(line: string): string {
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes("memory") || lowerLine.includes("heap"))
      return "Memory";
    if (
      lowerLine.includes("sql") ||
      lowerLine.includes("database") ||
      lowerLine.includes("connection")
    )
      return "Database";
    if (lowerLine.includes("network") || lowerLine.includes("timeout"))
      return "Network";
    if (lowerLine.includes("file") || lowerLine.includes("io")) return "IO";
    if (lowerLine.includes("auth") || lowerLine.includes("permission"))
      return "Security";
    if (lowerLine.includes("null") || lowerLine.includes("undefined"))
      return "Runtime";

    return "General";
  }

  private extractTimestamp(line: string): Date | null {
    // Common timestamp patterns
    const timestampPatterns = [
      /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/,
      /(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})/,
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
      /(\d{2}:\d{2}:\d{2})/,
    ];

    for (const pattern of timestampPatterns) {
      const match = line.match(pattern);
      if (match) {
        const dateStr = match[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  private extractMessage(line: string): string {
    // Remove timestamp and common log prefixes
    let message = line.replace(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[.,]?\d*\s*/,
      ""
    );
    message = message.replace(
      /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}[.,]?\d*\s*/,
      ""
    );
    message = message.replace(/^\d{2}:\d{2}:\d{2}[.,]?\d*\s*/, "");
    message = message.replace(/^\[.*?\]\s*/, "");
    message = message.replace(
      /^(ERROR|WARN|INFO|DEBUG|TRACE|FATAL|CRITICAL)\s*:?\s*/i,
      ""
    );

    return message.trim();
  }
}
