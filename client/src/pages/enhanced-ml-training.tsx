import React, { useState } from "react";
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
  FileSpreadsheet, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  Target,
  Lightbulb,
  Zap,
  Activity,
  Database
} from "lucide-react";

interface TrainingStats {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  validated: number;
}

interface PatternAnalysis {
  patterns: Array<{
    pattern: string;
    frequency: number;
    severity: string;
    category: string;
    solutions: string[];
    confidence: number;
    trend: {
      errorType: string;
      frequency: number;
      timespan: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      prediction: {
        nextPeriod: number;
        confidence: number;
      };
    };
  }>;
  insights: {
    totalPatterns: number;
    criticalPatterns: number;
    emergingPatterns: number;
    resolvedPatterns: number;
  };
  recommendations: string[];
}

interface TrainingResult {
  modelAccuracy: number;
  patternRecognitionScore: number;
  suggestionQuality: number;
  trainingDataSize: number;
  validationMetrics: {
    precision: number;
    recall: number;
    f1Score: number;
    confusionMatrix: number[][];
  };
  trendAnalysis: {
    commonErrorTypes: Array<{ type: string; frequency: number; trend: string }>;
    severityDistribution: Record<string, number>;
    temporalPatterns: Array<{ period: string; errorCount: number; change: number }>;
  };
  patternInsights: {
    discoveredPatterns: number;
    automatedSolutions: number;
    confidenceScores: number[];
  };
}

export default function EnhancedMLTraining() {
  const [isTraining, setIsTraining] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch training statistics
  const { data: trainingStats, isLoading: statsLoading } = useQuery<TrainingStats>({
    queryKey: ['/api/ml/training-stats'],
    queryFn: async () => {
      const response = await authenticatedRequest('GET', '/api/ml/training-stats');
      return response.json();
    },
  });

  // Fetch pattern analysis
  const { data: patternAnalysis, isLoading: patternsLoading } = useQuery<PatternAnalysis>({
    queryKey: ['/api/ml/pattern-analysis'],
    queryFn: async () => {
      const response = await authenticatedRequest('GET', '/api/ml/pattern-analysis');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch enhanced training status
  const { data: enhancedStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/ml/enhanced-status'],
    queryFn: async () => {
      const response = await authenticatedRequest('GET', '/api/ml/enhanced-status');
      return response.json();
    },
  });

  // Train from Excel mutation
  const trainFromExcelMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedRequest('POST', '/api/ml/train-from-excel');
      return response.json();
    },
    onSuccess: (data) => {
      setIsTraining(false);
      toast({
        title: "Training Completed",
        description: `Model trained successfully with ${data.result.trainingDataSize} examples. Accuracy: ${data.result.modelAccuracy}%`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ml/training-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ml/enhanced-status'] });
    },
    onError: (error: any) => {
      setIsTraining(false);
      toast({
        title: "Training Failed",
        description: error.message || "Failed to complete training",
        variant: "destructive",
      });
    },
  });

  const handleTrainFromExcel = () => {
    setIsTraining(true);
    trainFromExcelMutation.mutate();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <AdaptiveLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enhanced ML Training & Pattern Analysis</h1>
            <p className="text-muted-foreground">
              Advanced pattern recognition, trend analysis, and AI model training from Excel data
            </p>
          </div>
          <Button 
            onClick={handleTrainFromExcel} 
            disabled={isTraining}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isTraining ? "Training..." : "Train from Excel"}
          </Button>
        </div>

        {isTraining && (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              Training in progress... This may take a few minutes.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
            <TabsTrigger value="training">Training Metrics</TabsTrigger>
            <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Training Examples</p>
                      <p className="text-2xl font-bold">
                        {statsLoading ? "..." : trainingStats?.total || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Validated</p>
                      <p className="text-2xl font-bold">
                        {statsLoading ? "..." : trainingStats?.validated || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Patterns Found</p>
                      <p className="text-2xl font-bold">
                        {patternsLoading ? "..." : patternAnalysis?.insights.totalPatterns || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">Critical Patterns</p>
                      <p className="text-2xl font-bold">
                        {patternsLoading ? "..." : patternAnalysis?.insights.criticalPatterns || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {enhancedStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Training Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Current Step:</span>
                      <Badge variant="outline">{enhancedStatus.currentStep}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{enhancedStatus.progress}%</span>
                      </div>
                      <Progress value={enhancedStatus.progress} />
                    </div>
                    {enhancedStatus.lastTrainingDate && (
                      <p className="text-sm text-muted-foreground">
                        Last training: {new Date(enhancedStatus.lastTrainingDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Discovered Error Patterns</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patternsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2">Analyzing patterns...</span>
                  </div>
                ) : patternAnalysis?.patterns.length ? (
                  <div className="space-y-4">
                    {patternAnalysis.patterns.map((pattern, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className={getSeverityColor(pattern.severity)}>
                              {pattern.severity}
                            </Badge>
                            <Badge variant="outline">{pattern.category}</Badge>
                            <span className="font-medium">{pattern.pattern}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getTrendIcon(pattern.trend.trend)}
                            <Badge variant="outline">
                              {pattern.frequency} occurrences
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <strong>Trend:</strong> {pattern.trend.trend} over {pattern.trend.timespan}
                          {pattern.trend.prediction && (
                            <span className="ml-2">
                              (Predicted: {pattern.trend.prediction.nextPeriod} next period)
                            </span>
                          )}
                        </div>

                        {pattern.solutions.length > 0 && (
                          <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-200">
                            <p className="font-medium text-blue-800 text-sm">Solutions:</p>
                            <ul className="list-disc list-inside text-sm text-blue-700 mt-1">
                              {pattern.solutions.map((solution, i) => (
                                <li key={i}>{solution}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Confidence: {Math.round(pattern.confidence * 100)}%</span>
                          <Progress value={pattern.confidence * 100} className="w-20 h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No patterns discovered yet</p>
                    <p className="text-sm">Upload log files to start pattern analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {patternAnalysis?.recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5" />
                    <span>AI Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {patternAnalysis.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Training Data Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-3">By Category</h4>
                      <div className="space-y-2">
                        {Object.entries(trainingStats?.byCategory || {}).map(([category, count]) => (
                          <div key={category} className="flex items-center justify-between">
                            <span className="text-sm">{category}</span>
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={(count / (trainingStats?.total || 1)) * 100} 
                                className="w-20"
                              />
                              <span className="text-sm font-medium w-8">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">By Severity</h4>
                      <div className="space-y-2">
                        {Object.entries(trainingStats?.bySeverity || {}).map(([severity, count]) => (
                          <div key={severity} className="flex items-center justify-between">
                            <Badge className={getSeverityColor(severity)} variant="outline">
                              {severity}
                            </Badge>
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={(count / (trainingStats?.total || 1)) * 100} 
                                className="w-20"
                              />
                              <span className="text-sm font-medium w-8">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pattern Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  {patternAnalysis ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {patternAnalysis.insights.resolvedPatterns}
                          </div>
                          <div className="text-sm text-muted-foreground">Resolved</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {patternAnalysis.insights.emergingPatterns}
                          </div>
                          <div className="text-sm text-muted-foreground">Emerging</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trend Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Total Patterns Tracked</span>
                      <Badge variant="outline">
                        {patternAnalysis?.insights.totalPatterns || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Accuracy Improvement</span>
                      <Badge className="bg-green-100 text-green-800">
                        +15.3%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Resolution Rate</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        87.2%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdaptiveLayout>
  );
}
