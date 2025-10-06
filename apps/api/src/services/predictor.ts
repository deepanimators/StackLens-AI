import { ErrorLog, MlModel } from "@shared/schema";
import { storage } from "../database/database-storage.js";
import { FeatureEngineer, ExtractedFeatures } from "./feature-engineer.js";

export interface PredictionResult {
  predictedSeverity: string;
  predictedErrorType: string;
  confidence: number;
  probability: number;
  reasoning: string;
  suggestedActions: string[];
  modelUsed: string;
  featureImportance: { feature: string; contribution: number }[];
}

export interface BatchPredictionResult {
  predictions: PredictionResult[];
  modelMetrics: {
    accuracy: number;
    avgConfidence: number;
    totalPredictions: number;
  };
  processingTime: number;
}

export class Predictor {
  private static readonly MIN_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly SEVERITY_WEIGHTS = {
    critical: 1.0,
    high: 0.8,
    medium: 0.6,
    low: 0.4
  };

  async predictSingle(error: ErrorLog): Promise<PredictionResult> {
    try {
      // Get active model
      const activeModel = await storage.getActiveMlModel();
      if (!activeModel) {
        throw new Error('No active ML model found');
      }

      // Extract features
      const features = FeatureEngineer.extractFeatures(error);
      
      // Make prediction
      const prediction = await this.makePrediction(features, activeModel);
      
      return prediction;
    } catch (err) {
      console.error('Prediction failed:', err);
      return this.getFallbackPrediction(error);
    }
  }

  async predictBatch(errors: ErrorLog[]): Promise<BatchPredictionResult> {
    const startTime = Date.now();
    
    try {
      const activeModel = await storage.getActiveMlModel();
      if (!activeModel) {
        throw new Error('No active ML model found');
      }

      const predictions = await Promise.all(
        errors.map(error => this.predictSingle(error))
      );

      const processingTime = Date.now() - startTime;
      const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
      
      return {
        predictions,
        modelMetrics: {
          accuracy: activeModel.accuracy || 0,
          avgConfidence,
          totalPredictions: predictions.length
        },
        processingTime
      };
    } catch (error) {
      console.error('Batch prediction failed:', error);
      
      const fallbackPredictions = errors.map(err => this.getFallbackPrediction(err));
      
      return {
        predictions: fallbackPredictions,
        modelMetrics: {
          accuracy: 0,
          avgConfidence: 0.5,
          totalPredictions: fallbackPredictions.length
        },
        processingTime: Date.now() - startTime
      };
    }
  }

  private async makePrediction(features: ExtractedFeatures, model: MlModel): Promise<PredictionResult> {
    // Simulate ML model prediction logic
    const severityProbabilities = this.calculateSeverityProbabilities(features);
    const errorTypeProbabilities = this.calculateErrorTypeProbabilities(features);
    
    const predictedSeverity = this.getPredictedClass(severityProbabilities);
    const predictedErrorType = this.getPredictedClass(errorTypeProbabilities);
    
    const confidence = Math.max(
      severityProbabilities[predictedSeverity] || 0,
      errorTypeProbabilities[predictedErrorType] || 0
    );
    
    const probability = (severityProbabilities[predictedSeverity] || 0) * 
                       (errorTypeProbabilities[predictedErrorType] || 0);
    
    return {
      predictedSeverity,
      predictedErrorType,
      confidence,
      probability,
      reasoning: this.generateReasoning(features, predictedSeverity, predictedErrorType),
      suggestedActions: this.generateSuggestedActions(predictedSeverity, predictedErrorType),
      modelUsed: model.name,
      featureImportance: this.calculateFeatureContribution(features)
    };
  }

  private calculateSeverityProbabilities(features: ExtractedFeatures): Record<string, number> {
    const scores = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    // Keyword score impact
    if (features.keywordScore > 8) scores.critical += 0.4;
    else if (features.keywordScore > 6) scores.high += 0.3;
    else if (features.keywordScore > 3) scores.medium += 0.2;
    else scores.low += 0.1;

    // Exception indicators
    if (features.hasException) scores.critical += 0.3;
    if (features.hasTimeout) scores.high += 0.2;
    if (features.hasMemory) scores.critical += 0.25;
    if (features.hasDatabase) scores.high += 0.15;
    if (features.hasNetwork) scores.medium += 0.1;

    // Message length impact
    if (features.messageLength > 200) scores.high += 0.1;
    else if (features.messageLength < 50) scores.low += 0.1;

    // Contextual patterns
    if (features.contextualPatterns.includes('stack_trace')) scores.critical += 0.2;
    if (features.contextualPatterns.includes('error_code')) scores.high += 0.15;

    // Normalize probabilities
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    if (total > 0) {
      Object.keys(scores).forEach(key => {
        scores[key as keyof typeof scores] = scores[key as keyof typeof scores] / total;
      });
    }

    return scores;
  }

  private calculateErrorTypeProbabilities(features: ExtractedFeatures): Record<string, number> {
    const types = {
      'Runtime Error': 0,
      'Database Error': 0,
      'Network Error': 0,
      'Memory Error': 0,
      'Permission Error': 0,
      'File System Error': 0,
      'Format Error': 0,
      'Timeout Error': 0,
      'Logic Error': 0,
      'Configuration Error': 0
    };

    // Feature-based type prediction
    if (features.hasException) types['Runtime Error'] += 0.3;
    if (features.hasDatabase) types['Database Error'] += 0.4;
    if (features.hasNetwork) types['Network Error'] += 0.35;
    if (features.hasMemory) types['Memory Error'] += 0.4;
    if (features.hasPermission) types['Permission Error'] += 0.45;
    if (features.hasFile) types['File System Error'] += 0.3;
    if (features.hasFormat) types['Format Error'] += 0.35;
    if (features.hasTimeout) types['Timeout Error'] += 0.4;
    if (features.hasNull) types['Logic Error'] += 0.25;

    // Normalize probabilities
    const total = Object.values(types).reduce((sum, score) => sum + score, 0);
    if (total > 0) {
      Object.keys(types).forEach(key => {
        types[key as keyof typeof types] = types[key as keyof typeof types] / total;
      });
    }

    return types;
  }

  private getPredictedClass(probabilities: Record<string, number>): string {
    return Object.entries(probabilities)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  private generateReasoning(features: ExtractedFeatures, severity: string, errorType: string): string {
    const reasons = [];
    
    if (features.hasException) reasons.push('Exception keywords detected');
    if (features.keywordScore > 6) reasons.push('High keyword severity score');
    if (features.contextualPatterns.includes('stack_trace')) reasons.push('Stack trace pattern found');
    if (features.hasTimeout) reasons.push('Timeout-related keywords present');
    if (features.hasMemory) reasons.push('Memory-related indicators detected');
    
    return reasons.length > 0 
      ? `Predicted as ${severity} ${errorType} based on: ${reasons.join(', ')}`
      : `Predicted as ${severity} ${errorType} based on message analysis`;
  }

  private generateSuggestedActions(severity: string, errorType: string): string[] {
    const actions = [];
    
    switch (severity) {
      case 'critical':
        actions.push('Immediate investigation required');
        actions.push('Check system resources and dependencies');
        actions.push('Review recent deployments or changes');
        break;
      case 'high':
        actions.push('Investigate within 1 hour');
        actions.push('Check error logs and system status');
        actions.push('Verify service connectivity');
        break;
      case 'medium':
        actions.push('Schedule investigation within 24 hours');
        actions.push('Review error patterns and frequency');
        break;
      case 'low':
        actions.push('Monitor for pattern changes');
        actions.push('Log for future analysis');
        break;
    }
    
    // Add error type specific actions
    switch (errorType) {
      case 'Database Error':
        actions.push('Check database connectivity and queries');
        actions.push('Verify database schema and permissions');
        break;
      case 'Network Error':
        actions.push('Check network connectivity and firewall settings');
        actions.push('Verify external service availability');
        break;
      case 'Memory Error':
        actions.push('Check memory usage and allocation');
        actions.push('Review for memory leaks');
        break;
      case 'Permission Error':
        actions.push('Verify user permissions and access rights');
        actions.push('Check file system permissions');
        break;
    }
    
    return actions;
  }

  private calculateFeatureContribution(features: ExtractedFeatures): { feature: string; contribution: number }[] {
    const contributions = [
      { feature: 'keywordScore', contribution: features.keywordScore * 0.1 },
      { feature: 'hasException', contribution: features.hasException ? 0.3 : 0 },
      { feature: 'messageLength', contribution: Math.min(features.messageLength / 1000, 0.2) },
      { feature: 'hasTimeout', contribution: features.hasTimeout ? 0.2 : 0 },
      { feature: 'hasMemory', contribution: features.hasMemory ? 0.25 : 0 },
      { feature: 'hasDatabase', contribution: features.hasDatabase ? 0.15 : 0 },
      { feature: 'contextualPatterns', contribution: features.contextualPatterns.length * 0.05 }
    ];
    
    return contributions
      .filter(c => c.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution);
  }

  private getFallbackPrediction(error: ErrorLog): PredictionResult {
    // Basic rule-based fallback
    const message = error.message.toLowerCase();
    let severity = 'medium';
    let errorType = 'Unknown Error';
    
    // Simple rule-based classification
    if (message.includes('critical') || message.includes('fatal') || message.includes('exception')) {
      severity = 'critical';
      errorType = 'Runtime Error';
    } else if (message.includes('error') || message.includes('failed')) {
      severity = 'high';
      errorType = 'Runtime Error';
    } else if (message.includes('warning') || message.includes('deprecated')) {
      severity = 'medium';
      errorType = 'Configuration Error';
    } else if (message.includes('info') || message.includes('debug')) {
      severity = 'low';
      errorType = 'Information';
    }
    
    return {
      predictedSeverity: severity,
      predictedErrorType: errorType,
      confidence: 0.5,
      probability: 0.5,
      reasoning: 'Fallback rule-based prediction (ML model unavailable)',
      suggestedActions: ['Review error message and context', 'Check system logs', 'Consult documentation'],
      modelUsed: 'Fallback Rules',
      featureImportance: []
    };
  }
}

export const predictor = new Predictor();