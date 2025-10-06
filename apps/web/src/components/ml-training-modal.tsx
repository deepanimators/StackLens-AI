import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  X,
  Brain,
  Activity,
  TrendingUp,
  Target,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Play,
  Square,
  Download,
  RefreshCw,
  Zap,
} from "lucide-react";

interface MLTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MLMetrics {
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

interface TrainingStatus {
  isTraining: boolean;
  progress: number;
  currentStep: string;
  logs: Array<{
    timestamp: string;
    message: string;
    level: "info" | "warn" | "error";
  }>;
  metrics?: MLMetrics;
  sessionId?: string;
}

export default function MLTrainingModal({
  isOpen,
  onClose,
}: MLTrainingModalProps) {
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    isTraining: false,
    progress: 0,
    currentStep: "Ready to start training",
    logs: [],
  });
  const [activeTab, setActiveTab] = useState("training");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch ML status
  const { data: mlStatus } = useQuery({
    queryKey: ["/api/ml/status"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/ml/status");
      return response.json();
    },
    enabled: isOpen,
  });

  // Fetch training progress
  const { data: sessionProgress } = useQuery({
    queryKey: ["/api/ml/training-progress", trainingStatus.sessionId],
    queryFn: async () => {
      if (!trainingStatus.sessionId) return null;
      const response = await authenticatedRequest(
        "GET",
        `/api/ml/training-progress/${trainingStatus.sessionId}`
      );
      return response.json();
    },
    enabled: !!trainingStatus.sessionId && trainingStatus.isTraining,
    refetchInterval: 1000, // Poll every second during training
  });

  // Update training status when session progress changes
  useEffect(() => {
    if (sessionProgress) {
      setTrainingStatus((prev) => ({
        ...prev,
        progress: sessionProgress.progress,
        currentStep: sessionProgress.currentStep,
        logs: sessionProgress.logs,
        isTraining:
          sessionProgress.status === "running" ||
          sessionProgress.status === "starting",
        metrics: sessionProgress.metrics,
      }));

      // Handle completion
      if (sessionProgress.status === "completed") {
        queryClient.invalidateQueries({ queryKey: ["/api/ml/status"] });
        toast({
          title: "Success",
          description: `Model training completed! Accuracy: ${(
            sessionProgress.metrics?.accuracy * 100
          ).toFixed(1)}%`,
        });
      } else if (sessionProgress.status === "failed") {
        toast({
          title: "Error",
          description: "Model training failed",
          variant: "destructive",
        });
      }
    }
  }, [sessionProgress, queryClient, toast]);

  // Training mutation
  const trainModelMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedRequest("POST", "/api/ml/train", {
        body: JSON.stringify({
          modelName: `StackLens-Model-${
            new Date().toISOString().split("T")[0]
          }`,
          description: "AI-powered error classification model for log analysis",
        }),
        headers: { "Content-Type": "application/json" },
      });
      return response.json();
    },
    onSuccess: (response: any) => {
      setTrainingStatus((prev) => ({
        ...prev,
        isTraining: true,
        progress: 0,
        currentStep: "Training started...",
        sessionId: response.sessionId,
        logs: [
          {
            timestamp: new Date().toISOString(),
            message: "Training session started",
            level: "info",
          },
        ],
      }));
    },
    onError: (error) => {
      setTrainingStatus((prev) => ({
        ...prev,
        isTraining: false,
        currentStep: "Training failed to start",
        logs: [
          ...prev.logs,
          {
            timestamp: new Date().toISOString(),
            message: `Error: ${error.message}`,
            level: "error",
          },
        ],
      }));

      toast({
        title: "Error",
        description: "Failed to start model training",
        variant: "destructive",
      });
    },
  });

  const handleStartTraining = async () => {
    setTrainingStatus({
      isTraining: false,
      progress: 0,
      currentStep: "Initializing training...",
      logs: [
        {
          timestamp: new Date().toISOString(),
          message: "Initializing training...",
          level: "info",
        },
      ],
    });

    try {
      await trainModelMutation.mutateAsync();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleStopTraining = () => {
    setTrainingStatus((prev) => ({
      ...prev,
      isTraining: false,
      currentStep: "Training stopped by user",
      logs: [
        ...prev.logs,
        {
          timestamp: new Date().toISOString(),
          message: "Training stopped by user",
          level: "warn",
        },
      ],
    }));
  };

  const handleExportModel = async () => {
    try {
      const response = await authenticatedRequest("GET", "/api/ml/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ml-model.json";
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Model exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export model",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>ML Model Training</span>
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="training">Training</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="status">Model Status</TabsTrigger>
            </TabsList>

            <TabsContent value="training" className="space-y-6">
              {/* Training Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Training Controls</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">Model Training</p>
                      <p className="text-sm text-muted-foreground">
                        Train the ML model on your error data
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {trainingStatus.isTraining ? (
                        <Button
                          variant="outline"
                          onClick={handleStopTraining}
                          className="flex items-center space-x-2"
                        >
                          <Square className="h-4 w-4" />
                          <span>Stop Training</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={handleStartTraining}
                          disabled={trainModelMutation.isPending}
                          className="flex items-center space-x-2"
                        >
                          <Play className="h-4 w-4" />
                          <span>Start Training</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Training Progress */}
                  {(trainingStatus.isTraining ||
                    trainingStatus.progress > 0) && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            Training Progress
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {trainingStatus.progress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={trainingStatus.progress}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Current Step</p>
                        <p className="text-sm text-muted-foreground">
                          {trainingStatus.currentStep}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Training Log */}
              {trainingStatus.logs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Training Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-900 text-slate-100 rounded-lg p-4 h-48 overflow-y-auto font-mono text-sm">
                      {trainingStatus.logs.map((log, index) => (
                        <div key={index} className="mb-1 flex">
                          <span className="text-slate-400 mr-2">
                            {typeof log === "string"
                              ? new Date().toLocaleTimeString()
                              : new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`mr-2 ${
                              typeof log === "string"
                                ? "text-blue-400"
                                : log.level === "error"
                                ? "text-red-400"
                                : log.level === "warn"
                                ? "text-yellow-400"
                                : "text-blue-400"
                            }`}
                          >
                            [
                            {typeof log === "string"
                              ? "INFO"
                              : log.level.toUpperCase()}
                            ]
                          </span>
                          <span>
                            {typeof log === "string" ? log : log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Metrics */}
              {trainingStatus.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(trainingStatus.metrics?.accuracy * 100 || 0).toFixed(
                          1
                        )}
                        %
                      </div>
                      <p className="text-sm text-muted-foreground">Accuracy</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {(trainingStatus.metrics?.f1Score * 100 || 0).toFixed(
                          1
                        )}
                        %
                      </div>
                      <p className="text-sm text-muted-foreground">F1 Score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {(trainingStatus.metrics?.precision * 100 || 0).toFixed(
                          1
                        )}
                        %
                      </div>
                      <p className="text-sm text-muted-foreground">Precision</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {(trainingStatus.metrics?.recall * 100 || 0).toFixed(1)}
                        %
                      </div>
                      <p className="text-sm text-muted-foreground">Recall</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="metrics" className="space-y-6">
              {trainingStatus.metrics ? (
                <div className="space-y-6">
                  {/* Performance Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>Performance Metrics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">
                            {(
                              trainingStatus.metrics?.accuracy * 100 || 0
                            ).toFixed(1)}
                            %
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Accuracy
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">
                            {(
                              trainingStatus.metrics?.precision * 100 || 0
                            ).toFixed(1)}
                            %
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Precision
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600">
                            {(
                              trainingStatus.metrics?.recall * 100 || 0
                            ).toFixed(1)}
                            %
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Recall
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-orange-600">
                            {(
                              trainingStatus.metrics?.f1Score * 100 || 0
                            ).toFixed(1)}
                            %
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            F1 Score
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cross-Validation */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Cross-Validation Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-xl font-bold">
                            {(
                              trainingStatus.metrics?.cv_mean_score * 100 || 0
                            ).toFixed(1)}
                            %
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Mean Score
                          </p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-xl font-bold">
                            ±
                            {(
                              trainingStatus.metrics?.cv_std_score * 100 || 0
                            ).toFixed(1)}
                            %
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Std Deviation
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Features */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {trainingStatus.metrics.top_features?.map(
                          (feature, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="justify-center"
                            >
                              {feature}
                            </Badge>
                          )
                        ) || (
                          <div className="col-span-full text-center text-muted-foreground">
                            No features data available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Class Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Class Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {trainingStatus.metrics?.class_metrics &&
                        Object.keys(trainingStatus.metrics.class_metrics)
                          .length > 0 ? (
                          Object.entries(
                            trainingStatus.metrics.class_metrics
                          ).map(([className, metrics]: [string, any]) => (
                            <div
                              key={className}
                              className="border rounded-lg p-4"
                            >
                              <h4 className="font-medium mb-3 capitalize">
                                {className}
                              </h4>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">
                                    Precision
                                  </p>
                                  <p className="font-medium">
                                    {(metrics.precision * 100).toFixed(1)}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    Recall
                                  </p>
                                  <p className="font-medium">
                                    {(metrics.recall * 100).toFixed(1)}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">
                                    F1 Score
                                  </p>
                                  <p className="font-medium">
                                    {(metrics.f1_score * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">
                              No class metrics available
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">
                    No Metrics Available
                  </h3>
                  <p className="text-muted-foreground">
                    Train the model to see performance metrics
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="status" className="space-y-6">
              {/* Current Model Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Current Model Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        {mlStatus?.trained ? "Trained" : "Not Trained"}
                      </div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      {mlStatus?.trained && (
                        <CheckCircle className="h-6 w-6 text-green-600 mx-auto mt-2" />
                      )}
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        {mlStatus?.accuracy
                          ? `${(mlStatus.accuracy * 100).toFixed(1)}%`
                          : "N/A"}
                      </div>
                      <p className="text-sm text-muted-foreground">Accuracy</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        {mlStatus?.trainingDataSize || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Training Samples
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Model Info */}
              {mlStatus?.activeModel && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Active Model Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Model Name
                        </p>
                        <p className="font-medium">
                          {mlStatus.activeModel.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Version</p>
                        <p className="font-medium">
                          {mlStatus.activeModel.version}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Accuracy
                        </p>
                        <p className="font-medium">
                          {(mlStatus.activeModel.accuracy * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Trained At
                        </p>
                        <p className="font-medium">
                          {new Date(
                            mlStatus.activeModel.trainedAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Model Requirements */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Training Requirements:</strong> At least 10 error
                  samples are required to train the model. More diverse error
                  types will improve model accuracy.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex justify-between">
            <div className="flex items-center space-x-2">
              {trainingStatus.metrics && (
                <Button variant="outline" onClick={handleExportModel}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Model
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={trainingStatus.isTraining}
              >
                {trainingStatus.isTraining
                  ? "Training in Progress..."
                  : "Close"}
              </Button>
              {trainingStatus.metrics && (
                <Button onClick={onClose}>
                  <Zap className="h-4 w-4 mr-2" />
                  Deploy Model
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
