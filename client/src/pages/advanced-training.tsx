import React, { useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdaptiveLayout from "@/components/adaptive-layout";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Zap,
  Target,
  BarChart3,
  RefreshCw,
  Eye,
  Download,
} from "lucide-react";

interface TrainingSummary {
  excelRecords: number;
  existingPatterns: number;
  totalTrainingData: number;
  sampleData: any[];
  excelFiles: { file: string; exists: boolean }[];
}

interface TrainingResults {
  modelAccuracy: number;
  trainingRecords: number;
  patternsLearned: number;
  recommendations: string[];
}

interface PatternMetric {
  pattern: string;
  frequency: number;
  severity: string;
  trend: "increasing" | "decreasing" | "stable";
  firstSeen: string;
  lastSeen: string;
  averageResolutionTime: number;
  successRate: number;
  relatedPatterns: string[];
}

interface TrendAnalysis {
  timeframe: string;
  errorTrends: {
    category: string;
    trend: "up" | "down" | "stable";
    changePercent: number;
    volume: number;
  }[];
  patternEvolution: {
    pattern: string;
    evolution: "emerging" | "declining" | "persistent";
    riskLevel: "low" | "medium" | "high" | "critical";
  }[];
  recommendations: string[];
}

interface AdvancedAnalysis {
  patterns: PatternMetric[];
  trends: TrendAnalysis;
  insights: string[];
}

export default function AdvancedTrainingPage() {
  const [isTraining, setIsTraining] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch training summary
  const { data: trainingSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/ml/training-summary"],
    queryFn: async (): Promise<TrainingSummary> => {
      const response = await authenticatedRequest(
        "GET",
        "/api/ml/training-summary"
      );
      const data = await response.json();
      return data.summary;
    },
  });

  // Fetch advanced pattern analysis
  const {
    data: advancedAnalysis,
    isLoading: analysisLoading,
    refetch: refetchAnalysis,
  } = useQuery({
    queryKey: [
      `/api/analysis/advanced-patterns${
        selectedFileId ? `/${selectedFileId}` : ""
      }`,
    ],
    queryFn: async (): Promise<AdvancedAnalysis> => {
      const endpoint = selectedFileId
        ? `/api/analysis/advanced-patterns/${selectedFileId}`
        : "/api/analysis/advanced-patterns";
      const response = await authenticatedRequest("GET", endpoint);
      const data = await response.json();
      return data.analysis;
    },
    enabled: true,
  });

  // Train model mutation
  const trainModelMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedRequest(
        "POST",
        "/api/ml/train-from-excel",
        {}
      );
      return response.json();
    },
    onSuccess: (data) => {
      setIsTraining(false);
      queryClient.invalidateQueries({ queryKey: ["/api/ml/training-summary"] });
      toast({
        title: "Training Completed",
        description: `Model trained with ${
          data.results.trainingRecords
        } records. Accuracy: ${(data.results.modelAccuracy * 100).toFixed(1)}%`,
      });
    },
    onError: (error) => {
      setIsTraining(false);
      toast({
        title: "Training Failed",
        description:
          "Failed to train the model. Please check the training data.",
        variant: "destructive",
      });
    },
  });

  const handleTrainModel = () => {
    setIsTraining(true);
    trainModelMutation.mutate();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "down":
      case "decreasing":
        return <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />;
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return "text-red-600 bg-red-50";
      case "high":
        return "text-orange-600 bg-orange-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <AdaptiveLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Advanced Training & Pattern Analysis
            </h1>
            <p className="text-muted-foreground mt-2">
              Train AI models with Excel data and perform advanced pattern
              recognition
            </p>
          </div>
          <Button
            onClick={() => refetchAnalysis()}
            variant="outline"
            disabled={analysisLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                analysisLoading ? "animate-spin" : ""
              }`}
            />
            Refresh Analysis
          </Button>
        </div>

        <Tabs defaultValue="training" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="training">Model Training</TabsTrigger>
            <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
            <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          </TabsList>

          {/* Model Training Tab */}
          <TabsContent value="training" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Training Data Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Training Data Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {summaryLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ) : trainingSummary ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {trainingSummary.excelRecords}
                          </div>
                          <div className="text-sm text-blue-800">
                            Excel Records
                          </div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {trainingSummary.existingPatterns}
                          </div>
                          <div className="text-sm text-green-800">
                            Existing Patterns
                          </div>
                        </div>
                      </div>

                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-3xl font-bold text-purple-600">
                          {trainingSummary.totalTrainingData}
                        </div>
                        <div className="text-sm text-purple-800">
                          Total Training Records
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold">Excel Files Status:</h4>
                        {trainingSummary.excelFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <span className="text-sm truncate">
                              {file.file.split("/").pop()}
                            </span>
                            <Badge
                              variant={file.exists ? "default" : "destructive"}
                            >
                              {file.exists ? "Available" : "Missing"}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {trainingSummary.sampleData.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold">
                            Sample Training Data:
                          </h4>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {trainingSummary.sampleData
                              .slice(0, 3)
                              .map((sample, index) => (
                                <div
                                  key={index}
                                  className="p-2 bg-gray-50 rounded text-xs"
                                >
                                  <div className="font-medium">
                                    {sample.errorType}
                                  </div>
                                  <div className="text-gray-600 truncate">
                                    {sample.errorMessage}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Unable to load training data summary
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Training Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Model Training
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Training Process
                      </h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>
                          • Load Excel training data (Column D: Errors, Column
                          F: Suggestions)
                        </li>
                        <li>• Merge with existing error patterns</li>
                        <li>• Create training vectors and features</li>
                        <li>• Train advanced suggestion model</li>
                        <li>• Validate and save improved patterns</li>
                      </ul>
                    </div>

                    {isTraining && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">
                            Training in progress...
                          </span>
                        </div>
                        <Progress value={undefined} className="h-2" />
                      </div>
                    )}

                    <Button
                      onClick={handleTrainModel}
                      disabled={isTraining || summaryLoading}
                      className="w-full"
                      size="lg"
                    >
                      {isTraining ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Training Model...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Train Advanced Model
                        </>
                      )}
                    </Button>

                    {trainModelMutation.data && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <div>
                              <strong>Training Completed!</strong>
                            </div>
                            <div>
                              Accuracy:{" "}
                              {(
                                trainModelMutation.data.results.modelAccuracy *
                                100
                              ).toFixed(1)}
                              %
                            </div>
                            <div>
                              Records:{" "}
                              {trainModelMutation.data.results.trainingRecords}
                            </div>
                            <div>
                              Patterns:{" "}
                              {trainModelMutation.data.results.patternsLearned}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pattern Analysis Tab */}
          <TabsContent value="patterns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Advanced Pattern Recognition
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span>Analyzing patterns...</span>
                  </div>
                ) : advancedAnalysis?.patterns ? (
                  <div className="space-y-4">
                    {/* Pattern Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {advancedAnalysis.patterns
                        .slice(0, 6)
                        .map((pattern, index) => (
                          <Card
                            key={index}
                            className="border-l-4 border-l-blue-500"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <Badge
                                  className={getSeverityColor(pattern.severity)}
                                >
                                  {pattern.severity}
                                </Badge>
                                {getTrendIcon(pattern.trend)}
                              </div>
                              <h4 className="font-semibold text-sm mb-2 truncate">
                                {pattern.pattern}
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <div>Frequency: {pattern.frequency}</div>
                                <div>
                                  Success: {pattern.successRate.toFixed(1)}%
                                </div>
                                <div>
                                  Avg Resolution:{" "}
                                  {pattern.averageResolutionTime.toFixed(0)}m
                                </div>
                                <div>Trend: {pattern.trend}</div>
                              </div>
                              {pattern.relatedPatterns.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs text-muted-foreground">
                                    Related:
                                  </div>
                                  <div className="text-xs text-blue-600 truncate">
                                    {pattern.relatedPatterns.join(", ")}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                    </div>

                    {/* Insights */}
                    {advancedAnalysis.insights.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">
                          Key Insights
                        </h3>
                        <div className="space-y-2">
                          {advancedAnalysis.insights.map((insight, index) => (
                            <Alert key={index}>
                              <Eye className="h-4 w-4" />
                              <AlertDescription>{insight}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No pattern analysis data available. Try uploading log
                      files first.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trend Analysis Tab */}
          <TabsContent value="trends" className="space-y-6">
            {advancedAnalysis?.trends ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Error Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Error Category Trends ({advancedAnalysis.trends.timeframe}
                      )
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Bar
                      data={{
                        labels: advancedAnalysis.trends.errorTrends.map(
                          (t) => t.category
                        ),
                        datasets: [
                          {
                            label: "Error Volume",
                            data: advancedAnalysis.trends.errorTrends.map(
                              (t) => t.volume
                            ),
                            backgroundColor: "rgba(54, 162, 235, 0.6)",
                          },
                          {
                            label: "Change (%)",
                            data: advancedAnalysis.trends.errorTrends.map(
                              (t) => t.changePercent
                            ),
                            backgroundColor: "rgba(255, 99, 132, 0.4)",
                            yAxisID: "y1",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: "top" },
                          title: { display: false },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: { display: true, text: "Volume" },
                          },
                          y1: {
                            beginAtZero: true,
                            position: "right",
                            title: { display: true, text: "Change (%)" },
                            grid: { drawOnChartArea: false },
                          },
                        },
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Pattern Evolution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Pattern Evolution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Line
                      data={{
                        labels: advancedAnalysis.trends.patternEvolution
                          .slice(0, 8)
                          .map((e) => e.pattern),
                        datasets: [
                          {
                            label: "Risk Level",
                            data: advancedAnalysis.trends.patternEvolution
                              .slice(0, 8)
                              .map((e) => {
                                switch (e.riskLevel) {
                                  case "critical":
                                    return 4;
                                  case "high":
                                    return 3;
                                  case "medium":
                                    return 2;
                                  case "low":
                                    return 1;
                                  default:
                                    return 0;
                                }
                              }),
                            borderColor: "rgba(255, 99, 132, 1)",
                            backgroundColor: "rgba(255, 99, 132, 0.2)",
                            tension: 0.3,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: "top" },
                          title: { display: false },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            min: 0,
                            max: 4,
                            ticks: {
                              callback: function (value) {
                                switch (value) {
                                  case 1:
                                    return "Low";
                                  case 2:
                                    return "Medium";
                                  case 3:
                                    return "High";
                                  case 4:
                                    return "Critical";
                                  default:
                                    return "";
                                }
                              },
                            },
                            title: { display: true, text: "Risk Level" },
                          },
                        },
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Trend-Based Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {advancedAnalysis.trends.recommendations.map(
                        (recommendation, index) => (
                          <Alert key={index}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              {recommendation}
                            </AlertDescription>
                          </Alert>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Trend analysis data not available. Analysis may still be
                  processing.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdaptiveLayout>
  );
}
