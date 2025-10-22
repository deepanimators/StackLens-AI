import { db } from "../database/db.js";
import { errorLogs, savedSearches, searchAnalytics } from "@shared/sqlite-schema";
import { eq, and, or, like, desc, sql } from "drizzle-orm";

export interface SearchCriteria {
  query?: string;
  severity?: string[];
  errorType?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  fileIds?: number[];
  resolved?: boolean;
  hasAiSuggestion?: boolean;
  hasMlPrediction?: boolean;
}

export interface SearchResult {
  errors: any[];
  total: number;
  suggestions: string[];
  responseTime: number;
}

export class AdvancedSearchService {
  async searchErrors(userId: number, criteria: SearchCriteria, page = 1, limit = 20): Promise<SearchResult> {
    const startTime = Date.now();
    
    // Build query conditions
    const conditions = [eq(errorLogs.fileId, sql`(SELECT id FROM log_files WHERE uploaded_by = ${userId})`)];
    
    if (criteria.query) {
      conditions.push(
        or(
          like(errorLogs.message, `%${criteria.query}%`),
          like(errorLogs.fullText, `%${criteria.query}%`)
        )
      );
    }
    
    if (criteria.severity?.length) {
      conditions.push(sql`${errorLogs.severity} IN ${criteria.severity}`);
    }
    
    if (criteria.errorType?.length) {
      conditions.push(sql`${errorLogs.errorType} IN ${criteria.errorType}`);
    }
    
    if (criteria.dateRange) {
      conditions.push(
        and(
          sql`${errorLogs.timestamp} >= ${criteria.dateRange.start.getTime()}`,
          sql`${errorLogs.timestamp} <= ${criteria.dateRange.end.getTime()}`
        )
      );
    }
    
    if (criteria.resolved !== undefined) {
      conditions.push(eq(errorLogs.resolved, criteria.resolved));
    }
    
    if (criteria.hasAiSuggestion) {
      conditions.push(sql`${errorLogs.aiSuggestion} IS NOT NULL`);
    }
    
    if (criteria.hasMlPrediction) {
      conditions.push(sql`${errorLogs.mlPrediction} IS NOT NULL`);
    }

    // Execute search
    const [results, totalCount] = await Promise.all([
      db.select()
        .from(errorLogs)
        .where(and(...conditions))
        .orderBy(desc(errorLogs.timestamp))
        .limit(limit)
        .offset((page - 1) * limit),
      
      db.select({ count: sql`count(*)` })
        .from(errorLogs)
        .where(and(...conditions))
    ]);

    const responseTime = Date.now() - startTime;
    
    // Log search analytics
    await this.logSearchAnalytics(userId, criteria, totalCount[0].count as number, responseTime);
    
    // Generate suggestions
    const suggestions = await this.generateSearchSuggestions(userId, criteria.query);

    return {
      errors: results,
      total: totalCount[0].count as number,
      suggestions,
      responseTime
    };
  }

  async saveSearch(userId: number, name: string, criteria: SearchCriteria): Promise<void> {
    await db.insert(savedSearches).values({
      userId,
      name,
      criteria: JSON.stringify(criteria),
      isPublic: false
    });
  }

  async getSavedSearches(userId: number) {
    return await db.select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt));
  }

  private async logSearchAnalytics(userId: number, criteria: SearchCriteria, resultsCount: number, responseTime: number) {
    try {
      await db.insert(searchAnalytics).values({
        userId,
        query: criteria.query || '',
        filters: JSON.stringify(criteria),
        resultsCount,
        responseTimeMs: responseTime
      });
    } catch (error) {
      console.warn('Failed to log search analytics:', error);
    }
  }

  private async generateSearchSuggestions(userId: number, query?: string): Promise<string[]> {
    if (!query || query.length < 2) return [];
    
    // Get common error types and messages for suggestions
    const suggestions = await db.select({
      errorType: errorLogs.errorType,
      count: sql`count(*)`
    })
    .from(errorLogs)
    .where(
      and(
        sql`${errorLogs.fileId} IN (SELECT id FROM log_files WHERE uploaded_by = ${userId})`,
        like(errorLogs.errorType, `%${query}%`)
      )
    )
    .groupBy(errorLogs.errorType)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

    return suggestions.map(s => s.errorType);
  }
}