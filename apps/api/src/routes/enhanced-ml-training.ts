/**
 * Enhanced ML Training API Routes
 *
 * New endpoints for separate Prediction and Suggestion model training
 * with backup and reset capabilities
 */

import express from "express";
import path from "path";
import fs from "fs";
import PredictionModelTrainingService from "../services/prediction-model-training";
import SuggestionModelTrainingService from "../services/suggestion-model-training";

const router = express.Router();

// Initialize training services
const predictionTrainer = new PredictionModelTrainingService();
const suggestionTrainer = new SuggestionModelTrainingService();

/**
 * Backup current models before training
 */
router.post("/api/ml/backup", async (req, res) => {
  try {
    console.log("🔄 Starting model backup process...");

    const { spawn } = require("child_process");
    const backupScript = path.join(
      __dirname,
      "../..",
      "backup-and-reset-models.js"
    );

    // Run backup script
    const backupProcess = spawn("node", [backupScript, "backup"], {
      cwd: path.join(__dirname, "../.."),
      stdio: "pipe",
    });

    let output = "";
    let errors = "";

    backupProcess.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    backupProcess.stderr.on("data", (data: Buffer) => {
      errors += data.toString();
    });

    backupProcess.on("close", (code: number) => {
      if (code === 0) {
        res.json({
          success: true,
          message: "Models backed up successfully",
          output: output,
          backupLocation:
            output.match(/Backup saved to: (.+)/)?.[1] || "Unknown",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Backup failed",
          error: errors || "Unknown error",
          output: output,
        });
      }
    });
  } catch (error) {
    console.error("❌ Backup process failed:", error);
    res.status(500).json({
      success: false,
      message: "Backup process failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Reset all models and training data
 */
router.post("/api/ml/reset", async (req, res) => {
  try {
    console.log("🔄 Starting model reset process...");

    const { spawn } = require("child_process");
    const backupScript = path.join(
      __dirname,
      "../..",
      "backup-and-reset-models.js"
    );

    // Run reset script
    const resetProcess = spawn("node", [backupScript, "reset"], {
      cwd: path.join(__dirname, "../.."),
      stdio: "pipe",
    });

    let output = "";
    let errors = "";

    resetProcess.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    resetProcess.stderr.on("data", (data: Buffer) => {
      errors += data.toString();
    });

    resetProcess.on("close", (code: number) => {
      if (code === 0) {
        res.json({
          success: true,
          message: "Models reset successfully",
          output: output,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Reset failed",
          error: errors || "Unknown error",
          output: output,
        });
      }
    });
  } catch (error) {
    console.error("❌ Reset process failed:", error);
    res.status(500).json({
      success: false,
      message: "Reset process failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Backup and reset (combined operation)
 */
router.post("/api/ml/backup-and-reset", async (req, res) => {
  try {
    console.log("🔄 Starting backup and reset process...");

    const { spawn } = require("child_process");
    const backupScript = path.join(
      __dirname,
      "../..",
      "backup-and-reset-models.js"
    );

    // Run backup-and-reset script
    const process = spawn("node", [backupScript, "backup-and-reset"], {
      cwd: path.join(__dirname, "../.."),
      stdio: "pipe",
    });

    let output = "";
    let errors = "";

    process.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    process.stderr.on("data", (data: Buffer) => {
      errors += data.toString();
    });

    process.on("close", (code: number) => {
      if (code === 0) {
        res.json({
          success: true,
          message: "Backup and reset completed successfully",
          output: output,
          backupLocation:
            output.match(/Backup saved to: (.+)/)?.[1] || "Unknown",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Backup and reset failed",
          error: errors || "Unknown error",
          output: output,
        });
      }
    });
  } catch (error) {
    console.error("❌ Backup and reset process failed:", error);
    res.status(500).json({
      success: false,
      message: "Backup and reset process failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Train Prediction Model from log files
 */
router.post("/api/ml/train-prediction", async (req, res) => {
  try {
    const { logFilePaths } = req.body;

    if (!logFilePaths || !Array.isArray(logFilePaths)) {
      return res.status(400).json({
        success: false,
        message: "logFilePaths array is required",
      });
    }

    console.log("🔥 Starting Prediction Model training...");
    console.log("📂 Log files:", logFilePaths);

    // Validate log files exist
    const missingFiles = logFilePaths.filter(
      (filePath) => !fs.existsSync(filePath)
    );
    if (missingFiles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Log files not found: ${missingFiles.join(", ")}`,
      });
    }

    // Train the prediction model
    const result = await predictionTrainer.trainFromLogs(logFilePaths);

    if (result.success) {
      // Get training statistics
      const stats = predictionTrainer.getTrainingStats();

      res.json({
        success: true,
        message: result.message,
        modelId: result.modelId,
        metrics: result.metrics,
        trainingStats: stats,
        modelType: "prediction",
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        modelType: "prediction",
      });
    }
  } catch (error) {
    console.error("❌ Prediction Model training failed:", error);
    res.status(500).json({
      success: false,
      message: `Training failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      modelType: "prediction",
    });
  }
});

/**
 * Train Suggestion Model from Excel file
 */
router.post("/api/ml/train-suggestion", async (req, res) => {
  try {
    const { excelFilePath } = req.body;

    if (!excelFilePath) {
      return res.status(400).json({
        success: false,
        message: "excelFilePath is required",
      });
    }

    console.log("🔥 Starting Suggestion Model training...");
    console.log("📂 Excel file:", excelFilePath);

    // Validate Excel file exists
    if (!fs.existsSync(excelFilePath)) {
      return res.status(400).json({
        success: false,
        message: `Excel file not found: ${excelFilePath}`,
      });
    }

    // Train the suggestion model
    const result = await suggestionTrainer.trainFromExcel(excelFilePath);

    if (result.success) {
      // Get training statistics
      const stats = suggestionTrainer.getTrainingStats();

      res.json({
        success: true,
        message: result.message,
        modelId: result.modelId,
        metrics: result.metrics,
        trainingStats: stats,
        modelType: "suggestion",
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        modelType: "suggestion",
      });
    }
  } catch (error) {
    console.error("❌ Suggestion Model training failed:", error);
    res.status(500).json({
      success: false,
      message: `Training failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      modelType: "suggestion",
    });
  }
});

/**
 * Get current model status and training statistics
 */
router.get("/api/ml/status", async (req, res) => {
  try {
    const db = require("../db");

    // Get current models from database
    const models = await db.all(`
      SELECT * FROM ml_models 
      WHERE is_active = 1 
      ORDER BY created_at DESC
    `);

    // Get training statistics from services
    const predictionStats = predictionTrainer.getTrainingStats();
    const suggestionStats = suggestionTrainer.getTrainingStats();

    res.json({
      success: true,
      models: models,
      trainingStats: {
        prediction: predictionStats,
        suggestion: suggestionStats,
      },
      serviceStatus: {
        prediction: {
          ready: true,
          version: "2.0",
        },
        suggestion: {
          ready: true,
          version: "2.0",
        },
      },
    });
  } catch (error) {
    console.error("❌ Failed to get ML status:", error);
    res.status(500).json({
      success: false,
      message: `Failed to get status: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
  }
});

/**
 * Validate log files for prediction training
 */
router.post("/api/ml/validate-logs", async (req, res) => {
  try {
    const { logFilePaths } = req.body;

    if (!logFilePaths || !Array.isArray(logFilePaths)) {
      return res.status(400).json({
        success: false,
        message: "logFilePaths array is required",
      });
    }

    const validation = {
      valid: [],
      invalid: [],
      summary: {
        totalFiles: logFilePaths.length,
        validFiles: 0,
        totalLines: 0,
        estimatedErrors: 0,
      },
    };

    for (const filePath of logFilePaths) {
      try {
        if (!fs.existsSync(filePath)) {
          validation.invalid.push({
            file: filePath,
            reason: "File not found",
          });
          continue;
        }

        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter((line) => line.trim());

        // Quick error estimation using basic patterns
        const errorLines = lines.filter(
          (line) =>
            /error|exception|failed|critical|fatal/i.test(line) &&
            !/info.*error|debug.*error/i.test(line)
        );

        validation.valid.push({
          file: filePath,
          size: stats.size,
          lines: lines.length,
          estimatedErrors: errorLines.length,
          lastModified: stats.mtime,
        });

        validation.summary.totalLines += lines.length;
        validation.summary.estimatedErrors += errorLines.length;
      } catch (error) {
        validation.invalid.push({
          file: filePath,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    validation.summary.validFiles = validation.valid.length;

    res.json({
      success: true,
      validation: validation,
      recommendation:
        validation.summary.estimatedErrors > 0
          ? "Log files contain potential training data"
          : "Consider adding more diverse log files with error examples",
    });
  } catch (error) {
    console.error("❌ Log validation failed:", error);
    res.status(500).json({
      success: false,
      message: `Validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
  }
});

/**
 * Validate Excel file for suggestion training
 */
router.post("/api/ml/validate-excel", async (req, res) => {
  try {
    const { excelFilePath } = req.body;

    if (!excelFilePath) {
      return res.status(400).json({
        success: false,
        message: "excelFilePath is required",
      });
    }

    if (!fs.existsSync(excelFilePath)) {
      return res.status(400).json({
        success: false,
        message: "Excel file not found",
      });
    }

    const XLSX = require("xlsx");
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Analyze Excel structure
    const headers = Object.keys(jsonData[0] || {});
    const expectedHeaders = [
      "Error Description",
      "error_description",
      "Description",
      "Error",
      "Resolution",
      "resolution",
      "Solution",
      "Fix",
      "Steps",
    ];

    const hasErrorColumn = headers.some((h) =>
      expectedHeaders.some((expected) =>
        h.toLowerCase().includes(expected.toLowerCase())
      )
    );

    const hasResolutionColumn = headers.some((h) =>
      ["resolution", "solution", "fix", "steps"].some((expected) =>
        h.toLowerCase().includes(expected)
      )
    );

    const stats = {
      totalRows: jsonData.length,
      columns: headers,
      hasErrorColumn,
      hasResolutionColumn,
      sampleData: jsonData.slice(0, 3), // First 3 rows as sample
    };

    res.json({
      success: true,
      validation: stats,
      recommendation:
        hasErrorColumn && hasResolutionColumn
          ? "Excel file appears suitable for training"
          : "Excel file may need better column structure (Error Description + Resolution columns)",
    });
  } catch (error) {
    console.error("❌ Excel validation failed:", error);
    res.status(500).json({
      success: false,
      message: `Validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
  }
});

export default router;
