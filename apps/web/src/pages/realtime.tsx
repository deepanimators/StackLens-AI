import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdaptiveLayout from "@/components/adaptive-layout";
import StatsCard from "@/components/stats-card";
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
} from "lucide-react";

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

  // Fetch realtime metrics
  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ["realtime-metrics", selectedWindow],
    queryFn: async () => {
      const response = await fetch(
        `/api/analytics/metrics?window=${selectedWindow}&limit=20`
      );
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
    refetchInterval: isAutoRefresh ? 5000 : false, // Auto-refresh every 5 seconds
  });

  // Fetch alerts
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ["realtime-alerts"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/alerts?status=active");
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
            value={`${((latestMetric?.throughput ?? 0)).toFixed(0)}`}
            icon={Zap}
            trend={{ value: "↑ Active", isPositive: true }}
            className="bg-gradient-to-br from-green-50 to-green-100 border-green-200/50 dark:from-green-950/20 dark:to-green-900/20 dark:border-green-800/30"
            suffix="msg/s"
          />
          <StatsCard
            title="P99 Latency"
            value={`${((latestMetric?.latency_p99 ?? 0)).toFixed(0)}`}
            icon={Clock}
            trend={{
              value: "Optimal",
              isPositive: (latestMetric?.latency_p99 ?? 0) < 500,
            }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200/50 dark:from-purple-950/20 dark:to-purple-900/20 dark:border-purple-800/30"
            suffix="ms"
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
                <span>Active Alerts</span>
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
                    className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{alert.rule_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.metric}: {(alert.value ?? 0).toFixed(2)} (threshold: {(alert.threshold ?? 0).toFixed(2)})
                      </p>
                    </div>
                    <Badge
                      variant={
                        alert.severity === "critical"
                          ? "destructive"
                          : alert.severity === "warning"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active alerts</p>
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
    </AdaptiveLayout>
  );
}
