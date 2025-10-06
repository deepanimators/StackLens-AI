/**
 * Microservices Proxy Service
 * Central service to communicate with Python AI microservices
 */

import axios, { AxiosResponse } from "axios";
import { config } from "dotenv";

config();

export interface MicroserviceEndpoint {
  name: string;
  url: string;
  port: number;
  healthEndpoint: string;
}

export interface EmbeddingRequest {
  sentences: string[];
}

export interface EmbeddingResponse {
  embeddings: number[][];
}

export interface ClusterRequest {
  embeddings: number[][];
  n_clusters?: number;
}

export interface ClusterResponse {
  labels: number[];
  cluster_centers?: number[][];
}

export interface SemanticSearchRequest {
  query: string;
  texts: string[];
  top_k?: number;
}

export interface SemanticSearchResponse {
  results: Array<{
    text: string;
    score: number;
    index: number;
  }>;
}

export interface AnomalyDetectionRequest {
  texts: string[];
  contamination?: number;
}

export interface AnomalyDetectionResponse {
  anomalies: number[];
  scores: number[];
}

export interface NERRequest {
  text: string;
}

export interface NERResponse {
  entities: Array<{
    text: string;
    label: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface SummarizationRequest {
  text: string;
  max_length?: number;
  min_length?: number;
}

export interface SummarizationResponse {
  summary: string;
  original_length: number;
  summary_length: number;
}

export class MicroservicesProxy {
  private endpoints: Map<string, MicroserviceEndpoint> = new Map();
  private baseUrl: string;
  private timeout: number = 30000; // 30 seconds

  constructor() {
    this.baseUrl = process.env.MICROSERVICES_BASE_URL || "http://localhost";
    this.initializeEndpoints();
  }

  private initializeEndpoints() {
    const services: MicroserviceEndpoint[] = [
      {
        name: "embeddings",
        url: `${this.baseUrl}:8000`,
        port: 8000,
        healthEndpoint: "/health",
      },
      {
        name: "ner",
        url: `${this.baseUrl}:8001`,
        port: 8001,
        healthEndpoint: "/health",
      },
      {
        name: "summarization",
        url: `${this.baseUrl}:8002`,
        port: 8002,
        healthEndpoint: "/health",
      },
      {
        name: "semantic_search",
        url: `${this.baseUrl}:8003`,
        port: 8003,
        healthEndpoint: "/health",
      },
      {
        name: "anomaly",
        url: `${this.baseUrl}:8004`,
        port: 8004,
        healthEndpoint: "/health",
      },
      {
        name: "vector_db",
        url: `${this.baseUrl}:8005`,
        port: 8005,
        healthEndpoint: "/health",
      },
      {
        name: "deep_learning",
        url: `${this.baseUrl}:8006`,
        port: 8006,
        healthEndpoint: "/health",
      },
      {
        name: "active_learning",
        url: `${this.baseUrl}:8007`,
        port: 8007,
        healthEndpoint: "/health",
      },
      {
        name: "demo_service",
        url: `${this.baseUrl}:8080`,
        port: 8080,
        healthEndpoint: "/health",
      },
    ];

    services.forEach((service) => {
      this.endpoints.set(service.name, service);
    });
  }

  /**
   * Check health of all microservices
   */
  async checkServicesHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();

    const services = Array.from(this.endpoints.entries());
    for (const [name, endpoint] of services) {
      try {
        const response = await axios.get(
          `${endpoint.url}${endpoint.healthEndpoint}`,
          {
            timeout: 5000,
          }
        );
        healthStatus.set(name, response.status === 200);
      } catch (error) {
        healthStatus.set(name, false);
      }
    }

    return healthStatus;
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(sentences: string[]): Promise<EmbeddingResponse> {
    const endpoint =
      this.endpoints.get("embeddings") || this.endpoints.get("demo_service");
    if (!endpoint) throw new Error("Embeddings service not available");

    try {
      const response: AxiosResponse<EmbeddingResponse> = await axios.post(
        `${endpoint.url}/embed`,
        { sentences },
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      console.error("Embeddings service error:", error);
      throw new Error("Failed to generate embeddings");
    }
  }

  /**
   * Perform clustering on embeddings
   */
  async performClustering(
    embeddings: number[][],
    nClusters: number = 5
  ): Promise<ClusterResponse> {
    const endpoint =
      this.endpoints.get("embeddings") || this.endpoints.get("demo_service");
    if (!endpoint) throw new Error("Clustering service not available");

    try {
      const response: AxiosResponse<ClusterResponse> = await axios.post(
        `${endpoint.url}/cluster`,
        { embeddings, n_clusters: nClusters },
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      console.error("Clustering service error:", error);
      throw new Error("Failed to perform clustering");
    }
  }

  /**
   * Semantic search
   */
  async semanticSearch(
    query: string,
    texts: string[],
    topK: number = 5
  ): Promise<SemanticSearchResponse> {
    const endpoint =
      this.endpoints.get("semantic_search") ||
      this.endpoints.get("demo_service");
    if (!endpoint) throw new Error("Semantic search service not available");

    try {
      const response: AxiosResponse<SemanticSearchResponse> = await axios.post(
        `${endpoint.url}/search`,
        { query, texts, top_k: topK },
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      console.error("Semantic search service error:", error);
      throw new Error("Failed to perform semantic search");
    }
  }

  /**
   * Detect anomalies in text data
   */
  async detectAnomalies(
    texts: string[],
    contamination: number = 0.1
  ): Promise<AnomalyDetectionResponse> {
    const endpoint =
      this.endpoints.get("anomaly") || this.endpoints.get("demo_service");
    if (!endpoint) throw new Error("Anomaly detection service not available");

    try {
      const response: AxiosResponse<AnomalyDetectionResponse> =
        await axios.post(
          `${endpoint.url}/detect-anomaly`,
          { texts, contamination },
          { timeout: this.timeout }
        );
      return response.data;
    } catch (error) {
      console.error("Anomaly detection service error:", error);
      throw new Error("Failed to detect anomalies");
    }
  }

  /**
   * Extract named entities
   */
  async extractEntities(text: string): Promise<NERResponse> {
    const endpoint = this.endpoints.get("ner");
    if (!endpoint) throw new Error("NER service not available");

    try {
      const response: AxiosResponse<NERResponse> = await axios.post(
        `${endpoint.url}/extract`,
        { text },
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      console.error("NER service error:", error);
      throw new Error("Failed to extract entities");
    }
  }

  /**
   * Summarize text
   */
  async summarizeText(
    text: string,
    maxLength: number = 150,
    minLength: number = 30
  ): Promise<SummarizationResponse> {
    const endpoint = this.endpoints.get("summarization");
    if (!endpoint) throw new Error("Summarization service not available");

    try {
      const response: AxiosResponse<SummarizationResponse> = await axios.post(
        `${endpoint.url}/summarize`,
        { text, max_length: maxLength, min_length: minLength },
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      console.error("Summarization service error:", error);
      throw new Error("Failed to summarize text");
    }
  }

  /**
   * Get error patterns using advanced analysis
   */
  async analyzeErrorPatterns(texts: string[]): Promise<any> {
    const endpoint = this.endpoints.get("demo_service");
    if (!endpoint) throw new Error("Pattern analysis service not available");

    try {
      const response = await axios.post(
        `${endpoint.url}/get-patterns`,
        { texts },
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      console.error("Pattern analysis service error:", error);
      throw new Error("Failed to analyze error patterns");
    }
  }

  /**
   * Comprehensive error analysis using multiple microservices
   */
  async comprehensiveErrorAnalysis(errorTexts: string[]): Promise<any> {
    try {
      const [embeddings, anomalies, patterns] = await Promise.all([
        this.generateEmbeddings(errorTexts).catch(() => null),
        this.detectAnomalies(errorTexts).catch(() => null),
        this.analyzeErrorPatterns(errorTexts).catch(() => null),
      ]);

      let clusters = null;
      if (embeddings) {
        clusters = await this.performClustering(embeddings.embeddings).catch(
          () => null
        );
      }

      return {
        embeddings,
        clusters,
        anomalies,
        patterns,
        analysis_timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Comprehensive analysis error:", error);
      throw new Error("Failed to perform comprehensive error analysis");
    }
  }
}

// Export singleton instance
export const microservicesProxy = new MicroservicesProxy();
