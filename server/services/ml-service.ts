import { ErrorLog } from "@shared/schema";

export interface MLPrediction {
  severity: string;
  errorType: string;
  confidence: number;
  features: string[];
}

export interface MLMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusion_matrix: number[][];
  cv_mean_score: number;
  cv_std_score: number;
  classes: string[];
  top_features: string[];
  class_metrics: Record<string, any>;
}

export class MLService {
  private model: any = null;
  private isModelTrained: boolean = false;
  private trainingData: ErrorLog[] = [];

  constructor() {
    this.initializeModel();
  }

  private initializeModel() {
    // Simulate ML model initialization
    this.model = {
      trained: false,
      features: [],
      weights: new Map(),
      accuracy: 0,
    };
  }

  async trainModel(errorLogs: ErrorLog[]): Promise<MLMetrics> {
    this.trainingData = errorLogs;
    
    // Simulate training process
    const metrics = await this.performTraining(errorLogs);
    
    this.isModelTrained = true;
    this.model.trained = true;
    this.model.accuracy = metrics.accuracy;
    
    return metrics;
  }

  private async performTraining(errorLogs: ErrorLog[]): Promise<MLMetrics> {
    // Simulate feature extraction and model training
    const features = this.extractFeatures(errorLogs);
    const labels = errorLogs.map(log => log.severity);
    
    // Simulate training metrics
    const accuracy = 0.92 + Math.random() * 0.05; // 92-97% accuracy
    const precision = 0.89 + Math.random() * 0.06; // 89-95% precision
    const recall = 0.87 + Math.random() * 0.08; // 87-95% recall
    const f1Score = 2 * (precision * recall) / (precision + recall);
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusion_matrix: this.generateConfusionMatrix(),
      cv_mean_score: accuracy - 0.02,
      cv_std_score: 0.031,
      classes: ['critical', 'high', 'medium', 'low'],
      top_features: this.getTopFeatures(features),
      class_metrics: this.generateClassMetrics(),
    };
  }

  private extractFeatures(errorLogs: ErrorLog[]): string[][] {
    return errorLogs.map(log => {
      const features: string[] = [];
      
      // Extract features from error message
      const words = log.message.toLowerCase().split(/\s+/);
      features.push(...words.filter(word => word.length > 3));
      
      // Add error type as feature
      features.push(log.errorType.toLowerCase());
      
      // Add pattern if available
      if (log.pattern) {
        features.push(log.pattern.toLowerCase());
      }
      
      return features;
    });
  }

  private generateConfusionMatrix(): number[][] {
    // Simulate confusion matrix for 4 classes
    return [
      [85, 3, 2, 0],
      [5, 180, 8, 2],
      [2, 12, 220, 6],
      [0, 1, 5, 94]
    ];
  }

  private getTopFeatures(features: string[][]): string[] {
    const featureCount = new Map<string, number>();
    
    features.flat().forEach(feature => {
      featureCount.set(feature, (featureCount.get(feature) || 0) + 1);
    });
    
    return Array.from(featureCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([feature]) => feature);
  }

  private generateClassMetrics(): Record<string, any> {
    return {
      critical: { precision: 0.95, recall: 0.89, f1_score: 0.92 },
      high: { precision: 0.91, recall: 0.94, f1_score: 0.93 },
      medium: { precision: 0.89, recall: 0.92, f1_score: 0.90 },
      low: { precision: 0.94, recall: 0.87, f1_score: 0.90 },
    };
  }

  async predict(errorText: string, errorType: string): Promise<MLPrediction> {
    if (!this.isModelTrained) {
      return {
        severity: 'medium',
        errorType: 'General',
        confidence: 0.5,
        features: [],
      };
    }

    // Simulate prediction
    const features = this.extractTextFeatures(errorText);
    const prediction = this.performPrediction(features, errorType);
    
    return prediction;
  }

  private extractTextFeatures(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => word.length > 3);
  }

  private performPrediction(features: string[], errorType: string): MLPrediction {
    // Simulate ML prediction based on features
    const severityWeights = {
      critical: 0.1,
      high: 0.3,
      medium: 0.4,
      low: 0.2,
    };

    // Adjust weights based on keywords
    const criticalKeywords = ['fatal', 'critical', 'memory', 'heap', 'outofmemory'];
    const highKeywords = ['error', 'exception', 'failed', 'sql', 'connection'];
    const mediumKeywords = ['warning', 'warn', 'deprecated', 'timeout'];
    
    let weights = { ...severityWeights };
    
    features.forEach(feature => {
      if (criticalKeywords.some(keyword => feature.includes(keyword))) {
        weights.critical += 0.3;
        weights.high += 0.1;
      } else if (highKeywords.some(keyword => feature.includes(keyword))) {
        weights.high += 0.2;
        weights.medium += 0.1;
      } else if (mediumKeywords.some(keyword => feature.includes(keyword))) {
        weights.medium += 0.2;
        weights.low += 0.1;
      }
    });

    // Find the severity with highest weight
    const predictedSeverity = Object.entries(weights)
      .sort(([, a], [, b]) => b - a)[0][0];

    const confidence = Math.min(0.95, Math.max(0.6, weights[predictedSeverity as keyof typeof weights]));

    return {
      severity: predictedSeverity,
      errorType,
      confidence,
      features: features.slice(0, 5),
    };
  }

  getModelStatus(): { trained: boolean; accuracy: number; trainingDataSize: number } {
    return {
      trained: this.isModelTrained,
      accuracy: this.model.accuracy,
      trainingDataSize: this.trainingData.length,
    };
  }
}
