import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import AdaptiveLayout from "@/components/adaptive-layout";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  Zap,
  Search,
  AlertTriangle,
  Layers,
  Target,
  Activity,
  FileText,
  Bot,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Eye,
  BarChart3,
} from "lucide-react";

interface MicroserviceHealth {
  service: string;
  status: string;
  healthy: boolean;
}

interface MicroservicesStatus {
  overall_status: string;
  services: MicroserviceHealth[];
  timestamp: string;
}

interface SemanticSearchResult {
  text: string;
  score: number;
  index: number;
}

interface AnomalyResult {
  index: number;
  text: string;
  is_anomaly: boolean;
  score: number;
}

interface ClusterGroup {
  cluster_id: number;
  errors: string[];
  count: number;
}

interface EntityResult {
  text: string;
  label: string;
  start: number;
  end: number;
  confidence: number;
}

export default function MicroservicesAnalysisPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch microservices health status
  const { data: healthStatus, refetch: refetchHealth } = useQuery({
    queryKey: ["/api/microservices/health"],
    queryFn: async (): Promise<MicroservicesStatus> => {
      const response = await authenticatedRequest(
        "GET",
        "/api/microservices/health"
      );
      return response;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch user's files for analysis
  const { data: userFiles } = useQuery({
    queryKey: ["/api/files"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/files");
      return response;
    },
  });

  // Comprehensive analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async ({ fileId }: { fileId: number }) => {
      setIsAnalyzing(true);
      const response = await authenticatedRequest(
        "POST",
        "/api/microservices/analyze",
        {
          fileId,
        }
      );
      return response;
    },
    onSuccess: (data) => {
      setAnalysisResults(data);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: `Processed ${data.processed_errors} errors successfully`,
      });
    },
    onError: (error) => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Semantic search mutation
  const searchMutation = useMutation({
    mutationFn: async ({
      query,
      fileId,
    }: {
      query: string;
      fileId?: number;
    }) => {
      const response = await authenticatedRequest(
        "POST",
        "/api/microservices/search",
        {
          query,
          fileId,
          topK: 10,
        }
      );
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Search Complete",
        description: `Found ${data.results.length} relevant results`,
      });
    },
  });

  // Anomaly detection mutation
  const anomalyMutation = useMutation({
    mutationFn: async ({ fileId }: { fileId: number }) => {
      const response = await authenticatedRequest(
        "POST",
        "/api/microservices/anomalies",
        {
          fileId,
          contamination: 0.1,
        }
      );
      return response;
    },
  });

  // Clustering mutation
  const clusterMutation = useMutation({
    mutationFn: async ({
      fileId,
      nClusters,
    }: {
      fileId: number;
      nClusters: number;
    }) => {
      const response = await authenticatedRequest(
        "POST",
        "/api/microservices/cluster",
        {
          fileId,
          nClusters,
        }
      );
      return response;
    },
  });

  // Entity extraction mutation
  const entityMutation = useMutation({
    mutationFn: async ({ fileId }: { fileId: number }) => {
      const response = await authenticatedRequest(
        "POST",
        "/api/microservices/entities",
        {
          fileId,
        }
      );
      return response;
    },
  });

  // Summarization mutation
  const summarizeMutation = useMutation({
    mutationFn: async ({ fileId }: { fileId: number }) => {
      const response = await authenticatedRequest(
        "POST",
        "/api/microservices/summarize",
        {
          fileId,
          maxLength: 200,
          minLength: 50,
        }
      );
      return response;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "unhealthy":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  const getStatusIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const handleRunAnalysis = () => {
    if (!selectedFileId) {
      toast({
        title: "No File Selected",
        description: "Please select a file to analyze",
        variant: "destructive",
      });
      return;
    }
    analysisMutation.mutate({ fileId: selectedFileId });
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "No Query",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }
    searchMutation.mutate({
      query: searchQuery,
      fileId: selectedFileId || undefined,
    });
  };

  return (
    <AdaptiveLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Advanced AI Microservices Analysis
          </h1>
          <p className="text-gray-600">
            Leverage cutting-edge AI microservices for comprehensive error
            analysis
          </p>
        </div>

        {/* Microservices Health Status */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Microservices Status
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchHealth()}
              disabled={!healthStatus}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {healthStatus ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      healthStatus.overall_status === "operational"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {healthStatus.overall_status.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Last checked:{" "}
                    {new Date(healthStatus.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {healthStatus.services.map((service) => (
                    <div
                      key={service.service}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <span className="text-sm font-medium">
                        {service.service}
                      </span>
                      {getStatusIcon(service.healthy)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Checking microservices status...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              File Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {userFiles?.map((file: any) => (
                <Button
                  key={file.id}
                  variant={selectedFileId === file.id ? "default" : "outline"}
                  className="justify-start p-3 h-auto"
                  onClick={() => setSelectedFileId(file.id)}
                >
                  <div className="text-left">
                    <div className="font-medium text-sm">
                      {file.originalName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {file.totalErrors} errors • {file.status}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            {selectedFileId && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Selected file ID: {selectedFileId}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Button
            onClick={handleRunAnalysis}
            disabled={!selectedFileId || isAnalyzing}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            Comprehensive Analysis
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              selectedFileId &&
              anomalyMutation.mutate({ fileId: selectedFileId })
            }
            disabled={!selectedFileId || anomalyMutation.isPending}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Detect Anomalies
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              selectedFileId &&
              clusterMutation.mutate({ fileId: selectedFileId, nClusters: 5 })
            }
            disabled={!selectedFileId || clusterMutation.isPending}
          >
            <Layers className="h-4 w-4 mr-2" />
            Cluster Errors
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              selectedFileId &&
              entityMutation.mutate({ fileId: selectedFileId })
            }
            disabled={!selectedFileId || entityMutation.isPending}
          >
            <Target className="h-4 w-4 mr-2" />
            Extract Entities
          </Button>
        </div>

        {/* Semantic Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Semantic Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search for error patterns, symptoms, or solutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {searchMutation.data && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Search Results:</h4>
                {searchMutation.data.results.map(
                  (result: SemanticSearchResult, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <p className="text-sm">{result.text}</p>
                        <Badge variant="outline" className="ml-2">
                          {(result.score * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <Tabs defaultValue="comprehensive" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="comprehensive">Analysis</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="clusters">Clusters</TabsTrigger>
            <TabsTrigger value="entities">Entities</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="comprehensive" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comprehensive Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p>Running comprehensive analysis...</p>
                    </div>
                  </div>
                ) : analysisResults ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900">
                          Processed Errors
                        </h4>
                        <p className="text-2xl font-bold text-blue-700">
                          {analysisResults.processed_errors}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900">
                          Analysis Time
                        </h4>
                        <p className="text-2xl font-bold text-green-700">
                          {new Date(
                            analysisResults.timestamp
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900">Status</h4>
                        <p className="text-2xl font-bold text-purple-700">
                          {analysisResults.success ? "Success" : "Failed"}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Raw Analysis Data</h4>
                      <pre className="text-xs overflow-auto max-h-64 bg-white p-3 rounded border">
                        {JSON.stringify(analysisResults.analysis, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Run a comprehensive analysis to see results here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Anomaly Detection Results</CardTitle>
              </CardHeader>
              <CardContent>
                {anomalyMutation.data ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-red-50 rounded-lg">
                        <h4 className="font-medium text-red-900">
                          Anomalies Found
                        </h4>
                        <p className="text-2xl font-bold text-red-700">
                          {anomalyMutation.data.anomaly_count}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900">
                          Total Analyzed
                        </h4>
                        <p className="text-2xl font-bold text-blue-700">
                          {anomalyMutation.data.total_analyzed}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {anomalyMutation.data.anomalies.map(
                        (anomaly: AnomalyResult, index: number) => (
                          <div
                            key={index}
                            className="p-3 border border-red-200 rounded-lg bg-red-50"
                          >
                            <div className="flex justify-between items-start">
                              <p className="text-sm">{anomaly.text}</p>
                              <Badge variant="destructive" className="ml-2">
                                Score: {anomaly.score.toFixed(3)}
                              </Badge>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Run anomaly detection to see results here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clusters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Clustering Results</CardTitle>
              </CardHeader>
              <CardContent>
                {clusterMutation.data ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900">
                          Clusters Found
                        </h4>
                        <p className="text-2xl font-bold text-purple-700">
                          {clusterMutation.data.clusters.length}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900">
                          Total Errors
                        </h4>
                        <p className="text-2xl font-bold text-blue-700">
                          {clusterMutation.data.total_errors}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {clusterMutation.data.clusters.map(
                        (cluster: ClusterGroup) => (
                          <div
                            key={cluster.cluster_id}
                            className="border rounded-lg p-4"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium">
                                Cluster {cluster.cluster_id + 1}
                              </h4>
                              <Badge variant="outline">
                                {cluster.count} errors
                              </Badge>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {cluster.errors
                                .slice(0, 5)
                                .map((error, index) => (
                                  <p
                                    key={index}
                                    className="text-sm text-gray-600 truncate"
                                  >
                                    {error}
                                  </p>
                                ))}
                              {cluster.errors.length > 5 && (
                                <p className="text-sm text-gray-400">
                                  +{cluster.errors.length - 5} more errors...
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Run clustering analysis to see results here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Named Entity Recognition Results</CardTitle>
              </CardHeader>
              <CardContent>
                {entityMutation.data ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900">
                        Entities Found
                      </h4>
                      <p className="text-2xl font-bold text-green-700">
                        {entityMutation.data.entities.length}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {entityMutation.data.entities.map(
                        (entity: EntityResult, index: number) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 border rounded-lg"
                          >
                            <div>
                              <span className="font-medium">{entity.text}</span>
                              <Badge variant="outline" className="ml-2">
                                {entity.label}
                              </Badge>
                            </div>
                            <span className="text-sm text-gray-500">
                              {(entity.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Run entity extraction to see results here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Text Summarization Results
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      selectedFileId &&
                      summarizeMutation.mutate({ fileId: selectedFileId })
                    }
                    disabled={!selectedFileId || summarizeMutation.isPending}
                  >
                    {summarizeMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <FileText className="h-4 w-4 mr-1" />
                    )}
                    Generate Summary
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summarizeMutation.data ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900">
                          Original Length
                        </h4>
                        <p className="text-2xl font-bold text-blue-700">
                          {summarizeMutation.data.original_length}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900">
                          Summary Length
                        </h4>
                        <p className="text-2xl font-bold text-green-700">
                          {summarizeMutation.data.summary_length}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900">
                          Compression
                        </h4>
                        <p className="text-2xl font-bold text-purple-700">
                          {summarizeMutation.data.compression_ratio}%
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Summary</h4>
                      <p className="text-gray-700 leading-relaxed">
                        {summarizeMutation.data.summary}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Generate a summary to see results here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdaptiveLayout>
  );
}
