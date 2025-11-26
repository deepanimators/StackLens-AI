/**
 * Enhanced ML Training Dashboard
 *
 * New interface for separate Prediction and Suggestion model training
 * with backup, reset, and enhanced error detection capabilities
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Database,
  FileText,
  Zap,
  CheckCircle,
  XCircle,
  Download,
  RotateCcw,
  Play,
  Eye,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authenticatedRequest } from "@/lib/auth";

interface ModelMetrics {
  accuracy: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  relevanceScore?: number;
  completenessScore?: number;
  usabilityScore?: number;
}

interface ModelInfo {
  id: string;
  name: string;
  version: string;
  model_type: string;
  accuracy: number;
  training_data_size: number;
  is_active: boolean;
  created_at: string;
}

interface TrainingResult {
  success: boolean;
  message: string;
  modelId?: string;
  metrics?: ModelMetrics;
  trainingStats?: any;
}

interface ValidationResult {
  success: boolean;
  validation?: any;
  recommendation?: string;
}

const EnhancedMLTrainingDashboard: React.FC = () => {
  const [currentModels, setCurrentModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<string>("");
  const [trainingProgress, setTrainingProgress] = useState(0);

  // Prediction Model State
  const [predictionLogFiles, setPredictionLogFiles] = useState<string>("");
  const [predictionValidation, setPredictionValidation] =
    useState<ValidationResult | null>(null);
  const [predictionResult, setPredictionResult] =
    useState<TrainingResult | null>(null);

  // Suggestion Model State
  const [suggestionExcelFile, setSuggestionExcelFile] = useState<string>("");
  const [suggestionValidation, setSuggestionValidation] =
    useState<ValidationResult | null>(null);
  const [suggestionResult, setSuggestionResult] =
    useState<TrainingResult | null>(null);

  // Backup & Reset State
  const [backupLocation, setBackupLocation] = useState<string>("");
  const [lastBackup, setLastBackup] = useState<string>("");

  // Modal State
  const [showSuggestionResultModal, setShowSuggestionResultModal] =
    useState(false);

  useEffect(() => {
    loadCurrentModels();
  }, []);

  const loadCurrentModels = async () => {
    try {
      const response = await authenticatedRequest("GET", "/api/ml/status");
      const data = response;

      if (data.success) {
        setCurrentModels(data.models || []);
      }
    } catch (error) {
      console.error("Failed to load models:", error);
    }
  };

  const handleBackup = async () => {
    setIsLoading(true);
    setTrainingStatus("Creating backup...");

    try {
      const response = await authenticatedRequest("POST", "/api/ml/backup");

      const data = response;

      if (data.success) {
        setBackupLocation(data.backupLocation || "Backup completed");
        setLastBackup(new Date().toLocaleString());
        setTrainingStatus("✅ Backup completed successfully");
      } else {
        setTrainingStatus(`❌ Backup failed: ${data.message}`);
      }
    } catch (error) {
      setTrainingStatus(
        `❌ Backup error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm("⚠️ This will delete all trained models and data. Are you sure?")
    ) {
      return;
    }

    setIsLoading(true);
    setTrainingStatus("Resetting models...");

    try {
      const response = await authenticatedRequest("POST", "/api/ml/reset");

      const data = response;

      if (data.success) {
        setTrainingStatus("✅ Models reset successfully");
        setCurrentModels([]);
        setPredictionResult(null);
        setSuggestionResult(null);
      } else {
        setTrainingStatus(`❌ Reset failed: ${data.message}`);
      }
    } catch (error) {
      setTrainingStatus(
        `❌ Reset error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupAndReset = async () => {
    if (
      !confirm(
        "⚠️ This will backup current models and then reset everything. Continue?"
      )
    ) {
      return;
    }

    setIsLoading(true);
    setTrainingStatus("Creating backup and resetting...");

    try {
      const response = await authenticatedRequest(
        "POST",
        "/api/ml/backup-and-reset"
      );

      const data = response;

      if (data.success) {
        setBackupLocation(data.backupLocation || "Backup completed");
        setLastBackup(new Date().toLocaleString());
        setTrainingStatus("✅ Backup and reset completed successfully");
        setCurrentModels([]);
        setPredictionResult(null);
        setSuggestionResult(null);
      } else {
        setTrainingStatus(`❌ Backup and reset failed: ${data.message}`);
      }
    } catch (error) {
      setTrainingStatus(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validatePredictionLogs = async () => {
    if (!predictionLogFiles.trim()) {
      alert("Please enter log file paths");
      return;
    }

    const logPaths = predictionLogFiles
      .split("\n")
      .map((path) => path.trim())
      .filter((path) => path);

    try {
      const response = await authenticatedRequest(
        "POST",
        "/api/ml/validate-logs",
        {
          logFilePaths: logPaths,
        }
      );

      const data = response;
      setPredictionValidation(data);
    } catch (error) {
      setPredictionValidation({
        success: false,
        recommendation: `Validation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  };

  const validateSuggestionExcel = async () => {
    if (!suggestionExcelFile.trim()) {
      alert("Please enter Excel file path");
      return;
    }

    try {
      const response = await authenticatedRequest(
        "POST",
        "/api/ml/validate-excel",
        {
          excelFilePath: suggestionExcelFile.trim(),
        }
      );

      const data = response;
      setSuggestionValidation(data);
    } catch (error) {
      setSuggestionValidation({
        success: false,
        recommendation: `Validation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  };

  const trainPredictionModel = async () => {
    if (!predictionLogFiles.trim()) {
      alert("Please enter log file paths");
      return;
    }

    setIsLoading(true);
    setTrainingStatus("Training Prediction Model from error logs...");
    setTrainingProgress(0);

    const logPaths = predictionLogFiles
      .split("\n")
      .map((path) => path.trim())
      .filter((path) => path);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setTrainingProgress((prev) => Math.min(prev + 10, 90));
    }, 2000);

    try {
      const response = await authenticatedRequest(
        "POST",
        "/api/ml/train-prediction",
        {
          logFilePaths: logPaths,
        }
      );

      const data = response;
      setPredictionResult(data);

      if (data.success) {
        setTrainingStatus(`✅ Prediction Model trained: ${data.message}`);
        setTrainingProgress(100);
        loadCurrentModels(); // Refresh models list
      } else {
        setTrainingStatus(`❌ Prediction training failed: ${data.message}`);
      }
    } catch (error) {
      setPredictionResult({
        success: false,
        message: `Training error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      setTrainingStatus(
        `❌ Prediction training error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setTrainingProgress(0);
    }
  };

  const trainSuggestionModel = async () => {
    if (!suggestionExcelFile.trim()) {
      alert("Please enter Excel file path");
      return;
    }

    setIsLoading(true);
    setTrainingStatus("Training Suggestion Model from Excel data...");
    setTrainingProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setTrainingProgress((prev) => Math.min(prev + 15, 90));
    }, 1500);

    try {
      const response = await authenticatedRequest(
        "POST",
        "/api/ml/train-suggestion",
        {
          excelFilePaths: [suggestionExcelFile.trim()],
          useGeminiAI: true,
        }
      );

      const data = response;
      setSuggestionResult(data);

      if (data.success) {
        setTrainingStatus(`✅ Suggestion Model trained: ${data.message}`);
        setTrainingProgress(100);
        loadCurrentModels(); // Refresh models list
        setShowSuggestionResultModal(true); // Show results modal
      } else {
        setTrainingStatus(`❌ Suggestion training failed: ${data.message}`);
      }
    } catch (error) {
      setSuggestionResult({
        success: false,
        message: `Training error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      setTrainingStatus(
        `❌ Suggestion training error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setTrainingProgress(0);
    }
  };

  const formatMetrics = (metrics: ModelMetrics) => {
    return Object.entries(metrics)
      .filter(([key, value]) => typeof value === "number")
      .map(([key, value]) => ({
        name: key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase()),
        value: (value * 100).toFixed(1) + "%",
      }));
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Enhanced ML Training Dashboard
          </CardTitle>
          <CardDescription>
            Separate training for Prediction Model (error detection) and
            Suggestion Model (resolution steps)
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Status Bar */}
      {trainingStatus && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{trainingStatus}</AlertDescription>
        </Alert>
      )}

      {/* Progress Bar */}
      {trainingProgress > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Training Progress</span>
                <span>{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Models Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Current Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentModels.length === 0 ? (
            <p className="text-muted-foreground">No active models found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentModels.map((model) => (
                <Card key={model.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{model.name}</h4>
                      <Badge
                        variant={model.is_active ? "default" : "secondary"}
                      >
                        {model.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Type: {model.model_type} | Version: {model.version}
                    </p>
                    <p className="text-sm">
                      Accuracy:{" "}
                      <strong>{(model.accuracy * 100).toFixed(1)}%</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Training Data: {model.training_data_size} samples
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup & Reset Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Backup & Reset
          </CardTitle>
          <CardDescription>
            Backup current models before training new ones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleBackup}
              disabled={isLoading}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Create Backup
            </Button>
            <Button
              onClick={handleReset}
              disabled={isLoading}
              variant="destructive"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Models
            </Button>
            <Button
              onClick={handleBackupAndReset}
              disabled={isLoading}
              variant="secondary"
            >
              <Download className="h-4 w-4 mr-2" />
              Backup & Reset
            </Button>
          </div>

          {backupLocation && (
            <div className="bg-green-50 p-3 rounded-md">
              <p className="text-sm text-green-800">
                Last backup: {lastBackup}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Location: {backupLocation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Tabs */}
      <Tabs defaultValue="prediction" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prediction">Prediction Model</TabsTrigger>
          <TabsTrigger value="suggestion">Suggestion Model</TabsTrigger>
        </TabsList>

        {/* Prediction Model Tab */}
        <TabsContent value="prediction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Prediction Model Training
              </CardTitle>
              <CardDescription>
                Train from error logs to detect and classify actual errors with
                enhanced accuracy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prediction-logs">
                  Log File Paths (one per line)
                </Label>
                <textarea
                  id="prediction-logs"
                  className="w-full h-32 p-3 border rounded-md resize-none"
                  placeholder={`Enter log file paths, one per line:
/path/to/error.log
/path/to/application.log
/path/to/system.log`}
                  value={predictionLogFiles}
                  onChange={(e) => setPredictionLogFiles(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={validatePredictionLogs} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Validate Logs
                </Button>
                <Button
                  onClick={trainPredictionModel}
                  disabled={isLoading || !predictionLogFiles.trim()}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Train Prediction Model
                </Button>
              </div>

              {/* Validation Results */}
              {predictionValidation && (
                <Card className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    {predictionValidation.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    Validation Results
                  </h4>
                  {predictionValidation.validation && (
                    <div className="space-y-2 text-sm">
                      <p>
                        Valid files:{" "}
                        {predictionValidation.validation.summary?.validFiles ||
                          0}
                      </p>
                      <p>
                        Total lines:{" "}
                        {predictionValidation.validation.summary?.totalLines ||
                          0}
                      </p>
                      <p>
                        Estimated errors:{" "}
                        {predictionValidation.validation.summary
                          ?.estimatedErrors || 0}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {predictionValidation.recommendation}
                  </p>
                </Card>
              )}

              {/* Training Results */}
              {predictionResult && (
                <Card className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    {predictionResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    Training Results
                  </h4>
                  <p className="text-sm mb-3">{predictionResult.message}</p>

                  {predictionResult.metrics && (
                    <div className="grid grid-cols-2 gap-4">
                      {formatMetrics(predictionResult.metrics).map((metric) => (
                        <div key={metric.name} className="text-sm">
                          <span className="text-muted-foreground">
                            {metric.name}:
                          </span>
                          <span className="ml-2 font-medium">
                            {metric.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suggestion Model Tab */}
        <TabsContent value="suggestion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Suggestion Model Training
              </CardTitle>
              <CardDescription>
                Train from Excel data to provide actionable resolution steps and
                suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="suggestion-excel">Excel File Path</Label>
                <Input
                  id="suggestion-excel"
                  type="text"
                  placeholder="/path/to/error-resolutions.xlsx"
                  value={suggestionExcelFile}
                  onChange={(e) => setSuggestionExcelFile(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={validateSuggestionExcel} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Validate Excel
                </Button>
                <Button
                  onClick={trainSuggestionModel}
                  disabled={isLoading || !suggestionExcelFile.trim()}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Train Suggestion Model
                </Button>
              </div>

              {/* Validation Results */}
              {suggestionValidation && (
                <Card className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    {suggestionValidation.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    Validation Results
                  </h4>
                  {suggestionValidation.validation && (
                    <div className="space-y-2 text-sm">
                      <p>
                        Total rows:{" "}
                        {suggestionValidation.validation.totalRows || 0}
                      </p>
                      <p>
                        Columns:{" "}
                        {suggestionValidation.validation.columns?.length || 0}
                      </p>
                      <p>
                        Has error column:{" "}
                        {suggestionValidation.validation.hasErrorColumn
                          ? "Yes"
                          : "No"}
                      </p>
                      <p>
                        Has resolution column:{" "}
                        {suggestionValidation.validation.hasResolutionColumn
                          ? "Yes"
                          : "No"}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {suggestionValidation.recommendation}
                  </p>
                </Card>
              )}

              {/* Training Results */}
              {suggestionResult && (
                <Card className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    {suggestionResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    Training Results
                  </h4>
                  <p className="text-sm mb-3">{suggestionResult.message}</p>

                  {suggestionResult.metrics && (
                    <div className="grid grid-cols-2 gap-4">
                      {formatMetrics(suggestionResult.metrics).map((metric) => (
                        <div key={metric.name} className="text-sm">
                          <span className="text-muted-foreground">
                            {metric.name}:
                          </span>
                          <span className="ml-2 font-medium">
                            {metric.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suggestion Model Training Results Modal */}
      <Dialog
        open={showSuggestionResultModal}
        onOpenChange={setShowSuggestionResultModal}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Suggestion Model Training Results
            </DialogTitle>
            <DialogDescription>
              Training completed with the following metrics and insights
            </DialogDescription>
          </DialogHeader>

          {suggestionResult && (
            <div className="space-y-6">
              {/* Training Status */}
              <div className="flex items-center gap-2">
                {suggestionResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {suggestionResult.success
                    ? "Training Successful"
                    : "Training Failed"}
                </span>
              </div>

              {/* Message */}
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">{suggestionResult.message}</p>
              </div>

              {/* Training Results */}
              {suggestionResult.results && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Training Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Model Accuracy:
                        </span>
                        <span className="font-medium">
                          {(suggestionResult.results.accuracy * 100).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Relevance Score:
                        </span>
                        <span className="font-medium">
                          {(
                            suggestionResult.results.relevanceScore * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Completeness:
                        </span>
                        <span className="font-medium">
                          {(
                            suggestionResult.results.completenessScore * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Usability Score:
                        </span>
                        <span className="font-medium">
                          {(
                            suggestionResult.results.usabilityScore * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Suggestions Generated:
                        </span>
                        <span className="font-medium">
                          {suggestionResult.results.suggestionCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Training Data Size:
                        </span>
                        <span className="font-medium">
                          {suggestionResult.results.trainingDataSize} samples
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Category Distribution */}
                  {suggestionResult.results.categoryDistribution && (
                    <div className="space-y-2">
                      <h5 className="font-medium">Category Distribution</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(
                          suggestionResult.results.categoryDistribution
                        ).map(([category, count]) => (
                          <div
                            key={category}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              {category}:
                            </span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSuggestionResultModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowSuggestionResultModal(false);
                    loadCurrentModels();
                  }}
                >
                  View Models
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedMLTrainingDashboard;
