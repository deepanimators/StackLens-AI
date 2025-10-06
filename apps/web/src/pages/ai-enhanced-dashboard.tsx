import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import AdaptiveLayout from "@/components/adaptive-layout";
import { authenticatedRequest } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Bot,
  Activity,
  FileText,
  BarChart3,
  Eye,
  Lightbulb,
  Shield,
  Target,
  Cpu,
} from "lucide-react";

interface AIEnhancedDashboard {
  basic_stats: {
    total_errors: number;
    critical_errors: number;
    high_errors: number;
    recent_errors: number;
  };
  ai_insights: {
    monitoring: {
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
    } | null;
    statistics: {
      total_services: number;
      healthy_services: number;
      capabilities: string[];
      uptime_percentage: number;
      average_response_time: number;
    } | null;
    enterprise_analysis: {
      severity_distribution: Record<string, number>;
      category_distribution: Record<string, number>;
      language_distribution: Record<string, number>;
      framework_distribution: Record<string, number>;
      anomaly_score: number;
      risk_assessment: string;
      recommendations: string[];
    } | null;
  };
  recommendations: string[];
  alerts: Array<{
    type: "critical" | "warning" | "info";
    message: string;
    timestamp: string;
  }>;
}

export default function EnhancedDashboard() {
  const [, setLocation] = useLocation();

  // Fetch AI-enhanced dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/ai-enhanced"],
    queryFn: () => authenticatedRequest("GET", "/api/dashboard/ai-enhanced"),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch regular dashboard stats for comparison
  const { data: regularStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => authenticatedRequest("GET", "/api/dashboard/stats"),
  });

  if (isLoading) {
    return (
      <AdaptiveLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdaptiveLayout>
    );
  }

  const dashboard: AIEnhancedDashboard = dashboardData?.dashboard;
  const aiInsights = dashboard?.ai_insights;

  const getHealthColor = (health: string) => {
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

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "increasing":
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "decreasing":
        return <TrendingUp className="w-4 h-4 text-green-500 rotate-180" />;
      default:
        return <TrendingUp className="w-4 h-4 text-blue-500 rotate-90" />;
    }
  };

  return (
    <AdaptiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              AI-Enhanced Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time error intelligence with AI-powered insights and
              predictions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Bot className="w-4 h-4" />
              <span>AI Powered</span>
            </Badge>
            <Button
              variant="outline"
              onClick={() => setLocation("/enhanced-ai-analysis")}
            >
              <Brain className="w-4 h-4 mr-2" />
              Advanced Analysis
            </Button>
          </div>
        </div>

        {/* Critical Alerts */}
        {dashboard?.alerts && dashboard.alerts.length > 0 && (
          <div className="space-y-2">
            {dashboard.alerts.map((alert, index) => (
              <Alert
                key={index}
                variant={alert.type === "critical" ? "destructive" : "default"}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{alert.type.toUpperCase()}:</strong> {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Errors
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard?.basic_stats?.total_errors?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard?.basic_stats?.recent_errors || 0} in recent batch
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Critical Errors
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {dashboard?.basic_stats?.critical_errors || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {aiInsights?.monitoring?.critical_alerts || 0} active alerts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                System Health
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${getHealthColor(
                  aiInsights?.monitoring?.system_health || "unknown"
                )}`}
              >
                {aiInsights?.monitoring?.system_health
                  ?.charAt(0)
                  .toUpperCase() +
                  aiInsights?.monitoring?.system_health?.slice(1) || "Unknown"}
              </div>
              <p className="text-xs text-muted-foreground">
                {aiInsights?.statistics?.healthy_services || 0} of{" "}
                {aiInsights?.statistics?.total_services || 0} AI services online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                AI Response Time
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {aiInsights?.statistics?.average_response_time || 0}ms
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(aiInsights?.statistics?.uptime_percentage || 0)}%
                uptime
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Predictive Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>AI Predictions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiInsights?.monitoring?.predictions ? (
                <>
                  <div className="flex items-center justify-between">
                    <span>Next Hour Forecast</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {aiInsights.monitoring.predictions.next_hour_errors}{" "}
                        errors
                      </span>
                      {getTrendIcon(
                        aiInsights.monitoring.predictions.trend_direction
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Trend Direction</span>
                    <Badge
                      variant={
                        aiInsights.monitoring.predictions.trend_direction ===
                        "increasing"
                          ? "destructive"
                          : aiInsights.monitoring.predictions
                              .trend_direction === "decreasing"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {aiInsights.monitoring.predictions.trend_direction}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Anomalies Detected</span>
                    <span className="font-medium text-orange-500">
                      {aiInsights.monitoring.anomalies_detected}
                    </span>
                  </div>

                  {aiInsights.monitoring.predictions.risk_factors.length >
                    0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Risk Factors:</p>
                      <div className="space-y-1">
                        {aiInsights.monitoring.predictions.risk_factors.map(
                          (factor, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {factor}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  AI predictions not available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Error Distribution Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Error Intelligence</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiInsights?.enterprise_analysis ? (
                <>
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Severity Distribution:
                    </p>
                    <div className="space-y-2">
                      {Object.entries(
                        aiInsights.enterprise_analysis.severity_distribution
                      ).map(([severity, count]) => (
                        <div
                          key={severity}
                          className="flex items-center justify-between"
                        >
                          <Badge
                            variant={
                              severity === "critical"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {severity}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">
                      Category Breakdown:
                    </p>
                    <div className="space-y-1">
                      {Object.entries(
                        aiInsights.enterprise_analysis.category_distribution
                      )
                        .slice(0, 3)
                        .map(([category, count]) => (
                          <div
                            key={category}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="capitalize">
                              {category.replace("_", " ")}
                            </span>
                            <span>{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Risk Assessment:</p>
                    <Badge
                      variant={
                        aiInsights.enterprise_analysis.risk_assessment
                          .toLowerCase()
                          .includes("high")
                          ? "destructive"
                          : aiInsights.enterprise_analysis.risk_assessment
                              .toLowerCase()
                              .includes("medium")
                          ? "secondary"
                          : "default"
                      }
                    >
                      {aiInsights.enterprise_analysis.risk_assessment}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Anomaly Score:</p>
                    <div className="flex items-center space-x-2">
                      <Progress
                        value={
                          aiInsights.enterprise_analysis.anomaly_score * 100
                        }
                        className="flex-1"
                      />
                      <span className="text-sm font-medium">
                        {Math.round(
                          aiInsights.enterprise_analysis.anomaly_score * 100
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Enterprise analysis not available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations */}
        {dashboard?.recommendations && dashboard.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>AI Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboard.recommendations.map((recommendation, index) => (
                  <Alert key={index}>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{recommendation}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Service Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="w-5 h-5" />
              <span>AI Services Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {aiInsights?.statistics?.total_services || 0}
                </div>
                <p className="text-sm text-muted-foreground">Total Services</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {aiInsights?.statistics?.healthy_services || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Healthy Services
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {aiInsights?.statistics?.capabilities?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground">AI Capabilities</p>
              </div>
            </div>

            {aiInsights?.statistics?.capabilities && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">
                  Available Capabilities:
                </p>
                <div className="flex flex-wrap gap-2">
                  {aiInsights.statistics.capabilities.map(
                    (capability, index) => (
                      <Badge key={index} variant="outline">
                        {capability.replace("_", " ")}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/enhanced-ai-analysis")}
                className="h-20 flex flex-col items-center justify-center space-y-2"
              >
                <Brain className="w-6 h-6" />
                <span>AI Analysis</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/upload")}
                className="h-20 flex flex-col items-center justify-center space-y-2"
              >
                <FileText className="w-6 h-6" />
                <span>Upload Logs</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/all-errors")}
                className="h-20 flex flex-col items-center justify-center space-y-2"
              >
                <Eye className="w-6 h-6" />
                <span>View Errors</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/reports")}
                className="h-20 flex flex-col items-center justify-center space-y-2"
              >
                <BarChart3 className="w-6 h-6" />
                <span>Generate Report</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdaptiveLayout>
  );
}
