/**
 * Enhanced Microservices Integration Service
 * Advanced AI-powered error intelligence integration
 */

import axios, { AxiosResponse } from "axios";
import { config } from "dotenv";

config();

export interface StackLensAnalysisRequest {
  text: string;
  context?: string;
  includeML?: boolean;
  includeSimilarity?: boolean;
  includeEntities?: boolean;
}

export interface StackLensAnalysisResponse {
  error_type: string;
  severity: string;
  confidence: number;
  suggested_solution: string;
  pattern_matched?: string;
  similar_errors?: Array<{
    text: string;
    similarity: number;
    error_type: string;
  }>;
  ai_insights?: {
    category: string;
    risk_level: string;
    urgency: string;
    business_impact: string;
  };
  entities?: Array<{
    text: string;
    label: string;
    confidence: number;
  }>;
  ml_predictions?: {
    primary_model: string;
    accuracy: number;
    alternatives: Array<{
      model: string;
      prediction: string;
      confidence: number;
    }>;
  };
}

export interface EnterpriseIntelligenceRequest {
  errors: string[];
  analysis_type?: "comprehensive" | "quick" | "deep";
  include_predictions?: boolean;
  include_anomalies?: boolean;
}

export interface EnterpriseIntelligenceResponse {
  detected_errors: Array<{
    text: string;
    error_type: string;
    severity: string;
    confidence: number;
    category: string;
    language: string;
    framework: string;
  }>;
  severity_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  language_distribution: Record<string, number>;
  framework_distribution: Record<string, number>;
  anomaly_score: number;
  risk_assessment: string;
  recommendations: string[];
  learning_opportunities: string[];
  trends: {
    error_velocity: number;
    severity_trend: string;
    category_shifts: Record<string, number>;
  };
}

export interface RealTimeMonitoringResponse {
  active_errors: number;
  critical_alerts: number;
  anomalies_detected: number;
  system_health: "healthy" | "warning" | "critical";
  predictions: {
    next_hour_errors: number;
    trend_direction: "increasing" | "decreasing" | "stable";
    risk_factors: string[];
  };
  recommendations: string[];
}

export interface DeepLearningAnalysisRequest {
  text: string;
  model_type?: "classification" | "regression" | "anomaly";
  include_explanation?: boolean;
}

export interface DeepLearningAnalysisResponse {
  prediction: string;
  confidence: number;
  model_used: string;
  explanation?: {
    key_features: string[];
    decision_factors: Record<string, number>;
    similar_patterns: string[];
  };
  alternatives: Array<{
    prediction: string;
    confidence: number;
    model: string;
  }>;
}

export interface VectorSearchRequest {
  query: string;
  limit?: number;
  similarity_threshold?: number;
  include_metadata?: boolean;
}

export interface VectorSearchResponse {
  results: Array<{
    text: string;
    similarity: number;
    metadata?: Record<string, any>;
    error_type?: string;
    severity?: string;
  }>;
  query_vector?: number[];
  search_time_ms: number;
}

export interface AIServiceEndpoint {
  name: string;
  url: string;
  port: number;
  health_endpoint: string;
  capabilities: string[];
  version: string;
}

export class EnhancedMicroservicesProxy {
  private endpoints: Map<string, AIServiceEndpoint> = new Map();
  private baseUrl: string;
  private timeout: number = 45000; // Extended timeout for AI operations
  private retryAttempts: number = 3;
  private circuitBreaker: Map<
    string,
    { failures: number; lastFailure: number }
  > = new Map();

  constructor() {
    this.baseUrl = process.env.MICROSERVICES_BASE_URL || "http://localhost";
    this.initializeAIEndpoints();
  }

  private initializeAIEndpoints() {
    const services: AIServiceEndpoint[] = [
      {
        name: "stacklens-intelligence",
        url: `${this.baseUrl}:8000`,
        port: 8000,
        health_endpoint: "/health",
        capabilities: [
          "error_analysis",
          "ml_prediction",
          "similarity_search",
          "pattern_matching",
        ],
        version: "1.0.0",
      },
      {
        name: "enterprise-intelligence",
        url: `${this.baseUrl}:8001`,
        port: 8001,
        health_endpoint: "/health",
        capabilities: [
          "comprehensive_analysis",
          "anomaly_detection",
          "trend_analysis",
          "risk_assessment",
        ],
        version: "1.0.0",
      },
      {
        name: "deep-learning",
        url: `${this.baseUrl}:8002`,
        port: 8002,
        health_endpoint: "/health",
        capabilities: [
          "neural_classification",
          "feature_extraction",
          "pattern_recognition",
        ],
        version: "1.0.0",
      },
      {
        name: "vector-db",
        url: `${this.baseUrl}:8003`,
        port: 8003,
        health_endpoint: "/health",
        capabilities: [
          "semantic_search",
          "vector_storage",
          "similarity_matching",
        ],
        version: "1.0.0",
      },
      {
        name: "ner-service",
        url: `${this.baseUrl}:8004`,
        port: 8004,
        health_endpoint: "/health",
        capabilities: ["entity_extraction", "named_entity_recognition"],
        version: "1.0.0",
      },
      {
        name: "summarization",
        url: `${this.baseUrl}:8005`,
        port: 8005,
        health_endpoint: "/health",
        capabilities: ["text_summarization", "report_generation"],
        version: "1.0.0",
      },
      {
        name: "embeddings",
        url: `${this.baseUrl}:8006`,
        port: 8006,
        health_endpoint: "/health",
        capabilities: ["text_embeddings", "vector_generation"],
        version: "1.0.0",
      },
    ];

    services.forEach((service) => {
      this.endpoints.set(service.name, service);
      this.circuitBreaker.set(service.name, { failures: 0, lastFailure: 0 });
    });
  }

  /**
   * Enhanced health check with detailed service information
   */
  async checkServicesHealth(): Promise<{
    services: Map<
      string,
      {
        status: boolean;
        response_time: number;
        capabilities: string[];
        version: string;
        last_error?: string;
      }
    >;
    overall_health: "healthy" | "degraded" | "critical";
  }> {
    const serviceHealth = new Map();
    let healthyCount = 0;

    const services = Array.from(this.endpoints.entries());
    for (const [name, endpoint] of services) {
      const startTime = Date.now();
      try {
        const response = await axios.get(
          `${endpoint.url}${endpoint.health_endpoint}`,
          { timeout: 5000 }
        );

        const responseTime = Date.now() - startTime;
        serviceHealth.set(name, {
          status: true,
          response_time: responseTime,
          capabilities: endpoint.capabilities,
          version: endpoint.version,
        });
        healthyCount++;

        // Reset circuit breaker on success
        this.circuitBreaker.set(name, { failures: 0, lastFailure: 0 });
      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        serviceHealth.set(name, {
          status: false,
          response_time: responseTime,
          capabilities: endpoint.capabilities,
          version: endpoint.version,
          last_error: error.message,
        });

        // Update circuit breaker
        const breaker = this.circuitBreaker.get(name)!;
        breaker.failures++;
        breaker.lastFailure = Date.now();
      }
    }

    const healthPercentage = healthyCount / services.length;
    let overallHealth: "healthy" | "degraded" | "critical";

    if (healthPercentage >= 0.8) {
      overallHealth = "healthy";
    } else if (healthPercentage >= 0.5) {
      overallHealth = "degraded";
    } else {
      overallHealth = "critical";
    }

    return {
      services: serviceHealth,
      overall_health: overallHealth,
    };
  }

  /**
   * Comprehensive error analysis using StackLens Intelligence
   */
  async analyzeErrorComprehensive(
    request: StackLensAnalysisRequest
  ): Promise<StackLensAnalysisResponse> {
    const endpoint = this.endpoints.get("stacklens-intelligence");
    if (!endpoint)
      throw new Error("StackLens Intelligence service not available");

    if (!this.isServiceHealthy("stacklens-intelligence")) {
      throw new Error("StackLens Intelligence service is currently unhealthy");
    }

    try {
      const response: AxiosResponse<StackLensAnalysisResponse> =
        await axios.post(`${endpoint.url}/analyze/comprehensive`, request, {
          timeout: this.timeout,
        });
      return response.data;
    } catch (error: any) {
      this.recordServiceFailure("stacklens-intelligence");
      console.error("StackLens Intelligence error:", error);
      throw new Error(`Failed to analyze error: ${error.message}`);
    }
  }

  /**
   * Enterprise-level multi-error intelligence analysis
   */
  async analyzeEnterpriseIntelligence(
    request: EnterpriseIntelligenceRequest
  ): Promise<EnterpriseIntelligenceResponse> {
    const endpoint = this.endpoints.get("enterprise-intelligence");
    if (!endpoint)
      throw new Error("Enterprise Intelligence service not available");

    if (!this.isServiceHealthy("enterprise-intelligence")) {
      throw new Error("Enterprise Intelligence service is currently unhealthy");
    }

    try {
      const response: AxiosResponse<EnterpriseIntelligenceResponse> =
        await axios.post(`${endpoint.url}/analyze/enterprise`, request, {
          timeout: this.timeout,
        });
      return response.data;
    } catch (error: any) {
      this.recordServiceFailure("enterprise-intelligence");
      console.error("Enterprise Intelligence error:", error);
      throw new Error(
        `Failed to perform enterprise analysis: ${error.message}`
      );
    }
  }

  /**
   * Real-time monitoring and alerts
   */
  async getRealTimeMonitoring(): Promise<RealTimeMonitoringResponse> {
    const endpoint = this.endpoints.get("stacklens-intelligence");
    if (!endpoint)
      throw new Error("StackLens Intelligence service not available");

    try {
      const response: AxiosResponse<RealTimeMonitoringResponse> =
        await axios.get(`${endpoint.url}/monitoring/realtime`, {
          timeout: 10000,
        });
      return response.data;
    } catch (error: any) {
      console.error("Real-time monitoring error:", error);
      throw new Error(
        `Failed to get real-time monitoring data: ${error.message}`
      );
    }
  }

  /**
   * Deep learning analysis with neural networks
   */
  async analyzeWithDeepLearning(
    request: DeepLearningAnalysisRequest
  ): Promise<DeepLearningAnalysisResponse> {
    const endpoint = this.endpoints.get("deep-learning");
    if (!endpoint) throw new Error("Deep Learning service not available");

    if (!this.isServiceHealthy("deep-learning")) {
      throw new Error("Deep Learning service is currently unhealthy");
    }

    try {
      const response: AxiosResponse<DeepLearningAnalysisResponse> =
        await axios.post(`${endpoint.url}/analyze`, request, {
          timeout: this.timeout,
        });
      return response.data;
    } catch (error: any) {
      this.recordServiceFailure("deep-learning");
      console.error("Deep Learning error:", error);
      throw new Error(
        `Failed to perform deep learning analysis: ${error.message}`
      );
    }
  }

  /**
   * Vector-based semantic search
   */
  async performVectorSearch(
    request: VectorSearchRequest
  ): Promise<VectorSearchResponse> {
    const endpoint = this.endpoints.get("vector-db");
    if (!endpoint) throw new Error("Vector DB service not available");

    try {
      const response: AxiosResponse<VectorSearchResponse> = await axios.post(
        `${endpoint.url}/search`,
        request,
        { timeout: 15000 }
      );
      return response.data;
    } catch (error: any) {
      console.error("Vector search error:", error);
      throw new Error(`Failed to perform vector search: ${error.message}`);
    }
  }

  /**
   * Generate intelligent error summary
   */
  async generateErrorSummary(
    errors: string[],
    options?: {
      max_length?: number;
      focus?: "technical" | "business" | "executive";
    }
  ): Promise<{
    summary: string;
    key_insights: string[];
    recommendations: string[];
  }> {
    const endpoint = this.endpoints.get("summarization");
    if (!endpoint) throw new Error("Summarization service not available");

    try {
      const response = await axios.post(
        `${endpoint.url}/summarize/errors`,
        { errors, ...options },
        { timeout: 30000 }
      );
      return response.data;
    } catch (error: any) {
      console.error("Summarization error:", error);
      throw new Error(`Failed to generate error summary: ${error.message}`);
    }
  }

  /**
   * Extract entities from error logs
   */
  async extractErrorEntities(text: string): Promise<{
    entities: Array<{
      text: string;
      label: string;
      start: number;
      end: number;
      confidence: number;
    }>;
    technical_terms: string[];
    error_indicators: string[];
  }> {
    const endpoint = this.endpoints.get("ner-service");
    if (!endpoint) throw new Error("NER service not available");

    try {
      const response = await axios.post(
        `${endpoint.url}/extract`,
        { text },
        { timeout: 15000 }
      );
      return response.data;
    } catch (error: any) {
      console.error("NER service error:", error);
      throw new Error(`Failed to extract entities: ${error.message}`);
    }
  }

  /**
   * Multi-service comprehensive analysis
   */
  async performComprehensiveAnalysis(text: string): Promise<{
    stacklens_analysis: StackLensAnalysisResponse;
    deep_learning_analysis: DeepLearningAnalysisResponse;
    vector_search_results: VectorSearchResponse;
    entities: any;
    confidence_score: number;
    recommendation: string;
  }> {
    try {
      // Parallel execution for better performance
      const [
        stacklensResult,
        deepLearningResult,
        vectorSearchResult,
        entities,
      ] = await Promise.allSettled([
        this.analyzeErrorComprehensive({
          text,
          includeML: true,
          includeSimilarity: true,
          includeEntities: true,
        }),
        this.analyzeWithDeepLearning({ text, include_explanation: true }),
        this.performVectorSearch({ query: text, limit: 5 }),
        this.extractErrorEntities(text),
      ]);

      // Calculate overall confidence score
      let confidenceScore = 0;
      let validResults = 0;

      const finalResult: any = {};

      if (stacklensResult.status === "fulfilled") {
        finalResult.stacklens_analysis = stacklensResult.value;
        confidenceScore += stacklensResult.value.confidence;
        validResults++;
      }

      if (deepLearningResult.status === "fulfilled") {
        finalResult.deep_learning_analysis = deepLearningResult.value;
        confidenceScore += deepLearningResult.value.confidence;
        validResults++;
      }

      if (vectorSearchResult.status === "fulfilled") {
        finalResult.vector_search_results = vectorSearchResult.value;
        validResults++;
      }

      if (entities.status === "fulfilled") {
        finalResult.entities = entities.value;
        validResults++;
      }

      finalResult.confidence_score =
        validResults > 0 ? confidenceScore / validResults : 0;

      // Generate comprehensive recommendation
      if (finalResult.stacklens_analysis?.suggested_solution) {
        finalResult.recommendation =
          finalResult.stacklens_analysis.suggested_solution;
      } else if (
        finalResult.deep_learning_analysis?.explanation?.similar_patterns
      ) {
        finalResult.recommendation = `Based on similar patterns: ${finalResult.deep_learning_analysis.explanation.similar_patterns.join(
          ", "
        )}`;
      } else {
        finalResult.recommendation =
          "Continue monitoring and review error patterns for additional insights.";
      }

      return finalResult;
    } catch (error: any) {
      console.error("Comprehensive analysis error:", error);
      throw new Error(
        `Failed to perform comprehensive analysis: ${error.message}`
      );
    }
  }

  /**
   * Circuit breaker helper methods
   */
  private isServiceHealthy(serviceName: string): boolean {
    const breaker = this.circuitBreaker.get(serviceName);
    if (!breaker) return true;

    // If failures exceed threshold and recent, consider unhealthy
    const recentFailureThreshold = 5 * 60 * 1000; // 5 minutes
    const failureThreshold = 3;

    if (
      breaker.failures >= failureThreshold &&
      Date.now() - breaker.lastFailure < recentFailureThreshold
    ) {
      return false;
    }

    return true;
  }

  private recordServiceFailure(serviceName: string): void {
    const breaker = this.circuitBreaker.get(serviceName);
    if (breaker) {
      breaker.failures++;
      breaker.lastFailure = Date.now();
    }
  }

  /**
   * Get service statistics
   */
  async getServiceStatistics(): Promise<{
    total_services: number;
    healthy_services: number;
    capabilities: string[];
    uptime_percentage: number;
    average_response_time: number;
  }> {
    const healthData = await this.checkServicesHealth();
    const services = Array.from(healthData.services.values());

    const healthyCount = services.filter((s) => s.status).length;
    const totalServices = services.length;
    const allCapabilities = Array.from(this.endpoints.values())
      .flatMap((e) => e.capabilities)
      .filter((cap, index, arr) => arr.indexOf(cap) === index);

    const avgResponseTime =
      services.reduce((sum, s) => sum + s.response_time, 0) / totalServices;

    return {
      total_services: totalServices,
      healthy_services: healthyCount,
      capabilities: allCapabilities,
      uptime_percentage: (healthyCount / totalServices) * 100,
      average_response_time: Math.round(avgResponseTime),
    };
  }
}

export const enhancedMicroservicesProxy = new EnhancedMicroservicesProxy();
