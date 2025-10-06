import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AdaptiveLayout from "@/components/adaptive-layout";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Brain,
  Zap,
  Eye,
  BarChart3,
  Bot,
  Activity,
} from "lucide-react";
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";

interface UploadFile {
  id: string;
  file: File;
  status:
    | "pending"
    | "uploading"
    | "analyzing"
    | "ai-processing"
    | "completed"
    | "error";
  progress: number;
  error?: string;
  result?: {
    fileId: number;
    errors: number;
    aiAnalysis?: {
      severity_distribution: Record<string, number>;
      risk_assessment: string;
      recommendations: string[];
      anomaly_score: number;
    };
    realTimeInsights?: {
      error_types: string[];
      critical_count: number;
      predicted_issues: string[];
    };
  };
}

interface AIProcessingOptions {
  enableRealTimeAnalysis: boolean;
  enableAnomalyDetection: boolean;
  enableSemanticSearch: boolean;
  enableEntityExtraction: boolean;
  generateSummary: boolean;
}

export default function EnhancedUploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [aiOptions, setAIOptions] = useState<AIProcessingOptions>({
    enableRealTimeAnalysis: true,
    enableAnomalyDetection: true,
    enableSemanticSearch: false,
    enableEntityExtraction: false,
    generateSummary: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt", ".log"],
      "application/json": [".json"],
      "application/xml": [".xml"],
      "text/yaml": [".yaml", ".yml"],
      "text/csv": [".csv"],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const uploadMutation = useMutation({
    mutationFn: async (fileData: UploadFile) => {
      const formData = new FormData();
      formData.append("file", fileData.file);
      formData.append("aiOptions", JSON.stringify(aiOptions));

      return await authenticatedRequest("POST", "/api/files/upload", formData);
    },
    onSuccess: (data, variables) => {
      // Update file status to analyzing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === variables.id
            ? { ...f, status: "analyzing", progress: 50 }
            : f
        )
      );

      // Start AI analysis if enabled
      if (aiOptions.enableRealTimeAnalysis) {
        performAIAnalysis(variables.id, data.fileId);
      } else {
        // Mark as completed if no AI analysis
        setFiles((prev) =>
          prev.map((f) =>
            f.id === variables.id
              ? { ...f, status: "completed", progress: 100, result: data }
              : f
          )
        );
      }

      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Upload Successful",
        description: `File uploaded successfully. ${data.errors} errors detected.`,
      });
    },
    onError: (error: any, variables) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === variables.id
            ? { ...f, status: "error", error: error.message || "Upload failed" }
            : f
        )
      );
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const aiAnalysisMutation = useMutation({
    mutationFn: async ({
      fileId,
      errors,
    }: {
      fileId: number;
      errors: string[];
    }) => {
      const analysisPromises = [];

      // Enterprise analysis
      if (
        aiOptions.enableRealTimeAnalysis ||
        aiOptions.enableAnomalyDetection
      ) {
        analysisPromises.push(
          authenticatedRequest("/api/ai/analyze/enterprise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              errors: errors.slice(0, 100), // Limit for performance
              analysis_type: "quick",
              include_predictions: true,
              include_anomalies: aiOptions.enableAnomalyDetection,
            }),
          })
        );
      }

      // Summary generation
      if (aiOptions.generateSummary) {
        analysisPromises.push(
          authenticatedRequest("/api/ai/summarize/errors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              errors: errors.slice(0, 50),
              focus: "technical",
            }),
          })
        );
      }

      const results = await Promise.allSettled(analysisPromises);
      return results;
    },
  });

  const performAIAnalysis = async (fileId: string, uploadedFileId: number) => {
    // Update status to AI processing
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: "ai-processing", progress: 75 } : f
      )
    );

    try {
      // Get errors from the uploaded file
      const errorsResponse = await authenticatedRequest(
        `/api/errors?fileId=${uploadedFileId}`
      );
      const errors = errorsResponse.errors?.map((e: any) => e.message) || [];

      if (errors.length > 0) {
        const aiResults = await aiAnalysisMutation.mutateAsync({
          fileId: uploadedFileId,
          errors,
        });

        // Process AI results
        let aiAnalysis = {};
        let realTimeInsights = {};

        aiResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            if (index === 0 && result.value.analysis) {
              // Enterprise analysis results
              aiAnalysis = {
                severity_distribution:
                  result.value.analysis.severity_distribution,
                risk_assessment: result.value.analysis.risk_assessment,
                recommendations: result.value.analysis.recommendations,
                anomaly_score: result.value.analysis.anomaly_score,
              };

              realTimeInsights = {
                error_types: Object.keys(
                  result.value.analysis.category_distribution
                ),
                critical_count:
                  result.value.analysis.severity_distribution?.critical || 0,
                predicted_issues:
                  result.value.analysis.recommendations?.slice(0, 3) || [],
              };
            }
          }
        });

        // Update file with AI results
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  result: {
                    fileId: uploadedFileId,
                    errors: errors.length,
                    aiAnalysis,
                    realTimeInsights,
                  },
                }
              : f
          )
        );

        toast({
          title: "AI Analysis Complete",
          description: "Advanced AI analysis completed successfully.",
        });
      } else {
        // No errors found, mark as completed
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, status: "completed", progress: 100 } : f
          )
        );
      }
    } catch (error: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                error: `AI analysis failed: ${error.message}`,
              }
            : f
        )
      );

      toast({
        title: "AI Analysis Failed",
        description: error.message || "Failed to perform AI analysis",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async (file: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === file.id ? { ...f, status: "uploading", progress: 25 } : f
      )
    );

    uploadMutation.mutate(file);
  };

  const handleUploadAll = () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    pendingFiles.forEach(handleUpload);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "analyzing":
        return <Activity className="w-4 h-4 text-blue-500" />;
      case "ai-processing":
        return <Brain className="w-4 h-4 text-purple-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: UploadFile["status"]) => {
    switch (status) {
      case "uploading":
        return "Uploading...";
      case "analyzing":
        return "Analyzing errors...";
      case "ai-processing":
        return "AI processing...";
      case "completed":
        return "Complete";
      case "error":
        return "Error";
      default:
        return "Pending";
    }
  };

  return (
    <AdaptiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Enhanced File Upload
            </h1>
            <p className="text-muted-foreground">
              Upload error logs with AI-powered analysis and real-time insights
            </p>
          </div>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Bot className="w-4 h-4" />
            <span>AI Enhanced</span>
          </Badge>
        </div>

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upload">File Upload</TabsTrigger>
            <TabsTrigger value="ai-settings">AI Settings</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            {/* Drop Zone */}
            <Card>
              <CardContent className="p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      {isDragActive ? "Drop files here" : "Upload error logs"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Drag & drop files or click to browse. Supports{" "}
                      {Object.values(SUPPORTED_FILE_TYPES).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Maximum file size:{" "}
                      {(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File List */}
            {files.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Upload Queue</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handleUploadAll}
                      disabled={
                        !files.some((f) => f.status === "pending") ||
                        uploadMutation.isPending
                      }
                      size="sm"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {files.map((file) => (
                    <div key={file.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(file.status)}
                          <div>
                            <p className="font-medium">{file.file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.file.size / 1024).toFixed(1)} KB •{" "}
                              {getStatusText(file.status)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {file.status === "pending" && (
                            <Button
                              onClick={() => handleUpload(file)}
                              disabled={uploadMutation.isPending}
                              size="sm"
                              variant="outline"
                            >
                              Upload
                            </Button>
                          )}
                          <Button
                            onClick={() => removeFile(file.id)}
                            size="sm"
                            variant="ghost"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {(file.status === "uploading" ||
                        file.status === "analyzing" ||
                        file.status === "ai-processing") && (
                        <Progress value={file.progress} className="w-full" />
                      )}

                      {file.error && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{file.error}</AlertDescription>
                        </Alert>
                      )}

                      {file.result && (
                        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold">
                                {file.result.errors}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Errors Found
                              </p>
                            </div>
                            {file.result.realTimeInsights && (
                              <>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-red-500">
                                    {
                                      file.result.realTimeInsights
                                        .critical_count
                                    }
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Critical
                                  </p>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold">
                                    {
                                      file.result.realTimeInsights.error_types
                                        .length
                                    }
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Error Types
                                  </p>
                                </div>
                              </>
                            )}
                            {file.result.aiAnalysis && (
                              <div className="text-center">
                                <div className="text-2xl font-bold">
                                  {Math.round(
                                    (file.result.aiAnalysis.anomaly_score ||
                                      0) * 100
                                  )}
                                  %
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Anomaly Score
                                </p>
                              </div>
                            )}
                          </div>

                          {file.result.aiAnalysis && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  Risk Assessment:
                                </span>
                                <Badge
                                  variant={
                                    file.result.aiAnalysis.risk_assessment
                                      ?.toLowerCase()
                                      .includes("high")
                                      ? "destructive"
                                      : file.result.aiAnalysis.risk_assessment
                                          ?.toLowerCase()
                                          .includes("medium")
                                      ? "secondary"
                                      : "default"
                                  }
                                >
                                  {file.result.aiAnalysis.risk_assessment}
                                </Badge>
                              </div>

                              {file.result.aiAnalysis.recommendations &&
                                file.result.aiAnalysis.recommendations.length >
                                  0 && (
                                  <div>
                                    <p className="text-sm font-medium mb-1">
                                      AI Recommendations:
                                    </p>
                                    <div className="space-y-1">
                                      {file.result.aiAnalysis.recommendations
                                        .slice(0, 2)
                                        .map((rec: string, index: number) => (
                                          <Alert key={index} className="py-2">
                                            <AlertDescription className="text-xs">
                                              {rec}
                                            </AlertDescription>
                                          </Alert>
                                        ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Settings Tab */}
          <TabsContent value="ai-settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>AI Processing Options</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="real-time-analysis"
                          className="font-medium"
                        >
                          Real-time Analysis
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Analyze errors immediately after upload
                        </p>
                      </div>
                      <Switch
                        id="real-time-analysis"
                        checked={aiOptions.enableRealTimeAnalysis}
                        onCheckedChange={(checked) =>
                          setAIOptions((prev) => ({
                            ...prev,
                            enableRealTimeAnalysis: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="anomaly-detection"
                          className="font-medium"
                        >
                          Anomaly Detection
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Detect unusual error patterns
                        </p>
                      </div>
                      <Switch
                        id="anomaly-detection"
                        checked={aiOptions.enableAnomalyDetection}
                        onCheckedChange={(checked) =>
                          setAIOptions((prev) => ({
                            ...prev,
                            enableAnomalyDetection: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="generate-summary"
                          className="font-medium"
                        >
                          Generate Summary
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Create AI-powered error summaries
                        </p>
                      </div>
                      <Switch
                        id="generate-summary"
                        checked={aiOptions.generateSummary}
                        onCheckedChange={(checked) =>
                          setAIOptions((prev) => ({
                            ...prev,
                            generateSummary: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="semantic-search"
                          className="font-medium"
                        >
                          Semantic Search
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Enable vector-based error similarity search
                        </p>
                      </div>
                      <Switch
                        id="semantic-search"
                        checked={aiOptions.enableSemanticSearch}
                        onCheckedChange={(checked) =>
                          setAIOptions((prev) => ({
                            ...prev,
                            enableSemanticSearch: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="entity-extraction"
                          className="font-medium"
                        >
                          Entity Extraction
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Extract technical entities from errors
                        </p>
                      </div>
                      <Switch
                        id="entity-extraction"
                        checked={aiOptions.enableEntityExtraction}
                        onCheckedChange={(checked) =>
                          setAIOptions((prev) => ({
                            ...prev,
                            enableEntityExtraction: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    AI processing options affect upload time and analysis depth.
                    Real-time analysis provides immediate insights but may slow
                    down the upload process.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdaptiveLayout>
  );
}
