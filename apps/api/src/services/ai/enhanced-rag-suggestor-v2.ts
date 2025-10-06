/**
 * Enhanced RAG Suggestion Service
 * Provides context-aware error suggestions using vector similarity search
 * and historical pattern analysis
 */

import { VectorDatabaseClient } from "../vector-database.js";
import { Database } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  errorLogs,
  errorPatterns,
  suggestionFeedback,
  patternMetrics,
} from "@shared/schema.js";
import { eq, isNotNull } from "drizzle-orm";
import crypto from "crypto";

interface SimilarError {
  id: number;
  message: string;
  solution: string;
  similarity: number;
  metadata: {
    severity: string;
    errorType: string;
    pattern: string;
    resolutionTime?: number;
    successRate?: number;
  };
}

interface RAGSuggestion {
  id: string;
  suggestion: string;
  confidence: number;
  category: string;
  severity: string;
  estimatedTime: string;
  similarCases: SimilarError[];
  reasoning: string;
  contextualInsights: string[];
}

interface PatternInsight {
  pattern: string;
  errorType: string;
  severity: string;
  suggestedFix: string;
  metrics: any;
}

export class EnhancedRAGSuggestor {
  private vectorDb: VectorDatabaseClient;
  private db: any;
  private isReady: boolean = false;

  constructor(database: Database) {
    this.vectorDb = new VectorDatabaseClient({
      dimension: 384,
      indexType: "IndexFlatL2",
      model: "BAAI/bge-base-en-v1.5",
    });
    this.db = drizzle(database);
  }

  async initialize(): Promise<boolean> {
    try {
      // Minimal delay for service startup (reduced from 2000ms to 100ms)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Index existing errors for enhanced suggestions
      await this.indexExistingErrors();
      this.isReady = true;

      console.log("✅ Enhanced RAG Suggestor initialized");
      return true;
    } catch (error) {
      console.error("Failed to initialize Enhanced RAG Suggestor:", error);
      this.isReady = false;
      return false;
    }
  }

  async generateEnhancedSuggestion(
    errorMessage: string,
    severity: string,
    context?: string
  ): Promise<RAGSuggestion> {
    const suggestionId = crypto.randomUUID();

    try {
      // 1. Find similar errors using vector search
      const similarErrors = await this.findSimilarErrors(errorMessage, 5);

      // 2. Get pattern-based insights
      const patternInsights = await this.getPatternInsights(errorMessage);

      // 3. Generate context-aware suggestion
      const ragSuggestion = await this.generateContextAwareSuggestion(
        errorMessage,
        severity,
        similarErrors,
        patternInsights,
        context
      );

      // 4. Calculate confidence based on similarity and pattern metrics
      const confidence = this.calculateConfidence(
        similarErrors,
        patternInsights
      );

      // 5. Estimate resolution time
      const estimatedTime = this.estimateResolutionTime(
        similarErrors,
        severity
      );

      return {
        id: suggestionId,
        suggestion: ragSuggestion.solution,
        confidence,
        category: ragSuggestion.category,
        severity,
        estimatedTime,
        similarCases: similarErrors,
        reasoning: ragSuggestion.reasoning,
        contextualInsights: ragSuggestion.insights,
      };
    } catch (error) {
      console.error("Error generating enhanced suggestion:", error);
      return this.getFallbackSuggestion(errorMessage, severity, suggestionId);
    }
  }

  private async findSimilarErrors(
    errorMessage: string,
    limit: number = 5
  ): Promise<SimilarError[]> {
    try {
      if (!this.isReady) {
        return [];
      }

      // Use vector search to find similar patterns
      const searchResults = await this.vectorDb.search(errorMessage, {
        k: limit,
        threshold: 0.3,
      });

      const similarErrors: SimilarError[] = [];

      for (const result of searchResults) {
        // Convert string id to number for database query
        const errorId = parseInt(result.id);
        if (isNaN(errorId)) continue;

        // Get full error details from database
        const errorDetails = await this.db
          .select()
          .from(errorLogs)
          .where(eq(errorLogs.id, errorId))
          .limit(1);

        if (errorDetails.length > 0) {
          const error = errorDetails[0];

          // Get pattern metrics if available
          const metrics = await this.getErrorMetrics(error.message);

          similarErrors.push({
            id: error.id,
            message: error.message,
            solution: error.aiSuggestion || "No solution recorded",
            similarity: result.similarity,
            metadata: {
              severity: error.severity || "medium",
              errorType: error.errorType || "unknown",
              pattern: error.pattern || "generic",
              resolutionTime: metrics?.avgResolutionTime,
              successRate: metrics?.successRate,
            },
          });
        }
      }

      return similarErrors;
    } catch (error) {
      console.error("Error finding similar errors:", error);
      return [];
    }
  }

  private async getPatternInsights(
    errorMessage: string
  ): Promise<PatternInsight[]> {
    try {
      const patterns = await this.db
        .select()
        .from(errorPatterns)
        .where(eq(errorPatterns.isActive, true));

      const matchingPatterns = patterns.filter((pattern: any) => {
        try {
          const regex = new RegExp(pattern.regex, "i");
          return regex.test(errorMessage);
        } catch {
          return false;
        }
      });

      // Get metrics for matching patterns
      const insights: PatternInsight[] = [];
      for (const pattern of matchingPatterns) {
        const patternHash = crypto
          .createHash("md5")
          .update(pattern.pattern)
          .digest("hex");
        const metrics = await this.db
          .select()
          .from(patternMetrics)
          .where(eq(patternMetrics.patternHash, patternHash))
          .limit(1);

        insights.push({
          pattern: pattern.pattern,
          errorType: pattern.errorType,
          severity: pattern.severity,
          suggestedFix: pattern.suggestedFix || "No fix available",
          metrics: metrics[0] || null,
        });
      }

      return insights;
    } catch (error) {
      console.error("Error getting pattern insights:", error);
      return [];
    }
  }

  private async generateContextAwareSuggestion(
    errorMessage: string,
    severity: string,
    similarErrors: SimilarError[],
    patternInsights: PatternInsight[],
    context?: string
  ): Promise<{
    solution: string;
    category: string;
    reasoning: string;
    insights: string[];
  }> {
    // Enhanced rule-based suggestion generation based on similar cases and patterns
    let solution =
      "Please check logs for detailed error information and consult documentation.";
    let category = "general";
    let reasoning = "Generated based on available patterns and similar cases.";
    const insights: string[] = [];

    // Use pattern insights for base recommendation
    if (patternInsights.length > 0) {
      const bestPattern = patternInsights.reduce((best, current) =>
        (current.metrics?.successRate || 0) > (best.metrics?.successRate || 0)
          ? current
          : best
      );

      solution = bestPattern.suggestedFix;
      category = bestPattern.errorType;
      reasoning = `Based on ${bestPattern.pattern} pattern with ${
        bestPattern.metrics?.successRate || "unknown"
      }% success rate`;

      insights.push(`Pattern match: ${bestPattern.pattern}`);
      if (bestPattern.metrics) {
        insights.push(
          `Historical success rate: ${bestPattern.metrics.successRate}%`
        );
        insights.push(
          `Average resolution time: ${bestPattern.metrics.avgResolutionTime} minutes`
        );
      }
    }

    // Enhance with similar error solutions
    if (similarErrors.length > 0) {
      const bestSolution = similarErrors
        .filter((err) => err.solution !== "No solution recorded")
        .sort((a, b) => b.similarity - a.similarity)[0];

      if (bestSolution) {
        solution = bestSolution.solution;
        reasoning += `. Similar error (${Math.round(
          bestSolution.similarity * 100
        )}% match) was resolved with this approach`;
        insights.push(`Found ${similarErrors.length} similar cases`);
        insights.push(
          `Best match similarity: ${Math.round(bestSolution.similarity * 100)}%`
        );
      }
    }

    // Add severity-specific insights
    if (severity === "critical") {
      insights.push("High priority: Immediate attention required");
      insights.push("Consider escalating to senior team members");
    } else if (severity === "high") {
      insights.push("Important: Should be resolved within next few hours");
    }

    // Add context-specific insights if provided
    if (context) {
      insights.push(`Context analysis: ${context}`);
    }

    return {
      solution,
      category,
      reasoning,
      insights,
    };
  }

  private calculateConfidence(
    similarErrors: SimilarError[],
    patternInsights: PatternInsight[]
  ): number {
    if (similarErrors.length === 0 && patternInsights.length === 0) {
      return 0.3; // Low confidence without historical data
    }

    let confidenceScore = 0;
    let factors = 0;

    // Factor 1: Similarity of cases (0-0.4 points)
    if (similarErrors.length > 0) {
      const avgSimilarity =
        similarErrors.reduce((sum, err) => sum + err.similarity, 0) /
        similarErrors.length;
      const highSimilarityCount = similarErrors.filter(
        (err) => err.similarity > 0.8
      ).length;

      confidenceScore += avgSimilarity * 0.3;
      confidenceScore += (highSimilarityCount / similarErrors.length) * 0.1;
      factors += 0.4;
    }

    // Factor 2: Pattern matching (0-0.3 points)
    if (patternInsights.length > 0) {
      const patternsWithMetrics = patternInsights.filter(
        (p) => p.metrics?.successRate
      ).length;
      const avgSuccessRate =
        patternInsights
          .filter((p) => p.metrics?.successRate)
          .reduce((sum, p) => sum + (p.metrics.successRate || 0), 0) /
        (patternsWithMetrics || 1);

      confidenceScore += (patternsWithMetrics / patternInsights.length) * 0.15;
      confidenceScore += (avgSuccessRate / 100) * 0.15;
      factors += 0.3;
    }

    // Factor 3: Historical success rates (0-0.3 points)
    const errorsWithSuccessRate = similarErrors.filter(
      (err) => err.metadata.successRate
    );
    if (errorsWithSuccessRate.length > 0) {
      const avgSuccessRate =
        errorsWithSuccessRate.reduce(
          (sum, err) => sum + (err.metadata.successRate || 0),
          0
        ) / errorsWithSuccessRate.length;
      confidenceScore += (avgSuccessRate / 100) * 0.3;
      factors += 0.3;
    }

    // Normalize to 0-1 range
    const normalizedScore = factors > 0 ? confidenceScore / factors : 0.3;

    // Ensure minimum confidence for any suggestion
    return Math.max(0.2, Math.min(0.95, normalizedScore));
  }

  private estimateResolutionTime(
    similarErrors: SimilarError[],
    severity: string
  ): string {
    if (similarErrors.length === 0) {
      // Default estimates based on severity
      switch (severity) {
        case "critical":
          return "30-60 minutes";
        case "high":
          return "45-90 minutes";
        case "medium":
          return "60-120 minutes";
        default:
          return "30-180 minutes";
      }
    }

    const timesWithData = similarErrors
      .map((err) => err.metadata.resolutionTime)
      .filter((time) => time !== undefined) as number[];

    if (timesWithData.length === 0) {
      return "45-120 minutes (no historical data)";
    }

    const avgTime =
      timesWithData.reduce((sum, time) => sum + time, 0) / timesWithData.length;
    const minTime = Math.min(...timesWithData);

    if (avgTime < 30)
      return `${Math.round(minTime)}-${Math.round(avgTime + 15)} minutes`;
    if (avgTime < 120)
      return `${Math.round(avgTime - 15)}-${Math.round(avgTime + 30)} minutes`;
    return `${Math.round(avgTime - 30)}-${Math.round(avgTime + 60)} minutes`;
  }

  private async getErrorMetrics(errorMessage: string): Promise<any | null> {
    try {
      const patternHash = crypto
        .createHash("md5")
        .update(errorMessage)
        .digest("hex");
      const metrics = await this.db
        .select()
        .from(patternMetrics)
        .where(eq(patternMetrics.patternHash, patternHash))
        .limit(1);

      return metrics[0] || null;
    } catch (error) {
      console.error("Error getting metrics:", error);
      return null;
    }
  }

  private getFallbackSuggestion(
    errorMessage: string,
    severity: string,
    suggestionId: string
  ): RAGSuggestion {
    return {
      id: suggestionId,
      suggestion:
        "Please review the error message and check the application logs for more context. Consider consulting the documentation or reaching out for technical support.",
      confidence: 0.3,
      category: "general",
      severity,
      estimatedTime: "60-180 minutes",
      similarCases: [],
      reasoning: "Fallback suggestion due to system limitations",
      contextualInsights: [
        "Manual analysis required",
        "Limited historical data available",
      ],
    };
  }

  async recordFeedback(
    errorId: number,
    suggestionId: string,
    wasHelpful: boolean,
    resolutionTime?: number,
    userRating?: number,
    feedbackNotes?: string
  ): Promise<void> {
    try {
      await this.db.insert(suggestionFeedback).values({
        errorId,
        suggestionId,
        wasHelpful,
        resolutionTime,
        userRating,
        feedbackNotes,
      });

      // Update pattern metrics
      await this.updatePatternMetrics(errorId, wasHelpful, resolutionTime);
    } catch (error) {
      console.error("Error recording feedback:", error);
    }
  }

  private async updatePatternMetrics(
    errorId: number,
    wasHelpful: boolean,
    resolutionTime?: number
  ): Promise<void> {
    try {
      const error = await this.db
        .select()
        .from(errorLogs)
        .where(eq(errorLogs.id, errorId))
        .limit(1);

      if (error.length === 0) return;

      const patternHash = crypto
        .createHash("md5")
        .update(error[0].message)
        .digest("hex");

      // Get or create pattern metrics
      let metrics = await this.db
        .select()
        .from(patternMetrics)
        .where(eq(patternMetrics.patternHash, patternHash))
        .limit(1);

      if (metrics.length === 0) {
        // Create new metrics entry
        await this.db.insert(patternMetrics).values({
          patternHash,
          totalOccurrences: 1,
          successfulResolutions: wasHelpful ? 1 : 0,
          avgResolutionTime: resolutionTime || null,
          successRate: wasHelpful ? 100 : 0,
        });
      } else {
        // Update existing metrics
        const current = metrics[0];
        const newTotal = current.totalOccurrences + 1;
        const newSuccessful =
          current.successfulResolutions + (wasHelpful ? 1 : 0);
        const newSuccessRate = (newSuccessful / newTotal) * 100;

        let newAvgResolutionTime = current.avgResolutionTime;
        if (resolutionTime) {
          if (current.avgResolutionTime) {
            newAvgResolutionTime = Math.round(
              (current.avgResolutionTime * current.totalOccurrences +
                resolutionTime) /
                newTotal
            );
          } else {
            newAvgResolutionTime = resolutionTime;
          }
        }

        await this.db
          .update(patternMetrics)
          .set({
            totalOccurrences: newTotal,
            successfulResolutions: newSuccessful,
            successRate: newSuccessRate,
            avgResolutionTime: newAvgResolutionTime,
            lastUpdated: Date.now(),
          })
          .where(eq(patternMetrics.patternHash, patternHash));
      }
    } catch (error) {
      console.error("Error updating pattern metrics:", error);
    }
  }

  async indexExistingErrors(): Promise<void> {
    try {
      console.log("🔄 Indexing existing errors for RAG system...");

      // Get all resolved errors with suggestions
      const errors = await this.db
        .select({
          id: errorLogs.id,
          message: errorLogs.message,
          aiSuggestion: errorLogs.aiSuggestion,
          severity: errorLogs.severity,
          pattern: errorLogs.pattern,
        })
        .from(errorLogs)
        .where(isNotNull(errorLogs.aiSuggestion))
        .limit(1000); // Index in batches

      if (errors.length > 0) {
        const indexData = errors.map((error: any) => ({
          id: error.id,
          text: error.message,
          metadata: {
            severity: error.severity || "medium",
            pattern: error.pattern || "generic",
            solution: error.aiSuggestion || "No solution available",
          },
        }));

        await this.vectorDb.indexPatterns(indexData);
        console.log(`✅ Successfully indexed ${errors.length} errors for RAG`);
      } else {
        console.log("ℹ️ No errors with suggestions found for indexing");
      }
    } catch (error) {
      console.error("❌ Error indexing existing errors:", error);
    }
  }
}
