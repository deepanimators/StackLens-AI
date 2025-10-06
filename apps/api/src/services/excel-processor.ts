import * as fs from "fs";
import * as path from "path";
import { storage } from "../database/database-storage.js";

export interface ExcelTrainingData {
  id?: number;
  errorMessage: string;
  errorType: string;
  severity: string;
  category: string;
  rootCause: string;
  resolutionSteps: string[];
  codeExample?: string;
  preventionMeasures: string[];
  confidence: number;
  source: string;
  timestamp: Date;
}

export interface TrainingMetrics {
  totalRecords: number;
  processedRecords: number;
  errorCount: number;
  categories: string[];
  severityDistribution: Record<string, number>;
  averageConfidence: number;
}

export class ExcelTrainingDataProcessor {
  private readonly EXCEL_DIRECTORY = path.join(
    process.cwd(),
    "attached_assets"
  );

  constructor() { }

  /**
   * Process all Excel files in the attached_assets directory
   */
  async processAllExcelFiles(): Promise<ExcelTrainingData[]> {
    const allTrainingData: ExcelTrainingData[] = [];

    try {
      const files = fs
        .readdirSync(this.EXCEL_DIRECTORY)
        .filter((file) => file.endsWith(".xlsx") && !file.startsWith("~$"));

      console.log(`Found ${files.length} Excel files to process`);

      for (const file of files) {
        try {
          const filePath = path.join(this.EXCEL_DIRECTORY, file);
          const fileData = await this.processExcelFile(filePath);
          allTrainingData.push(...fileData);
          console.log(`Processed ${fileData.length} records from ${file}`);
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
        }
      }

      return allTrainingData;
    } catch (error) {
      console.error("Error reading Excel directory:", error);
      return [];
    }
  }

  /**
   * Process a single Excel file
   */
  private async processExcelFile(
    filePath: string
  ): Promise<ExcelTrainingData[]> {
    const XLSX = await import("xlsx");
    const workbook = XLSX.default?.readFile
      ? XLSX.default.readFile(filePath)
      : XLSX.readFile(filePath);
    const trainingData: ExcelTrainingData[] = [];

    // Process all sheets in the workbook
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const utils = XLSX.default?.utils || XLSX.utils;
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) continue; // Skip if no data rows

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      // Map columns to our structure
      const columnMapping = this.detectColumnMapping(headers);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        try {
          const trainingRecord = this.extractTrainingRecord(
            row,
            columnMapping,
            filePath,
            i + 2
          );
          if (trainingRecord) {
            trainingData.push(trainingRecord);
          }
        } catch (error) {
          console.warn(`Error processing row ${i + 2} in ${filePath}:`, error);
        }
      }
    }

    return trainingData;
  }

  /**
   * Detect column mapping from Excel headers
   */
  private detectColumnMapping(headers: string[]): Record<string, number> {
    const mapping: Record<string, number> = {};

    headers.forEach((header, index) => {
      const cleanHeader = header?.toString().toLowerCase().trim() || "";

      // Error message patterns
      if (
        cleanHeader.includes("error") &&
        (cleanHeader.includes("message") || cleanHeader.includes("description"))
      ) {
        mapping.errorMessage = index;
      }
      // Just message patterns (for our specific Excel format)
      else if (cleanHeader === "message") {
        mapping.errorMessage = index;
      }
      // Error type patterns
      else if (
        cleanHeader.includes("type") ||
        cleanHeader.includes("category")
      ) {
        mapping.errorType = index;
      }
      // Severity patterns
      else if (
        cleanHeader.includes("severity") ||
        cleanHeader.includes("priority") ||
        cleanHeader.includes("level")
      ) {
        mapping.severity = index;
      }
      // Root cause patterns
      else if (
        cleanHeader.includes("cause") ||
        cleanHeader.includes("reason") ||
        cleanHeader.includes("analysis")
      ) {
        mapping.rootCause = index;
      }
      // Resolution patterns
      else if (
        cleanHeader.includes("resolution") ||
        cleanHeader.includes("solution") ||
        cleanHeader.includes("suggestion") ||
        cleanHeader.includes("fix")
      ) {
        mapping.resolution = index;
      }
      // Code example patterns
      else if (
        cleanHeader.includes("code") ||
        cleanHeader.includes("example")
      ) {
        mapping.codeExample = index;
      }
      // Prevention patterns
      else if (
        cleanHeader.includes("prevention") ||
        cleanHeader.includes("avoid") ||
        cleanHeader.includes("prevent")
      ) {
        mapping.prevention = index;
      }
      // Confidence patterns
      else if (
        cleanHeader.includes("confidence") ||
        cleanHeader.includes("accuracy")
      ) {
        mapping.confidence = index;
      }
    });

    return mapping;
  }

  /**
   * Extract training record from Excel row
   */
  private extractTrainingRecord(
    row: any[],
    mapping: Record<string, number>,
    filePath: string,
    rowNumber: number
  ): ExcelTrainingData | null {
    const errorMessage = this.getCellValue(row, mapping.errorMessage);
    if (!errorMessage) return null;

    const errorType =
      this.getCellValue(row, mapping.errorType) ||
      this.inferErrorType(errorMessage);
    const severity = this.normalizeSeverity(
      this.getCellValue(row, mapping.severity) ||
      this.inferSeverity(errorMessage)
    );
    const rootCause =
      this.getCellValue(row, mapping.rootCause) ||
      this.generateRootCause(errorMessage, errorType);
    const resolutionText = this.getCellValue(row, mapping.resolution) || "";
    const preventionText = this.getCellValue(row, mapping.prevention) || "";
    const codeExample = this.getCellValue(row, mapping.codeExample);
    const confidence = this.parseConfidence(
      this.getCellValue(row, mapping.confidence)
    );

    return {
      errorMessage: errorMessage.substring(0, 2000), // Limit length
      errorType,
      severity,
      category: this.categorizeError(errorType, errorMessage),
      rootCause,
      resolutionSteps: this.parseSteps(resolutionText),
      codeExample: codeExample || undefined,
      preventionMeasures: this.parseSteps(preventionText),
      confidence:
        confidence || this.calculateConfidence(errorMessage, resolutionText),
      source: `excel:${path.basename(filePath)}:row${rowNumber}`,
      timestamp: new Date(),
    };
  }

  /**
   * Get cell value safely
   */
  private getCellValue(row: any[], index: number): string {
    if (index === undefined || index < 0 || index >= row.length) return "";
    const value = row[index];
    return value?.toString().trim() || "";
  }

  /**
   * Infer error type from message
   */
  private inferErrorType(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("memory") || lowerMessage.includes("heap"))
      return "Memory";
    if (lowerMessage.includes("sql") || lowerMessage.includes("database"))
      return "Database";
    if (lowerMessage.includes("network") || lowerMessage.includes("connection"))
      return "Network";
    if (lowerMessage.includes("timeout")) return "Timeout";
    if (lowerMessage.includes("null") || lowerMessage.includes("undefined"))
      return "Runtime";
    if (lowerMessage.includes("syntax") || lowerMessage.includes("parse"))
      return "Syntax";
    if (lowerMessage.includes("auth") || lowerMessage.includes("permission"))
      return "Security";
    if (lowerMessage.includes("file") || lowerMessage.includes("io"))
      return "IO";

    return "General";
  }

  /**
   * Infer severity from message
   */
  private inferSeverity(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("critical") || lowerMessage.includes("fatal"))
      return "critical";
    if (lowerMessage.includes("error") || lowerMessage.includes("exception"))
      return "high";
    if (lowerMessage.includes("warn") || lowerMessage.includes("warning"))
      return "medium";
    if (lowerMessage.includes("info")) return "low";

    return "medium";
  }

  /**
   * Normalize severity values
   */
  private normalizeSeverity(severity: string): string {
    const normalized = severity.toLowerCase().trim();

    if (["critical", "fatal", "severe"].includes(normalized)) return "critical";
    if (["high", "error", "major"].includes(normalized)) return "high";
    if (["medium", "moderate", "warning", "warn"].includes(normalized))
      return "medium";
    if (["low", "minor", "info", "information"].includes(normalized))
      return "low";

    return "medium";
  }

  /**
   * Categorize error based on type and message
   */
  private categorizeError(errorType: string, message: string): string {
    const categories = {
      Memory: "Infrastructure",
      Database: "Data",
      Network: "Infrastructure",
      Timeout: "Performance",
      Runtime: "Application",
      Syntax: "Code",
      Security: "Security",
      IO: "System",
      General: "Application",
    };

    return categories[errorType as keyof typeof categories] || "Application";
  }

  /**
   * Generate root cause if not provided
   */
  private generateRootCause(errorMessage: string, errorType: string): string {
    const templates = {
      Memory: "Memory allocation issue detected in the application",
      Database: "Database connectivity or query execution problem",
      Network: "Network communication failure or timeout",
      Timeout: "Operation exceeded configured timeout threshold",
      Runtime: "Runtime execution error in application logic",
      Syntax: "Code syntax or parsing error detected",
      Security: "Authentication or authorization failure",
      IO: "File system or input/output operation failure",
      General: "Application error requiring investigation",
    };

    return (
      templates[errorType as keyof typeof templates] ||
      "Error requires detailed analysis"
    );
  }

  /**
   * Parse steps from text
   */
  private parseSteps(text: string): string[] {
    if (!text) return [];

    // Split by common delimiters
    const steps = text
      .split(/[\n\r•·\-\*\d+\.\s]{1,3}/)
      .map((step) => step.trim())
      .filter((step) => step && step.length > 10); // Filter meaningful steps

    if (steps.length === 0 && text.length > 0) {
      return [text.trim()];
    }

    return steps.slice(0, 10); // Limit to 10 steps
  }

  /**
   * Parse confidence score
   */
  private parseConfidence(value: string): number | null {
    if (!value) return null;

    const numMatch = value.match(/(\d+\.?\d*)/);
    if (!numMatch) return null;

    let confidence = parseFloat(numMatch[1]);

    // Convert percentage to decimal if needed
    if (confidence > 1) {
      confidence = confidence / 100;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate confidence based on content quality
   */
  private calculateConfidence(
    errorMessage: string,
    resolution: string
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for detailed messages
    if (errorMessage.length > 100) confidence += 0.1;
    if (errorMessage.length > 200) confidence += 0.1;

    // Higher confidence for detailed resolutions
    if (resolution.length > 50) confidence += 0.1;
    if (resolution.length > 200) confidence += 0.2;

    // Check for technical terms
    const technicalTerms = [
      "exception",
      "stack",
      "trace",
      "configuration",
      "parameter",
    ];
    const hasTerms = technicalTerms.some(
      (term) =>
        errorMessage.toLowerCase().includes(term) ||
        resolution.toLowerCase().includes(term)
    );
    if (hasTerms) confidence += 0.1;

    return Math.min(0.95, confidence);
  }

  /**
   * Save training data to database
   */
  async saveTrainingData(trainingData: ExcelTrainingData[]): Promise<{
    saved: number;
    errors: number;
    details: string[];
  }> {
    console.log(
      `Saving ${trainingData.length} training records to database...`
    );

    const result = {
      saved: 0,
      errors: 0,
      details: [] as string[],
    };

    // Save in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < trainingData.length; i += batchSize) {
      const batch = trainingData.slice(i, i + batchSize);

      for (const record of batch) {
        try {
          // Map Excel data to AI training data schema
          await storage.createTrainingData({
            errorType: record.errorType,
            severity: record.severity,
            suggestedSolution:
              record.resolutionSteps.join("; ") || record.rootCause,
            sourceFile: record.source,
            confidence: record.confidence,
            source: "excel",
            isValidated: false,
            features: JSON.stringify({
              category: record.category,
              resolutionSteps: record.resolutionSteps,
              preventionMeasures: record.preventionMeasures,
              codeExample: record.codeExample,
            }),
            originalData: JSON.stringify(record),
          });
          result.saved++;
        } catch (error) {
          console.error("Error saving training record:", error);
          result.errors++;
          result.details.push(`Error saving record: ${error}`);
        }
      }

      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(trainingData.length / batchSize);
      console.log(`Saved batch ${batchNum}/${totalBatches}`);
      result.details.push(`Batch ${batchNum}/${totalBatches} processed`);
    }

    return result;
  }

  /**
   * Get training metrics
   */
  async getTrainingMetrics(): Promise<TrainingMetrics> {
    const allTrainingData = await this.processAllExcelFiles();

    const severityDistribution: Record<string, number> = {};
    const categories = new Set<string>();
    let totalConfidence = 0;

    allTrainingData.forEach((record) => {
      severityDistribution[record.severity] =
        (severityDistribution[record.severity] || 0) + 1;
      categories.add(record.category);
      totalConfidence += record.confidence;
    });

    return {
      totalRecords: allTrainingData.length,
      processedRecords: allTrainingData.length,
      errorCount: 0,
      categories: Array.from(categories),
      severityDistribution,
      averageConfidence:
        allTrainingData.length > 0
          ? totalConfidence / allTrainingData.length
          : 0,
    };
  }

  /**
   * Enhance training data with feature extraction
   */
  async enhanceTrainingData(rawData: ExcelTrainingData[]): Promise<any[]> {
    return rawData.map((record) => ({
      ...record,
      features: this.extractFeatures(record),
      messageLength: record.errorMessage.length,
      resolutionComplexity: record.resolutionSteps.length,
      hasCodeExample: !!record.codeExample,
      keywords: this.extractKeywords(record.errorMessage),
    }));
  }

  /**
   * Extract features from training record
   */
  private extractFeatures(record: ExcelTrainingData): string[] {
    const features: string[] = [];

    // Add error type as feature
    features.push(`type:${record.errorType.toLowerCase()}`);

    // Add severity as feature
    features.push(`severity:${record.severity}`);

    // Add category as feature
    features.push(`category:${record.category.toLowerCase()}`);

    // Extract keywords from message
    const keywords = this.extractKeywords(record.errorMessage);
    features.push(...keywords.map((k) => `keyword:${k}`));

    return features;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          !["this", "that", "with", "from", "they", "have", "been"].includes(
            word
          )
      );

    // Get unique words and limit
    return [...new Set(words)].slice(0, 10);
  }
}

export const excelProcessor = new ExcelTrainingDataProcessor();
