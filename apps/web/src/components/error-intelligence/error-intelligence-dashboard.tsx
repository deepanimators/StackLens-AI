import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Zap,
  Shield,
  BarChart3,
  RefreshCw,
  Download,
  Settings,
  Play,
  Pause,
  Clock,
  Users,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ErrorIntelligenceAnalyzer from './error-intelligence-analyzer';
import useErrorIntelligence, { useMockErrorIntelligence } from '@/hooks/use-error-intelligence';
import { ErrorEvent } from '@/services/error-intelligence';

interface ErrorIntelligenceDashboardProps {
  className?: string;
  useMockData?: boolean;
}

export function ErrorIntelligenceDashboard({ className, useMockData = false }: ErrorIntelligenceDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [analysisMode, setAnalysisMode] = useState<'auto' | 'manual'>('auto');
  const [alertThreshold, setAlertThreshold] = useState(75);
  const { toast } = useToast();

  // Use appropriate hook based on mock data setting
  const errorIntelligence = useMockData ? useMockErrorIntelligence() : useErrorIntelligence({
    autoAnalyze: analysisMode === 'auto',
    analysisInterval: 15, // 15 minutes
    onAnalysisComplete: (results) => {
      toast({
        title: "Analysis Complete",
        description: `Found ${results.patterns.length} patterns with ${Math.round(results.confidence)}% confidence.`
      });
    },
    onNewPattern: (pattern) => {
      if (pattern.severity === 'high' || pattern.severity === 'critical') {
        toast({
          title: "Critical Pattern Detected",
          description: pattern.pattern,
          variant: "destructive"
        });
      }
    },
    onHighRiskError: (error, riskScore) => {
      if (riskScore >= alertThreshold) {
        toast({
          title: "High Risk Error Detected",
          description: `Risk score: ${riskScore}% - ${error.message}`,
          variant: "destructive"
        });
      }
    }
  });

  // Generate sample error events for demonstration
  useEffect(() => {
    if (useMockData && isRealTimeEnabled) {
      const interval = setInterval(() => {
        const sampleError: ErrorEvent = {
          id: `error-${Date.now()}`,
          timestamp: new Date(),
          errorType: ['timeout', 'auth_error', 'memory_leak', 'sql_error'][Math.floor(Math.random() * 4)],
          message: 'Sample error message for demonstration',
          stackTrace: 'at Function.sample\n  at Object.demo',
          severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
          context: { component: 'dashboard', action: 'analysis' },
          tags: ['demo', 'sample']
        };
        
        errorIntelligence.analyzeNewError(sampleError);
      }, 5000); // Every 5 seconds

      return () => clearInterval(interval);
    }
  }, [useMockData, isRealTimeEnabled, errorIntelligence]);

  // Get severity color helper
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // Get risk level color
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Brain className="h-8 w-8 mr-3 text-purple-600" />
            Error Intelligence Dashboard
          </h1>
          <p className="text-muted-foreground">
            AI-powered error analysis with real-time pattern detection and predictive insights
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Real-time Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="real-time"
              checked={isRealTimeEnabled}
              onCheckedChange={setIsRealTimeEnabled}
            />
            <Label htmlFor="real-time" className="text-sm">Real-time</Label>
          </div>

          {/* Analysis Mode */}
          <Select value={analysisMode} onValueChange={(value: any) => setAnalysisMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>

          {/* Settings Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Error Intelligence Settings</DialogTitle>
                <DialogDescription>
                  Configure AI analysis parameters and alert thresholds
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>Alert Threshold (%)</Label>
                  <Select value={alertThreshold.toString()} onValueChange={(v) => setAlertThreshold(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50% - Low</SelectItem>
                      <SelectItem value="75">75% - Medium</SelectItem>
                      <SelectItem value="90">90% - High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Manual Analysis Button */}
          <Button 
            onClick={errorIntelligence.runAnalysis} 
            disabled={errorIntelligence.isAnalyzing}
          >
            {errorIntelligence.isAnalyzing ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-pulse" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              {errorIntelligence.isInitialized ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {errorIntelligence.isInitialized ? 'System Ready' : 'System Error'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              {isRealTimeEnabled ? (
                <Activity className="h-4 w-4 text-green-500" />
              ) : (
                <Pause className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm font-medium">
                {isRealTimeEnabled ? 'Real-time Active' : 'Real-time Paused'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                {errorIntelligence.lastAnalysis 
                  ? `Last: ${errorIntelligence.lastAnalysis.toLocaleTimeString()}`
                  : 'No analysis yet'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">
                Confidence: {Math.round(errorIntelligence.confidence)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Progress */}
      {errorIntelligence.isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI Analysis in Progress</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(errorIntelligence.analysisProgress)}%
                </span>
              </div>
              <Progress value={errorIntelligence.analysisProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Errors Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errorIntelligence.stats.totalErrorsProcessed.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Patterns Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {errorIntelligence.patterns.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Risk Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {errorIntelligence.stats.highRiskAlertsGenerated}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {errorIntelligence.predictions.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processing Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {errorIntelligence.processingTime}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(errorIntelligence.stats.averageConfidence)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="analysis">Full Analysis</TabsTrigger>
          <TabsTrigger value="real-time">Real-time</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Recent Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-purple-600" />
                Recent Error Patterns
              </CardTitle>
              <CardDescription>
                Latest patterns detected by AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errorIntelligence.patterns.length > 0 ? (
                <div className="space-y-3">
                  {errorIntelligence.patterns.slice(0, 3).map((pattern) => (
                    <div key={pattern.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{pattern.pattern}</h4>
                        <Badge variant="outline" className={getSeverityColor(pattern.severity)}>
                          {pattern.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <span>Frequency: {pattern.frequency}</span>
                        <span>Affected: {pattern.affectedUsers} users</span>
                        <span>Confidence: {pattern.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No patterns detected yet. Run analysis to discover patterns.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Predictions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
                Error Predictions
              </CardTitle>
              <CardDescription>
                AI-predicted future error occurrences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errorIntelligence.predictions.length > 0 ? (
                <div className="space-y-3">
                  {errorIntelligence.predictions.slice(0, 2).map((prediction) => (
                    <div key={prediction.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{prediction.predictedErrorType}</h4>
                        <div className="flex items-center space-x-2">
                          <div className={cn("w-2 h-2 rounded-full", getRiskColor(prediction.riskLevel))} />
                          <span className="text-sm">{prediction.probability}%</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Predicted in: {prediction.timeframe}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No predictions available. Analyze more data to generate predictions.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <ErrorIntelligenceAnalyzer 
            onAnalysisComplete={(analysis) => {
              toast({
                title: "Pattern Analysis Complete",
                description: "New insights have been generated."
              });
            }}
          />
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="space-y-4">
            {errorIntelligence.predictions.map((prediction) => (
              <Card key={prediction.id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
                        {prediction.predictedErrorType}
                      </CardTitle>
                      <CardDescription>
                        {prediction.probability}% probability in {prediction.timeframe}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      prediction.riskLevel === 'critical' ? 'destructive' :
                      prediction.riskLevel === 'high' ? 'default' : 'secondary'
                    }>
                      {prediction.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Trigger Conditions</h5>
                      <ul className="text-sm space-y-1">
                        {prediction.triggerConditions.map((condition, index) => (
                          <li key={index} className="flex items-start">
                            <AlertTriangle className="h-3 w-3 mr-2 mt-0.5 text-orange-500" />
                            {condition}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Preventive Actions</h5>
                      <ul className="text-sm space-y-1">
                        {prediction.preventiveActions.map((action, index) => (
                          <li key={index} className="flex items-start">
                            <Shield className="h-3 w-3 mr-2 mt-0.5 text-green-500" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {errorIntelligence.predictions.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Predictions Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Run error analysis to generate predictive insights.
                  </p>
                  <Button onClick={errorIntelligence.runAnalysis}>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Predictions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis">
          <ErrorIntelligenceAnalyzer 
            onAnalysisComplete={(analysis) => {
              errorIntelligence.runAnalysis();
            }}
          />
        </TabsContent>

        <TabsContent value="real-time" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-500" />
                  Real-time Error Processing
                </span>
                <div className="flex items-center space-x-2">
                  {isRealTimeEnabled ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <Activity className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Pause className="h-3 w-3 mr-1" />
                      Paused
                    </Badge>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                Live error stream analysis with immediate pattern detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {errorIntelligence.stats.totalErrorsProcessed}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {errorIntelligence.stats.highRiskAlertsGenerated}
                  </div>
                  <div className="text-sm text-muted-foreground">High Risk Alerts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {errorIntelligence.stats.patternsDetected}
                  </div>
                  <div className="text-sm text-muted-foreground">Patterns Found</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Stream Visualization would go here */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Live Error Stream</h3>
                <p className="text-muted-foreground mb-4">
                  Real-time error visualization and analysis coming soon.
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <Switch
                    checked={isRealTimeEnabled}
                    onCheckedChange={setIsRealTimeEnabled}
                  />
                  <Label>Enable Real-time Processing</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ErrorIntelligenceDashboard;