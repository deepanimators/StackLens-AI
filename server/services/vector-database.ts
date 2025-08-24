/**
 * Vector Database Service for RAG Implementation
 * Provides semantic search capabilities using FAISS and sentence transformers
 */

import { spawn } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ErrorLog } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VectorSearchOptions {
  k?: number;
  threshold?: number;
  filters?: {
    errorType?: string;
    severity?: string;
    [key: string]: any;
  };
}

interface VectorSearchResult {
  id: string;
  pattern: string;
  similarity: number;
  errorType: string;
  severity: string;
  solution: {
    resolutionSteps: string[];
    successRate: number;
    avgResolutionTime: string;
    codeExample?: string;
  };
  frequency: number;
  metadata: any;
}

interface IndexedPattern {
  id: string;
  pattern: string;
  errorType: string;
  severity: string;
  embedding?: number[];
  solution: {
    resolutionSteps: string[];
    successRate: number;
    avgResolutionTime: string;
    codeExample?: string;
  };
  frequency: number;
  metadata: any;
}

/**
 * Vector Database Client for semantic search
 * Uses Python microservice for FAISS operations
 */
export class VectorDatabaseClient {
  private dimension: number;
  private indexType: string;
  private model: string;
  private vectorServiceUrl: string;
  private isInitialized: boolean = false;
  private patterns: Map<string, IndexedPattern> = new Map();

  constructor(config: {
    dimension: number;
    indexType: string;
    model: string;
    serviceUrl?: string;
  }) {
    this.dimension = config.dimension;
    this.indexType = config.indexType;
    this.model = config.model;
    this.vectorServiceUrl = config.serviceUrl || "http://localhost:8001";

    this.initializeService();
  }

  /**
   * Initialize the vector database service
   */
  private async initializeService() {
    try {
      // Check if Python vector service is running
      const isRunning = await this.checkServiceHealth();

      if (!isRunning) {
        console.log("🚀 Starting Python vector database service...");
        await this.startVectorService();
      }

      this.isInitialized = true;
      console.log("✅ Vector database service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize vector database:", error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if the vector service is healthy
   */
  private async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.vectorServiceUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Start the Python vector database service
   */
  private async startVectorService(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if enhanced vector service file exists
      const servicePath = path.join(
        __dirname,
        "../../ml_microservices/enhanced_vector_db_service.py"
      );

      if (!existsSync(servicePath)) {
        console.warn(
          "⚠️ Enhanced vector service not found, using fallback similarity search"
        );
        resolve();
        return;
      }

      console.log("🚀 Starting enhanced Python vector service...");

      // Start the Python service with explicit port
      const pythonProcess = spawn("python", [servicePath], {
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PORT: "8001",
          HOST: "0.0.0.0",
        },
      });

      pythonProcess.stdout?.on("data", (data) => {
        console.log(`📊 Vector Service: ${data.toString().trim()}`);
      });

      pythonProcess.stderr?.on("data", (data) => {
        console.error(`❌ Vector Service Error: ${data.toString().trim()}`);
      });

      pythonProcess.on("error", (error) => {
        console.error("❌ Failed to start Python vector service:", error);
        resolve(); // Don't reject, just use fallback
      });

      // Wait a moment for service to start
      setTimeout(async () => {
        const isHealthy = await this.checkServiceHealth();
        if (isHealthy) {
          console.log("✅ Vector service started successfully");
        } else {
          console.warn(
            "⚠️ Vector service may not be fully ready, using fallback"
          );
        }
        resolve();
      }, 3000);
    });
  }

  /**
   * Index patterns for semantic search
   */
  async indexPatterns(patterns: IndexedPattern[]): Promise<void> {
    if (!this.isInitialized) {
      console.warn("⚠️ Vector DB not initialized, storing patterns locally");
      patterns.forEach((pattern) => {
        this.patterns.set(pattern.id, pattern);
      });
      return;
    }

    try {
      // Prepare corpus and metadata for indexing
      const corpus = patterns.map((p) => p.pattern);
      const metadata = patterns.map((p) => ({
        id: p.id,
        errorType: p.errorType,
        severity: p.severity,
        frequency: p.frequency,
        ...p.metadata,
      }));

      const response = await fetch(`${this.vectorServiceUrl}/index-corpus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ corpus, metadata }),
      });

      if (response.ok) {
        // Store pattern metadata locally for quick access
        patterns.forEach((pattern) => {
          this.patterns.set(pattern.id, pattern);
        });

        const result = await response.json();
        console.log(
          `📚 Indexed ${patterns.length} patterns in vector database (${result.dimension}D)`
        );
      } else {
        throw new Error(`Failed to index patterns: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error indexing patterns:", error);
      // Fallback to local storage
      patterns.forEach((pattern) => {
        this.patterns.set(pattern.id, pattern);
      });
    }
  }

  /**
   * Search for similar patterns using vector similarity
   */
  async search(
    queryEmbedding: number[] | string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const { k = 5, threshold = 0.7, filters = {} } = options;

    if (!this.isInitialized) {
      return this.fallbackSimilaritySearch(queryEmbedding, options);
    }

    try {
      const query =
        typeof queryEmbedding === "string" ? queryEmbedding : "vector_query";

      const response = await fetch(`${this.vectorServiceUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, k }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      const results: VectorSearchResult[] = [];

      for (const result of data.results) {
        const pattern = Array.from(this.patterns.values())[result.corpus_id];
        if (pattern && this.matchesFilters(pattern, filters)) {
          const similarity = 1 - result.distance / 2; // Convert distance to similarity

          if (similarity >= threshold) {
            results.push({
              id: pattern.id,
              pattern: pattern.pattern,
              similarity,
              errorType: pattern.errorType,
              severity: pattern.severity,
              solution: pattern.solution,
              frequency: pattern.frequency,
              metadata: pattern.metadata,
            });
          }
        }
      }

      return results.sort((a, b) => b.similarity - a.similarity).slice(0, k);
    } catch (error) {
      console.error("❌ Vector search failed:", error);
      return this.fallbackSimilaritySearch(queryEmbedding, options);
    }
  }

  /**
   * Fallback similarity search using string matching
   */
  private fallbackSimilaritySearch(
    query: number[] | string,
    options: VectorSearchOptions
  ): VectorSearchResult[] {
    const { k = 5, threshold = 0.3, filters = {} } = options;
    const queryText = typeof query === "string" ? query.toLowerCase() : "";

    if (!queryText) {
      console.warn("⚠️ No query text provided for fallback search");
      return [];
    }

    const results: VectorSearchResult[] = [];

    // Convert patterns Map to Array for iteration
    const patternArray = Array.from(this.patterns.values());
    for (const pattern of patternArray) {
      if (!this.matchesFilters(pattern, filters)) continue;

      const similarity = this.calculateStringSimilarity(
        queryText,
        pattern.pattern.toLowerCase()
      );

      if (similarity >= threshold) {
        results.push({
          id: pattern.id,
          pattern: pattern.pattern,
          similarity,
          errorType: pattern.errorType,
          severity: pattern.severity,
          solution: pattern.solution,
          frequency: pattern.frequency,
          metadata: pattern.metadata,
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, k);
  }

  /**
   * Check if pattern matches the provided filters
   */
  private matchesFilters(pattern: IndexedPattern, filters: any): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (value && pattern[key as keyof IndexedPattern] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate string similarity using Jaccard similarity
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    // Convert sets to arrays for compatibility
    const words1Array = Array.from(words1);
    const words2Array = Array.from(words2);

    const intersection = new Set(
      words1Array.filter((word) => words2.has(word))
    );
    const union = new Set([...words1Array, ...words2Array]);

    return intersection.size / union.size;
  }

  /**
   * Add a new pattern to the index
   */
  async addPattern(pattern: IndexedPattern): Promise<void> {
    this.patterns.set(pattern.id, pattern);

    // If vector service is available, reindex
    if (this.isInitialized) {
      const allPatterns = Array.from(this.patterns.values());
      await this.indexPatterns(allPatterns);
    }
  }

  /**
   * Get indexed pattern by ID
   */
  getPattern(id: string): IndexedPattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Get total number of indexed patterns
   */
  getPatternCount(): number {
    return this.patterns.size;
  }

  /**
   * Clear all patterns
   */
  clearPatterns(): void {
    this.patterns.clear();
  }
}

/**
 * Embedding Service for generating vector embeddings
 */
export class EmbeddingService {
  private model: string;
  private maxLength: number;
  private serviceUrl: string;

  constructor(config: {
    model: string;
    maxLength: number;
    serviceUrl?: string;
  }) {
    this.model = config.model;
    this.maxLength = config.maxLength;
    this.serviceUrl = config.serviceUrl || "http://localhost:8001";
  }

  /**
   * Generate embedding for text
   */
  async encode(text: string): Promise<number[]> {
    try {
      // Truncate text if too long
      const truncatedText =
        text.length > this.maxLength ? text.substring(0, this.maxLength) : text;

      const response = await fetch(`${this.serviceUrl}/embed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: truncatedText }),
      });

      if (!response.ok) {
        throw new Error(`Embedding generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error("❌ Embedding generation failed:", error);
      // Return a random embedding as fallback
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Generate multiple embeddings in batch
   */
  async encodeBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.encode(text)));
  }

  /**
   * Generate fallback embedding using simple hash
   */
  private generateFallbackEmbedding(text: string): number[] {
    const embedding = new Array(384).fill(0);

    // Simple hash-based embedding generation
    for (let i = 0; i < text.length && i < embedding.length; i++) {
      embedding[i % embedding.length] += text.charCodeAt(i) / 1000;
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    return embedding.map((val) => (magnitude > 0 ? val / magnitude : 0));
  }
}

/**
 * Factory function to create configured vector database client
 */
export function createVectorDatabase(): VectorDatabaseClient {
  return new VectorDatabaseClient({
    dimension: 384,
    indexType: "L2",
    model: "BAAI/bge-base-en-v1.5",
    serviceUrl: process.env.VECTOR_DB_URL || "http://localhost:8001",
  });
}

/**
 * Factory function to create configured embedding service
 */
export function createEmbeddingService(): EmbeddingService {
  return new EmbeddingService({
    model: "BAAI/bge-base-en-v1.5",
    maxLength: 512,
    serviceUrl: process.env.VECTOR_DB_URL || "http://localhost:8001",
  });
}
