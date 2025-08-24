import { ErrorLog } from "@shared/schema";
import { predictor } from "./predictor";
// Removed aiService import to avoid circular dependency
import errorMap from "./error-map.json";

export interface SuggestionResult {
  source: 'ml_model' | 'static_map' | 'ai_service' | 'fallback';
  confidence: number;
  rootCause: string;
  resolutionSteps: string[];
  codeExample?: string;
  preventionMeasures: string[];
  reasoning: string;
  relatedPatterns: string[];
  estimatedResolutionTime: string;
  priority: 'immediate' | 'urgent' | 'normal' | 'low';
}

export class Suggestor {
  private static readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4
  };

  async getSuggestion(error: ErrorLog): Promise<SuggestionResult> {
    try {
      // Try ML model first
      const mlResult = await this.tryMLPrediction(error);
      if (mlResult && mlResult.confidence >= this.CONFIDENCE_THRESHOLDS.MEDIUM) {
        return mlResult;
      }

      // Try static error map
      const staticResult = await this.tryStaticMap(error);
      if (staticResult) {
        return staticResult;
      }

      // Fall back to AI service
      const aiResult = await this.tryAIService(error);
      if (aiResult) {
        return aiResult;
      }

      // Final fallback
      return this.getFallbackSuggestion(error);
    } catch (error) {
      console.error('Suggestion generation failed:', error);
      return this.getFallbackSuggestion(error);
    }
  }

  async getBatchSuggestions(errors: ErrorLog[]): Promise<SuggestionResult[]> {
    const suggestions = await Promise.allSettled(
      errors.map(error => this.getSuggestion(error))
    );

    return suggestions.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Suggestion failed for error ${index}:`, result.reason);
        return this.getFallbackSuggestion(errors[index]);
      }
    });
  }

  private async tryMLPrediction(error: ErrorLog): Promise<SuggestionResult | null> {
    try {
      const prediction = await predictor.predictSingle(error);
      
      if (prediction.confidence < this.CONFIDENCE_THRESHOLDS.MEDIUM) {
        return null;
      }

      return {
        source: 'ml_model',
        confidence: prediction.confidence,
        rootCause: prediction.reasoning,
        resolutionSteps: prediction.suggestedActions,
        preventionMeasures: this.getPreventionMeasures(prediction.predictedErrorType),
        reasoning: `ML model prediction with ${(prediction.confidence * 100).toFixed(1)}% confidence`,
        relatedPatterns: this.getRelatedPatterns(prediction.predictedErrorType),
        estimatedResolutionTime: this.getEstimatedResolutionTime(prediction.predictedSeverity),
        priority: this.getPriority(prediction.predictedSeverity)
      };
    } catch (error) {
      console.error('ML prediction failed:', error);
      return null;
    }
  }

  private async tryStaticMap(error: ErrorLog): Promise<SuggestionResult | null> {
    const message = error.message.toLowerCase();
    
    // Search through error map categories
    for (const [category, errorTypes] of Object.entries(errorMap)) {
      for (const [errorType, errorData] of Object.entries(errorTypes)) {
        if (this.matchesPattern(message, errorData.pattern)) {
          return {
            source: 'static_map',
            confidence: 0.85,
            rootCause: errorData.root_cause,
            resolutionSteps: errorData.resolution_steps,
            codeExample: errorData.code_example,
            preventionMeasures: errorData.prevention_measures,
            reasoning: `Matched static error pattern: ${category}/${errorType}`,
            relatedPatterns: [category, errorType],
            estimatedResolutionTime: this.getEstimatedResolutionTime(errorData.severity),
            priority: this.getPriority(errorData.severity)
          };
        }
      }
    }
    
    return null;
  }

  private async tryAIService(error: ErrorLog): Promise<SuggestionResult | null> {
    // Temporarily disabled to avoid circular dependency
    // AI service will be called separately from the routes
    console.log('AI service temporarily disabled to avoid circular dependency');
    return null;
  }

  private matchesPattern(message: string, patterns: string[]): boolean {
    return patterns.some(pattern => 
      message.includes(pattern.toLowerCase())
    );
  }

  private getPreventionMeasures(errorType: string): string[] {
    const commonMeasures = [
      'Implement proper error handling',
      'Add logging and monitoring',
      'Use defensive programming practices',
      'Implement unit tests',
      'Regular code reviews'
    ];

    const specificMeasures: Record<string, string[]> = {
      'Database Error': [
        'Use connection pooling',
        'Implement database health checks',
        'Use parameterized queries',
        'Monitor database performance'
      ],
      'Network Error': [
        'Implement retry logic',
        'Use circuit breakers',
        'Monitor network connectivity',
        'Set appropriate timeouts'
      ],
      'Memory Error': [
        'Monitor memory usage',
        'Implement memory profiling',
        'Use streaming for large data',
        'Proper cleanup of resources'
      ],
      'Runtime Error': [
        'Use TypeScript for type safety',
        'Implement null checks',
        'Use static analysis tools',
        'Add comprehensive testing'
      ]
    };

    return [...commonMeasures, ...(specificMeasures[errorType] || [])];
  }

  private getRelatedPatterns(errorType: string): string[] {
    const patterns: Record<string, string[]> = {
      'Database Error': ['connection', 'query', 'timeout', 'syntax'],
      'Network Error': ['connection', 'timeout', 'refused', 'unreachable'],
      'Memory Error': ['heap', 'memory', 'allocation', 'leak'],
      'Runtime Error': ['null', 'undefined', 'reference', 'type'],
      'Permission Error': ['access', 'denied', 'permission', 'unauthorized'],
      'File System Error': ['file', 'path', 'directory', 'not found']
    };

    return patterns[errorType] || ['error', 'exception', 'failed'];
  }

  private getEstimatedResolutionTime(severity: string): string {
    const timeEstimates: Record<string, string> = {
      'critical': '30 minutes - 2 hours',
      'high': '1 - 4 hours',
      'medium': '4 - 8 hours',
      'low': '1 - 2 days'
    };

    return timeEstimates[severity] || '2 - 4 hours';
  }

  private getPriority(severity: string): 'immediate' | 'urgent' | 'normal' | 'low' {
    const priorities: Record<string, 'immediate' | 'urgent' | 'normal' | 'low'> = {
      'critical': 'immediate',
      'high': 'urgent',
      'medium': 'normal',
      'low': 'low'
    };

    return priorities[severity] || 'normal';
  }

  private extractPatternsFromMessage(message: string): string[] {
    const patterns = [];
    const lowerMessage = message.toLowerCase();
    
    // Common error patterns
    const commonPatterns = [
      'exception', 'error', 'failed', 'timeout', 'connection', 'memory',
      'null', 'undefined', 'permission', 'access', 'file', 'network',
      'database', 'syntax', 'type', 'reference', 'heap', 'stack'
    ];
    
    commonPatterns.forEach(pattern => {
      if (lowerMessage.includes(pattern)) {
        patterns.push(pattern);
      }
    });
    
    return patterns;
  }

  private getFallbackSuggestion(error: ErrorLog): SuggestionResult {
    const severity = error.severity || 'medium';
    
    return {
      source: 'fallback',
      confidence: 0.3,
      rootCause: 'Unable to determine specific root cause. Manual investigation required.',
      resolutionSteps: [
        'Review the error message and context',
        'Check recent changes or deployments',
        'Examine system logs for related errors',
        'Consult documentation and knowledge base',
        'Contact support if issue persists'
      ],
      preventionMeasures: [
        'Implement comprehensive logging',
        'Add monitoring and alerting',
        'Use error tracking tools',
        'Implement proper error handling',
        'Regular system health checks'
      ],
      reasoning: 'Generic fallback suggestion (no specific pattern matched)',
      relatedPatterns: ['generic', 'unknown'],
      estimatedResolutionTime: this.getEstimatedResolutionTime(severity),
      priority: this.getPriority(severity)
    };
  }
}

export const suggestor = new Suggestor();