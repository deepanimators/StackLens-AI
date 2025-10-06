import { VectorDatabaseClient } from "./vector-database.js";
import { Database } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  errorLogs,
  errorPatterns,
  suggestionFeedback,
  patternMetrics,
} from "@shared/schema.js";
import { eq, desc, and, gte, isNotNull } from "drizzle-orm";
import crypto from "crypto";

interface SimilarError {
  id: number;
  message: string;
  solution: string;
  similarity: number;
  metadata: {
    severity: string;
    type: string;
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

export class EnhancedRAGSuggestor {
  private vectorDb: VectorDatabaseClient;
  private db: any;

  constructor(database: Database) {
    this.vectorDb = new VectorDatabaseClient();
    this.db = drizzle(database);
  }

  async initialize(): Promise<boolean> {
    try {
      const isVectorDbReady = await this.vectorDb.initialize();
      if (!isVectorDbReady) {
        console.warn(
          "Vector database not available, falling back to traditional suggestions"
        );
        return false;
      }

      // Index existing errors if vector DB is empty
      await this.indexExistingErrors();
      return true;
    } catch (error) {
      console.error("Failed to initialize Enhanced RAG Suggestor:", error);
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

      // 3. Generate context-aware suggestion using LLM
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
      const searchResults = await this.vectorDb.searchSimilar(
        errorMessage,
        limit
      );

      const similarErrors: SimilarError[] = [];

      for (const result of searchResults) {
        // Get full error details from database
        const errorDetails = await this.db
          .select()
          .from(errorLogs)
          .where(eq(errorLogs.id, result.id))
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
              type: error.type || "unknown",
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

  private async getPatternInsights(errorMessage: string): Promise<any[]> {
    try {
      const patterns = await this.db
        .select()
        .from(errorPatterns)
        .where(eq(errorPatterns.isActive, true));

      const matchingPatterns = patterns.filter((pattern) => {
        try {
          const regex = new RegExp(pattern.regex, "i");
          return regex.test(errorMessage);
        } catch {
          return false;
        }
      });

      // Get metrics for matching patterns
      const insights = [];
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
          type: pattern.errorType,
          severity: pattern.severity,
          suggestedFix: pattern.suggestedFix,
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
    patternInsights: any[],
    context?: string
  ): Promise<{
    solution: string;
    category: string;
    reasoning: string;
    insights: string[];
  }> {
    const similarCasesContext = similarErrors
      .map(
        (error) =>
          `Error: ${error.message}\nSolution: ${
            error.solution
          }\nSuccess Rate: ${
            error.metadata.successRate || "N/A"
          }\nResolution Time: ${error.metadata.resolutionTime || "N/A"} minutes`
      )
      .join("\n\n");

    const patternContext = patternInsights
      .map(
        (insight) =>
          `Pattern: ${insight.pattern}\nType: ${insight.type}\nSuggested Fix: ${
            insight.suggestedFix
          }\nHistorical Success Rate: ${insight.metrics?.successRate || "N/A"}`
      )
      .join("\n\n");

    const prompt = `
As an expert software engineering assistant with access to historical error resolution data, analyze the following error and provide a comprehensive solution.

CURRENT ERROR:
Message: ${errorMessage}
Severity: ${severity}
${context ? `Context: ${context}` : ""}

SIMILAR RESOLVED CASES:
${similarCasesContext || "No similar cases found in knowledge base"}

PATTERN-BASED INSIGHTS:
${patternContext || "No matching patterns found"}

Please provide a JSON response with the following structure:
{
  "solution": "Detailed step-by-step solution with specific commands/fixes",
  "category": "Error category (e.g., database, authentication, network, etc.)",
  "reasoning": "Explain why this solution is recommended based on similar cases and patterns",
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"]
}

Focus on:
1. Actionable steps based on successful historical resolutions
2. Risk assessment and prevention measures
3. Alternative approaches if the primary solution fails
4. Best practices to prevent similar issues

Ensure the solution is practical, tested (based on similar cases), and includes specific implementation details.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return {
        solution: result.solution || "Unable to generate specific solution",
        category: result.category || "general",
        reasoning: result.reasoning || "No reasoning available",
        insights: result.insights || [],
      };
    } catch (error) {
      console.error("Error generating context-aware suggestion:", error);
      return {
        solution:
          "Please check logs for detailed error information and consult documentation.",
        category: "general",
        reasoning: "LLM suggestion generation failed",
        insights: ["Manual analysis required"],
      };
    }
  }

  private calculateConfidence(
    similarErrors: SimilarError[],
    patternInsights: any[]
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
    const maxTime = Math.max(...timesWithData);

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

  private async indexExistingErrors(): Promise<void> {
    try {
      // Check if we need to index errors
      const stats = await this.vectorDb.getStats();
      if (stats.totalVectors > 100) {
        console.log(
          `Vector database already contains ${stats.totalVectors} vectors`
        );
        return;
      }

      console.log("Indexing existing errors for RAG system...");

      // Get all resolved errors with suggestions
      const errors = await this.db
        .select({
          id: errorLogs.id,
          message: errorLogs.message,
          aiSuggestion: errorLogs.aiSuggestion,
          severity: errorLogs.severity,
          type: errorLogs.type,
          pattern: errorLogs.pattern,
        })
        .from(errorLogs)
        .where(
          and(
            eq(errorLogs.aiSuggestion, null), // Only errors with suggestions
            gte(errorLogs.id, 1)
          )
        )
        .limit(1000); // Index in batches

      if (errors.length > 0) {
        const indexData = errors.map((error) => ({
          id: error.id,
          text: error.message,
          metadata: {
            severity: error.severity || "medium",
            type: error.type || "unknown",
            pattern: error.pattern || "generic",
            solution: error.aiSuggestion || "No solution available",
          },
        }));

        const success = await this.vectorDb.indexDocuments(indexData);
        if (success) {
          console.log(`Successfully indexed ${errors.length} errors for RAG`);
        } else {
          console.warn("Failed to index errors for RAG");
        }
      }
    } catch (error) {
      console.error("Error indexing existing errors:", error);
    }
  }
}
