import { ErrorLog, AISuggestion } from "@shared/schema";
import { storage } from "../database/database-storage.js";

interface VectorSearchResult {
  pattern: string;
  similarity: number;
  errorType: string;
  solution: {
    resolutionSteps: string[];
    successRate: number;
    avgResolutionTime: string;
    codeExample?: string;
  };
  frequency: number;
}

interface RAGContext {
  similarPatterns: VectorSearchResult[];
  historicalSolutions: string[];
  commonCauses: string[];
  preventiveMeasures: string[];
  confidence: number;
}

interface EnhancedSuggestionResult {
  source: "rag_enhanced" | "ml_model" | "static_map" | "fallback";
  confidence: number;
  rootCause: string;
  resolutionSteps: string[];
  codeExample?: string;
  preventionMeasures: string[];
  reasoning: string;
  relatedPatterns: string[];
  estimatedResolutionTime: string;
  priority: "immediate" | "urgent" | "normal" | "low";
  historicalContext: {
    similarCases: number;
    avgSuccessRate: number;
    recommendedApproach: string;
  };
}

/**
 * RAG-Enhanced Suggestion Service
 * Combines vector search with large language models for context-aware error resolution
 */
export class RAGSuggestionService {
  private vectorDB: VectorDatabaseClient;
  private embeddingModel: EmbeddingService;
  private knowledgeBase: Map<string, VectorSearchResult> = new Map();

  constructor() {
    this.initializeVectorDB();
    this.populateKnowledgeBase();
  }

  /**
   * Generate RAG-enhanced suggestion for error
   */
  async generateEnhancedSuggestion(
    error: ErrorLog
  ): Promise<EnhancedSuggestionResult> {
    try {
      console.log(
        `🔍 RAG: Processing error ID ${
          error.id
        } with message: ${error.message.substring(0, 100)}...`
      );

      // Step 1: Generate embedding for current error
      const errorEmbedding = await this.generateErrorEmbedding(error);

      // Step 2: Perform semantic search for similar patterns
      const similarPatterns = await this.findSimilarPatterns(
        errorEmbedding,
        error
      );

      if (similarPatterns.length === 0) {
        console.log(
          "📊 RAG: No similar patterns found, falling back to standard approach"
        );
        return await this.fallbackToStandardSuggestion(error);
      }

      // Step 3: Build retrieval context from similar patterns
      const context = await this.buildRetrievalContext(similarPatterns, error);

      // Step 4: Generate enhanced prompt with historical context
      const enhancedPrompt = this.buildRAGPrompt(error, context);

      // Step 5: Generate suggestion with LLM using retrieved context
      const suggestion = await this.generateContextualSuggestion(
        enhancedPrompt,
        error
      );

      // Step 6: Validate and enhance with historical data
      const enhancedResult = this.validateAndEnhance(suggestion, context);

      console.log(
        `✅ RAG: Generated enhanced suggestion with ${enhancedResult.confidence}% confidence`
      );

      // Step 7: Learn from this interaction
      await this.updateKnowledgeBase(error, enhancedResult);

      return enhancedResult;
    } catch (error) {
      console.error("❌ RAG: Error in enhanced suggestion generation:", error);
      return await this.fallbackToStandardSuggestion(error);
    }
  }

  /**
   * Initialize vector database and load existing patterns
   */
  private async initializeVectorDB() {
    // Initialize FAISS-based vector search
    this.vectorDB = new VectorDatabaseClient({
      dimension: 384, // Using sentence-transformers dimension
      indexType: "L2", // L2 distance for similarity
      model: "BAAI/bge-base-en-v1.5", // High-quality embedding model
    });

    this.embeddingModel = new EmbeddingService({
      model: "BAAI/bge-base-en-v1.5",
      maxLength: 512,
    });

    console.log("🚀 RAG: Vector database initialized");
  }

  /**
   * Populate knowledge base with existing error patterns and solutions
   */
  private async populateKnowledgeBase() {
    try {
      // Get all error logs with successful AI suggestions
      const resolvedErrors = await storage.getResolvedErrorsWithSuggestions();

      console.log(
        `📚 RAG: Indexing ${resolvedErrors.length} resolved error patterns...`
      );

      const patterns = await Promise.all(
        resolvedErrors.map(async (error) => {
          const embedding = await this.generateErrorEmbedding(error);
          return {
            id: error.id.toString(),
            pattern: error.message,
            errorType: error.errorType,
            severity: error.severity,
            embedding: embedding,
            solution: this.extractSolutionData(error.aiSuggestion),
            frequency: await this.calculatePatternFrequency(error.message),
            metadata: {
              createdAt: error.createdAt,
              confidence: error.aiSuggestion?.confidence || 0,
              resolutionTime:
                error.mlPrediction?.estimatedResolutionTime || "unknown",
            },
          };
        })
      );

      // Index patterns in vector database
      await this.vectorDB.indexPatterns(patterns);

      // Cache frequently accessed patterns
      patterns.forEach((pattern) => {
        this.knowledgeBase.set(pattern.id, {
          pattern: pattern.pattern,
          similarity: 1.0,
          errorType: pattern.errorType,
          solution: pattern.solution,
          frequency: pattern.frequency,
        });
      });

      console.log(
        `✅ RAG: Knowledge base populated with ${patterns.length} patterns`
      );
    } catch (error) {
      console.error("❌ RAG: Error populating knowledge base:", error);
    }
  }

  /**
   * Generate embedding vector for error message
   */
  private async generateErrorEmbedding(error: ErrorLog): Promise<number[]> {
    // Combine multiple error features for richer embeddings
    const errorText = [
      error.message,
      error.errorType,
      error.severity,
      error.fullText?.substring(0, 200) || "",
    ].join(" | ");

    return await this.embeddingModel.encode(errorText);
  }

  /**
   * Find similar error patterns using vector similarity search
   */
  private async findSimilarPatterns(
    errorEmbedding: number[],
    error: ErrorLog,
    k: number = 5,
    threshold: number = 0.7
  ): Promise<VectorSearchResult[]> {
    const searchResults = await this.vectorDB.search(errorEmbedding, {
      k: k * 2, // Search more to filter by relevance
      threshold: threshold,
      filters: {
        errorType: error.errorType, // Prioritize same error type
        severity: error.severity, // Consider severity level
      },
    });

    // Rank results by combined similarity and success rate
    const rankedResults = searchResults
      .map((result) => ({
        ...result,
        combinedScore:
          result.similarity * 0.7 + result.solution.successRate * 0.3,
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, k);

    console.log(
      `🔎 RAG: Found ${
        rankedResults.length
      } similar patterns with avg similarity ${
        rankedResults.reduce((sum, r) => sum + r.similarity, 0) /
        rankedResults.length
      }`
    );

    return rankedResults;
  }

  /**
   * Build retrieval context from similar patterns
   */
  private async buildRetrievalContext(
    similarPatterns: VectorSearchResult[],
    currentError: ErrorLog
  ): Promise<RAGContext> {
    const historicalSolutions = similarPatterns
      .map((p) => p.solution.resolutionSteps.join("; "))
      .filter((solution, index, arr) => arr.indexOf(solution) === index) // Remove duplicates
      .slice(0, 3); // Top 3 unique solutions

    const commonCauses = this.extractCommonCauses(similarPatterns);
    const preventiveMeasures =
      this.aggregatePreventiveMeasures(similarPatterns);

    const avgSuccessRate =
      similarPatterns.reduce((sum, p) => sum + p.solution.successRate, 0) /
      similarPatterns.length;
    const confidence = Math.min(
      avgSuccessRate * 0.8 + (similarPatterns.length / 5) * 0.2,
      0.95
    );

    return {
      similarPatterns,
      historicalSolutions,
      commonCauses,
      preventiveMeasures,
      confidence,
    };
  }

  /**
   * Build enhanced prompt with retrieval context
   */
  private buildRAGPrompt(error: ErrorLog, context: RAGContext): string {
    const basePrompt = `
Analyze this error and provide a comprehensive solution:

CURRENT ERROR:
- Type: ${error.errorType}
- Severity: ${error.severity}  
- Message: ${error.message}
- Context: ${error.fullText?.substring(0, 300) || "No additional context"}

HISTORICAL CONTEXT:
Based on ${context.similarPatterns.length} similar past cases:

SUCCESSFUL RESOLUTIONS:
${context.historicalSolutions
  .map((solution, i) => `${i + 1}. ${solution}`)
  .join("\n")}

COMMON ROOT CAUSES:
${context.commonCauses.map((cause, i) => `- ${cause}`).join("\n")}

PROVEN PREVENTION MEASURES:
${context.preventiveMeasures.map((measure, i) => `- ${measure}`).join("\n")}

PATTERN ANALYSIS:
- Similar cases resolved: ${context.similarPatterns.length}
- Average success rate: ${(
      (context.similarPatterns.reduce(
        (sum, p) => sum + p.solution.successRate,
        0
      ) /
        context.similarPatterns.length) *
      100
    ).toFixed(1)}%
- Typical resolution time: ${
      context.similarPatterns[0]?.solution.avgResolutionTime || "varies"
    }

Please provide:
1. Root cause analysis based on historical patterns
2. Step-by-step resolution prioritizing proven methods
3. Code examples if applicable (learn from similar cases)
4. Prevention measures based on historical data
5. Confidence assessment and alternative approaches

Format your response with clear sections for each component.`;

    return basePrompt;
  }

  /**
   * Generate contextual suggestion using LLM with RAG context
   */
  private async generateContextualSuggestion(
    prompt: string,
    error: ErrorLog
  ): Promise<AISuggestion> {
    // Use existing AI service but with enhanced prompt
    const aiService = new (await import("../services/ai-service.js")).AIService();

    // Create enhanced error object with RAG context
    const enhancedError = {
      ...error,
      fullText: prompt, // Replace fullText with RAG-enhanced prompt
    };

    return await aiService.generateErrorSuggestion(enhancedError);
  }

  /**
   * Validate and enhance suggestion with historical context
   */
  private validateAndEnhance(
    suggestion: AISuggestion,
    context: RAGContext
  ): EnhancedSuggestionResult {
    const historicalContext = {
      similarCases: context.similarPatterns.length,
      avgSuccessRate:
        context.similarPatterns.reduce(
          (sum, p) => sum + p.solution.successRate,
          0
        ) / context.similarPatterns.length,
      recommendedApproach:
        context.similarPatterns.length > 0
          ? "Follow proven historical resolution pattern"
          : "Apply standard troubleshooting approach",
    };

    // Enhance confidence based on historical success rate
    const baseConfidence = suggestion.confidence || 75;
    const historicalBoost = historicalContext.avgSuccessRate * 0.2;
    const enhancedConfidence = Math.min(baseConfidence + historicalBoost, 95);

    return {
      source: "rag_enhanced",
      confidence: enhancedConfidence,
      rootCause: suggestion.rootCause,
      resolutionSteps: suggestion.resolutionSteps,
      codeExample: suggestion.codeExample,
      preventionMeasures: suggestion.preventionMeasures,
      reasoning: `RAG-enhanced suggestion based on ${
        context.similarPatterns.length
      } similar historical patterns with ${historicalContext.avgSuccessRate.toFixed(
        1
      )}% average success rate`,
      relatedPatterns: context.similarPatterns.map((p) =>
        p.pattern.substring(0, 100)
      ),
      estimatedResolutionTime: this.estimateResolutionTime(
        context.similarPatterns
      ),
      priority: this.calculatePriority(suggestion, context),
      historicalContext,
    };
  }

  /**
   * Update knowledge base with new successful resolution
   */
  private async updateKnowledgeBase(
    error: ErrorLog,
    result: EnhancedSuggestionResult
  ) {
    // This would be called after user provides feedback on suggestion success
    // For now, we'll prepare the structure for future learning
    console.log(`📝 RAG: Prepared knowledge update for error ${error.id}`);
  }

  /**
   * Fallback to standard suggestion when RAG fails
   */
  private async fallbackToStandardSuggestion(
    error: ErrorLog
  ): Promise<EnhancedSuggestionResult> {
    const { Suggestor } = await import("../services/suggestor");
    const suggestor = new Suggestor();
    const standardResult = await suggestor.getSuggestion(error);

    // Convert to enhanced format
    return {
      ...standardResult,
      historicalContext: {
        similarCases: 0,
        avgSuccessRate: 0,
        recommendedApproach: "Standard approach (no historical data)",
      },
    };
  }

  // Helper methods
  private extractSolutionData(aiSuggestion: any) {
    return {
      resolutionSteps: aiSuggestion?.resolutionSteps || [],
      successRate: 0.8, // Default assumption, would be tracked over time
      avgResolutionTime: "2-4 hours", // Default estimate
      codeExample: aiSuggestion?.codeExample,
    };
  }

  private async calculatePatternFrequency(message: string): Promise<number> {
    // Simplified frequency calculation
    const similarMessages = await storage.countSimilarMessages(message);
    return similarMessages;
  }

  private extractCommonCauses(patterns: VectorSearchResult[]): string[] {
    // Extract common themes from successful resolutions
    const causes = new Set<string>();
    patterns.forEach((p) => {
      if (p.solution.resolutionSteps.length > 0) {
        // Simplified cause extraction - in reality would use NLP
        const firstStep = p.solution.resolutionSteps[0];
        if (firstStep.includes("check") || firstStep.includes("verify")) {
          causes.add("Configuration or connectivity issue");
        }
        if (firstStep.includes("update") || firstStep.includes("install")) {
          causes.add("Outdated dependencies or missing components");
        }
        if (firstStep.includes("permission") || firstStep.includes("access")) {
          causes.add("Permission or access rights issue");
        }
      }
    });
    return Array.from(causes).slice(0, 3);
  }

  private aggregatePreventiveMeasures(
    patterns: VectorSearchResult[]
  ): string[] {
    const measures = new Set<string>();
    patterns.forEach((p) => {
      // Add common prevention patterns
      measures.add("Implement proper error handling and logging");
      measures.add("Regular system health monitoring");
      measures.add("Keep dependencies updated");
    });
    return Array.from(measures).slice(0, 4);
  }

  private estimateResolutionTime(patterns: VectorSearchResult[]): string {
    if (patterns.length === 0) return "2-4 hours";

    const times = patterns.map((p) => p.solution.avgResolutionTime);
    // Simplified time estimation
    return times[0] || "2-4 hours";
  }

  private calculatePriority(
    suggestion: AISuggestion,
    context: RAGContext
  ): "immediate" | "urgent" | "normal" | "low" {
    const confidence = suggestion.confidence || 0;
    const historicalSuccess =
      context.similarPatterns.reduce(
        (sum, p) => sum + p.solution.successRate,
        0
      ) / context.similarPatterns.length;

    if (confidence > 90 && historicalSuccess > 0.9) return "immediate";
    if (confidence > 80 && historicalSuccess > 0.8) return "urgent";
    if (confidence > 70 && historicalSuccess > 0.6) return "normal";
    return "low";
  }
}

// Mock classes that would need to be implemented
class VectorDatabaseClient {
  constructor(config: any) {}
  async indexPatterns(patterns: any[]) {}
  async search(
    embedding: number[],
    options: any
  ): Promise<VectorSearchResult[]> {
    return [];
  }
}

class EmbeddingService {
  constructor(config: any) {}
  async encode(text: string): Promise<number[]> {
    return new Array(384).fill(0).map(() => Math.random());
  }
}

export const ragSuggestionService = new RAGSuggestionService();
