// StackLens Enterprise Error Intelligence Integration
// Integrates the comprehensive AI error detection platform with the main StackLens application

import { config } from "dotenv";
config();

interface EnterpriseAnalysisResult {
  analysis_id: string;
  timestamp: string;
  input_count: number;
  analysis_result: {
    detected_errors: Array<{
      original_text: string;
      normalized_text: string;
      predictions: {
        error_type?: string;
        severity?: string;
        category?: string;
        language?: string;
        framework?: string;
      };
      confidences: Record<string, number>;
      anomaly_score: number;
      is_anomaly: boolean;
      should_learn: boolean;
      timestamp: string;
    }>;
    severity_distribution: Record<string, number>;
    category_distribution: Record<string, number>;
    language_distribution: Record<string, number>;
    framework_distribution: Record<string, number>;
    anomaly_score: number;
    risk_assessment: string;
    recommendations: string[];
    learning_opportunities: string[];
  };
  intelligence_metrics: {
    models_used: string[];
    corpus_coverage: string;
    confidence_threshold: number;
    anomaly_detection: string;
  };
}

interface CorpusStatistics {
  corpus_statistics: {
    total_patterns: number;
    severity_distribution: Record<string, number>;
    category_distribution: Record<string, number>;
    language_distribution: Record<string, number>;
    framework_distribution: Record<string, number>;
    most_frequent_errors: Array<{ text: string; frequency: number }>;
  };
  model_status: {
    trained_classifiers: string[];
    vectorizer_features: number;
    anomaly_detector: string;
  };
}

export class EnterpriseErrorIntelligence {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private isHealthy: boolean;

  constructor(baseUrl: string = "http://localhost:8889") {
    this.baseUrl = baseUrl;
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.isHealthy = false;
    this.checkHealth();
  }

  /**
   * Check if the enterprise platform is healthy and operational
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout for health checks
      });

      if (response.ok) {
        const health = await response.json();
        this.isHealthy =
          health.status === "healthy" && health.models_ready === true;
        return this.isHealthy;
      }
    } catch (error) {
      console.warn(
        "Enterprise Error Intelligence platform health check failed:",
        error
      );
      this.isHealthy = false;
    }
    return false;
  }

  /**
   * Perform comprehensive error analysis using the enterprise platform
   */
  async analyzeErrors(
    errorMessages: string[],
    options: {
      enableLearning?: boolean;
      includeRecommendations?: boolean;
      detectAnomalies?: boolean;
    } = {}
  ): Promise<EnterpriseAnalysisResult | null> {
    if (!errorMessages || errorMessages.length === 0) {
      throw new Error("No error messages provided for analysis");
    }

    // Check platform health first
    if (!this.isHealthy) {
      const healthCheck = await this.checkHealth();
      if (!healthCheck) {
        console.warn(
          "Enterprise platform is not available, falling back to basic analysis"
        );
        return null;
      }
    }

    const {
      enableLearning = true,
      includeRecommendations = true,
      detectAnomalies = true,
    } = options;

    try {
      const response = await this.makeRequest(
        "/analyze/comprehensive",
        "POST",
        errorMessages,
        {
          learn_from_analysis: enableLearning,
        }
      );

      if (response) {
        // Log intelligence metrics
        console.log(
          `🧠 Enterprise Analysis: ${response.input_count} errors analyzed, ` +
            `${response.analysis_result.recommendations.length} recommendations, ` +
            `risk: ${response.analysis_result.risk_assessment}`
        );

        return response;
      }
    } catch (error) {
      console.error("Enterprise error analysis failed:", error);
    }

    return null;
  }

  /**
   * Learn from manually classified errors to improve the platform
   */
  async learnFromClassifications(
    errorClassifications: Record<
      string,
      {
        error_type: string;
        severity: string;
        category: string;
        language: string;
        framework: string;
      }
    >
  ): Promise<boolean> {
    if (!this.isHealthy) {
      console.warn("Cannot learn - enterprise platform is not available");
      return false;
    }

    try {
      const response = await this.makeRequest(
        "/learn/manual",
        "POST",
        errorClassifications
      );

      if (response && response.status === "success") {
        console.log(
          `🧠 Learned from ${response.learned_patterns} new error patterns`
        );
        return true;
      }
    } catch (error) {
      console.error("Manual learning failed:", error);
    }

    return false;
  }

  /**
   * Get comprehensive corpus statistics
   */
  async getCorpusStatistics(): Promise<CorpusStatistics | null> {
    if (!this.isHealthy) {
      await this.checkHealth();
    }

    try {
      const response = await this.makeRequest("/corpus/stats", "GET");
      return response;
    } catch (error) {
      console.error("Failed to get corpus statistics:", error);
      return null;
    }
  }

  /**
   * Enhanced error pattern discovery with enterprise intelligence
   */
  async discoverAdvancedPatterns(fileId: number): Promise<any[]> {
    // This method integrates with the existing StackLens error pattern analyzer
    // but enhances it with enterprise intelligence

    try {
      // Get errors from file (existing StackLens logic)
      const errors = await this.getErrorsFromFile(fileId);

      if (!errors || errors.length === 0) {
        return [];
      }

      // Extract error messages
      const errorMessages = errors.map((error) => error.message);

      // Use enterprise intelligence for analysis
      const enterpriseAnalysis = await this.analyzeErrors(errorMessages, {
        enableLearning: true,
        includeRecommendations: true,
        detectAnomalies: true,
      });

      if (enterpriseAnalysis) {
        return this.convertToStackLensPatterns(enterpriseAnalysis, errors);
      } else {
        // Fallback to basic pattern discovery
        return this.basicPatternDiscovery(errors);
      }
    } catch (error) {
      console.error("Advanced pattern discovery failed:", error);
      return [];
    }
  }

  /**
   * Convert enterprise analysis results to StackLens pattern format
   */
  private convertToStackLensPatterns(
    analysis: EnterpriseAnalysisResult,
    originalErrors: any[]
  ): any[] {
    const patterns: any[] = [];

    // Group detected errors by type and severity
    const groupedErrors = new Map<string, any[]>();

    analysis.analysis_result.detected_errors.forEach((detectedError, index) => {
      const key = `${detectedError.predictions.error_type}_${detectedError.predictions.severity}`;

      if (!groupedErrors.has(key)) {
        groupedErrors.set(key, []);
      }

      groupedErrors.get(key)!.push({
        ...detectedError,
        originalError: originalErrors[index],
      });
    });

    // Convert groups to StackLens pattern format
    groupedErrors.forEach((errorGroup, groupKey) => {
      const firstError = errorGroup[0];
      const predictions = firstError.predictions;

      patterns.push({
        errorType: predictions.error_type || "UnknownError",
        messages: errorGroup.map((e) => e.original_text).slice(0, 3),
        frequency: errorGroup.length,
        severity: this.mapSeverityToStackLens(predictions.severity || "medium"),
        suggestedPattern: this.generateStackLensPattern(predictions),
        suggestedRegex: this.generateStackLensRegex(errorGroup),
        category: this.mapCategoryToStackLens(
          predictions.category || "general"
        ),
        description: this.generateDescription(predictions, errorGroup.length),
        solution: this.generateSolution(
          predictions,
          analysis.analysis_result.recommendations
        ),
        confidence: this.calculateAverageConfidence(errorGroup),
        language: predictions.language || "Unknown",
        framework: predictions.framework || "Unknown",
        isAnomaly: errorGroup.some((e) => e.is_anomaly),
        riskLevel: analysis.analysis_result.risk_assessment,
        enterpriseRecommendations: analysis.analysis_result.recommendations,
      });
    });

    return patterns.sort((a, b) => {
      // Sort by severity first, then by frequency
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aSeverity =
        severityOrder[a.severity as keyof typeof severityOrder] || 1;
      const bSeverity =
        severityOrder[b.severity as keyof typeof severityOrder] || 1;

      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }

      return b.frequency - a.frequency;
    });
  }

  /**
   * Generate enhanced AI suggestions using enterprise intelligence
   */
  async generateEnhancedSuggestions(errorLog: any): Promise<any> {
    try {
      // Analyze single error with enterprise platform
      const analysis = await this.analyzeErrors([errorLog.message], {
        enableLearning: false,
        includeRecommendations: true,
        detectAnomalies: true,
      });

      if (analysis && analysis.analysis_result.detected_errors.length > 0) {
        const detectedError = analysis.analysis_result.detected_errors[0];
        const predictions = detectedError.predictions;

        return {
          rootCause: this.generateEnhancedRootCause(predictions, detectedError),
          resolutionSteps: this.generateEnhancedResolutionSteps(
            predictions,
            analysis.analysis_result.recommendations
          ),
          codeExample: this.generateCodeExample(predictions),
          preventionMeasures: this.generatePreventionMeasures(
            predictions,
            detectedError
          ),
          confidence: this.calculateAverageConfidence([detectedError]),
          severity: predictions.severity || "medium",
          category: predictions.category || "general",
          language: predictions.language || "Unknown",
          framework: predictions.framework || "Unknown",
          isAnomaly: detectedError.is_anomaly,
          riskAssessment: analysis.analysis_result.risk_assessment,
          enterpriseInsights: {
            anomalyScore: detectedError.anomaly_score,
            shouldLearn: detectedError.should_learn,
            modelPredictions: predictions,
            confidenceScores: detectedError.confidences,
          },
        };
      }
    } catch (error) {
      console.error("Enhanced suggestion generation failed:", error);
    }

    // Fallback to basic suggestion
    return this.generateBasicSuggestion(errorLog);
  }

  /**
   * Make HTTP request to enterprise platform with retry logic
   */
  private async makeRequest(
    endpoint: string,
    method: "GET" | "POST",
    body?: any,
    params?: Record<string, any>
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        let url = `${this.baseUrl}${endpoint}`;

        if (params && method === "GET") {
          const searchParams = new URLSearchParams(params);
          url += `?${searchParams.toString()}`;
        }

        const requestOptions: RequestInit = {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(this.timeout),
        };

        if (body && method === "POST") {
          requestOptions.body = JSON.stringify(body);
        }

        if (params && method === "POST") {
          const formData = new URLSearchParams(params);
          url += `?${formData.toString()}`;
        }

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.retryAttempts) {
          console.warn(`Request attempt ${attempt} failed, retrying...`);
          await this.sleep(1000 * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  // Helper methods
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private mapSeverityToStackLens(severity: string): string {
    const mapping: Record<string, string> = {
      critical: "critical",
      high: "high",
      medium: "medium",
      low: "low",
      info: "low",
    };
    return mapping[severity] || "medium";
  }

  private mapCategoryToStackLens(category: string): string {
    const mapping: Record<string, string> = {
      runtime: "runtime",
      compilation: "compilation",
      security: "security",
      performance: "performance",
      network: "network",
      database: "database",
      filesystem: "filesystem",
      memory: "memory",
      configuration: "configuration",
      api: "api",
      authentication: "authentication",
      business_logic: "business",
      infrastructure: "infrastructure",
      deployment: "deployment",
    };
    return mapping[category] || "general";
  }

  private generateStackLensPattern(predictions: any): string {
    return `${predictions.error_type || "Error"} in ${
      predictions.language || "Unknown"
    } ${predictions.framework || "application"}`;
  }

  private generateStackLensRegex(errorGroup: any[]): string {
    // Generate a regex pattern based on the error texts
    const commonWords = this.findCommonWords(
      errorGroup.map((e) => e.normalized_text)
    );
    return commonWords.join(".*");
  }

  private findCommonWords(texts: string[]): string[] {
    if (texts.length === 0) return [];

    const wordCounts = new Map<string, number>();

    texts.forEach((text) => {
      const words = text.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (word.length > 2) {
          // Skip very short words
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });
    });

    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= Math.ceil(texts.length * 0.5)) // Must appear in at least 50% of texts
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([word, _]) => word);
  }

  private generateDescription(predictions: any, frequency: number): string {
    return `${
      predictions.error_type || "Error"
    } pattern occurring ${frequency} times in ${
      predictions.language || "unknown"
    } ${predictions.framework || "application"}. Category: ${
      predictions.category || "general"
    }.`;
  }

  private generateSolution(
    predictions: any,
    recommendations: string[]
  ): string {
    const specificSolutions = recommendations.slice(0, 2).join(" ");
    return (
      specificSolutions ||
      `Review the ${predictions.category || "error"} logs and check for ${
        predictions.error_type || "issues"
      } in your ${predictions.language || "application"} code.`
    );
  }

  private calculateAverageConfidence(errorGroup: any[]): number {
    if (errorGroup.length === 0) return 0.5;

    const avgConfidence =
      errorGroup.reduce((sum, error) => {
        const confidences = Object.values(error.confidences || {}) as number[];
        const errorAvg =
          confidences.reduce((a, b) => a + b, 0) /
          Math.max(confidences.length, 1);
        return sum + errorAvg;
      }, 0) / errorGroup.length;

    return Math.round(avgConfidence * 100) / 100;
  }

  private generateEnhancedRootCause(
    predictions: any,
    detectedError: any
  ): string {
    let cause = `This appears to be a ${predictions.error_type || "error"} in ${
      predictions.language || "the application"
    }`;

    if (predictions.framework && predictions.framework !== "Unknown") {
      cause += ` using the ${predictions.framework} framework`;
    }

    if (detectedError.is_anomaly) {
      cause +=
        ". This error pattern is unusual and may indicate a new type of issue";
    }

    cause += `.`;
    return cause;
  }

  private generateEnhancedResolutionSteps(
    predictions: any,
    recommendations: string[]
  ): string[] {
    const steps = [
      `Examine the ${
        predictions.category || "error"
      } logs for additional context`,
      `Check the ${predictions.language || "application"} code for ${
        predictions.error_type || "issues"
      }`,
    ];

    // Add enterprise recommendations
    recommendations.forEach((rec) => {
      if (rec && !steps.some((step) => step.includes(rec.substring(0, 20)))) {
        steps.push(rec);
      }
    });

    return steps.slice(0, 4); // Limit to 4 steps
  }

  private generateCodeExample(predictions: any): string | undefined {
    // Generate basic code examples based on error type and language
    const examples: Record<string, Record<string, string>> = {
      Python: {
        AttributeError: `# Check for None values before accessing attributes\nif obj is not None:\n    result = obj.attribute\nelse:\n    result = default_value`,
        KeyError: `# Use get() method with default value\nvalue = dictionary.get('key', default_value)\n# Or check if key exists\nif 'key' in dictionary:\n    value = dictionary['key']`,
        ImportError: `# Install missing module\n# pip install module_name\n# Or check if module is available\ntry:\n    import module_name\nexcept ImportError:\n    print("Module not available")`,
      },
      JavaScript: {
        TypeError: `// Check for undefined/null before accessing properties\nif (obj && obj.property) {\n    return obj.property;\n}\nreturn defaultValue;`,
        ReferenceError: `// Ensure variable is declared\nlet variable = 'value';\n// Or check if variable exists\nif (typeof variable !== 'undefined') {\n    console.log(variable);\n}`,
      },
    };

    const language = predictions.language;
    const errorType = predictions.error_type;

    if (
      language &&
      errorType &&
      examples[language] &&
      examples[language][errorType]
    ) {
      return examples[language][errorType];
    }

    return undefined;
  }

  private generatePreventionMeasures(
    predictions: any,
    detectedError: any
  ): string[] {
    const measures = [
      `Implement proper error handling for ${
        predictions.error_type || "errors"
      }`,
      `Add validation checks in ${predictions.language || "your"} code`,
      `Set up monitoring for ${predictions.category || "application"} issues`,
    ];

    if (detectedError.is_anomaly) {
      measures.push("Monitor for similar anomalous patterns in the future");
    }

    return measures;
  }

  // Placeholder methods for integration with existing StackLens code
  private async getErrorsFromFile(fileId: number): Promise<any[]> {
    // This would integrate with existing StackLens database logic
    // For now, return empty array
    return [];
  }

  private basicPatternDiscovery(errors: any[]): any[] {
    // Fallback to existing StackLens pattern discovery logic
    return [];
  }

  private generateBasicSuggestion(errorLog: any): any {
    // Fallback to existing StackLens suggestion logic
    return {
      rootCause: "Unable to analyze with enterprise intelligence",
      resolutionSteps: ["Review error logs", "Check recent changes"],
      confidence: 0.5,
    };
  }
}

// Export singleton instance
export const enterpriseIntelligence = new EnterpriseErrorIntelligence();

// Integration helper for existing StackLens ErrorPatternAnalyzer
export class EnhancedErrorPatternAnalyzer {
  private enterpriseIntelligence: EnterpriseErrorIntelligence;

  constructor() {
    this.enterpriseIntelligence = new EnterpriseErrorIntelligence();
  }

  /**
   * Enhanced pattern discovery that uses enterprise intelligence
   */
  async discoverPatterns(fileId: number): Promise<any[]> {
    return this.enterpriseIntelligence.discoverAdvancedPatterns(fileId);
  }

  /**
   * Enhanced AI suggestions with enterprise intelligence
   */
  async generateEnhancedSuggestion(errorLog: any): Promise<any> {
    return this.enterpriseIntelligence.generateEnhancedSuggestions(errorLog);
  }
}
