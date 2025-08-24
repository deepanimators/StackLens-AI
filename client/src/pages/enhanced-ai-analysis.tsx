import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import AdaptiveLayout from "@/components/adaptive-layout";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
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
  Search,
  FileSpreadsheet,
  Settings,
  Cpu,
  Database,
  Network,
  Eye,
  BarChart3,
} from "lucide-react";

interface AIServiceHealth {
  status: boolean;
  response_time: number;
  capabilities: string[];
  version: string;
  last_error?: string;
}

interface AIStatistics {
  total_services: number;
  healthy_services: number;
  capabilities: string[];
  uptime_percentage: number;
  average_response_time: number;
}

interface ComprehensiveAnalysis {
  error_type: string;
  severity: string;
  confidence: number;
  suggested_solution: string;
  pattern_matched?: string;
  similar_errors?: Array<{
    text: string;
    similarity: number;
    error_type: string;
  }>;
  ai_insights?: {
    category: string;
    risk_level: string;
    urgency: string;
    business_impact: string;
  };
  entities?: Array<{
    text: string;
    label: string;
    confidence: number;
  }>;
  ml_predictions?: {
    primary_model: string;
    accuracy: number;
    alternatives: Array<{
      model: string;
      prediction: string;
      confidence: number;
    }>;
  };
}

interface RealTimeMonitoring {
  active_errors: number;
  critical_alerts: number;
  anomalies_detected: number;
  system_health: "healthy" | "warning" | "critical";
  predictions: {
    next_hour_errors: number;
    trend_direction: "increasing" | "decreasing" | "stable";
    risk_factors: string[];
  };
  recommendations: string[];
}

export default function EnhancedAIAnalysisPage() {
  const [analysisText, setAnalysisText] = useState("");
  const [analysisOptions, setAnalysisOptions] = useState({
    includeML: true,
    includeSimilarity: true,
    includeEntities: true,
    includeDeepLearning: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] =
    useState<string>("comprehensive");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AI service health
  const { data: healthData } = useQuery({
    queryKey: ["/api/ai/health"],
    queryFn: () => authenticatedRequest("/api/ai/health"),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch AI statistics
  const { data: statisticsData } = useQuery({
    queryKey: ["/api/ai/statistics"],
    queryFn: () => authenticatedRequest("/api/ai/statistics"),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch real-time monitoring
  const { data: monitoringData } = useQuery({
    queryKey: ["/api/ai/monitoring/realtime"],
    queryFn: () => authenticatedRequest("/api/ai/monitoring/realtime"),
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Comprehensive analysis mutation
  const comprehensiveAnalysisMutation = useMutation({
    mutationFn: (data: {
      text: string;
      context?: string;
      includeML?: boolean;
      includeSimilarity?: boolean;
      includeEntities?: boolean;
    }) =>
      authenticatedRequest("/api/ai/analyze/comprehensive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Comprehensive AI analysis completed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to perform AI analysis.",
        variant: "destructive",
      });
    },
  });

  // Deep learning analysis mutation
  const deepLearningAnalysisMutation = useMutation({
    mutationFn: (data: {
      text: string;
      model_type?: string;
      include_explanation?: boolean;
    }) =>
      authenticatedRequest("/api/ai/analyze/deep-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  // Semantic search mutation
  const semanticSearchMutation = useMutation({
    mutationFn: (data: {
      query: string;
      limit?: number;
      similarity_threshold?: number;
      include_metadata?: boolean;
    }) =>
      authenticatedRequest("/api/ai/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  // Multi-service analysis mutation
  const multiServiceAnalysisMutation = useMutation({
    mutationFn: (data: { text: string }) =>
      authenticatedRequest("/api/ai/analyze/multi-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  const handleAnalyze = () => {
    if (!analysisText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter text to analyze.",
        variant: "destructive",
      });
      return;
    }

    switch (selectedService) {
      case "comprehensive":
        comprehensiveAnalysisMutation.mutate({
          text: analysisText,
          ...analysisOptions,
        });
        break;
      case "deep-learning":
        deepLearningAnalysisMutation.mutate({
          text: analysisText,
          model_type: "classification",
          include_explanation: true,
        });
        break;
      case "multi-service":
        multiServiceAnalysisMutation.mutate({
          text: analysisText,
        });
        break;
    }
  };

  const handleSemanticSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a search query.",
        variant: "destructive",
      });
      return;
    }

    semanticSearchMutation.mutate({
      query: searchQuery,
      limit: 10,
      similarity_threshold: 0.7,
      include_metadata: true,
    });
  };

  const getHealthStatusColor = (status: boolean) => {
    return status ? "text-green-500" : "text-red-500";
  };

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <AdaptiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Enhanced AI Analysis
            </h1>
            <p className="text-muted-foreground">
              Advanced AI-powered error intelligence and analysis platform
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Activity className="w-4 h-4" />
              <span>Real-time AI</span>
            </Badge>
          </div>
        </div>

        {/* AI Service Health Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Service Health
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthData?.overall_health === "healthy" ? (
                  <span className="text-green-500">Healthy</span>
                ) : healthData?.overall_health === "degraded" ? (
                  <span className="text-yellow-500">Degraded</span>
                ) : (
                  <span className="text-red-500">Critical</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {statisticsData?.statistics?.healthy_services || 0} of{" "}
                {statisticsData?.statistics?.total_services || 0} services
                online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Errors
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monitoringData?.monitoring?.active_errors || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {monitoringData?.monitoring?.critical_alerts || 0} critical
                alerts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Response Time
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statisticsData?.statistics?.average_response_time || 0}ms
              </div>
              <p className="text-xs text-muted-foreground">
                Average across all services
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monitoringData?.monitoring?.anomalies_detected || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Trend:{" "}
                {monitoringData?.monitoring?.predictions?.trend_direction ||
                  "stable"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Analysis Interface */}
        <Tabs defaultValue="analysis" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="search">Semantic Search</TabsTrigger>
            <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
            <TabsTrigger value="services">Service Status</TabsTrigger>
          </TabsList>

          {/* AI Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>Advanced Error Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="analysis-text">Error Text/Log</Label>
                  <Textarea
                    id="analysis-text"
                    placeholder="Paste your error log or message here for AI analysis..."
                    value={analysisText}
                    onChange={(e) => setAnalysisText(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Analysis Options</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-ml"
                        checked={analysisOptions.includeML}
                        onCheckedChange={(checked) =>
                          setAnalysisOptions((prev) => ({
                            ...prev,
                            includeML: checked,
                          }))
                        }
                      />
                      <Label htmlFor="include-ml">ML Predictions</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-similarity"
                        checked={analysisOptions.includeSimilarity}
                        onCheckedChange={(checked) =>
                          setAnalysisOptions((prev) => ({
                            ...prev,
                            includeSimilarity: checked,
                          }))
                        }
                      />
                      <Label htmlFor="include-similarity">Similar Errors</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-entities"
                        checked={analysisOptions.includeEntities}
                        onCheckedChange={(checked) =>
                          setAnalysisOptions((prev) => ({
                            ...prev,
                            includeEntities: checked,
                          }))
                        }
                      />
                      <Label htmlFor="include-entities">
                        Entity Extraction
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-type">Analysis Type</Label>
                  <select
                    id="service-type"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="comprehensive">
                      Comprehensive Analysis
                    </option>
                    <option value="deep-learning">
                      Deep Learning Analysis
                    </option>
                    <option value="multi-service">
                      Multi-Service Analysis
                    </option>
                  </select>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={comprehensiveAnalysisMutation.isPending}
                  className="w-full"
                >
                  {comprehensiveAnalysisMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>

                {/* Analysis Results */}
                {comprehensiveAnalysisMutation.data && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Analysis Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">
                            Error Type
                          </Label>
                          <p className="text-lg">
                            {
                              comprehensiveAnalysisMutation.data.analysis
                                .error_type
                            }
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">
                            Severity
                          </Label>
                          <Badge
                            variant={
                              comprehensiveAnalysisMutation.data.analysis
                                .severity === "critical"
                                ? "destructive"
                                : "default"
                            }
                          >
                            {
                              comprehensiveAnalysisMutation.data.analysis
                                .severity
                            }
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Confidence Score
                        </Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Progress
                            value={
                              comprehensiveAnalysisMutation.data.analysis
                                .confidence * 100
                            }
                            className="flex-1"
                          />
                          <span className="text-sm font-medium">
                            {Math.round(
                              comprehensiveAnalysisMutation.data.analysis
                                .confidence * 100
                            )}
                            %
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Suggested Solution
                        </Label>
                        <Alert className="mt-2">
                          <Lightbulb className="h-4 w-4" />
                          <AlertDescription>
                            {
                              comprehensiveAnalysisMutation.data.analysis
                                .suggested_solution
                            }
                          </AlertDescription>
                        </Alert>
                      </div>

                      {comprehensiveAnalysisMutation.data.analysis
                        .similar_errors && (
                        <div>
                          <Label className="text-sm font-medium">
                            Similar Errors
                          </Label>
                          <div className="space-y-2 mt-2">
                            {comprehensiveAnalysisMutation.data.analysis.similar_errors.map(
                              (error: any, index: number) => (
                                <Card key={index} className="p-3">
                                  <div className="flex justify-between items-start">
                                    <p className="text-sm">{error.text}</p>
                                    <Badge variant="outline">
                                      {Math.round(error.similarity * 100)}%
                                      match
                                    </Badge>
                                  </div>
                                </Card>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Semantic Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="w-5 h-5" />
                  <span>Semantic Error Search</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search for similar errors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSemanticSearch}
                    disabled={semanticSearchMutation.isPending}
                  >
                    {semanticSearchMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {semanticSearchMutation.data && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Search Results
                    </Label>
                    {semanticSearchMutation.data.results.results.map(
                      (result: any, index: number) => (
                        <Card key={index} className="p-3">
                          <div className="flex justify-between items-start">
                            <p className="text-sm">{result.text}</p>
                            <Badge variant="outline">
                              {Math.round(result.similarity * 100)}% match
                            </Badge>
                          </div>
                          {result.error_type && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Type: {result.error_type}
                            </p>
                          )}
                        </Card>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Real-time Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>System Health</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Overall Status</span>
                      <Badge
                        variant={
                          monitoringData?.monitoring?.system_health ===
                          "healthy"
                            ? "default"
                            : monitoringData?.monitoring?.system_health ===
                              "warning"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {monitoringData?.monitoring?.system_health || "Unknown"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Errors</span>
                      <span className="font-medium">
                        {monitoringData?.monitoring?.active_errors || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Critical Alerts</span>
                      <span className="font-medium text-red-500">
                        {monitoringData?.monitoring?.critical_alerts || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Predictions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Next Hour Errors</span>
                      <span className="font-medium">
                        {monitoringData?.monitoring?.predictions
                          ?.next_hour_errors || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Trend</span>
                      <Badge variant="outline">
                        {monitoringData?.monitoring?.predictions
                          ?.trend_direction || "stable"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Anomalies</span>
                      <span className="font-medium">
                        {monitoringData?.monitoring?.anomalies_detected || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {monitoringData?.monitoring?.recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="w-5 h-5" />
                    <span>AI Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {monitoringData.monitoring.recommendations.map(
                      (recommendation: string, index: number) => (
                        <Alert key={index}>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>{recommendation}</AlertDescription>
                        </Alert>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Service Status Tab */}
          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Network className="w-5 h-5" />
                  <span>Microservices Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthData?.services && (
                  <div className="space-y-3">
                    {Array.from(healthData.services.entries()).map(
                      ([serviceName, serviceData]: [
                        string,
                        AIServiceHealth
                      ]) => (
                        <div
                          key={serviceName}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                serviceData.status
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <div>
                              <p className="font-medium capitalize">
                                {serviceName.replace("-", " ")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                v{serviceData.version} •{" "}
                                {serviceData.response_time}ms
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {serviceData.capabilities.length} capabilities
                            </Badge>
                            <Badge
                              variant={
                                serviceData.status ? "default" : "destructive"
                              }
                            >
                              {serviceData.status ? "Online" : "Offline"}
                            </Badge>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {statisticsData?.statistics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Uptime</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Progress
                          value={statisticsData.statistics.uptime_percentage}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium">
                          {Math.round(
                            statisticsData.statistics.uptime_percentage
                          )}
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Available Capabilities
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {statisticsData.statistics.capabilities.map(
                          (capability: string, index: number) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {capability.replace("_", " ")}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdaptiveLayout>
  );
}
