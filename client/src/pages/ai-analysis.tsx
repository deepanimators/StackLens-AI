import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import AdaptiveLayout from "@/components/adaptive-layout";
import ErrorTable from "@/components/error-table";
import AnalysisModal from "@/components/analysis-modal";
import AISuggestionModal from "@/components/ai-suggestion-modal";
import MLTrainingModal from "@/components/ml-training-modal";
import { authenticatedRequest } from "@/lib/auth";
import {
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Bot,
  Lightbulb,
  Target,
  Activity,
  FileSpreadsheet,
  Settings,
} from "lucide-react";

interface ErrorLog {
  id: number;
  lineNumber: number;
  timestamp: string | null;
  message: string;
  severity: string;
  errorType: string;
  fullText: string;
  resolved: boolean;
  aiSuggestion?: any;
  mlPrediction?: any;
}

interface MLStatus {
  trained: boolean;
  accuracy: number;
  trainingDataSize: number;
  activeModel?: {
    name: string;
    version: string;
    accuracy: number;
    trainedAt: string;
  };
}

interface SuggestionPerformance {
  modelAccuracy: number;
  suggestionCoverage: number;
  totalErrorsProcessed: number;
  errorsWithSuggestions: number;
  isActive: boolean;
  lastTrainingDate: string | null;
  trainingDataSize: number;
  suggestionSuccessRate: number;
  averageResponseTime: string;
  activeModel?: {
    name: string;
    version: string;
    accuracy: number;
    trainedAt: string | null;
  };
}

export default function AIAnalysisPage() {
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showAISuggestionModal, setShowAISuggestionModal] = useState(false);
  const [showMLTrainingModal, setShowMLTrainingModal] = useState(false);
  const [showManualTrainingModal, setShowManualTrainingModal] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<string>("");
  const [trainingMetrics, setTrainingMetrics] = useState<any>(null);

  // Pagination state for consolidated errors
  const [consolidatedCurrentPage, setConsolidatedCurrentPage] = useState(1);
  const [consolidatedItemsPerPage] = useState(10);

  // Fetch all errors with AI suggestions (not just first 100)
  const { data: errors, refetch: refetchErrors } = useQuery({
    queryKey: ["/api/errors/enhanced/all"],
    queryFn: async (): Promise<ErrorLog[]> => {
      let allErrors: ErrorLog[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 1000; // Increased from 100 to 1000 to reduce API calls
      while (hasMore) {
        const response = await authenticatedRequest(
          "GET",
          `/api/errors/enhanced?page=${page}&limit=${pageSize}`
        );
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          allErrors = allErrors.concat(data.data);
          hasMore = data.pagination?.hasNext || false;
          page++;

          // Prevent infinite loops - stop after reasonable number of pages (limit to ~10-20 pages for dashboard)
          if (page > 20) break; // Reduced to show first 20k items max for better performance
        } else {
          hasMore = false;
        }
      }
      console.log(
        `Enhanced errors fetched: ${allErrors.length} errors from ${
          page - 1
        } pages`
      );
      return allErrors;
    },
    staleTime: 5000, // Reduced from 60000ms (60s) to 5000ms (5s) for faster updates
  });

  const { data: consolidatedData, refetch: refetchConsolidated } = useQuery({
    queryKey: ["/api/errors/consolidated/all"],
    queryFn: async () => {
      let allConsolidatedErrors: any[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 500; // Increased from 50 to 500 to reduce API calls
      let totalErrors = 0;

      while (hasMore) {
        const response = await authenticatedRequest(
          "GET",
          `/api/errors/consolidated?page=${page}&limit=${pageSize}`
        );
        const data = await response.json();

        if (data.data && data.data.length > 0) {
          allConsolidatedErrors = allConsolidatedErrors.concat(data.data);
          totalErrors =
            data.totalErrors || data.pagination?.total || totalErrors;
          hasMore = data.pagination?.hasNext || data.hasMore || false;
          page++;

          // Prevent infinite loops - stop after reasonable number of pages (limit to ~10-20 pages for dashboard)
          if (page > 20) break; // Reduced for better performance, shows first 10k consolidated patterns
        } else {
          hasMore = false;
        }
      }

      console.log(
        `Consolidated errors fetched: ${
          allConsolidatedErrors.length
        } consolidated patterns from ${
          page - 1
        } pages, totalErrors: ${totalErrors}`
      );

      return {
        consolidatedErrors: allConsolidatedErrors,
        totalErrors: totalErrors,
      };
    },
    staleTime: 10000, // Cache for 10 seconds
  });

  const { data: mlStatus } = useQuery({
    queryKey: ["/api/ml/status"],
    queryFn: async (): Promise<MLStatus> => {
      const response = await authenticatedRequest("GET", "/api/ml/status");
      return response.json();
    },
  });

  const { data: suggestionPerformance } = useQuery({
    queryKey: ["/api/ai/suggestion-performance"],
    queryFn: async (): Promise<SuggestionPerformance> => {
      const response = await authenticatedRequest(
        "GET",
        "/api/ai/suggestion-performance"
      );
      return response.json();
    },
  });

  const handleViewSuggestion = (error: ErrorLog) => {
    setSelectedError(error);
    setShowAISuggestionModal(true);
  };

  const handleGenerateSuggestion = (error: ErrorLog) => {
    setSelectedError(error);
    setShowAISuggestionModal(true);
  };

  const handleViewDetails = (error: ErrorLog) => {
    setSelectedError(error);
    setShowAnalysisModal(true);
  };

  const handleTrainModel = () => {
    setShowMLTrainingModal(true);
  };

  const handleManualTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingStatus("Initializing training process...");

    try {
      // Step 1: Process Excel training data
      setTrainingStatus("Processing Excel training data...");
      setTrainingProgress(20);

      const processResponse = await authenticatedRequest(
        "POST",
        "/api/ai/process-excel-training"
      );
      if (!processResponse.ok) {
        throw new Error("Failed to process Excel training data");
      }

      const { processedRecords } = await processResponse.json();

      // Step 2: Train the model
      setTrainingStatus("Training ML model with processed data...");
      setTrainingProgress(50);

      const trainResponse = await authenticatedRequest(
        "POST",
        "/api/ai/train-manual",
        {
          useExcelData: true,
        }
      );

      if (!trainResponse.ok) {
        throw new Error("Failed to train model");
      }

      const trainingResult = await trainResponse.json();

      // Step 3: Validate and finalize
      setTrainingStatus("Validating model performance...");
      setTrainingProgress(80);

      // Get updated metrics
      const metricsResponse = await authenticatedRequest(
        "GET",
        "/api/ai/training-metrics"
      );
      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json();
        setTrainingMetrics(metrics);
      }

      setTrainingProgress(100);
      setTrainingStatus("Training completed successfully!");

      // Refresh ML status (remove reference to undefined mlStatusQuery)
      window.location.reload(); // Simple refresh for now

      setTimeout(() => {
        setShowManualTrainingModal(false);
        setIsTraining(false);
        setTrainingProgress(0);
        setTrainingStatus("");
      }, 2000);
    } catch (error: any) {
      console.error("Manual training failed:", error);
      setTrainingStatus(`Training failed: ${error.message}`);
      setIsTraining(false);
    }
  };

  // Use consolidated data from backend instead of client-side grouping
  const consolidatedErrors = consolidatedData?.consolidatedErrors || [];

  // Sorting functions
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

  const sortBySeverityAndDate = (a: ErrorLog, b: ErrorLog) => {
    // First sort by severity (Critical > High > Medium > Low)
    const severityDiff =
      (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
      (severityOrder[a.severity as keyof typeof severityOrder] || 0);
    if (severityDiff !== 0) return severityDiff;

    // Then sort by timestamp (latest first)
    const dateA = new Date(a.timestamp || 0).getTime();
    const dateB = new Date(b.timestamp || 0).getTime();
    return dateB - dateA;
  };

  // Apply sorting to different data sets
  const sortedErrors = [...(errors || [])].sort(sortBySeverityAndDate);
  const sortedAISuggestionErrors = sortedErrors.filter(
    (e) =>
      e.aiSuggestion &&
      ((typeof e.aiSuggestion === "object" && e.aiSuggestion !== null) ||
        (typeof e.aiSuggestion === "string" &&
          e.aiSuggestion !== "null" &&
          e.aiSuggestion !== ""))
  );
  const sortedMLPredictionErrors = sortedErrors.filter(
    (e) =>
      e.mlPrediction &&
      ((typeof e.mlPrediction === "object" && e.mlPrediction !== null) ||
        (typeof e.mlPrediction === "string" &&
          e.mlPrediction !== "null" &&
          e.mlPrediction !== ""))
  );
  const sortedConsolidatedErrors = [...consolidatedErrors].sort(
    (a: any, b: any) => {
      // Sort consolidated errors by severity and latest occurrence
      const severityDiff =
        (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
        (severityOrder[a.severity as keyof typeof severityOrder] || 0);
      if (severityDiff !== 0) return severityDiff;

      const dateA = new Date(a.latestOccurrence || 0).getTime();
      const dateB = new Date(b.latestOccurrence || 0).getTime();
      return dateB - dateA;
    }
  );

  // Pagination for consolidated errors
  const totalConsolidatedErrors = sortedConsolidatedErrors.length;
  const totalConsolidatedPages = Math.ceil(
    totalConsolidatedErrors / consolidatedItemsPerPage
  );
  const startIndex = (consolidatedCurrentPage - 1) * consolidatedItemsPerPage;
  const endIndex = startIndex + consolidatedItemsPerPage;
  const paginatedConsolidatedErrors = sortedConsolidatedErrors.slice(
    startIndex,
    endIndex
  );

  console.log("AI Analysis Debug:", {
    errors: errors?.length || 0,
    consolidatedErrors: consolidatedErrors.length,
    totalErrors: consolidatedData?.totalErrors,
    consolidatedDataRaw: consolidatedData,
    mlStatus,
    firstError: errors?.[0],
    firstConsolidated: consolidatedErrors[0],
  });

  // Calculate total errors properly - use the actual total from server or fallback to loaded errors count
  const calculatedTotalErrors =
    consolidatedData?.totalErrors || errors?.length || 0;

  const aiSuggestionStats = {
    totalErrors: calculatedTotalErrors,
    withAISuggestions: sortedAISuggestionErrors.length || 0,
    withMLPredictions: sortedMLPredictionErrors.length || 0,
    resolvedErrors:
      sortedErrors?.filter((e) => e.resolved === true).length || 0,
  };

  return (
    <AdaptiveLayout
      title="AI Analysis"
      subtitle="Intelligent error analysis and resolution suggestions"
    >
      {/* AI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Errors</p>
                <p className="text-2xl font-bold">
                  {aiSuggestionStats.totalErrors}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Suggestions</p>
                <p className="text-2xl font-bold">
                  {aiSuggestionStats.withAISuggestions}
                </p>
              </div>
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ML Predictions</p>
                <p className="text-2xl font-bold">
                  {aiSuggestionStats.withMLPredictions}
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">
                  {aiSuggestionStats.resolvedErrors}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced ML Training Metrics Dashboard */}
      {trainingMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Excel Training Results & Model Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Training Data Metrics */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Training Data Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Records
                    </span>
                    <span className="font-medium">
                      {trainingMetrics.totalRecords}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Validated
                    </span>
                    <span className="font-medium">
                      {trainingMetrics.validatedRecords}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Avg Confidence
                    </span>
                    <span className="font-medium">
                      {trainingMetrics.avgConfidence &&
                      !isNaN(trainingMetrics.avgConfidence)
                        ? Math.round(trainingMetrics.avgConfidence)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Excel Sources
                    </span>
                    <span className="font-medium">
                      {trainingMetrics.bySource?.excel || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Data Quality
                    </span>
                    <Badge variant="outline" className="text-green-600">
                      {(
                        (trainingMetrics.validatedRecords /
                          trainingMetrics.totalRecords) *
                        100
                      ).toFixed(1)}
                      %
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Model Performance Metrics */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Model Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Accuracy
                    </span>
                    <Badge
                      variant={
                        trainingMetrics.accuracy > 0.9 ? "default" : "secondary"
                      }
                    >
                      {((trainingMetrics.accuracy || 0) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Precision
                    </span>
                    <Badge
                      variant={
                        trainingMetrics.precision > 0.85
                          ? "default"
                          : "secondary"
                      }
                    >
                      {((trainingMetrics.precision || 0) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Recall
                    </span>
                    <Badge
                      variant={
                        trainingMetrics.recall > 0.85 ? "default" : "secondary"
                      }
                    >
                      {((trainingMetrics.recall || 0) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      F1 Score
                    </span>
                    <Badge
                      variant={
                        trainingMetrics.f1Score > 0.85 ? "default" : "secondary"
                      }
                    >
                      {((trainingMetrics.f1Score || 0) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Model Version
                    </span>
                    <span className="font-medium text-xs">
                      {trainingMetrics.modelVersion || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confusion Matrix */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Confusion Matrix</h4>
                {trainingMetrics.confusionMatrix &&
                Array.isArray(trainingMetrics.confusionMatrix) ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-1 text-xs">
                      <div></div>
                      <div className="text-center font-medium">Crit</div>
                      <div className="text-center font-medium">High</div>
                      <div className="text-center font-medium">Med</div>
                      <div className="text-center font-medium">Low</div>
                    </div>
                    {trainingMetrics.confusionMatrix.map(
                      (row: any, i: number) => (
                        <div key={i} className="grid grid-cols-5 gap-1 text-xs">
                          <div className="font-medium">
                            {["Crit", "High", "Med", "Low"][i]}
                          </div>
                          {row.map((value: any, j: number) => (
                            <div
                              key={j}
                              className={`text-center p-1 rounded ${
                                i === j
                                  ? "bg-green-100 text-green-800 font-medium"
                                  : value > 0
                                  ? "bg-red-50 text-red-600"
                                  : "bg-gray-50 text-gray-400"
                              }`}
                            >
                              {value}
                            </div>
                          ))}
                        </div>
                      )
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      Diagonal = Correct predictions, Off-diagonal =
                      Misclassifications
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No confusion matrix available
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Always Visible Suggestion Model Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Suggestion Model Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Model Accuracy</p>
              <div className="text-2xl font-bold text-green-600">
                {suggestionPerformance?.modelAccuracy
                  ? `${(suggestionPerformance.modelAccuracy * 100).toFixed(1)}%`
                  : trainingMetrics?.accuracy
                  ? `${(trainingMetrics.accuracy * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Training Status</p>
              <div className="flex items-center space-x-2">
                <Badge
                  variant={
                    suggestionPerformance?.isActive ? "default" : "secondary"
                  }
                >
                  {suggestionPerformance?.isActive ? "Active" : "Not Trained"}
                </Badge>
                {suggestionPerformance?.isActive && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Training Data</p>
              <div className="text-2xl font-bold">
                {suggestionPerformance?.trainingDataSize ||
                  trainingMetrics?.totalRecords ||
                  0}
              </div>
              <p className="text-xs text-muted-foreground">samples</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <div className="text-sm">
                {suggestionPerformance?.lastTrainingDate
                  ? new Date(
                      suggestionPerformance.lastTrainingDate
                    ).toLocaleDateString()
                  : "Never"}
              </div>
            </div>
          </div>

          {/* Additional Suggestion Metrics */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Suggestion Coverage
              </p>
              <div className="text-lg font-bold">
                {suggestionPerformance?.suggestionCoverage
                  ? `${(suggestionPerformance.suggestionCoverage * 100).toFixed(
                      1
                    )}%`
                  : "N/A"}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Errors with Suggestions
              </p>
              <div className="text-lg font-bold">
                {suggestionPerformance?.errorsWithSuggestions || 0}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Response Time</p>
              <div className="text-lg font-bold">
                {suggestionPerformance?.averageResponseTime || "N/A"}
              </div>
            </div>
          </div>

          {/* Active Suggestion Model Info */}
          {suggestionPerformance?.activeModel && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Active Suggestion Model</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {suggestionPerformance.activeModel.name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">
                    {suggestionPerformance.activeModel.version}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Accuracy</p>
                  <p className="font-medium">
                    {(suggestionPerformance.activeModel.accuracy * 100).toFixed(
                      1
                    )}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trained</p>
                  <p className="font-medium">
                    {suggestionPerformance.activeModel.trainedAt
                      ? new Date(
                          suggestionPerformance.activeModel.trainedAt
                        ).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manual Training Button only for suggestions */}
          <div className="mt-4">
            <Button
              onClick={() => setShowManualTrainingModal(true)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Manual Training</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ML Prediction Model Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>ML Prediction Model Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Prediction Status</p>
              <div className="flex items-center space-x-2">
                <Badge variant={mlStatus?.trained ? "default" : "secondary"}>
                  {mlStatus?.trained ? "Active" : "Not Trained"}
                </Badge>
                {mlStatus?.trained && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Prediction Accuracy
              </p>
              <div className="text-2xl font-bold">
                {mlStatus?.accuracy
                  ? `${(mlStatus.accuracy * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Data Processed</p>
              <div className="text-2xl font-bold">
                {mlStatus?.trainingDataSize || 0} samples
              </div>
            </div>
          </div>

          {mlStatus?.activeModel && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Active Prediction Model</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{mlStatus.activeModel.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">{mlStatus.activeModel.version}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Accuracy</p>
                  <p className="font-medium">
                    {(mlStatus.activeModel.accuracy * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trained</p>
                  <p className="font-medium">
                    {new Date(
                      mlStatus.activeModel.trainedAt
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Train Model Button for ML Predictions */}
          <div className="mt-4">
            <Button
              onClick={handleTrainModel}
              className="flex items-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Train Model</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Tabs */}
      <Tabs defaultValue="consolidated" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consolidated">Consolidated Analysis</TabsTrigger>
          <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
          <TabsTrigger value="predictions">ML Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="consolidated" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consolidated Error Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedConsolidatedErrors.length > 0 ? (
                <div className="space-y-4">
                  {/* Pagination info */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Showing {startIndex + 1}-
                      {Math.min(endIndex, totalConsolidatedErrors)} of{" "}
                      {totalConsolidatedErrors} consolidated errors
                    </span>
                    <span>
                      Page {consolidatedCurrentPage} of {totalConsolidatedPages}
                    </span>
                  </div>

                  {/* Error list */}
                  {paginatedConsolidatedErrors.map((group, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{group.errorType}</h4>
                          <Badge
                            variant="secondary"
                            className={`
                                ${
                                  group.severity === "critical"
                                    ? "bg-red-100 text-red-800"
                                    : ""
                                }
                                ${
                                  group.severity === "high"
                                    ? "bg-orange-100 text-orange-800"
                                    : ""
                                }
                                ${
                                  group.severity === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : ""
                                }
                                ${
                                  group.severity === "low"
                                    ? "bg-green-100 text-green-800"
                                    : ""
                                }
                              `}
                          >
                            {group.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            {group.count} errors
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Latest:{" "}
                            {new Date(
                              group.latestOccurrence
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {group.message.substring(0, 200)}...
                        </p>
                        <div className="flex items-center space-x-2">
                          {group.hasAISuggestion && (
                            <span title="Has AI Suggestion">
                              <Lightbulb className="h-4 w-4 text-yellow-600" />
                            </span>
                          )}
                          {group.hasMLPrediction && (
                            <span title="Has ML Prediction">
                              <Target className="h-4 w-4 text-blue-600" />
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleViewSuggestion(group.examples[0])
                            }
                          >
                            <Bot className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls */}
                  {totalConsolidatedPages > 1 && (
                    <div className="flex items-center justify-between border-t pt-4 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConsolidatedCurrentPage((prev) =>
                            Math.max(1, prev - 1)
                          )
                        }
                        disabled={consolidatedCurrentPage <= 1}
                      >
                        Previous
                      </Button>

                      <div className="flex items-center space-x-2">
                        {Array.from(
                          { length: Math.min(5, totalConsolidatedPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalConsolidatedPages <= 5) {
                              pageNum = i + 1;
                            } else if (consolidatedCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              consolidatedCurrentPage >=
                              totalConsolidatedPages - 2
                            ) {
                              pageNum = totalConsolidatedPages - 4 + i;
                            } else {
                              pageNum = consolidatedCurrentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  consolidatedCurrentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  setConsolidatedCurrentPage(pageNum)
                                }
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConsolidatedCurrentPage((prev) =>
                            Math.min(totalConsolidatedPages, prev + 1)
                          )
                        }
                        disabled={
                          consolidatedCurrentPage >= totalConsolidatedPages
                        }
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">
                    No Errors to Analyze
                  </h3>
                  <p className="text-muted-foreground">
                    Upload some log files to see AI analysis results here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedAISuggestionErrors.length > 0 ? (
                <ErrorTable
                  errors={sortedAISuggestionErrors}
                  onViewDetails={handleViewDetails}
                  onGenerateSuggestion={handleGenerateSuggestion}
                  showLineNumbers={true}
                  showTimestamp={true}
                  showFileName={true}
                />
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">
                    No AI Suggestions Yet
                  </h3>
                  <p className="text-muted-foreground">
                    AI suggestions will appear here as errors are analyzed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ML Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedMLPredictionErrors.length > 0 ? (
                <div className="space-y-4">
                  {sortedMLPredictionErrors.map((error) => (
                    <div key={error.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="secondary"
                            className={`
                                ${
                                  error.severity === "critical"
                                    ? "bg-red-100 text-red-800"
                                    : ""
                                }
                                ${
                                  error.severity === "high"
                                    ? "bg-orange-100 text-orange-800"
                                    : ""
                                }
                                ${
                                  error.severity === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : ""
                                }
                                ${
                                  error.severity === "low"
                                    ? "bg-green-100 text-green-800"
                                    : ""
                                }
                              `}
                          >
                            {error.severity}
                          </Badge>
                          {error.mlPrediction && (
                            <Badge variant="outline">
                              {error.mlPrediction.confidence &&
                              !isNaN(error.mlPrediction.confidence)
                                ? Math.round(
                                    error.mlPrediction.confidence * 100
                                  )
                                : 0}
                              % confidence
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSuggestion(error)}
                        >
                          View Details
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {error.errorType}
                      </p>
                      <p className="text-sm">
                        {error.message.length > 100
                          ? `${error.message.substring(0, 100)}...`
                          : error.message}
                      </p>
                      {error.mlPrediction && (
                        <div className="mt-3 p-3 bg-green-50 rounded">
                          <p className="text-sm font-medium text-green-900">
                            ML Prediction:
                          </p>
                          <p className="text-sm text-green-800">
                            Predicted as {error.mlPrediction.severity} severity
                            with{" "}
                            {error.mlPrediction.confidence &&
                            !isNaN(error.mlPrediction.confidence)
                              ? Math.round(error.mlPrediction.confidence * 100)
                              : 0}
                            % confidence
                          </p>
                          {error.mlPrediction.features &&
                            error.mlPrediction.features.length > 0 && (
                              <p className="text-xs text-green-700 mt-1">
                                Key features:{" "}
                                {error.mlPrediction.features
                                  .slice(0, 3)
                                  .join(", ")}
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">
                    No ML Predictions Yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Train the ML model to see predictions here.
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        // Use consolidated errors for batch prediction
                        const errorsForPrediction = consolidatedErrors
                          .slice(0, 10)
                          .map((error) => ({
                            message:
                              error.message ||
                              error.errorMessage ||
                              "Unknown error",
                            stackTrace:
                              error.stackTrace || error.traceback || "",
                            timestamp:
                              error.latestOccurrence ||
                              new Date().toISOString(),
                            severity: error.severity || "medium",
                            errorType: error.errorType || "Unknown",
                            id: error.id,
                          }));

                        console.log(
                          "Sending batch prediction request:",
                          errorsForPrediction
                        );

                        const response = await authenticatedRequest(
                          "POST",
                          "/api/ml/batch-predict",
                          {
                            errors: errorsForPrediction,
                          }
                        );
                        if (response.ok) {
                          const result = await response.json();
                          console.log("Batch prediction result:", result);

                          // Show success notification instead of reloading
                          alert(
                            `✅ ML Predictions Generated!\n\n` +
                              `📊 Processed: ${
                                result.predictions?.length || 0
                              } errors\n` +
                              `⚡ Processing Time: ${
                                result.processingTime || "N/A"
                              }ms\n` +
                              `🎯 Model Accuracy: ${
                                (result.modelMetrics?.accuracy * 100)?.toFixed(
                                  1
                                ) || "N/A"
                              }%`
                          );

                          // Refresh data without full page reload
                          refetchErrors();
                          refetchConsolidated();
                        } else {
                          console.error(
                            "Batch prediction failed:",
                            response.status,
                            await response.text()
                          );
                        }
                      } catch (error) {
                        console.error("Failed to generate predictions:", error);
                      }
                    }}
                    variant="outline"
                  >
                    Generate ML Predictions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}

      {selectedError && (
        <Dialog
          open={showAISuggestionModal}
          onOpenChange={setShowAISuggestionModal}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>AI Suggestion Details</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedError.aiSuggestion ? (
                <>
                  <Alert>
                    <Bot className="h-4 w-4" />
                    <AlertDescription>
                      AI-powered analysis and resolution suggestions based on
                      error patterns.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Root Cause</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedError.aiSuggestion.rootCause}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Resolution Steps</h4>
                      <ol className="text-sm text-muted-foreground space-y-1">
                        {selectedError.aiSuggestion.resolutionSteps?.map(
                          (step: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">
                                {index + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          )
                        )}
                      </ol>
                    </div>
                    {selectedError.aiSuggestion.codeExample && (
                      <div>
                        <h4 className="font-medium mb-2">Code Example</h4>
                        <div className="bg-muted rounded-lg p-3 font-mono text-sm overflow-x-auto">
                          <pre>{selectedError.aiSuggestion.codeExample}</pre>
                        </div>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium mb-2">Prevention Measures</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {selectedError.aiSuggestion.preventionMeasures?.map(
                          (measure: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-600 mr-2">•</span>
                              <span>{measure}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        Confidence:{" "}
                        {Math.round(
                          (selectedError.aiSuggestion.confidence || 0) *
                            (selectedError.aiSuggestion.confidence <= 1
                              ? 100
                              : 1)
                        )}
                        %
                      </Badge>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No AI suggestions available</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <MLTrainingModal
        isOpen={showMLTrainingModal}
        onClose={() => setShowMLTrainingModal(false)}
      />

      {/* Manual Training Modal */}
      <Dialog
        open={showManualTrainingModal}
        onOpenChange={setShowManualTrainingModal}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Manual Model Training</span>
            </DialogTitle>
            <DialogDescription>
              Train the AI model using Excel training data with manual
              intervention capabilities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isTraining ? (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">
                    Training Features:
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Process Excel training data from attached files</li>
                    <li>• Manual validation and error correction</li>
                    <li>• Real-time accuracy and precision reporting</li>
                    <li>• Model performance optimization</li>
                  </ul>
                </div>

                {trainingMetrics && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-2">
                      Previous Training Results:
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Records: {trainingMetrics.totalRecords}</div>
                      <div>Validated: {trainingMetrics.validatedRecords}</div>
                      <div>
                        Avg Confidence:{" "}
                        {trainingMetrics.avgConfidence &&
                        !isNaN(trainingMetrics.avgConfidence)
                          ? Math.round(trainingMetrics.avgConfidence)
                          : 0}
                        %
                      </div>
                      <div>
                        Sources: {Object.keys(trainingMetrics.bySource).length}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-sm font-medium mb-2">
                    {trainingStatus}
                  </div>
                  <Progress value={trainingProgress} className="w-full" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {trainingProgress}% complete
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!isTraining ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowManualTrainingModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualTraining}
                  className="flex items-center space-x-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Start Training</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" disabled>
                Training in Progress...
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdaptiveLayout>
  );
}
