import { ErrorLog } from "@shared/schema";

export interface ExtractedFeatures {
  errorMessage: string;
  severity: string;
  errorType: string;
  messageLength: number;
  hasException: boolean;
  hasTimeout: boolean;
  hasMemory: boolean;
  hasDatabase: boolean;
  hasNetwork: boolean;
  hasPermission: boolean;
  hasNull: boolean;
  hasConnection: boolean;
  hasFile: boolean;
  hasFormat: boolean;
  wordCount: number;
  uppercaseRatio: number;
  digitRatio: number;
  specialCharRatio: number;
  keywordScore: number;
  contextualPatterns: string[];
  timestamp?: string;
  lineNumber?: number;
  fileType?: string;
}

export class FeatureEngineer {
  private static readonly CRITICAL_KEYWORDS = [
    'exception', 'error', 'failed', 'timeout', 'memory', 'null', 'crash', 'fatal', 'critical'
  ];

  private static readonly HIGH_KEYWORDS = [
    'warning', 'denied', 'permission', 'unauthorized', 'forbidden', 'connection', 'network'
  ];

  private static readonly MEDIUM_KEYWORDS = [
    'deprecated', 'invalid', 'missing', 'not found', 'format', 'parse', 'syntax'
  ];

  private static readonly LOW_KEYWORDS = [
    'info', 'debug', 'trace', 'notice', 'log', 'message'
  ];

  public static extractFeatures(error: ErrorLog): ExtractedFeatures {
    const message = error.message.toLowerCase();
    const words = message.split(/\s+/);
    
    return {
      errorMessage: error.message,
      severity: error.severity,
      errorType: error.errorType,
      messageLength: error.message.length,
      hasException: this.containsKeyword(message, ['exception', 'throw', 'catch']),
      hasTimeout: this.containsKeyword(message, ['timeout', 'timed out', 'time out']),
      hasMemory: this.containsKeyword(message, ['memory', 'heap', 'stack', 'oom']),
      hasDatabase: this.containsKeyword(message, ['database', 'sql', 'query', 'connection']),
      hasNetwork: this.containsKeyword(message, ['network', 'connection', 'socket', 'http']),
      hasPermission: this.containsKeyword(message, ['permission', 'access', 'denied', 'unauthorized']),
      hasNull: this.containsKeyword(message, ['null', 'undefined', 'nil']),
      hasConnection: this.containsKeyword(message, ['connection', 'connect', 'disconnect']),
      hasFile: this.containsKeyword(message, ['file', 'path', 'directory', 'folder']),
      hasFormat: this.containsKeyword(message, ['format', 'parse', 'json', 'xml', 'csv']),
      wordCount: words.length,
      uppercaseRatio: this.calculateUppercaseRatio(error.message),
      digitRatio: this.calculateDigitRatio(error.message),
      specialCharRatio: this.calculateSpecialCharRatio(error.message),
      keywordScore: this.calculateKeywordScore(message),
      contextualPatterns: this.extractContextualPatterns(message),
      timestamp: error.timestamp,
      lineNumber: error.lineNumber,
      fileType: this.extractFileType(error.message)
    };
  }

  public static extractBatchFeatures(errors: ErrorLog[]): ExtractedFeatures[] {
    return errors.map(error => this.extractFeatures(error));
  }

  private static containsKeyword(message: string, keywords: string[]): boolean {
    return keywords.some(keyword => message.includes(keyword));
  }

  private static calculateUppercaseRatio(message: string): number {
    const uppercaseCount = (message.match(/[A-Z]/g) || []).length;
    return uppercaseCount / message.length;
  }

  private static calculateDigitRatio(message: string): number {
    const digitCount = (message.match(/\d/g) || []).length;
    return digitCount / message.length;
  }

  private static calculateSpecialCharRatio(message: string): number {
    const specialCharCount = (message.match(/[^a-zA-Z0-9\s]/g) || []).length;
    return specialCharCount / message.length;
  }

  private static calculateKeywordScore(message: string): number {
    let score = 0;
    
    this.CRITICAL_KEYWORDS.forEach(keyword => {
      if (message.includes(keyword)) score += 4;
    });
    
    this.HIGH_KEYWORDS.forEach(keyword => {
      if (message.includes(keyword)) score += 3;
    });
    
    this.MEDIUM_KEYWORDS.forEach(keyword => {
      if (message.includes(keyword)) score += 2;
    });
    
    this.LOW_KEYWORDS.forEach(keyword => {
      if (message.includes(keyword)) score += 1;
    });
    
    return score;
  }

  private static extractContextualPatterns(message: string): string[] {
    const patterns: string[] = [];
    
    // Stack trace pattern
    if (message.includes('at ') && message.includes('line ')) {
      patterns.push('stack_trace');
    }
    
    // URL pattern
    if (message.match(/https?:\/\/[^\s]+/)) {
      patterns.push('url_reference');
    }
    
    // File path pattern
    if (message.match(/[a-zA-Z]:\\|\/[a-zA-Z]/)) {
      patterns.push('file_path');
    }
    
    // Error code pattern
    if (message.match(/\b[A-Z]{2,}\d{3,}\b/)) {
      patterns.push('error_code');
    }
    
    // Memory address pattern
    if (message.match(/0x[0-9a-fA-F]+/)) {
      patterns.push('memory_address');
    }
    
    // Time pattern
    if (message.match(/\d{2}:\d{2}:\d{2}/)) {
      patterns.push('timestamp');
    }
    
    return patterns;
  }

  private static extractFileType(message: string): string | undefined {
    const fileExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.php', '.rb', '.go'];
    
    for (const ext of fileExtensions) {
      if (message.includes(ext)) {
        return ext.substring(1); // Remove the dot
      }
    }
    
    return undefined;
  }
}