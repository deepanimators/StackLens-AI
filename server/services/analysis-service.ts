import { LogFile, ErrorLog, InsertLogFile, InsertErrorLog } from '@shared/sqlite-schema';
import { storage } from '../database-storage';
import { aiService } from '../ai-service';
import { predictor } from './predictor';
import { suggestor } from './suggestor';
import { FeatureEngineer } from './feature-engineer';
import { LogParser } from './log-parser';

export interface AnalysisOutput {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  upload_timestamp: string;
  analysis_timestamp: string;
  errors_detected: ErrorDetection[];
  anomalies: Anomaly[];
  predictions: Prediction[];
  suggestions: Suggestion[];
  total_errors: number;
  critical_errors: number;
  high_errors: number;
  medium_errors: number;
  low_errors: number;
  status: string;
  error_message?: string;
}

export interface ErrorDetection {
  id: number;
  line_number: number;
  timestamp: string;
  severity: string;
  error_type: string;
  message: string;
  full_text: string;
  pattern?: string;
  confidence: number;
  context: {
    preceding_lines?: string[];
    following_lines?: string[];
  };
}

export interface Anomaly {
  id: number;
  type: string;
  severity: string;
  description: string;
  affected_lines: number[];
  confidence: number;
  pattern: string;
  recommendation: string;
}

export interface Prediction {
  id: number;
  category: string;
  confidence: number;
  predicted_severity: string;
  likelihood: number;
  reasoning: string;
  features_used: string[];
  model_version: string;
}

export interface Suggestion {
  id: number;
  error_id: number;
  type: string; // 'ai', 'pattern', 'ml'
  root_cause: string;
  resolution_steps: string[];
  code_example?: string;
  prevention_measures: string[];
  confidence: number;
  priority: string;
  estimated_fix_time: string;
}

export class AnalysisService {
  private featureEngineer: FeatureEngineer;
  private logParser: LogParser;

  constructor() {
    this.featureEngineer = new FeatureEngineer();
    this.logParser = new LogParser();
  }

  async analyzeFile(fileData: {
    filename: string;
    originalName: string;
    content: string;
    mimeType: string;
    size: number;
    uploadedBy: number;
  }): Promise<AnalysisOutput> {
    const startTime = new Date();
    
    try {
      // Create log file record
      const logFile: InsertLogFile = {
        filename: fileData.filename,
        originalName: fileData.originalName,
        fileType: this.getFileType(fileData.mimeType),
        fileSize: fileData.size,
        mimeType: fileData.mimeType,
        uploadedBy: fileData.uploadedBy,
        uploadTimestamp: new Date(),
        status: 'processing',
        totalErrors: 0,
        criticalErrors: 0,
        highErrors: 0,
        mediumErrors: 0,
        lowErrors: 0,
      };

      const createdLogFile = await storage.createLogFile(logFile);

      // Parse the file content
      const parseResult = await this.logParser.parseLogFile(fileData.content, fileData.mimeType);
      
      if (!parseResult.success) {
        await storage.updateLogFile(createdLogFile.id, {
          status: 'failed',
          errorMessage: parseResult.error,
          analysisTimestamp: new Date(),
        });
        
        return this.createFailedAnalysis(createdLogFile, parseResult.error);
      }

      // Process detected errors
      const errorDetections: ErrorDetection[] = [];
      const errorCounts = { critical: 0, high: 0, medium: 0, low: 0 };

      for (const error of parseResult.errors || []) {
        const errorLog: InsertErrorLog = {
          fileId: createdLogFile.id,
          storeNumber: createdLogFile.storeNumber || null,
          kioskNumber: createdLogFile.kioskNumber || null,
          lineNumber: error.lineNumber,
          timestamp: error.timestamp,
          severity: error.severity,
          errorType: error.errorType,
          message: error.message,
          fullText: error.fullText,
          pattern: error.pattern,
          resolved: false,
        };

        const createdError = await storage.createErrorLog(errorLog);
        
        // Create enhanced error detection
        const errorDetection: ErrorDetection = {
          id: createdError.id,
          line_number: error.lineNumber,
          timestamp: error.timestamp?.toISOString() || new Date().toISOString(),
          severity: error.severity,
          error_type: error.errorType,
          message: error.message,
          full_text: error.fullText,
          pattern: error.pattern,
          confidence: error.confidence || 0.8,
          context: {
            preceding_lines: error.context?.preceding || [],
            following_lines: error.context?.following || [],
          },
        };

        errorDetections.push(errorDetection);
        errorCounts[error.severity.toLowerCase() as keyof typeof errorCounts]++;
      }

      // Generate AI suggestions for errors
      const suggestions: Suggestion[] = [];
      for (const error of parseResult.errors || []) {
        try {
          const aiSuggestion = await aiService.generateErrorSuggestion(error);
          const suggestion: Suggestion = {
            id: suggestions.length + 1,
            error_id: error.id || 0,
            type: 'ai',
            root_cause: aiSuggestion.rootCause,
            resolution_steps: aiSuggestion.resolutionSteps,
            code_example: aiSuggestion.codeExample,
            prevention_measures: aiSuggestion.preventionMeasures,
            confidence: aiSuggestion.confidence,
            priority: error.severity,
            estimated_fix_time: this.estimateFixTime(error.severity),
          };
          suggestions.push(suggestion);
        } catch (error) {
          console.error('Error generating AI suggestion:', error);
        }
      }

      // Generate ML predictions
      const predictions: Prediction[] = [];
      for (const error of parseResult.errors || []) {
        try {
          const features = this.featureEngineer.extractFeatures(error);
          const prediction = await predictor.predict(features);
          
          const predictionResult: Prediction = {
            id: predictions.length + 1,
            category: prediction.category,
            confidence: prediction.confidence,
            predicted_severity: prediction.severity,
            likelihood: prediction.likelihood,
            reasoning: prediction.reasoning,
            features_used: Object.keys(features),
            model_version: prediction.modelVersion || '1.0.0',
          };
          predictions.push(predictionResult);
        } catch (error) {
          console.error('Error generating ML prediction:', error);
        }
      }

      // Detect anomalies
      const anomalies: Anomaly[] = await this.detectAnomalies(parseResult.errors || []);

      // Update log file with analysis results
      const analysisTimestamp = new Date();
      const updatedLogFile = await storage.updateLogFile(createdLogFile.id, {
        analysisTimestamp,
        errorsDetected: errorDetections,
        anomalies,
        predictions,
        suggestions,
        totalErrors: errorDetections.length,
        criticalErrors: errorCounts.critical,
        highErrors: errorCounts.high,
        mediumErrors: errorCounts.medium,
        lowErrors: errorCounts.low,
        status: 'completed',
        analysisResult: {
          processingTime: analysisTimestamp.getTime() - startTime.getTime(),
          fileProcessed: true,
          analysisCompleted: true,
        },
      });

      return this.createAnalysisOutput(updatedLogFile!, errorDetections, anomalies, predictions, suggestions);

    } catch (error) {
      console.error('Analysis error:', error);
      
      await storage.updateLogFile(createdLogFile.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        analysisTimestamp: new Date(),
      });

      return this.createFailedAnalysis(createdLogFile, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private getFileType(mimeType: string): string {
    const typeMap: { [key: string]: string } = {
      'text/plain': 'text',
      'application/json': 'json',
      'text/xml': 'xml',
      'application/xml': 'xml',
      'text/yaml': 'yaml',
      'application/yaml': 'yaml',
      'text/csv': 'csv',
    };
    
    return typeMap[mimeType] || 'text';
  }

  private estimateFixTime(severity: string): string {
    const timeMap: { [key: string]: string } = {
      'critical': '1-2 hours',
      'high': '2-4 hours',
      'medium': '4-8 hours',
      'low': '1-2 days',
    };
    
    return timeMap[severity.toLowerCase()] || '1-2 hours';
  }

  private async detectAnomalies(errors: any[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Group errors by type and detect patterns
    const errorsByType = new Map<string, any[]>();
    errors.forEach(error => {
      if (!errorsByType.has(error.errorType)) {
        errorsByType.set(error.errorType, []);
      }
      errorsByType.get(error.errorType)!.push(error);
    });

    // Detect unusual frequency patterns
    for (const [errorType, typeErrors] of errorsByType) {
      if (typeErrors.length > 10) {
        anomalies.push({
          id: anomalies.length + 1,
          type: 'frequency_anomaly',
          severity: 'high',
          description: `Unusual frequency of ${errorType} errors detected`,
          affected_lines: typeErrors.map(e => e.lineNumber),
          confidence: 0.85,
          pattern: 'high_frequency',
          recommendation: `Investigate root cause of recurring ${errorType} errors`,
        });
      }
    }

    // Detect time-based anomalies
    const timeBasedErrors = errors.filter(e => e.timestamp);
    if (timeBasedErrors.length > 5) {
      const timestamps = timeBasedErrors.map(e => new Date(e.timestamp).getTime());
      const timeDiffs = timestamps.slice(1).map((t, i) => t - timestamps[i]);
      const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      
      const rapidErrors = timeDiffs.filter(diff => diff < avgTimeDiff * 0.1);
      if (rapidErrors.length > 3) {
        anomalies.push({
          id: anomalies.length + 1,
          type: 'temporal_anomaly',
          severity: 'medium',
          description: 'Rapid succession of errors detected',
          affected_lines: timeBasedErrors.slice(0, rapidErrors.length).map(e => e.lineNumber),
          confidence: 0.75,
          pattern: 'rapid_succession',
          recommendation: 'Check for cascading failures or system overload',
        });
      }
    }

    return anomalies;
  }

  private createAnalysisOutput(
    logFile: LogFile,
    errorDetections: ErrorDetection[],
    anomalies: Anomaly[],
    predictions: Prediction[],
    suggestions: Suggestion[]
  ): AnalysisOutput {
    return {
      id: logFile.id,
      filename: logFile.filename,
      file_type: logFile.fileType,
      file_size: logFile.fileSize,
      upload_timestamp: logFile.uploadTimestamp.toISOString(),
      analysis_timestamp: logFile.analysisTimestamp?.toISOString() || new Date().toISOString(),
      errors_detected: errorDetections,
      anomalies,
      predictions,
      suggestions,
      total_errors: logFile.totalErrors,
      critical_errors: logFile.criticalErrors,
      high_errors: logFile.highErrors,
      medium_errors: logFile.mediumErrors,
      low_errors: logFile.lowErrors,
      status: logFile.status,
      error_message: logFile.errorMessage,
    };
  }

  private createFailedAnalysis(logFile: LogFile, errorMessage: string): AnalysisOutput {
    return {
      id: logFile.id,
      filename: logFile.filename,
      file_type: logFile.fileType || 'unknown',
      file_size: logFile.fileSize,
      upload_timestamp: logFile.uploadTimestamp.toISOString(),
      analysis_timestamp: new Date().toISOString(),
      errors_detected: [],
      anomalies: [],
      predictions: [],
      suggestions: [],
      total_errors: 0,
      critical_errors: 0,
      high_errors: 0,
      medium_errors: 0,
      low_errors: 0,
      status: 'failed',
      error_message: errorMessage,
    };
  }

  async getAnalysisById(id: number): Promise<AnalysisOutput | null> {
    const logFile = await storage.getLogFile(id);
    if (!logFile) return null;

    const errorDetections = logFile.errorsDetected ? JSON.parse(logFile.errorsDetected) : [];
    const anomalies = logFile.anomalies ? JSON.parse(logFile.anomalies) : [];
    const predictions = logFile.predictions ? JSON.parse(logFile.predictions) : [];
    const suggestions = logFile.suggestions ? JSON.parse(logFile.suggestions) : [];

    return this.createAnalysisOutput(logFile, errorDetections, anomalies, predictions, suggestions);
  }

  async getAllAnalyses(userId?: number): Promise<AnalysisOutput[]> {
    const logFiles = userId ? await storage.getLogFilesByUser(userId) : await storage.getAllLogFiles();
    
    const analyses: AnalysisOutput[] = [];
    for (const logFile of logFiles) {
      const analysis = await this.getAnalysisById(logFile.id);
      if (analysis) {
        analyses.push(analysis);
      }
    }
    
    return analyses;
  }
}

export const analysisService = new AnalysisService();