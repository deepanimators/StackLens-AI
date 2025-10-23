import React, { useState, useEffect, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import styles from "./reports.module.css";
import { Pie, Doughnut, Line, Bar } from "react-chartjs-2";

// Progressive chart loading state
const useProgressiveChartLoader = () => {
  const [loadedCharts, setLoadedCharts] = useState<Set<string>>(new Set());

  const loadChart = (chartId: string) => {
    startTransition(() => {
      setLoadedCharts((prev) => {
        const newSet = new Set(prev);
        newSet.add(chartId);
        return newSet;
      });
    });
  };

  const isChartLoaded = (chartId: string) => loadedCharts.has(chartId);

  return { loadChart, isChartLoaded };
};

// Chart skeleton component
const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 bg-gray-200 rounded flex items-center justify-center">
      <div className="text-gray-500">Loading chart...</div>
    </div>
  </div>
);

// Section loading skeleton component
const SectionSkeleton = ({ title }: { title: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </div>
    </CardContent>
  </Card>
);

import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";

// Register chart components once
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdaptiveLayout from "@/components/adaptive-layout";
import {
  Calendar,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  BarChart3,
  Clock,
  Target,
  Users,
  Zap,
  AlertCircle,
  Loader2,
} from "lucide-react";

type ErrorTypeData = {
  type: string;
  count: number;
  percentage: number;
};

type SeverityDistribution = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

type TopFile = {
  fileName: string;
  totalErrors: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  analysisDate: string;
};

type Performance = {
  avgProcessingTime: string;
  successRate: number;
};

type Trends = {
  files?: number;
  errors?: number;
  critical?: number;
  resolution?: number;
};

// Import the authenticatedRequest and authenticatedFetch functions
import { authenticatedRequest, authenticatedFetch } from "@/lib/auth";

// Fetch real report data from API
const fetchReportData = async (selectedDateRange: string) => {
    try {
      console.log(`🔄 Fetching real report data from API for range: ${selectedDateRange}...`);

      // Use the proper reports API endpoint that includes trends with dynamic date range
      const reportsResponse = await authenticatedRequest(
        "GET",
        `/api/reports?range=${selectedDateRange}`
      );
    console.log("📊 Reports response:", reportsResponse);

    // Fallback to dashboard stats if reports API fails
    let dashboardResponse = null;
    try {
      dashboardResponse = await authenticatedRequest(
        "GET",
        "/api/dashboard/stats"
      );
    } catch (error) {
      console.warn("Dashboard API failed, using reports data only:", error);
    }

    // Calculate real statistics from the reports API response
    const summary = reportsResponse?.summary || {};
    const trends = reportsResponse?.trends || summary?.trends || {};
    
    const totalFiles = summary.totalFiles || 0;
    const totalErrors = summary.totalErrors || 0;
    const criticalErrors = summary.criticalErrors || 0;
    const resolvedErrors = summary.resolvedErrors || 0;
    const resolutionRate = summary.resolutionRate || 0;

    // Use severity distribution from API response
    const severityDistribution = reportsResponse?.severityDistribution || {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    // Use error types from API response 
    const errorTypes: ErrorTypeData[] = reportsResponse?.errorTypes || [];

    // Use top files from API response
    const topFiles: TopFile[] = reportsResponse?.topFiles || [];

    // Use performance data from API response
    const performance: Performance = reportsResponse?.performance || {
      avgProcessingTime: "0.0s",
      successRate: 0,
    };

    const realData = {
      summary: {
        totalFiles,
        totalErrors,
        criticalErrors,
        resolvedErrors,
        resolutionRate,
        trends: trends, // Add trends data from the reports API
      },
      errorTypes: reportsResponse?.errorTypes || errorTypes,
      severityDistribution: reportsResponse?.severityDistribution || severityDistribution,
      topFiles: reportsResponse?.topFiles || topFiles,
      performance: reportsResponse?.performance || performance,
    };

    console.log("✅ Real report data calculated:", realData);
    return realData;
  } catch (error) {
    console.error("❌ Failed to fetch real report data:", error);

    // In production, show error state - NO MOCK DATA
    if (import.meta.env.PROD) {
      // Return empty data structure to trigger "No data" UI
      const errorTypes: ErrorTypeData[] = [];
      const severityDistribution: SeverityDistribution = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
      const topFiles: TopFile[] = [];
      const performance: Performance = {
        avgProcessingTime: "0.0s",
        successRate: 0,
      };

      return {
        summary: {
          totalFiles: 0,
          totalErrors: 0,
          criticalErrors: 0,
          resolvedErrors: 0,
          resolutionRate: 0,
        },
        errorTypes,
        severityDistribution,
        topFiles,
        performance,
      };
    }

    // In development, log warning but still show empty state
    console.warn("⚠️ DEV MODE: Showing empty state instead of mock data");
    const errorTypes: ErrorTypeData[] = [];
    const severityDistribution: SeverityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    const topFiles: TopFile[] = [];
    const performance: Performance = {
      avgProcessingTime: "0.0s",
      successRate: 0,
    };

    return {
      summary: {
        totalFiles: 0,
        totalErrors: 0,
        criticalErrors: 0,
        resolvedErrors: 0,
        resolutionRate: 0,
      },
      errorTypes,
      severityDistribution,
      topFiles,
      performance,
    };
  }
};

// Enhanced Trends Analysis Component
const EnhancedTrendsAnalysis: React.FC<{ reportData: any; isActive?: boolean }> = ({
  reportData,
  isActive = false,
}) => {
  const [trendsData, setTrendsData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<string>("30d");
  const [isLoading, setIsLoading] = useState(false);
  const [loadedCharts, setLoadedCharts] = useState<Set<string>>(new Set());

  // Progressive chart loader
  const { loadChart, isChartLoaded } = useProgressiveChartLoader();

  // Load chart after a delay
  const loadChartWithDelay = (chartId: string, delay: number = 0) => {
    setTimeout(() => {
      startTransition(() => {
        loadChart(chartId);
        setLoadedCharts((prev) => {
          const newSet = new Set(prev);
          newSet.add(chartId);
          return newSet;
        });
      });
    }, delay);
  };

  // Start loading charts progressively when trends data is available
  useEffect(() => {
    if (trendsData && trendsData.errorIdentificationTrends) {
      // Load charts with faster staggered delays (reduced from 100-1500ms to 50-200ms)
      loadChartWithDelay("identification-trends", 50);
      loadChartWithDelay("similar-patterns", 100);
      loadChartWithDelay("resolution-analysis", 150);
      loadChartWithDelay("recommendation-chart", 200);
    }
  }, [trendsData]);

  // Fetch trends data from API using authenticated request
  const fetchTrendsData = async (selectedTimeframe: string) => {
    setIsLoading(true);
    console.log(
      `🔍 Attempting to fetch trends data for timeframe: ${selectedTimeframe}`
    );

    try {
      const url = `/api/trends/analysis?timeframe=${selectedTimeframe}`;
      console.log(`📡 Making authenticated request to: ${url}`);

      // Use authenticatedRequest instead of fetch
      const data = await authenticatedRequest("GET", url);
      console.log(`✅ Successfully fetched trends data:`, data);
        
      // Check if we got real data or empty results
      if (!data || (Array.isArray(data.errorIdentificationTrends) && data.errorIdentificationTrends.length === 0)) {
        console.log("ℹ️ No trends data available for selected timeframe");
        setTrendsData(null);
      } else {
        setTrendsData(data);
      }
    } catch (error) {
      console.error("💥 Failed to fetch trends data:", error);
      if (error instanceof Error) {
        console.error("Error type:", error.constructor.name);
        console.error("Error message:", error.message);
      }

      // Show empty state on error
      setTrendsData(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Only fetch data when component is active and not already loaded
    if (isActive && !trendsData && !isLoading) {
      fetchTrendsData(timeframe);
    }
  }, [isActive, timeframe]);

  // Generate mock trends data for demo
  const generateMockTrendsData = (timeframe: string) => {
    const intervals = timeframe === "7d" ? 7 : timeframe === "30d" ? 15 : 18;
    const now = new Date();

    return {
      timeframe,
      totalDataPoints: 150,
      analysisTimestamp: now.toISOString(),
      errorIdentificationTrends: Array.from({ length: intervals }, (_, i) => {
        const date = new Date(
          now.getTime() -
            (intervals - i - 1) *
              (timeframe === "7d"
                ? 24 * 60 * 60 * 1000
                : timeframe === "30d"
                ? 2 * 24 * 60 * 60 * 1000
                : 5 * 24 * 60 * 60 * 1000)
        );
        return {
          period: date.toISOString().split("T")[0],
          total_errors: Math.floor(Math.random() * 20) + 5,
          detection_methods: {
            ml_detected: Math.floor(Math.random() * 15) + 3,
            pattern_matched: Math.floor(Math.random() * 10) + 2,
            user_reported: Math.floor(Math.random() * 5) + 1,
            ai_suggested: Math.floor(Math.random() * 12) + 2,
          },
          identification_accuracy: 75 + Math.random() * 20,
        };
      }),
      similarErrorAnalysis: [
        {
          error_pattern: "Database connection timeout error",
          occurrence_count: 15,
          first_seen: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          last_seen: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          resolution_rate: 85.5,
          avg_resolution_time_hours: 2.5,
          severity_distribution: { critical: 3, high: 8, medium: 4, low: 0 },
          trend_direction: "decreasing",
        },
        {
          error_pattern: "Memory allocation failure",
          occurrence_count: 12,
          first_seen: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          last_seen: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          resolution_rate: 92.3,
          avg_resolution_time_hours: 1.8,
          severity_distribution: { critical: 4, high: 6, medium: 2, low: 0 },
          trend_direction: "stable",
        },
      ],
      resolutionTimeAnalysis: {
        total_resolved: 95,
        average_resolution_time_hours: 3.2,
        resolution_time_distribution: {
          "0-1h": 25,
          "1-4h": 45,
          "4-24h": 20,
          "1-3d": 5,
          "3d+": 0,
        },
        average_by_severity: {
          critical: 5.5,
          high: 3.2,
          medium: 2.1,
          low: 0.8,
        },
        ai_assisted_resolution_impact: {
          with_ai: 2.1,
          without_ai: 4.8,
        },
      },
      peakErrorTimesAnalysis: {
        hourly_distribution: Array.from({ length: 24 }, (_, hour) => ({
          hour: `${hour.toString().padStart(2, "0")}:00`,
          error_count: Math.floor(Math.random() * 10) + 1,
        })),
        daily_distribution: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ].map((day) => ({
          day,
          error_count: Math.floor(Math.random() * 25) + 5,
        })),
        peak_hour: "14:00",
        peak_day: "Wednesday",
        peak_hour_percentage: 12.5,
        peak_day_percentage: 18.2,
      },
      aiAccuracyTrends: Array.from({ length: intervals }, (_, i) => {
        const date = new Date(
          now.getTime() -
            (intervals - i - 1) *
              (timeframe === "7d"
                ? 24 * 60 * 60 * 1000
                : timeframe === "30d"
                ? 2 * 24 * 60 * 60 * 1000
                : 5 * 24 * 60 * 60 * 1000)
        );
        return {
          period: date.toISOString().split("T")[0],
          avg_confidence: 0.75 + Math.random() * 0.2,
          high_confidence_predictions: Math.floor(Math.random() * 15) + 5,
          total_predictions: Math.floor(Math.random() * 25) + 10,
          accuracy_rate: 70 + Math.random() * 25,
        };
      }),
      recommendations: [
        {
          type: "optimization",
          title: "Implement Predictive Error Prevention",
          message:
            "Based on patterns, 65% of errors could be prevented with proactive monitoring",
          action: "Set up automated alerts for high-risk patterns",
        },
        {
          type: "improvement",
          title: "Enhance AI Model Training",
          message: "AI accuracy has improved 15% over the last month",
          action: "Continue feeding the model with resolved error patterns",
        },
      ],
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading trends analysis...</p>
        </div>
      </div>
    );
  }

  if (!trendsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            No trends data available. Please try refreshing or check your
            connection.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Advanced Trends Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive analysis of error patterns, resolution trends, and
                AI performance
              </p>
            </div>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Error Identification Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Error Identification Methods Over Time
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How errors are being detected and identified across different
            methods
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loadedCharts.has("identification-trends") ? (
              <Line
                data={{
                  labels: trendsData.errorIdentificationTrends.map(
                    (item: any) => item.period
                  ),
                  datasets: [
                    {
                      label: "ML Detected",
                      data: trendsData.errorIdentificationTrends.map(
                        (item: any) => item.detection_methods.ml_detected
                      ),
                      borderColor: "#3b82f6",
                      backgroundColor: "rgba(59,130,246,0.1)",
                      fill: true,
                      tension: 0.4,
                    },
                    {
                      label: "Pattern Matched",
                      data: trendsData.errorIdentificationTrends.map(
                        (item: any) => item.detection_methods.pattern_matched
                      ),
                      borderColor: "#10b981",
                      backgroundColor: "rgba(16,185,129,0.1)",
                      fill: true,
                      tension: 0.4,
                    },
                    {
                      label: "AI Suggested",
                      data: trendsData.errorIdentificationTrends.map(
                        (item: any) => item.detection_methods.ai_suggested
                      ),
                      borderColor: "#8b5cf6",
                      backgroundColor: "rgba(139,92,246,0.1)",
                      fill: true,
                      tension: 0.4,
                    },
                    {
                      label: "User Reported",
                      data: trendsData.errorIdentificationTrends.map(
                        (item: any) => item.detection_methods.user_reported
                      ),
                      borderColor: "#f59e42",
                      backgroundColor: "rgba(245,158,66,0.1)",
                      fill: true,
                      tension: 0.4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "top" },
                    tooltip: {
                      mode: "index",
                      intersect: false,
                    },
                  },
                  scales: {
                    x: {
                      display: true,
                      title: {
                        display: true,
                        text: "Time Period",
                      },
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: "Number of Errors",
                      },
                    },
                  },
                  interaction: {
                    mode: "nearest",
                    axis: "x",
                    intersect: false,
                  },
                }}
              />
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Similar Error Patterns Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Recurring Error Pattern Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Similar errors found multiple times with resolution statistics
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trendsData.similarErrorAnalysis.map(
              (pattern: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <h4 className="font-semibold mb-2">
                        {pattern.error_pattern}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          {pattern.occurrence_count} occurrences
                        </span>
                        <span className="flex items-center gap-1">
                          {pattern.trend_direction === "increasing" ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          ) : pattern.trend_direction === "decreasing" ? (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          ) : (
                            <Activity className="h-4 w-4 text-blue-500" />
                          )}
                          {pattern.trend_direction}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Resolution Rate:</span>
                        <span className="font-medium">
                          {pattern.resolution_rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Avg Resolution Time:</span>
                        <span className="font-medium">
                          {pattern.avg_resolution_time_hours?.toFixed(1) ||
                            "N/A"}
                          h
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        Severity Distribution:
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span className="text-red-600">
                          Critical: {pattern.severity_distribution.critical}
                        </span>
                        <span className="text-orange-600">
                          High: {pattern.severity_distribution.high}
                        </span>
                        <span className="text-yellow-600">
                          Medium: {pattern.severity_distribution.medium}
                        </span>
                        <span className="text-green-600">
                          Low: {pattern.severity_distribution.low}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resolution Time Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Resolution Time Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut
                data={{
                  labels: Object.keys(
                    trendsData.resolutionTimeAnalysis
                      .resolution_time_distribution
                  ),
                  datasets: [
                    {
                      data: Object.values(
                        trendsData.resolutionTimeAnalysis
                          .resolution_time_distribution
                      ),
                      backgroundColor: [
                        "#22c55e",
                        "#3b82f6",
                        "#f59e42",
                        "#ef4444",
                        "#8b5cf6",
                      ],
                      borderWidth: 2,
                      borderColor: "#ffffff",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const total =
                            trendsData.resolutionTimeAnalysis.total_resolved;
                          const percentage = (
                            (context.parsed / total) *
                            100
                          ).toFixed(1);
                          return `${context.label}: ${context.parsed} errors (${percentage}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
            <div className="mt-4 text-center">
              <div className="text-2xl font-bold">
                {trendsData.resolutionTimeAnalysis.average_resolution_time_hours.toFixed(
                  1
                )}
                h
              </div>
              <div className="text-sm text-muted-foreground">
                Average Resolution Time
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI-Assisted vs Manual Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div>
                  <div className="font-semibold text-green-800 dark:text-green-200">
                    With AI Assistance
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    Faster resolution times
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {trendsData.resolutionTimeAnalysis.ai_assisted_resolution_impact.with_ai.toFixed(
                    1
                  )}
                  h
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div>
                  <div className="font-semibold text-red-800 dark:text-red-200">
                    Manual Resolution
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Traditional debugging
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {trendsData.resolutionTimeAnalysis.ai_assisted_resolution_impact.without_ai.toFixed(
                    1
                  )}
                  h
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                AI assistance reduces resolution time by{" "}
                <span className="font-semibold text-green-600">
                  {Math.round(
                    ((trendsData.resolutionTimeAnalysis
                      .ai_assisted_resolution_impact.without_ai -
                      trendsData.resolutionTimeAnalysis
                        .ai_assisted_resolution_impact.with_ai) /
                      trendsData.resolutionTimeAnalysis
                        .ai_assisted_resolution_impact.without_ai) *
                      100
                  )}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Error Times Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Peak Error Times - Hourly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar
                data={{
                  labels:
                    trendsData.peakErrorTimesAnalysis.hourly_distribution.map(
                      (item: any) => item.hour
                    ),
                  datasets: [
                    {
                      label: "Error Count",
                      data: trendsData.peakErrorTimesAnalysis.hourly_distribution.map(
                        (item: any) => item.error_count
                      ),
                      backgroundColor: "rgba(59,130,246,0.6)",
                      borderColor: "#3b82f6",
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    x: {
                      title: { display: true, text: "Hour of Day" },
                    },
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: "Error Count" },
                    },
                  },
                }}
              />
            </div>
            <div className="mt-2 text-sm text-muted-foreground text-center">
              Peak hour:{" "}
              <span className="font-semibold">
                {trendsData.peakErrorTimesAnalysis.peak_hour}
              </span>
              (
              {trendsData.peakErrorTimesAnalysis.peak_hour_percentage.toFixed(
                1
              )}
              % of all errors)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Peak Error Days - Weekly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar
                data={{
                  labels:
                    trendsData.peakErrorTimesAnalysis.daily_distribution.map(
                      (item: any) => item.day
                    ),
                  datasets: [
                    {
                      label: "Error Count",
                      data: trendsData.peakErrorTimesAnalysis.daily_distribution.map(
                        (item: any) => item.error_count
                      ),
                      backgroundColor: "rgba(16,185,129,0.6)",
                      borderColor: "#10b981",
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    x: {
                      title: { display: true, text: "Day of Week" },
                    },
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: "Error Count" },
                    },
                  },
                }}
              />
            </div>
            <div className="mt-2 text-sm text-muted-foreground text-center">
              Peak day:{" "}
              <span className="font-semibold">
                {trendsData.peakErrorTimesAnalysis.peak_day}
              </span>
              (
              {trendsData.peakErrorTimesAnalysis.peak_day_percentage.toFixed(1)}
              % of all errors)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Accuracy Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI Detection Accuracy Over Time
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tracking improvement in AI model performance and confidence levels
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line
              data={{
                labels: trendsData.aiAccuracyTrends.map(
                  (item: any) => item.period
                ),
                datasets: [
                  {
                    label: "Average Confidence",
                    data: trendsData.aiAccuracyTrends.map((item: any) =>
                      (item.avg_confidence * 100).toFixed(1)
                    ),
                    borderColor: "#8b5cf6",
                    backgroundColor: "rgba(139,92,246,0.1)",
                    fill: true,
                    tension: 0.4,
                    yAxisID: "y",
                  },
                  {
                    label: "Accuracy Rate (%)",
                    data: trendsData.aiAccuracyTrends.map(
                      (item: any) => item.accuracy_rate
                    ),
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16,185,129,0.1)",
                    fill: true,
                    tension: 0.4,
                    yAxisID: "y",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top" },
                },
                scales: {
                  x: {
                    title: { display: true, text: "Time Period" },
                  },
                  y: {
                    type: "linear",
                    display: true,
                    position: "left",
                    min: 0,
                    max: 100,
                    title: { display: true, text: "Percentage (%)" },
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend-Based Recommendations
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            AI-powered insights and suggestions based on trend analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {trendsData.recommendations.map((rec: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg bg-muted/20">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      rec.type === "warning"
                        ? "bg-yellow-100 text-yellow-600"
                        : rec.type === "optimization"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {rec.type === "warning" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : rec.type === "optimization" ? (
                      <Target className="h-4 w-4" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {rec.message}
                    </p>
                    <p className="text-sm font-medium text-blue-600">
                      Action: {rec.action}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Reports() {
  const [dateRange, setDateRange] = useState(() => {
    // Persist date range selection in localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reports-date-range') || '30d';
    }
    return '30d';
  });
  const [reportType, setReportType] = useState("summary");
  const { toast } = useToast();

  // Update localStorage when dateRange changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('reports-date-range', dateRange);
    }
  }, [dateRange]);

  type ReportSummary = {
    totalFiles: number;
    totalErrors: number;
    criticalErrors: number;
    resolvedErrors: number;
    resolutionRate: number;
    trends?: Trends;
  };

  const defaultSummary: ReportSummary = {
    totalFiles: 0,
    totalErrors: 0,
    criticalErrors: 0,
    resolvedErrors: 0,
    resolutionRate: 0,
    trends: {
      files: 0,
      errors: 0,
      critical: 0,
      resolution: 0,
    },
  };

  const {
    data: reportData = {
      summary: defaultSummary,
      errorTypes: [] as ErrorTypeData[],
      resolutionRate: 0,
      severityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
      topFiles: [] as TopFile[],
      performance: { avgProcessingTime: "0.0s", successRate: 0 },
    },
    isLoading: reportsLoading,
  } = useQuery({
    queryKey: ["reportData", dateRange],
    queryFn: () => fetchReportData(dateRange),
  });

  const handleExportReport = async (type: string) => {
    try {
      console.log(`🔽 Exporting report as ${type.toUpperCase()}`);
      
      // Show loading state
      const loadingToast = toast({
        title: "Exporting Report...",
        description: `Generating ${type.toUpperCase()} report`,
        duration: 0, // Don't auto-dismiss
      });

      // Make API call to export endpoint using raw fetch for non-JSON responses
      const response = await authenticatedFetch(
        "GET", 
        `/api/reports/export?format=${type}&range=${dateRange}&reportType=${reportType}`
      );

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      // Generate timestamp for filename
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Handle different response types
      if (type === 'csv') {
        const csvContent = await response.text();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stacklens-error-analysis-${dateRange}-${timestamp}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (type === 'pdf') {
        // For PDF, we get HTML that can be printed to PDF by browser
        const htmlContent = await response.text();
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        
        // Open in new window for print-to-PDF
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            // Auto-trigger print dialog after short delay
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        }
        
        // Also provide download option
        const a = document.createElement('a');
        a.href = url;
        a.download = `stacklens-error-analysis-${dateRange}-${timestamp}.html`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (type === 'xlsx') {
        const excelContent = await response.blob();
        const url = window.URL.createObjectURL(excelContent);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stacklens-error-analysis-${dateRange}-${timestamp}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      // Dismiss loading toast and show success
      loadingToast.dismiss();
      toast({
        title: "Export Successful",
        description: `${type.toUpperCase()} report downloaded successfully`,
      });

    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export ${type.toUpperCase()} report. Please try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <AdaptiveLayout
        title="Reports"
        subtitle="Comprehensive error analysis reports and insights"
      >
        {/* Report Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary Report</SelectItem>
                    <SelectItem value="detailed">Detailed Report</SelectItem>
                    <SelectItem value="trends">Trends Analysis</SelectItem>
                    <SelectItem value="performance">
                      Performance Report
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => handleExportReport("pdf")}
                >
                  {" "}
                  <Download className="h-4 w-4 mr-2" /> Export PDF{" "}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExportReport("csv")}
                >
                  {" "}
                  <Download className="h-4 w-4 mr-2" /> Export CSV{" "}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExportReport("xlsx")}
                >
                  {" "}
                  <Download className="h-4 w-4 mr-2" /> Export Excel{" "}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 my-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Files</p>
                  <p className="text-2xl font-bold">
                    {reportsLoading ? (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    ) : (
                      reportData?.summary?.totalFiles ?? 0
                    )}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2 flex items-center">
                {((reportData?.summary as any)?.trends?.files || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm ${((reportData?.summary as any)?.trends?.files || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(reportData?.summary as any)?.trends?.files !== undefined 
                    ? `${((reportData?.summary as any)?.trends?.files || 0) >= 0 ? '+' : ''}${(reportData?.summary as any)?.trends?.files}%`
                    : '0%'
                  }
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Errors</p>
                  <p className="text-2xl font-bold">
                    {reportsLoading ? (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    ) : (
                      reportData?.summary?.totalErrors ?? 0
                    )}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <div className="mt-2 flex items-center">
                {((reportData?.summary as any)?.trends?.errors || 0) <= 0 ? (
                  <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm ${((reportData?.summary as any)?.trends?.errors || 0) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(reportData?.summary as any)?.trends?.errors !== undefined
                    ? `${((reportData?.summary as any)?.trends?.errors || 0) >= 0 ? '+' : ''}${(reportData?.summary as any)?.trends?.errors}%`
                    : '0%'
                  }
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Critical Errors
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {reportsLoading ? (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    ) : (
                      reportData?.summary?.criticalErrors ?? 0
                    )}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-red-600" />
              </div>
              <div className="mt-2 flex items-center">
                {((reportData?.summary as any)?.trends?.critical || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
                )}
                <span className={`text-sm ${((reportData?.summary as any)?.trends?.critical || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {(reportData?.summary as any)?.trends?.critical !== undefined
                    ? `${((reportData?.summary as any)?.trends?.critical || 0) >= 0 ? '+' : ''}${(reportData?.summary as any)?.trends?.critical}%`
                    : '0%'
                  }
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Resolution Rate
                  </p>
                  <p className="text-2xl font-bold">
                    {reportsLoading ? (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    ) : (
                      <>
                        {(
                          ((reportData?.summary?.resolvedErrors ?? 0) /
                            (reportData?.summary?.totalErrors ?? 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </>
                    )}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2 flex items-center">
                {((reportData?.summary as any)?.trends?.resolution || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm ${((reportData?.summary as any)?.trends?.resolution || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(reportData?.summary as any)?.trends?.resolution !== undefined
                    ? `${((reportData?.summary as any)?.trends?.resolution || 0) >= 0 ? '+' : ''}${(reportData?.summary as any)?.trends?.resolution}%`
                    : '0%'
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Tabs */}
        {reportsLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionSkeleton title="Error Types Distribution" />
            <SectionSkeleton title="Severity Analysis" />
            <SectionSkeleton title="Top Error Files" />
            <SectionSkeleton title="Performance Metrics" />
          </div>
        ) : (
          <Tabs
            value={reportType}
            onValueChange={setReportType}
            className="w-full"
          >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Error Types Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Error Types Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData?.errorTypes.map((type: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-medium">{type.type}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            {type.count}
                          </span>
                          <Badge variant="secondary">
                            {type.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles["chart-container-pie"]}>
                    <Pie
                      data={{
                        labels: reportData.errorTypes.map((et: any) => et.type),
                        datasets: [
                          {
                            data: reportData.errorTypes.map(
                              (et: any) => et.count
                            ),
                            backgroundColor: [
                              "#ef4444",
                              "#f59e42",
                              "#fde047",
                              "#22c55e",
                              "#3b82f6",
                              "#a855f7",
                              "#f472b6",
                              "#6b7280",
                            ],
                          },
                        ],
                      }}
                      options={{
                        plugins: {
                          legend: { position: "right" },
                        },
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Severity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(reportData?.severityDistribution || {}).map(
                      ([severity, count]) => (
                        <div
                          key={severity}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                severity === "critical"
                                  ? "bg-red-500"
                                  : severity === "high"
                                  ? "bg-orange-500"
                                  : severity === "medium"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                            ></div>
                            <span className="font-medium capitalize">
                              {severity}
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`${
                              severity === "critical"
                                ? "bg-red-100 text-red-800"
                                : severity === "high"
                                ? "bg-orange-100 text-orange-800"
                                : severity === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {count as number}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Files */}
            <Card>
              <CardHeader>
                <CardTitle>Top Files by Error Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 px-4 font-medium text-muted-foreground">
                          File Name
                        </th>
                        <th className="py-2 px-4 font-medium text-muted-foreground">
                          Total Errors
                        </th>
                        <th className="py-2 px-4 font-medium text-muted-foreground">
                          Critical
                        </th>
                        <th className="py-2 px-4 font-medium text-muted-foreground">
                          High
                        </th>
                        <th className="py-2 px-4 font-medium text-muted-foreground">
                          Medium
                        </th>
                        <th className="py-2 px-4 font-medium text-muted-foreground">
                          Low
                        </th>
                        <th className="py-2 px-4 font-medium text-muted-foreground">
                          Analysis Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData?.topFiles?.map((file: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4 font-medium">
                            {file.fileName}
                          </td>
                          <td className="py-2 px-4 font-semibold">
                            {file.totalErrors}
                          </td>
                          <td className="py-2 px-4">
                            <Badge
                              variant="secondary"
                              className={
                                file.critical > 0
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-600"
                              }
                            >
                              {file.critical}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">
                            <Badge
                              variant="secondary"
                              className={
                                file.high > 0
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-gray-100 text-gray-600"
                              }
                            >
                              {file.high}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">
                            <Badge
                              variant="secondary"
                              className={
                                file.medium > 0
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-600"
                              }
                            >
                              {file.medium}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">
                            <Badge
                              variant="secondary"
                              className={
                                file.low > 0
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-600"
                              }
                            >
                              {file.low}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-muted-foreground">
                            {new Date(file.analysisDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {(!reportData?.topFiles ||
                        reportData.topFiles.length === 0) && (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-8 text-center text-muted-foreground"
                          >
                            No files with errors found. Upload some files to see
                            analysis.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Error Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Severity Breakdown */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Error Severity Breakdown
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">
                            Critical Errors
                          </span>
                        </div>
                        <Badge variant="destructive">
                          {reportData?.severityDistribution.critical || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium">
                            High Priority
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        >
                          {reportData?.severityDistribution.high || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium">
                            Medium Priority
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        >
                          {reportData?.severityDistribution.medium || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">
                            Low Priority (Info)
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {reportData?.severityDistribution.low || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Error Type Analysis */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Top Error Types
                    </h4>
                    <div className="space-y-2">
                      {reportData?.errorTypes
                        .slice(0, 5)
                        .map((errorType: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 rounded border"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {errorType.type}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {errorType.percentage.toFixed(1)}% of all errors
                              </div>
                            </div>
                            <Badge variant="outline">{errorType.count}</Badge>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Performance Insights */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Analysis Performance
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-lg font-bold">
                          {reportData?.performance.avgProcessingTime}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Avg Processing
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-lg font-bold">
                          {reportData?.performance.successRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Success Rate
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-lg font-bold">
                          {reportData?.summary.resolutionRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Resolution Rate
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Suggestions & Root Causes */}
            <Card>
              <CardHeader>
                <CardTitle>AI Suggestions & Root Causes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="font-medium text-green-800 dark:text-green-200">
                      Suggestion: Review database connection pooling settings to
                      reduce Database errors.
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Root Cause: High frequency of Database errors detected in
                      server.log. Consider optimizing DB pool size and retry
                      logic.
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="font-medium text-blue-800 dark:text-blue-200">
                      Suggestion: Implement exponential backoff for API retries
                      to minimize Network/API errors.
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Root Cause: Network/API errors are spiking during peak
                      hours. Backoff and circuit breaker patterns recommended.
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <div className="font-medium text-yellow-800 dark:text-yellow-200">
                      Suggestion: Add more granular error logging in UI
                      components for better traceability.
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Root Cause: UI errors are under-reported. Enhanced logging
                      will improve diagnosis and resolution.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <EnhancedTrendsAnalysis reportData={reportData} isActive={reportType === "trends"} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {reportData?.performance?.avgProcessingTime || "0.0s"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Avg. Processing Time
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {reportData?.performance?.successRate?.toFixed?.(1) ||
                        "0.0"}
                      %
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Analysis Success Rate
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {reportData?.performance?.totalAnalyses || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Analyses
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}
      </AdaptiveLayout>
    </>
  );
}
