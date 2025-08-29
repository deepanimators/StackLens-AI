import { storage } from "./database-storage";
import { LogParser } from "./services/log-parser";
import { aiService } from "./ai-service";
import { MLService } from "./services/ml-service";
import path from "path";
import fs from "fs";

interface AnalysisJob {
  id: string;
  fileId: number;
  userId: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  currentStep: string;
  startTime: Date;
}

class BackgroundJobProcessor {
  private jobs: Map<string, AnalysisJob> = new Map();
  private mlService = new MLService();

  async startFileAnalysis(fileId: number, userId: number): Promise<string> {
    // Check if analysis is already completed in database
    const existingAnalysis = await storage.getAnalysisHistoryByFileId(fileId);
    if (existingAnalysis && existingAnalysis.status === "completed") {
      console.log(`Analysis already completed for file ${fileId}`);
      return `analysis_${fileId}_completed`;
    }

    // Check if there's already an active job for this file
    const existingJob = Array.from(this.jobs.values()).find(
      (job) =>
        job.fileId === fileId &&
        (job.status === "pending" || job.status === "processing")
    );

    if (existingJob) {
      console.log(
        `Analysis job already exists for file ${fileId}: ${existingJob.id}`
      );
      return existingJob.id;
    }

    const jobId = `analysis_${fileId}_${Date.now()}`;

    const job: AnalysisJob = {
      id: jobId,
      fileId,
      userId,
      status: "pending",
      progress: 0,
      currentStep: "Initializing analysis",
      startTime: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start the analysis in the background
    setTimeout(() => this.processAnalysisJob(job), 100);

    return jobId;
  }

  async getJobStatus(jobId: string): Promise<AnalysisJob | null> {
    return this.jobs.get(jobId) || null;
  }

  private async updateJobStatus(
    jobId: string,
    status: AnalysisJob["status"],
    progress: number,
    currentStep: string
  ) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.progress = progress;
      job.currentStep = currentStep;

      // Update database with progress
      try {
        const analysisHistory = await storage.getAnalysisHistoryByFileId(
          job.fileId
        );
        if (analysisHistory) {
          await storage.updateAnalysisHistory(analysisHistory.id, {
            progress,
            currentStep,
            status,
          });
        }
      } catch (error) {
        console.error("Failed to update analysis history:", error);
      }
    }
  }

  private async processAnalysisJob(job: AnalysisJob): Promise<void> {
    try {
      await this.updateJobStatus(job.id, "processing", 5, "Loading file data");

      // Get file info
      const logFile = await storage.getLogFile(job.fileId);
      if (!logFile) {
        throw new Error("File not found");
      }

      // Update log file status to processing
      await storage.updateLogFile(job.fileId, { status: "processing" });

      await this.updateJobStatus(
        job.id,
        "processing",
        10,
        "Reading file content"
      );

      // Read file content
      const filePath = path.join("uploads", logFile.filename);
      if (!fs.existsSync(filePath)) {
        throw new Error("File not found on disk");
      }

      const fileContent = fs.readFileSync(filePath, "utf8");

      await this.updateJobStatus(
        job.id,
        "processing",
        20,
        "Loading error patterns"
      );

      // Get error patterns
      const errorPatterns = await storage.getActiveErrorPatterns();
      const parser = new LogParser(errorPatterns);

      await this.updateJobStatus(job.id, "processing", 30, "Parsing log file");

      // Parse the log file
      const parsedErrors = parser.parseLogFile(
        fileContent,
        logFile.originalName
      );

      await this.updateJobStatus(
        job.id,
        "processing",
        50,
        "Storing error logs"
      );

      // Store parsed errors in batches
      const errorLogs = [];
      const batchSize = 50;
      for (let i = 0; i < parsedErrors.length; i += batchSize) {
        const batch = parsedErrors.slice(i, i + batchSize);
        for (const error of batch) {
          const errorLog = await storage.createErrorLog({
            fileId: job.fileId,
            lineNumber: error.lineNumber,
            timestamp: error.timestamp,
            severity: error.severity,
            errorType: error.errorType,
            message: error.message,
            fullText: error.fullText,
            pattern: error.pattern,
            resolved: false,
          });
          errorLogs.push(errorLog);
        }

        // Update progress during batch processing
        const batchProgress = 50 + Math.floor((i / parsedErrors.length) * 30);
        await this.updateJobStatus(
          job.id,
          "processing",
          batchProgress,
          `Storing error logs (${i + batch.length}/${parsedErrors.length})`
        );
      }

      await this.updateJobStatus(job.id, "processing", 75, "Training ML model");

      // Train the ML model with the error logs
      try {
        console.log(`Training ML model with ${errorLogs.length} error logs`);

        // Add missing mlConfidence property for type compatibility
        const errorLogsWithConfidence = errorLogs.map((error) => ({
          ...error,
          mlConfidence: 0, // Default confidence value
          createdAt: error.createdAt || new Date(),
        }));

        const mlMetrics = await this.mlService.trainModel(
          errorLogsWithConfidence
        );
        console.log(
          `ML model trained successfully. Accuracy: ${mlMetrics.accuracy.toFixed(
            3
          )}`
        );
      } catch (mlError) {
        console.error("ML model training error:", mlError);
      }

      await this.updateJobStatus(
        job.id,
        "processing",
        80,
        "Generating AI suggestions"
      );

      // Generate AI suggestions for critical and high severity errors
      const criticalAndHighErrors = errorLogs.filter((e) =>
        ["critical", "high"].includes(e.severity)
      );
      const maxSuggestions = Math.min(criticalAndHighErrors.length, 10); // Limit to avoid API quota issues

      for (let i = 0; i < maxSuggestions; i++) {
        const error = criticalAndHighErrors[i];
        try {
          // Add missing mlConfidence property for type compatibility
          const errorWithConfidence = {
            ...error,
            mlConfidence: 0,
            createdAt: error.createdAt || new Date(),
          };

          const suggestion = await aiService.generateErrorSuggestion(
            errorWithConfidence
          );
          await storage.updateErrorLog(error.id, {
            aiSuggestion: {
              rootCause: suggestion.rootCause,
              resolutionSteps: suggestion.resolutionSteps,
              codeExample: suggestion.codeExample,
              preventionMeasures: suggestion.preventionMeasures,
              confidence: suggestion.confidence,
            },
          });
        } catch (aiError) {
          console.error("AI suggestion error:", aiError);
        }

        // Update progress
        const suggestionProgress = 80 + Math.floor((i / maxSuggestions) * 15);
        await this.updateJobStatus(
          job.id,
          "processing",
          suggestionProgress,
          `Generating AI suggestions (${i + 1}/${maxSuggestions})`
        );
      }

      await this.updateJobStatus(
        job.id,
        "processing",
        95,
        "Finalizing analysis"
      );

      // Calculate processing time
      const processingTime = (Date.now() - job.startTime.getTime()) / 1000;

      // Create/update analysis history
      try {
        const existingAnalysis = await storage.getAnalysisHistoryByFileId(
          job.fileId
        );

        const analysisData = {
          fileId: job.fileId,
          userId: job.userId,
          filename: logFile.originalName,
          fileType: logFile.fileType,
          fileSize: logFile.fileSize,
          uploadTimestamp: logFile.uploadTimestamp
            ? Math.floor(logFile.uploadTimestamp.getTime() / 1000)
            : Math.floor(Date.now() / 1000),
          analysisTimestamp: Math.floor(Date.now() / 1000),
          status: "completed",
          progress: 100,
          currentStep: "Analysis completed successfully",
          totalErrors: errorLogs.length,
          criticalErrors: errorLogs.filter((e) => e.severity === "critical")
            .length,
          highErrors: errorLogs.filter((e) => e.severity === "high").length,
          mediumErrors: errorLogs.filter((e) => e.severity === "medium").length,
          lowErrors: errorLogs.filter((e) => e.severity === "low").length,
          processingTime,
          modelAccuracy: this.mlService.getModelStatus().accuracy,
        };

        if (existingAnalysis) {
          await storage.updateAnalysisHistory(
            existingAnalysis.id,
            analysisData
          );
        } else {
          await storage.createAnalysisHistory(analysisData);
        }
      } catch (dbError) {
        console.error("Failed to update analysis history:", dbError);
      }

      // Update file status and error counts
      await storage.updateLogFile(job.fileId, {
        status: "completed",
        totalErrors: errorLogs.length,
        criticalErrors: errorLogs.filter((e) => e.severity === "critical")
          .length,
        highErrors: errorLogs.filter((e) => e.severity === "high").length,
        mediumErrors: errorLogs.filter((e) => e.severity === "medium").length,
        lowErrors: errorLogs.filter((e) => e.severity === "low").length,
      });

      await this.updateJobStatus(
        job.id,
        "completed",
        100,
        "Analysis completed successfully"
      );

      // Trigger automatic model retraining with new data
      try {
        console.log(
          "Triggering automatic model retraining after file analysis completion..."
        );
        const { AdvancedTrainingSystem } = await import(
          "./advanced-training-system"
        );
        const trainingSystem = new AdvancedTrainingSystem();

        // Check if enough new data to warrant retraining (e.g., at least 10 new errors)
        if (errorLogs.length >= 10) {
          console.log(
            `New file has ${errorLogs.length} errors - triggering automatic retraining`
          );

          // Start background training (don't wait for completion)
          trainingSystem
            .trainSuggestionModel()
            .then((result) => {
              console.log("Automatic retraining completed:", result);
            })
            .catch((error) => {
              console.error("Automatic retraining failed:", error);
            });
        } else {
          console.log(
            `New file has ${errorLogs.length} errors - skipping automatic retraining (minimum 10 required)`
          );
        }
      } catch (retrainError) {
        console.error("Failed to trigger automatic retraining:", retrainError);
        // Don't fail the analysis if retraining fails
      }

      // Clean up job after completion (keep for 1 hour for status queries)
      setTimeout(() => {
        this.jobs.delete(job.id);
      }, 60 * 60 * 1000);
    } catch (error) {
      console.error("Analysis job failed:", error);
      await storage.updateLogFile(job.fileId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // Get all active jobs (for monitoring)
  getAllJobs(): AnalysisJob[] {
    return Array.from(this.jobs.values());
  }

  // Clean up old completed jobs
  cleanupOldJobs(): void {
    const now = Date.now();
    const maxAge = 4 * 60 * 60 * 1000; // 4 hours

    const jobEntries = Array.from(this.jobs.entries());
    for (const [jobId, job] of jobEntries) {
      if (now - job.startTime.getTime() > maxAge) {
        this.jobs.delete(jobId);
      }
    }
  }

  // Fix stuck processing jobs in database
  async fixStuckJobs(): Promise<void> {
    try {
      console.log("🔧 Checking for stuck processing jobs...");

      // Find analysis records that have been "processing" for more than 30 minutes
      const stuckThreshold = Date.now() - 30 * 60 * 1000; // 30 minutes ago

      // This would require a custom query to the database
      // For now, we'll just clean up in-memory jobs that are stuck
      const now = Date.now();
      const stuckJobThreshold = 30 * 60 * 1000; // 30 minutes

      const jobEntries = Array.from(this.jobs.entries());
      for (const [jobId, job] of jobEntries) {
        if (
          (job.status === "processing" || job.status === "pending") &&
          now - job.startTime.getTime() > stuckJobThreshold
        ) {
          console.log(`🚨 Found stuck job: ${jobId} for file ${job.fileId}`);

          // Mark as failed and update database
          await this.updateJobStatus(
            jobId,
            "failed",
            job.progress,
            "Job timed out - please retry"
          );

          // Clean up the job
          this.jobs.delete(jobId);
        }
      }
    } catch (error) {
      console.error("Error fixing stuck jobs:", error);
    }
  }
}

// Export singleton instance
export const backgroundJobProcessor = new BackgroundJobProcessor();

// Clean up old jobs every hour and fix stuck jobs every 10 minutes
setInterval(() => {
  backgroundJobProcessor.cleanupOldJobs();
}, 60 * 60 * 1000);

setInterval(() => {
  backgroundJobProcessor.fixStuckJobs();
}, 10 * 60 * 1000); // Check for stuck jobs every 10 minutes
