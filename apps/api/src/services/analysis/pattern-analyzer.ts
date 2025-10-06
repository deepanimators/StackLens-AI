import { storage } from '../database-storage';
import { LogParser } from './log-parser';

export class PatternAnalyzer {
  
  async reanalyzeExistingLogs(): Promise<void> {
    console.log('Starting reanalysis of existing error logs...');
    
    try {
      // Get all active error patterns
      const patterns = await storage.getActiveErrorPatterns();
      console.log(`Found ${patterns.length} active error patterns`);
      
      if (patterns.length === 0) {
        console.log('No error patterns found, skipping reanalysis');
        return;
      }
      
      // Get all error logs that don't have patterns assigned
      const errorLogs = await storage.getAllErrorLogs();
      console.log(`Found ${errorLogs.length} error logs to analyze`);
      
      let updatedCount = 0;
      
      for (const errorLog of errorLogs) {
        // Skip if already has a pattern
        if (errorLog.pattern) continue;
        
        const matchedPattern = this.findMatchingPattern(errorLog.fullText, patterns);
        
        if (matchedPattern) {
          await storage.updateErrorLog(errorLog.id, {
            pattern: matchedPattern.pattern,
            severity: matchedPattern.severity,
            errorType: matchedPattern.errorType,
          });
          updatedCount++;
        }
      }
      
      console.log(`Updated ${updatedCount} error logs with patterns`);
      
    } catch (error) {
      console.error('Error during reanalysis:', error);
    }
  }
  
  private findMatchingPattern(logText: string, patterns: any[]): any | null {
    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern.regex, 'i');
        if (regex.test(logText)) {
          return pattern;
        }
      } catch (regexError) {
        console.error(`Invalid regex for pattern ${pattern.pattern}:`, regexError);
      }
    }
    return null;
  }
  
  async generateDynamicPatterns(fileId: number): Promise<void> {
    console.log(`Generating dynamic patterns for file ${fileId}...`);
    
    try {
      // Get all error logs for this file
      const errorLogs = await storage.getErrorLogsByFile(fileId);
      
      if (errorLogs.length === 0) {
        console.log('No error logs found for pattern generation');
        return;
      }
      
      // Group similar error messages
      const messageGroups = this.groupSimilarMessages(errorLogs);
      
      // Create patterns for significant groups
      for (const [groupKey, logs] of messageGroups.entries()) {
        if (logs.length >= 3) { // Only create patterns for frequent errors
          await this.createDynamicPattern(groupKey, logs);
        }
      }
      
    } catch (error) {
      console.error('Error generating dynamic patterns:', error);
    }
  }
  
  private groupSimilarMessages(errorLogs: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    for (const log of errorLogs) {
      // Extract key parts of the message for grouping
      const key = this.extractMessageKey(log.message || log.fullText);
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(log);
    }
    
    return groups;
  }
  
  private extractMessageKey(message: string): string {
    // Remove timestamps, IDs, and other variable parts
    let key = message
      .replace(/\d{4}-\d{2}-\d{2}[T/]\d{2}:\d{2}:\d{2}[.\d]*[Z]?[+-]?\d*[:]?\d*/g, 'TIMESTAMP')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID')
      .replace(/\b\d+\b/g, 'NUMBER')
      .replace(/\[[\w-]+\]/g, '[THREAD]')
      .substring(0, 200); // Limit length
    
    return key;
  }
  
  private async createDynamicPattern(messageKey: string, logs: any[]): Promise<void> {
    const firstLog = logs[0];
    
    // Determine severity based on error type and frequency
    let severity = 'medium';
    if (logs.length > 10) severity = 'high';
    if (logs.length > 20) severity = 'critical';
    
    // Create a regex pattern from the message key
    const regexPattern = this.createRegexFromKey(messageKey);
    
    const patternName = `Dynamic: ${this.extractPatternName(messageKey)}`;
    
    try {
      await storage.createErrorPattern({
        pattern: patternName,
        regex: regexPattern,
        description: `Auto-generated pattern from ${logs.length} similar errors`,
        severity,
        errorType: firstLog.errorType || 'Unknown',
        category: 'Auto-Generated',
        suggestedFix: 'Review similar error occurrences and implement appropriate fixes',
        isActive: true,
      });
      
      console.log(`Created dynamic pattern: ${patternName}`);
      
      // Update all logs in this group with the new pattern
      for (const log of logs) {
        await storage.updateErrorLog(log.id, {
          pattern: patternName,
        });
      }
      
    } catch (error) {
      console.error(`Error creating dynamic pattern for ${patternName}:`, error);
    }
  }
  
  private createRegexFromKey(messageKey: string): string {
    // Convert the message key into a regex pattern
    return messageKey
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex characters
      .replace(/TIMESTAMP/g, '[\\d\\-T/:Z.+]+')
      .replace(/UUID/g, '[0-9a-f\\-]+')
      .replace(/NUMBER/g, '\\d+')
      .replace(/\\[THREAD\\]/g, '\\[[\\w\\-]+\\]');
  }
  
  private extractPatternName(messageKey: string): string {
    // Extract a meaningful name from the message key
    const words = messageKey
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !['TIMESTAMP', 'UUID', 'NUMBER'].includes(word))
      .slice(0, 4);
    
    return words.join(' ') || 'Unknown Pattern';
  }
}

export const patternAnalyzer = new PatternAnalyzer();
