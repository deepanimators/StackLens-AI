import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Target, 
  Lightbulb,
  Clock,
  Users,
  FileText,
  BarChart3,
  Search,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Types and Interfaces
export interface ErrorPattern {
  id: string;
  pattern: string;
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedUsers: number;
  confidence: number;
  tags: string[];
  description: string;
  suggestedActions: string[];
}

export interface RootCauseAnalysis {
  id: string;
  errorId: string;
  possibleCauses: Array<{
    cause: string;
    probability: number;
    evidence: string[];
    category: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    effort: 'easy' | 'moderate' | 'complex';
    impact: 'low' | 'medium' | 'high';
  }>;
  confidence: number;
  analysisTimestamp: Date;
}

export interface ErrorPrediction {
  id: string;
  predictedErrorType: string;
  probability: number;
  timeframe: string;
  triggerConditions: string[];
  preventiveActions: string[];
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorImpactAssessment {
  id: string;
  errorId: string;
  businessImpact: {
    revenue: number;
    users: number;
    operations: string[];
  };
  technicalImpact: {
    systems: string[];
    performance: number;
    availability: number;
  };
  timeToResolve: {
    estimated: string;
    confidence: number;
  };
  cascadingEffects: string[];
}

interface ErrorIntelligenceAnalyzerProps {
  className?: string;
  onAnalysisComplete?: (analysis: any) => void;
}

export function ErrorIntelligenceAnalyzer({ className, onAnalysisComplete }: ErrorIntelligenceAnalyzerProps) {
  const [activeTab, setActiveTab] = useState('patterns');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const { toast } = useToast();

  // Sample data - replace with real AI analysis results
  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([
    {
      id: 'pattern-001',
      pattern: 'Database connection timeout in user authentication',
      errorType: 'connection_timeout',
      severity: 'high',
      frequency: 127,
      firstOccurrence: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastOccurrence: new Date(Date.now() - 2 * 60 * 60 * 1000),
      affectedUsers: 1247,
      confidence: 92,
      tags: ['database', 'auth', 'timeout'],
      description: 'Recurring pattern of database timeouts during peak authentication hours',
      suggestedActions: [
        'Optimize database connection pooling',
        'Implement connection retry logic',
        'Scale database instances during peak hours'
      ]
    },
    {
      id: 'pattern-002',
      pattern: 'Memory leak in React component lifecycle',
      errorType: 'memory_leak',
      severity: 'medium',
      frequency: 89,
      firstOccurrence: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      lastOccurrence: new Date(Date.now() - 30 * 60 * 1000),
      affectedUsers: 543,
      confidence: 87,
      tags: ['memory', 'react', 'frontend'],
      description: 'Progressive memory consumption in dashboard components',
      suggestedActions: [
        'Review useEffect cleanup functions',
        'Implement proper event listener removal',
        'Audit third-party library usage'
      ]
    }
  ]);

  const [rootCauseAnalyses, setRootCauseAnalyses] = useState<RootCauseAnalysis[]>([
    {
      id: 'rca-001',
      errorId: 'pattern-001',
      possibleCauses: [
        {
          cause: 'Database connection pool exhaustion',
          probability: 85,
          evidence: ['High concurrent user count', 'Long-running queries detected', 'Pool metrics show 95% utilization'],
          category: 'infrastructure'
        },
        {
          cause: 'Network latency to database server',
          probability: 62,
          evidence: ['Increased response times during peak hours', 'Geographic distribution of errors'],
          category: 'network'
        },
        {
          cause: 'Inefficient query patterns',
          probability: 45,
          evidence: ['N+1 query patterns detected', 'Missing database indexes'],
          category: 'code'
        }
      ],
      recommendations: [
        {
          action: 'Increase database connection pool size',
          priority: 'high',
          effort: 'easy',
          impact: 'high'
        },
        {
          action: 'Implement database query optimization',
          priority: 'medium',
          effort: 'moderate',
          impact: 'medium'
        },
        {
          action: 'Add database performance monitoring',
          priority: 'high',
          effort: 'moderate',
          impact: 'high'
        }
      ],
      confidence: 88,
      analysisTimestamp: new Date()
    }
  ]);

  const [errorPredictions, setErrorPredictions] = useState<ErrorPrediction[]>([
    {
      id: 'pred-001',
      predictedErrorType: 'API rate limit exceeded',
      probability: 78,
      timeframe: 'Next 24 hours',
      triggerConditions: [
        'Traffic increase >150% from baseline',
        'Peak user activity window (2-4 PM)',
        'Marketing campaign launch scheduled'
      ],
      preventiveActions: [
        'Scale API instances proactively',
        'Implement request throttling',
        'Enable caching for frequent endpoints'
      ],
      confidence: 82,
      riskLevel: 'medium'
    },
    {
      id: 'pred-002',
      predictedErrorType: 'Disk space exhaustion',
      probability: 65,
      timeframe: 'Next 72 hours',
      triggerConditions: [
        'Current disk usage at 75%',
        'Log file growth rate: 2GB/day',
        'No log rotation configured'
      ],
      preventiveActions: [
        'Implement log rotation policy',
        'Clean up temporary files',
        'Monitor disk usage alerts'
      ],
      confidence: 89,
      riskLevel: 'high'
    }
  ]);

  // Run AI analysis
  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate AI analysis progress
      const steps = [
        'Collecting error data...',
        'Analyzing patterns...',
        'Performing root cause analysis...',
        'Generating predictions...',
        'Calculating impact assessments...',
        'Preparing recommendations...'
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalysisProgress((i + 1) / steps.length * 100);
        
        toast({
          title: "AI Analysis Progress",
          description: steps[i]
        });
      }

      // Simulate generating new insights
      const newPattern: ErrorPattern = {
        id: `pattern-${Date.now()}`,
        pattern: 'API gateway timeout during high traffic',
        errorType: 'gateway_timeout',
        severity: 'high',
        frequency: 45,
        firstOccurrence: new Date(Date.now() - 2 * 60 * 60 * 1000),
        lastOccurrence: new Date(Date.now() - 10 * 60 * 1000),
        affectedUsers: 234,
        confidence: 94,
        tags: ['api', 'gateway', 'timeout'],
        description: 'New pattern detected: API gateway timeouts correlating with traffic spikes',
        suggestedActions: [
          'Implement circuit breaker pattern',
          'Add API gateway health checks',
          'Configure auto-scaling policies'
        ]
      };

      setErrorPatterns(prev => [newPattern, ...prev]);
      
      onAnalysisComplete?.(newPattern);

      toast({
        title: "Analysis Complete",
        description: "New error patterns and insights have been discovered."
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to complete error intelligence analysis.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  }, [toast, onAnalysisComplete]);

  // Filter patterns
  const filteredPatterns = errorPatterns.filter(pattern => {
    const matchesSearch = pattern.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeverity = filterSeverity === 'all' || pattern.severity === filterSeverity;
    
    return matchesSearch && matchesSeverity;
  });

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get risk level icon
  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Brain className="h-8 w-8 mr-3 text-purple-600" />
            Error Intelligence
          </h1>
          <p className="text-muted-foreground">
            AI-powered error analysis, pattern recognition, and predictive insights
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          
          <Button onClick={runAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-pulse" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Run AI Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI Analysis in Progress</span>
                <span className="text-sm text-muted-foreground">{Math.round(analysisProgress)}%</span>
              </div>
              <Progress value={analysisProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorPatterns.length}</div>
            <p className="text-xs text-muted-foreground">
              +2 new patterns detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Priority Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {errorPatterns.filter(p => p.severity === 'high' || p.severity === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Affected Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errorPatterns.reduce((sum, p) => sum + p.affectedUsers, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all error patterns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prediction Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">92%</div>
            <p className="text-xs text-muted-foreground">
              AI model confidence
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
          <TabsTrigger value="root-cause">Root Cause</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search error patterns..."
                className="pl-10"
              />
            </div>
            
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Error Patterns */}
          <div className="space-y-4">
            {filteredPatterns.map((pattern) => (
              <Card key={pattern.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{pattern.pattern}</CardTitle>
                      <CardDescription className="mt-1">{pattern.description}</CardDescription>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(pattern.severity)}>
                        {pattern.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {pattern.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Frequency:</span>
                      <div className="text-lg font-semibold">{pattern.frequency}</div>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Affected Users:</span>
                      <div className="text-lg font-semibold">{pattern.affectedUsers.toLocaleString()}</div>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">First Seen:</span>
                      <div className="text-sm">{pattern.firstOccurrence.toLocaleDateString()}</div>
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">Last Seen:</span>
                      <div className="text-sm">{pattern.lastOccurrence.toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-sm text-muted-foreground mb-2 block">Tags:</span>
                      <div className="flex flex-wrap gap-1">
                        {pattern.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-sm text-muted-foreground mb-2 block">Suggested Actions:</span>
                      <ul className="text-sm space-y-1">
                        {pattern.suggestedActions.map((action, index) => (
                          <li key={index} className="flex items-start">
                            <Lightbulb className="h-3 w-3 mr-2 mt-0.5 text-yellow-500" />
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

          {filteredPatterns.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Error Patterns Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || filterSeverity !== 'all' 
                      ? 'No patterns match your current filters.'
                      : 'Run AI analysis to discover error patterns.'}
                  </p>
                  {!searchTerm && filterSeverity === 'all' && (
                    <Button onClick={runAnalysis}>
                      <Brain className="h-4 w-4 mr-2" />
                      Start Analysis
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="root-cause" className="space-y-6">
          <div className="space-y-4">
            {rootCauseAnalyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2 text-purple-600" />
                    Root Cause Analysis
                  </CardTitle>
                  <CardDescription>
                    Analysis for error pattern: {errorPatterns.find(p => p.id === analysis.errorId)?.pattern}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Possible Causes (by probability)</h4>
                    <div className="space-y-3">
                      {analysis.possibleCauses.map((cause, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">{cause.cause}</h5>
                            <div className="flex items-center space-x-2">
                              <Progress value={cause.probability} className="w-20 h-2" />
                              <span className="text-sm font-medium">{cause.probability}%</span>
                            </div>
                          </div>
                          
                          <Badge variant="secondary" className="mb-2">
                            {cause.category}
                          </Badge>
                          
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Evidence:</span>
                            <ul className="mt-1 space-y-1">
                              {cause.evidence.map((evidence, idx) => (
                                <li key={idx} className="flex items-start">
                                  <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 mr-2 flex-shrink-0" />
                                  {evidence}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-3">Recommendations</h4>
                    <div className="space-y-3">
                      {analysis.recommendations.map((rec, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium flex-1">{rec.action}</h5>
                            <div className="flex space-x-2">
                              <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                                {rec.priority} priority
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex space-x-4 text-sm text-muted-foreground">
                            <span>Effort: <span className="font-medium">{rec.effort}</span></span>
                            <span>Impact: <span className="font-medium">{rec.impact}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Analysis confidence: {analysis.confidence}%</span>
                    <span>Generated: {analysis.analysisTimestamp.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <div className="space-y-4">
            {errorPredictions.map((prediction) => (
              <Card key={prediction.id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
                        {prediction.predictedErrorType}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Predicted to occur in {prediction.timeframe}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getRiskIcon(prediction.riskLevel)}
                      <Badge variant="outline">
                        {prediction.probability}% probability
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                    <span>Risk level: <span className="font-medium capitalize">{prediction.riskLevel}</span></span>
                    <span>Confidence: {prediction.confidence}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="impact" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Impact Analysis Coming Soon</h3>
                <p className="text-muted-foreground mb-4">
                  Comprehensive business and technical impact assessments are being developed.
                </p>
                <Button variant="outline" onClick={runAnalysis}>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Impact Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ErrorIntelligenceAnalyzer;