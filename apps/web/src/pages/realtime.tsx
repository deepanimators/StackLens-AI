import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { config } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdaptiveLayout from "@/components/adaptive-layout";
import StatsCard from "@/components/stats-card";
import AlertDetailsModal from "@/components/alert-details-modal";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Zap,
  Clock,
  Eye,
  RefreshCw,
  Pause,
  Play,
  Lightbulb,
  Zap as AlertIcon,
  AlertCircle,
  CheckCircle,
  Bug,
  Workflow,
  ExternalLink,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RealtimeMetrics {
  window: string;
  timestamp: string;
  total_requests: number;
  error_count: number;
  error_rate: number;
  latency_p50: number;
  latency_p99: number;
  throughput: number;
}

interface AlertData {
  id: string;
  rule_name: string;
  severity: "critical" | "warning" | "info";
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  status: "active" | "resolved";
}

export default function Realtime() {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [selectedWindow, setSelectedWindow] = useState<"1min" | "5min" | "1hour">("1min");
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [scenarios, setScenarios] = useState<{id: string, name: string}[]>([]);

  // Fetch scenarios on mount
  // POS Demo Backend runs on port 3000 - use dynamic URL based on current hostname
  const posBackendUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'http://localhost:3000';

  useEffect(() => {
    fetch(`${posBackendUrl}/api/scenarios`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setScenarios(data.scenarios);
        }
      })
      .catch(err => console.error("Failed to fetch scenarios", err));
  }, [posBackendUrl]);


  const handleSimulateError = async (scenarioId: string) => {
    if (!scenarioId) return;
    setIsSimulating(true);
    try {
      // Call the POS Demo App to simulate the error
      // 🎯 UPDATED: Using dynamic URL based on current hostname
      const response = await fetch(`${posBackendUrl}/api/simulate-error/${scenarioId}`, {
          method: 'POST',
      });
      
      // Refresh data shortly after
      setTimeout(() => {
        refetchMetrics();
        refetchAlerts();
      }, 1000);
    } catch (e) {
      console.error("Simulation failed", e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Fetch realtime metrics
  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ["realtime-metrics", selectedWindow],
    queryFn: async () => {
      // Calculate limit based on window (assuming 5s interval)
      // 1min = 12 points -> fetch 20 for safety
      // 5min = 60 points -> fetch 60
      // 1hour = 720 points -> fetch 720
      const limit = selectedWindow === '1min' ? 20 : selectedWindow === '5min' ? 60 : 720;
      
      const response = await fetch(
        `/api/analytics/metrics?window=${selectedWindow}&limit=${limit}`
      );
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
    refetchInterval: isAutoRefresh ? 5000 : false, // Auto-refresh every 5 seconds
  });

  // Fetch alerts with time window filtering
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ["realtime-alerts", selectedWindow],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/alerts?status=active&window=${selectedWindow}`);
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return response.json();
    },
    refetchInterval: isAutoRefresh ? 10000 : false, // Auto-refresh every 10 seconds
  });

  // Fetch health status
  const { data: healthData } = useQuery({
    queryKey: ["realtime-health"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/health-status");
      if (!response.ok) throw new Error("Failed to fetch health");
      return response.json();
    },
    refetchInterval: isAutoRefresh ? 5000 : false,
  });

  // Fetch AI analysis for active alerts - only when there are alerts
  const { data: aiAnalysisData } = useQuery({
    queryKey: ["realtime-ai-analysis", alertsData, selectedWindow],
    queryFn: async () => {
      const alerts = alertsData?.data?.alerts || [];
      if (alerts.length === 0) return { data: { hasErrors: false, analysis: null } };
      
      try {
        const response = await fetch("/api/analytics/ai-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alerts: alerts,
            metrics: metricsData?.data?.metrics?.[metricsData.data.metrics.length - 1] || null,
            window: selectedWindow
          })
        });
        if (!response.ok) throw new Error("Failed to fetch AI analysis");
        return response.json();
      } catch (error) {
        console.error("AI analysis error:", error);
        return { data: { hasErrors: false, analysis: null } };
      }
    },
    enabled: Boolean(alertsData?.data?.alerts?.length),
    refetchInterval: isAutoRefresh ? 15000 : false, // Refresh AI analysis every 15 seconds
    placeholderData: (previousData: any) => previousData, // Prevent blinking by keeping previous data while fetching
  });

  // Prepare chart data
  const metrics: RealtimeMetrics[] = metricsData?.data?.metrics || [];
  
  const chartData = {
    labels: metrics.map((m) => m.timestamp).reverse(),
    datasets: [
      {
        label: "Error Rate (%)",
        data: metrics.map((m) => m.error_rate).reverse(),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: "y",
      },
      {
        label: "Throughput (req/s)",
        data: metrics.map((m) => m.throughput).reverse(),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: "y1",
      },
    ],
  };

  const latencyChartData = {
    labels: metrics.map((m) => m.timestamp).reverse(),
    datasets: [
      {
        label: "P50 Latency (ms)",
        data: metrics.map((m) => m.latency_p50).reverse(),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      {
        label: "P99 Latency (ms)",
        data: metrics.map((m) => m.latency_p99).reverse(),
        borderColor: "rgb(168, 85, 247)",
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: true,
          text: "Error Rate (%)",
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        title: {
          display: true,
          text: "Throughput (req/s)",
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const latencyChartOptions = {
    responsive: true,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "Latency (ms)",
        },
      },
    },
  };

  const latestMetric = metrics[metrics.length - 1] || {
    error_rate: 0,
    latency_p99: 0,
    throughput: 0,
    error_count: 0,
  };

  const alerts: AlertData[] = alertsData?.data?.alerts || [];
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;
  const warningAlerts = alerts.filter((a) => a.severity === "warning").length;

  const handleViewAlertDetails = (alert: AlertData) => {
    setSelectedAlert(alert);
    setShowAlertModal(true);
  };

  return (
    <AdaptiveLayout
      title="Real-time Analytics"
      subtitle="Live monitoring and alerting dashboard"
      onUploadClick={() => {}}
    >
      <div className="space-y-6">
        {/* Control Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Window:</span>
            {(["1min", "5min", "1hour"] as const).map((window) => (
              <Button
                key={window}
                variant={selectedWindow === window ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedWindow(window)}
              >
                {window === "1min" ? "1 Min" : window === "5min" ? "5 Min" : "1 Hour"}
              </Button>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className="flex items-center space-x-2"
            >
              {isAutoRefresh ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Resume</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchMetrics();
                refetchAlerts();
              }}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Error Simulation Card */}
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Bug className="h-5 w-5 text-purple-600" />
              <span>Error Simulation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-full md:w-64">
                <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Error Scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => handleSimulateError(selectedScenario)}
                disabled={!selectedScenario || isSimulating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSimulating ? "Simulating..." : "Trigger Error"}
              </Button>
              
              <div className="h-6 w-px bg-border hidden md:block" />
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Quick Triggers:</span>
                <Button variant="outline" size="sm" onClick={() => handleSimulateError('PAY_006')}>
                  Wallet Fail
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSimulateError('NET_004')}>
                  DNS Fail
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSimulateError('HW_005')}>
                  Scale Error
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Status */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span>System Status</span>
              </CardTitle>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold text-green-600">
                  {healthData?.data?.status === "healthy" ? "✓ Healthy" : "⚠ Degraded"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-lg font-semibold">{Math.floor((healthData?.data?.uptime || 0) / 3600)}h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Messages/s</p>
                <p className="text-lg font-semibold">{(latestMetric?.throughput ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Latency (P99)</p>
                <p className="text-lg font-semibold">{(latestMetric?.latency_p99 ?? 0).toFixed(0)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Error Analysis */}
        {aiAnalysisData?.data?.hasErrors && aiAnalysisData?.data?.analysis && (
          <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5 text-amber-600" />
                    <span>AI Error Analysis</span>
                  </CardTitle>
                  <Button variant="outline" size="sm" className="h-7 text-xs flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                    <Workflow className="h-3 w-3" />
                    AI Automation Workflow
                  </Button>
                  {aiAnalysisData.data.aiProvider && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-7 text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300">
                        {aiAnalysisData.data.aiProvider}
                      </Badge>
                      {aiAnalysisData.data.aiResponseTimeMs && (
                        <Badge variant="outline" className="h-7 text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300">
                          <Clock className="h-3 w-3 mr-1" />
                          {aiAnalysisData.data.aiResponseTimeMs}ms
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <Badge 
                  className={`${
                    aiAnalysisData.data.analysis.severity === "critical" 
                      ? "bg-red-600 hover:bg-red-700" 
                      : aiAnalysisData.data.analysis.severity === "high"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : aiAnalysisData.data.analysis.severity === "medium"
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white`}
                >
                  {aiAnalysisData.data.analysis.severity?.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Categories and Types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Error Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysisData.data.analysis.errorCategories?.map((category: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Error Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysisData.data.analysis.errorTypes?.map((type: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pattern and Root Cause */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Error Pattern</h4>
                <p className="text-sm text-foreground">{aiAnalysisData.data.analysis.pattern}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Root Cause</h4>
                <p className="text-sm text-foreground">{aiAnalysisData.data.analysis.rootCause}</p>
              </div>

              {/* Impact */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">System Impact</h4>
                <p className="text-sm text-foreground">{aiAnalysisData.data.analysis.estimatedImpact}</p>
              </div>

              {/* Immediate Actions */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>Immediate Actions</span>
                </h4>
                <ul className="space-y-1">
                  {aiAnalysisData.data.analysis.immediateActions?.map((action: string, idx: number) => (
                    <li key={idx} className="text-sm flex items-start space-x-2">
                      <span className="text-red-600 font-bold">→</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggestions */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center space-x-1">
                  <Lightbulb className="h-4 w-4" />
                  <span>AI Suggestions</span>
                </h4>
                <ul className="space-y-1">
                  {aiAnalysisData.data.analysis.suggestions?.map((suggestion: string, idx: number) => (
                    <li key={idx} className="text-sm flex items-start space-x-2">
                      <span className="text-amber-600 font-bold">✓</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Long Term Fixes */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Long-term Fixes</span>
                </h4>
                <ul className="space-y-1">
                  {aiAnalysisData.data.analysis.longTermFixes?.map((fix: string, idx: number) => (
                    <li key={idx} className="text-sm flex items-start space-x-2">
                      <span className="text-green-600 font-bold">⚙</span>
                      <span>{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Jira Integration */}
              {aiAnalysisData.data.analysis.jiraTicket && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <img src="https://cdn.icon-icons.com/icons2/2699/PNG/512/atlassian_jira_logo_icon_170511.png" alt="Jira" className="w-4 h-4" />
                      Jira Ticket Created
                    </span>
                    <a 
                      href={aiAnalysisData.data.analysis.jiraLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 hover:underline"
                    >
                      {aiAnalysisData.data.analysis.jiraTicket}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    A Jira ticket has been automatically created for this issue. Status: <strong>{aiAnalysisData.data.analysis.jiraStatus}</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title="Error Rate"
            value={`${((latestMetric?.error_rate ?? 0)).toFixed(2)}%`}
            icon={AlertTriangle}
            trend={{
              value: `${(Math.random() * 10 - 5).toFixed(1)}%`,
              isPositive: (latestMetric?.error_rate ?? 0) < 5,
            }}
            className="bg-gradient-to-br from-red-50 to-red-100 border-red-200/50 dark:from-red-950/20 dark:to-red-900/20 dark:border-red-800/30"
          />
          <StatsCard
            title="Throughput"
            value={`${((latestMetric?.throughput ?? 0)).toFixed(0)} msg/s`}
            icon={Zap}
            trend={{ value: "↑ Active", isPositive: true }}
            className="bg-gradient-to-br from-green-50 to-green-100 border-green-200/50 dark:from-green-950/20 dark:to-green-900/20 dark:border-green-800/30"
          />
          <StatsCard
            title="P99 Latency"
            value={`${((latestMetric?.latency_p99 ?? 0)).toFixed(0)} ms`}
            icon={Clock}
            trend={{
              value: "Optimal",
              isPositive: (latestMetric?.latency_p99 ?? 0) < 500,
            }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200/50 dark:from-purple-950/20 dark:to-purple-900/20 dark:border-purple-800/30"
          />
          <StatsCard
            title="Total Errors"
            value={latestMetric?.error_count ?? 0}
            icon={TrendingUp}
            trend={{
              value: `Last ${selectedWindow}`,
              isPositive: (latestMetric?.error_count ?? 0) === 0,
            }}
            className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200/50 dark:from-orange-950/20 dark:to-orange-900/20 dark:border-orange-800/30"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Error Rate & Throughput</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="h-72 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Latency Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length > 0 ? (
                <Line data={latencyChartData} options={latencyChartOptions} />
              ) : (
                <div className="h-72 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <Card className={`border-l-4 ${criticalAlerts > 0 ? "border-l-red-500" : "border-l-blue-500"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Active Alerts (Last {selectedWindow === "1min" ? "1 Minute" : selectedWindow === "5min" ? "5 Minutes" : "1 Hour"})</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                {criticalAlerts > 0 && (
                  <Badge variant="destructive">
                    {criticalAlerts} Critical
                  </Badge>
                )}
                {warningAlerts > 0 && (
                  <Badge variant="secondary">
                    {warningAlerts} Warnings
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {alerts.slice(0, 10).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-sm">{alert.rule_name}</p>
                        <Badge
                          variant={
                            alert.severity === "critical"
                              ? "destructive"
                              : alert.severity === "warning"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {alert.metric}: {(alert.value ?? 0).toFixed(2)} (threshold: {(alert.threshold ?? 0).toFixed(2)})
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAlertDetails(alert)}
                      className="ml-4"
                    >
                      View More
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active alerts in the selected time window</p>
                <p className="text-xs mt-1">Showing alerts from the last {selectedWindow === "1min" ? "1 minute" : selectedWindow === "5min" ? "5 minutes" : "1 hour"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date().toLocaleTimeString()}
          {isAutoRefresh && " • Auto-refreshing every 5 seconds"}
        </div>
      </div>

      {/* Alert Details Modal */}
      <AlertDetailsModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        alert={selectedAlert}
        aiAnalysis={aiAnalysisData?.data?.analysis || null}
      />
    </AdaptiveLayout>
  );
}
