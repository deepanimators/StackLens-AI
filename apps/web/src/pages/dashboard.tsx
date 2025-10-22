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
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);
import ErrorTable from "@/components/error-table";
import { authenticatedRequest, authenticatedFetch, authManager } from "@/lib/auth";
import {
  FileText,
  AlertTriangle,
  Flame,
  CheckCircle,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { SEVERITY_COLORS } from "@/lib/constants";

interface DashboardStats {
  totalFiles: number;
  totalErrors: number;
  resolvedErrors: number;
  pendingErrors: number;
  criticalErrors: number;
  highErrors: number;
  mediumErrors: number;
  lowErrors: number;
  resolutionRate: string;
  mlAccuracy: number;
  trends?: {
    files: { value: string; isPositive: boolean };
    errors: { value: string; isPositive: boolean };
    criticalErrors: { value: string; isPositive: boolean };
    resolutionRate: { value: string; isPositive: boolean };
  };
}

interface RecentFile {
  id: number;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: number;
  uploadTimestamp: string;
  analysisTimestamp: string | null;
  errorsDetected: string | null;
  anomalies: string | null;
  predictions: string | null;
  suggestions: string | null;
  totalErrors: number;
  criticalErrors: number;
  highErrors: number;
  mediumErrors: number;
  lowErrors: number;
  status: string;
  errorMessage: string | null;
  analysisResult: string | null;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<RecentFile | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await authenticatedRequest(
        "GET",
        "/api/dashboard/stats"
      );
      return response as Promise<DashboardStats>;
    },
  });

  const { data: recentFiles } = useQuery({
    queryKey: ["/api/files"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/files");
      // Handle the actual API response structure: { files: [...] }
      return (response.files || []) as RecentFile[];
    },
  });

  const { data: recentErrors } = useQuery({
    queryKey: ["/api/errors"],
    queryFn: async () => {
      const response = await authenticatedRequest(
        "GET",
        "/api/errors?limit=10"
      );
      return response.errors || [];
    },
  });

  const handleUploadClick = () => {
    setLocation("/upload");
  };

  const handleViewAnalysis = (file: RecentFile) => {
    setSelectedFile(file);
    // Navigate to analysis history with file filter
    setLocation(`/analysis-history?fileId=${file.id}&fileName=${encodeURIComponent(file.originalName)}`);
  };

  const handleExportFile = async (file: RecentFile) => {
    try {
      const response = await authenticatedFetch(
        "GET",
        `/api/export/errors?fileId=${file.id}&format=csv`
      );
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.originalName}_analysis.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "Analysis exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export analysis",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (file: RecentFile) => {
    if (
      !confirm("Are you sure you want to delete this file and its analysis?")
    ) {
      return;
    }

    try {
      await authenticatedRequest("DELETE", `/api/files/${file.id}`);
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      // Refresh the data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const severityData = stats
    ? [
        {
          severity: "critical" as const,
          count: stats.criticalErrors,
          percentage: (stats.criticalErrors / stats.totalErrors) * 100 || 0,
        },
        {
          severity: "high" as const,
          count: stats.highErrors,
          percentage: (stats.highErrors / stats.totalErrors) * 100 || 0,
        },
        {
          severity: "medium" as const,
          count: stats.mediumErrors,
          percentage: (stats.mediumErrors / stats.totalErrors) * 100 || 0,
        },
        {
          severity: "low" as const,
          count: stats.lowErrors,
          percentage: (stats.lowErrors / stats.totalErrors) * 100 || 0,
        },
      ]
    : [];

  return (
    <AdaptiveLayout
      title="Dashboard"
      subtitle="AI-Powered Log Analysis & System Health Monitoring"
      onUploadClick={handleUploadClick}
    >
      {/* AI Status Bar */}
      <Card className="border-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 border-primary/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
              <span className="text-sm font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI Analysis Engine: Active
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-muted-foreground">
                  Model Accuracy:{" "}
                  <span className="font-medium text-primary">
                    {stats?.mlAccuracy !== undefined ? `${stats.mlAccuracy}%` : "N/A"}
                  </span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-muted-foreground">
                  Processing:{" "}
                  <span className="font-medium text-green-600">Real-time</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard
          title="Total Files"
          value={stats?.totalFiles || 0}
          icon={FileText}
          trend={stats?.trends?.files || { value: "0%", isPositive: true }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200/50 dark:from-blue-950/20 dark:to-blue-900/20 dark:border-blue-800/30"
        />
        <StatsCard
          title="Total Errors"
          value={stats?.totalErrors || 0}
          icon={AlertTriangle}
          trend={stats?.trends?.errors || { value: "0%", isPositive: true }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200/50 dark:from-orange-950/20 dark:to-orange-900/20 dark:border-orange-800/30"
        />
        <StatsCard
          title="Critical Issues"
          value={stats?.criticalErrors || 0}
          icon={Flame}
          trend={stats?.trends?.criticalErrors || { value: "0%", isPositive: true }}
          className="bg-gradient-to-br from-red-50 to-red-100 border-red-200/50 dark:from-red-950/20 dark:to-red-900/20 dark:border-red-800/30"
        />
        <StatsCard
          title="Resolution Rate"
          value={stats?.resolutionRate || "0.0%"}
          icon={CheckCircle}
          trend={stats?.trends?.resolutionRate || { value: "0%", isPositive: true }}
          className="bg-gradient-to-br from-green-50 to-green-100 border-green-200/50 dark:from-green-950/20 dark:to-green-900/20 dark:border-green-800/30"
        />
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Error Trends Chart (Chart.js) */}
        <Card>
          <CardHeader>
            <CardTitle>Error Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <Line
              data={{
                labels: ["7D", "30D", "90D"],
                datasets: [
                  {
                    label: "Total Errors",
                    data: [
                      stats?.totalErrors || 0,
                      Math.round((stats?.totalErrors || 0) * 0.85),
                      Math.round((stats?.totalErrors || 0) * 0.7),
                    ],
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59,130,246,0.2)",
                    tension: 0.4,
                  },
                  {
                    label: "Critical Errors",
                    data: [
                      stats?.criticalErrors || 0,
                      Math.round((stats?.criticalErrors || 0) * 0.85),
                      Math.round((stats?.criticalErrors || 0) * 0.7),
                    ],
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239,68,68,0.2)",
                    tension: 0.4,
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: { position: "top" },
                },
                scales: {
                  y: { beginAtZero: true },
                },
                responsive: true,
              }}
            />
          </CardContent>
        </Card>

        {/* Severity Distribution (Chart.js Bar) */}
        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar
              data={{
                labels: severityData.map((item) => item.severity.toUpperCase()),
                datasets: [
                  {
                    label: "Count",
                    data: severityData.map((item) => item.count),
                    backgroundColor: [
                      "#ef4444",
                      "#f59e42",
                      "#fde047",
                      "#22c55e",
                    ],
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { beginAtZero: true },
                },
                responsive: true,
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Analysis</CardTitle>
            <Button
              variant="outline"
              onClick={() => setLocation("/analysis-history")}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-3 px-4 font-medium text-muted-foreground">
                    File Name
                  </th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">
                    Errors Found
                  </th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">
                    Critical
                  </th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">
                    Analysis Date
                  </th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(recentFiles) &&
                  recentFiles.slice(0, 5).map((file) => (
                    <tr key={file.id} className="border-b hover:bg-muted/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {file.originalName}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant="secondary"
                          className={getStatusColor(file.status)}
                        >
                          {file.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">{file.totalErrors || 0}</td>
                      <td className="py-4 px-4">
                        <span className="text-red-600">
                          {file.criticalErrors || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {new Date(file.uploadTimestamp).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAnalysis(file)}
                            className="text-primary hover:text-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportFile(file)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFile(file)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {(!recentFiles || recentFiles.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No files uploaded yet</p>
                <Button onClick={handleUploadClick} className="mt-2">
                  Upload your first file
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </AdaptiveLayout>
  );
}
