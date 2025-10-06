import * as XLSX from 'xlsx';
import { DatabaseStorage } from './database-storage';
import { aiService } from './ai-service';
import path from 'path';

interface TrainingData {
  error: string;
  suggestion: string;
  errorType?: string;
  severity?: string;
  category?: string;
}

interface ProcessedTrainingData extends TrainingData {
  features: {
    errorKeywords: string[];
    errorLength: number;
    hasStackTrace: boolean;
    hasTimestamp: boolean;
    logLevel: string;
    componentMentioned: string[];
    technicalTerms: string[];
  };
}

export class ExcelTrainingDataProcessor {
  private db: DatabaseStorage;
  private aiService: typeof aiService;

  constructor() {
    this.db = new DatabaseStorage();
    this.aiService = aiService;
  }

  /**
   * Process Excel file and extract training data
   */
  async processExcelFile(filePath: string): Promise<TrainingData[]> {
    try {
      console.log(`Processing Excel file: ${filePath}`);

      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const trainingData: TrainingData[] = [];

      // Skip header row, process data rows
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];

        // Column D (index 3) = Error, Column F (index 5) = Suggestion
        const error = row[3]?.toString()?.trim();
        const suggestion = row[5]?.toString()?.trim();

        if (error && suggestion && error.length > 10 && suggestion.length > 10) {
          const errorType = this.categorizeError(error);
          const severity = this.determineSeverity(error);
          const category = this.determineCategory(error);

          trainingData.push({
            error,
            suggestion,
            errorType,
            severity,
            category
          });
        }
      }

      console.log(`Extracted ${trainingData.length} training examples from Excel`);
      return trainingData;
    } catch (error) {
      console.error('Error processing Excel file:', error);
      throw error;
    }
  }

  /**
   * Process all Excel files in the attached_assets directory
   */
  async processAllExcelFiles(): Promise<TrainingData[]> {
    const excelFiles = [
      'attached_assets/Error Transactional Logs_With Some Error Suggestions_1752342066865.xlsx',
      'attached_assets/Error Transactional Logs_With Some Error Suggestions_1752467209697.xlsx'
    ];

    let allTrainingData: TrainingData[] = [];

    for (const file of excelFiles) {
      try {
        const filePath = path.join(process.cwd(), file);
        const data = await this.processExcelFile(filePath);
        allTrainingData = allTrainingData.concat(data);
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }

    // Remove duplicates based on error content
    const uniqueData = this.removeDuplicates(allTrainingData);
    console.log(`Total unique training examples: ${uniqueData.length}`);

    return uniqueData;
  }

  /**
   * Enhance training data with feature extraction
   */
  async enhanceTrainingData(trainingData: TrainingData[]): Promise<ProcessedTrainingData[]> {
    const processedData: ProcessedTrainingData[] = [];

    for (const item of trainingData) {
      const features = this.extractFeatures(item.error);

      processedData.push({
        ...item,
        features
      });
    }

    return processedData;
  }

  /**
   * Extract features from error text for ML training
   */
  private extractFeatures(error: string): ProcessedTrainingData['features'] {
    const errorLower = error.toLowerCase();

    return {
      errorKeywords: this.extractKeywords(error),
      errorLength: error.length,
      hasStackTrace: /at\s+[\w.]+\(|stack\s*trace|caused\s+by/i.test(error),
      hasTimestamp: /\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}|\d{13}/.test(error),
      logLevel: this.extractLogLevel(error),
      componentMentioned: this.extractComponents(error),
      technicalTerms: this.extractTechnicalTerms(error)
    };
  }

  /**
   * Extract keywords from error message
   */
  private extractKeywords(error: string): string[] {
    const stopWords = ['the', 'is', 'at', 'of', 'on', 'in', 'to', 'and', 'or', 'but', 'with', 'for'];
    const words = error.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    return Array.from(new Set(words)).slice(0, 10); // Top 10 unique keywords
  }

  /**
   * Extract log level from error message
   */
  private extractLogLevel(error: string): string {
    const logLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'FATAL', 'TRACE'];
    for (const level of logLevels) {
      if (error.toUpperCase().includes(level)) {
        return level;
      }
    }
    return 'UNKNOWN';
  }

  /**
   * Extract component names mentioned in error
   */
  private extractComponents(error: string): string[] {
    const componentPatterns = [
      /(\w+Service)/gi,
      /(\w+Controller)/gi,
      /(\w+Repository)/gi,
      /(\w+Manager)/gi,
      /(\w+Handler)/gi,
      /(\w+Processor)/gi,
      /(\w+Client)/gi,
      /(\w+Adapter)/gi
    ];

    const components: string[] = [];
    for (const pattern of componentPatterns) {
      const matches = error.match(pattern);
      if (matches) {
        components.push(...matches);
      }
    }

    return Array.from(new Set(components)).slice(0, 5);
  }

  /**
   * Extract technical terms from error message
   */
  private extractTechnicalTerms(error: string): string[] {
    const technicalTerms = [
      'database', 'connection', 'timeout', 'sql', 'query', 'transaction',
      'memory', 'heap', 'stack', 'thread', 'process', 'server',
      'network', 'socket', 'http', 'api', 'rest', 'json', 'xml',
      'authentication', 'authorization', 'security', 'token', 'session',
      'configuration', 'property', 'parameter', 'variable', 'environment',
      'exception', 'error', 'failure', 'warning', 'critical'
    ];

    const foundTerms = technicalTerms.filter(term =>
      error.toLowerCase().includes(term)
    );

    return foundTerms.slice(0, 8);
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('database') || errorLower.includes('sql') || errorLower.includes('connection')) {
      return 'Database';
    } else if (errorLower.includes('network') || errorLower.includes('timeout') || errorLower.includes('socket')) {
      return 'Network';
    } else if (errorLower.includes('memory') || errorLower.includes('heap') || errorLower.includes('performance')) {
      return 'Performance';
    } else if (errorLower.includes('authentication') || errorLower.includes('authorization') || errorLower.includes('security')) {
      return 'Security';
    } else if (errorLower.includes('configuration') || errorLower.includes('property') || errorLower.includes('setting')) {
      return 'Configuration';
    } else if (errorLower.includes('api') || errorLower.includes('service') || errorLower.includes('endpoint')) {
      return 'API';
    }

    return 'Application';
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('critical') || errorLower.includes('fatal') || errorLower.includes('severe')) {
      return 'Critical';
    } else if (errorLower.includes('error') || errorLower.includes('exception') || errorLower.includes('failed')) {
      return 'High';
    } else if (errorLower.includes('warn') || errorLower.includes('warning')) {
      return 'Medium';
    }

    return 'Low';
  }

  /**
   * Determine error category
   */
  private determineCategory(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('pos') || errorLower.includes('payment') || errorLower.includes('transaction')) {
      return 'POS System';
    } else if (errorLower.includes('order') || errorLower.includes('menu') || errorLower.includes('item')) {
      return 'Order Management';
    } else if (errorLower.includes('tax') || errorLower.includes('pricing') || errorLower.includes('discount')) {
      return 'Financial';
    }

    return this.categorizeError(error);
  }

  /**
   * Remove duplicate training examples
   */
  private removeDuplicates(data: TrainingData[]): TrainingData[] {
    const seen = new Set<string>();
    return data.filter(item => {
      const key = item.error.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Save training data to database
   */
  async saveTrainingData(trainingData: ProcessedTrainingData[]): Promise<void> {
    try {
      console.log('Saving training data to database...');

      for (const item of trainingData) {
        // Save as training data in the database
        await this.db.createTrainingData({
          errorType: item.errorType || 'Unknown',
          severity: item.severity || 'Medium',
          suggestedSolution: item.suggestion,
          sourceFile: 'Excel Import',
          confidence: 0.8,
          source: 'excel_import',
          isValidated: true,
          validatedBy: 'system',
          validatedAt: Date.now(),
          features: item.features,
          originalData: {
            error: item.error,
            category: item.category
          }
        });
      }

      console.log(`Saved ${trainingData.length} training examples to database`);
    } catch (error) {
      console.error('Error saving training data:', error);
      throw error;
    }
  }
}
