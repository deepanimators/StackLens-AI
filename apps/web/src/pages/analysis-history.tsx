import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdaptiveLayout from "@/components/adaptive-layout";
import ProgressBar from "@/components/progress-bar";
import { authenticatedRequest, authManager } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Download,
  Eye,
  Clock,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

interface AnalysisHistory {
  id: number;
  fileId: number;
  userId: number;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadTimestamp: string;
  analysisTimestamp: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  currentStep: string;
  totalErrors: number;
  criticalErrors: number;
  highErrors: number;
  mediumErrors: number;
  lowErrors: number;
  processingTime: number;
  modelAccuracy: number;
  storeNumber?: string | null; // Store number from log file
  kioskNumber?: string | null; // Kiosk number from log file
  // Additional fields from API
  analysisDate?: string; // Backward compatibility
  fileName?: string; // From file lookup
}

interface LogFile {
  id: number;
  filename: string;
  originalName: string;
  size: number;
  analysisStatus: string;
  uploadedAt: string;
  analysisId?: number; // Add analysis ID link
}

interface ErrorPattern {
  pattern: string;
  count: number;
  severity: string;
  errorType: string;
  examples: string[];
}

export default function AnalysisHistoryPage() {
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<AnalysisHistory | null>(null);
  const [showErrorPatterns, setShowErrorPatterns] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [filterFileId, setFilterFileId] = useState<number | null>(null);
  const [filterFileName, setFilterFileName] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle URL parameters for filtering by file
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fileIdParam = urlParams.get('fileId');
    const fileNameParam = urlParams.get('fileName');
    
    if (fileIdParam) {
      const fileId = parseInt(fileIdParam);
      if (!isNaN(fileId)) {
        setFilterFileId(fileId);
        setFilterFileName(fileNameParam ? decodeURIComponent(fileNameParam) : '');
        console.log("📁 Filtering analysis history by file:", { fileId, fileName: fileNameParam });
      }
    }
  }, []);

  // Fetch analysis history (completed analyses)
  const {
    data: analysisData,
    isLoading,
    error: historyError,
  } = useQuery({
    queryKey: ["/api/analysis/history", filterFileId],
    queryFn: async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append("limit", "100");
        
        if (filterFileId) {
          params.append("fileId", filterFileId.toString());
        }
        
        const queryString = params.toString() ? `?${params.toString()}` : "?limit=100";
        
        // Request with reasonable limit for display but get statistics for all records
        const data = await authenticatedRequest(
          "GET",
          `/api/analysis/history${queryString}`
        );
        console.log("📊 Analysis history response:", data);

        // Handle paginated response structure
        if (data && Array.isArray(data.history)) {
          console.log("✅ Analysis history data received");
          console.log(
            `📈 Total analyses from API statistics: ${
              data.statistics?.totalAnalyses || data.history.length
            }`
          );
          console.log(
            `📈 Total errors from API statistics: ${
              data.statistics?.totalErrors || 0
            }`
          );

          const mappedHistory = data.history.map((item: any) => ({
            ...item,
            filename: item.fileName || item.filename, // Map fileName to filename
            analysisDate: item.uploadDate || item.analysisDate, // Map uploadDate to analysisDate
            analysisTimestamp: item.uploadDate || item.analysisTimestamp,
            uploadTimestamp: item.uploadDate || item.uploadTimestamp,
          }));

          return {
            history: mappedHistory,
            statistics: data.statistics || {
              totalAnalyses: mappedHistory.length,
              totalErrors: mappedHistory.reduce(
                (sum: number, item: any) => sum + (item.totalErrors || 0),
                0
              ),
              totalCriticalErrors: mappedHistory.reduce(
                (sum: number, item: any) => sum + (item.criticalErrors || 0),
                0
              ),
              totalHighErrors: mappedHistory.reduce(
                (sum: number, item: any) => sum + (item.highErrors || 0),
                0
              ),
              totalMediumErrors: mappedHistory.reduce(
                (sum: number, item: any) => sum + (item.mediumErrors || 0),
                0
              ),
              totalLowErrors: mappedHistory.reduce(
                (sum: number, item: any) => sum + (item.lowErrors || 0),
                0
              ),
            },
            pagination: data.pagination,
          };
        }

        // Fallback for direct array response
        if (Array.isArray(data)) {
          const mappedData = data.map((item: any) => ({
            ...item,
            filename: item.fileName || item.filename, // Map fileName to filename
            analysisDate: item.uploadDate || item.analysisDate, // Map uploadDate to analysisDate
            analysisTimestamp: item.uploadDate || item.analysisTimestamp,
            uploadTimestamp: item.uploadDate || item.uploadTimestamp,
          }));
          return {
            history: mappedData,
            statistics: {
              totalAnalyses: mappedData.length,
              totalErrors: mappedData.reduce(
                (sum: number, item: any) => sum + (item.totalErrors || 0),
                0
              ),
              totalCriticalErrors: mappedData.reduce(
                (sum: number, item: any) => sum + (item.criticalErrors || 0),
                0
              ),
              totalHighErrors: mappedData.reduce(
                (sum: number, item: any) => sum + (item.highErrors || 0),
                0
              ),
              totalMediumErrors: mappedData.reduce(
                (sum: number, item: any) => sum + (item.mediumErrors || 0),
                0
              ),
              totalLowErrors: mappedData.reduce(
                (sum: number, item: any) => sum + (item.lowErrors || 0),
                0
              ),
            },
            pagination: null,
          };
        }

        console.warn(
          "Unexpected analysis history API response structure:",
          data
        );
        return {
          history: [],
          statistics: {
            totalAnalyses: 0,
            totalErrors: 0,
            totalCriticalErrors: 0,
            totalHighErrors: 0,
            totalMediumErrors: 0,
            totalLowErrors: 0,
          },
          pagination: null,
        };
      } catch (error) {
        console.error("Analysis History API Error:", error);
        throw error;
      }
    },
    refetchInterval: (data) => {
      // Only poll frequently if there are processing items
      const hasProcessing =
        Array.isArray(data) &&
        data.some(
          (item: any) =>
            item.status === "processing" || item.status === "pending"
        );
      return hasProcessing ? 10000 : 30000; // 10s if processing, 30s otherwise
    },
    staleTime: 5000, // Cache for 5 seconds to reduce unnecessary requests
  });

  // Extract analysis history and statistics from the API response
  const analysisHistory = analysisData?.history || [];
  const statistics = analysisData?.statistics || {
    totalAnalyses: 0,
    totalErrors: 0,
    totalCriticalErrors: 0,
    totalHighErrors: 0,
    totalMediumErrors: 0,
    totalLowErrors: 0,
  };

  // Fetch all files including processing ones
  const { data: logFiles, error: filesError } = useQuery({
    queryKey: ["/api/files"],
    queryFn: async (): Promise<LogFile[]> => {
      try {
        const data = await authenticatedRequest("GET", "/api/files");
        console.log("Log Files API Response:", data); // Debug log

        // Handle paginated response structure
        if (data && Array.isArray(data.files)) {
          return data.files;
        }

        // Fallback for direct array response
        if (Array.isArray(data)) {
          return data;
        }

        console.warn("Unexpected API response structure:", data);
        return [];
      } catch (error) {
        console.error("Files API Error:", error);
        throw error;
      }
    },
    refetchInterval: (data) => {
      // Only poll frequently if there are processing files
      const hasProcessing =
        Array.isArray(data) &&
        data.some(
          (file: any) =>
            file.analysisStatus === "processing" ||
            file.analysisStatus === "pending"
        );
      return hasProcessing ? 15000 : false; // 15s if processing, no polling otherwise
    },
    staleTime: 10000, // Cache for 10 seconds
  });

  // Fetch error patterns for selected analysis
  const {
    data: errorPatterns,
    isLoading: patternsLoading,
    error: patternsError,
  } = useQuery({
    queryKey: [
      `/api/analysis/${selectedAnalysis?.id}/patterns`,
      showErrorPatterns,
    ],
    queryFn: async (): Promise<ErrorPattern[]> => {
      console.log(`🔍 Frontend Query: Query function called!`);
      console.log(
        `🔍 Frontend Query: selectedAnalysis exists: ${!!selectedAnalysis}`
      );
      console.log(`🔍 Frontend Query: showErrorPatterns: ${showErrorPatterns}`);
      console.log(`🔍 Frontend Query: selectedAnalysis:`, selectedAnalysis);

      if (!selectedAnalysis) {
        console.log("🔍 Frontend: No selectedAnalysis, returning empty array");
        return [];
      }

      if (!showErrorPatterns) {
        console.log(
          "🔍 Frontend: showErrorPatterns is false, returning empty array"
        );
        return [];
      }

      console.log(
        `🔍 Frontend: Starting patterns query for analysis ID: ${selectedAnalysis.id}`
      );
      console.log(
        "🔍 Frontend: Selected analysis for patterns:",
        selectedAnalysis
      );

      try {
        const data = await authenticatedRequest(
          "GET",
          `/api/analysis/${selectedAnalysis.id}/patterns`
        );

        console.log("🔍 Frontend: Error Patterns API Response:", data);

        // Handle response structure - server returns { patterns: [...] }
        if (data && Array.isArray(data.patterns)) {
          console.log(
            `🔍 Frontend: Found ${data.patterns.length} patterns in response`
          );
          return data.patterns;
        }

        // Fallback for direct array
        if (Array.isArray(data)) {
          console.log(`🔍 Frontend: Direct array with ${data.length} patterns`);
          return data;
        }

        console.log(
          "🔍 Frontend: No valid patterns found in response, returning empty array"
        );
        return [];
      } catch (error) {
        console.error(`🔍 Frontend: Patterns API error:`, error);
        return [];
      }
    },
    enabled: (() => {
      const isEnabled = !!selectedAnalysis && showErrorPatterns;
      console.log(
        `🔍 Frontend Query: Query enabled: ${isEnabled} (selectedAnalysis: ${!!selectedAnalysis}, showErrorPatterns: ${showErrorPatterns})`
      );
      return isEnabled;
    })(),
    retry: false, // Don't retry on failure for debugging
  });

  // Combine completed analyses with processing files
  const combinedHistory = React.useMemo(() => {
    // Ensure analysisHistory is always an array
    const historyArray = Array.isArray(analysisHistory) ? analysisHistory : [];
    // Ensure logFiles is always an array
    const filesArray = Array.isArray(logFiles) ? logFiles : [];

    const completed = historyArray.map((analysis) => ({
      ...analysis,
      // Ensure completed analyses show 100% progress
      progress: analysis.status === "completed" ? 100 : analysis.progress || 0,
    }));

    const processing = filesArray
      .filter(
        (file) =>
          file.analysisStatus === "processing" ||
          file.analysisStatus === "pending"
      )
      .map((file) => {
        // Get real-time progress from analysis_history if available
        const matchingAnalysis = historyArray.find(
          (analysis) =>
            analysis.fileId === file.id &&
            (analysis.status === "processing" || analysis.status === "pending")
        );

        return {
          id: file.id,
          fileId: file.id,
          userId: 0,
          totalErrors: 0,
          criticalErrors: 0,
          highErrors: 0,
          mediumErrors: 0,
          lowErrors: 0,
          analysisDate: file.uploadedAt,
          processingTime: 0,
          modelAccuracy: 0,
          status: file.analysisStatus as
            | "pending"
            | "processing"
            | "completed"
            | "failed",
          fileName: file.originalName,
          filename: file.originalName,
          fileType:
            file.originalName.split(".").pop()?.toLowerCase() || "unknown",
          fileSize: file.size || 0,
          uploadTimestamp: file.uploadedAt,
          analysisTimestamp: "",
          // Use real progress from analysis_history if available
          progress:
            matchingAnalysis?.progress ||
            (file.analysisStatus === "pending" ? 0 : 25),
          currentStep:
            matchingAnalysis?.currentStep ||
            (file.analysisStatus === "pending"
              ? "Waiting to start analysis"
              : "Analyzing file content"),
        };
      });

    // Filter out processing files that already have completed analysis
    const completedFileIds = new Set(completed.map((a) => a.fileId));
    const filteredProcessing = processing.filter(
      (p) => !completedFileIds.has(p.fileId)
    );

    return [...filteredProcessing, ...completed].sort(
      (a, b) =>
        new Date(
          b.analysisDate || b.analysisTimestamp || b.uploadTimestamp
        ).getTime() -
        new Date(
          a.analysisDate || a.analysisTimestamp || a.uploadTimestamp
        ).getTime()
    );
  }, [analysisHistory, logFiles]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await authenticatedRequest(
        "DELETE",
        `/api/analysis/history/${id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Success",
        description: "Analysis deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete analysis",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return await authenticatedRequest(
        "POST",
        "/api/analysis/history/bulk-delete",
        { historyIds: ids }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Success",
        description: `${data.totalDeleted} analyses deleted successfully`,
      });
      setSelectedItems([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete analyses",
        variant: "destructive",
      });
    },
  });

  const retriggerAnalysisMutation = useMutation({
    mutationFn: async () => {
      return await authenticatedRequest(
        "POST",
        "/api/analysis/retrigger-pending"
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Success",
        description: `${
          data.retriggeredCount || 0
        } pending analyses retriggered successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to retrigger pending analyses",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setItemToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length > 0) {
      bulkDeleteMutation.mutate(selectedItems);
    }
  };

  const toggleSelectItem = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allIds = combinedHistory.map((item) => item.id);
    setSelectedItems(allIds);
  };

  const deselectAll = () => {
    setSelectedItems([]);
  };

  const handleExport = async (analysis: AnalysisHistory) => {
    try {
      // Make a direct fetch request since we need the blob response
      const token = authManager.getToken();
      const response = await fetch(
        `/api/export/errors?analysisId=${analysis.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analysis-${analysis.id}.csv`;
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown Date";

    try {
      let timestamp = parseInt(dateString);
      // Convert Unix timestamp (seconds) to milliseconds if needed
      if (timestamp < 10000000000) {
        // Unix timestamp in seconds
        timestamp = timestamp * 1000;
      }

      const date = new Date(timestamp);
      if (
        isNaN(date.getTime()) ||
        date.getFullYear() > 3000 ||
        date.getFullYear() < 2020
      ) {
        return "Unknown Date";
      }
      return date.toLocaleDateString();
    } catch (error) {
      return "Unknown Date";
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Unknown Date";

    try {
      let timestamp = parseInt(dateString);
      // Convert Unix timestamp (seconds) to milliseconds if needed
      if (timestamp < 10000000000) {
        // Unix timestamp in seconds
        timestamp = timestamp * 1000;
      }

      const date = new Date(timestamp);
      if (
        isNaN(date.getTime()) ||
        date.getFullYear() > 3000 ||
        date.getFullYear() < 2020
      ) {
        return "Unknown Date";
      }
      return date.toLocaleString();
    } catch (error) {
      return "Unknown Date";
    }
  };

  const getFileName = (fileId: number) => {
    // Ensure logFiles is an array before calling find
    if (!Array.isArray(logFiles)) {
      console.warn("logFiles is not an array:", logFiles);
      return "Unknown File";
    }
    const file = logFiles.find((f) => f.id === fileId);
    console.log(
      `🔍 getFileName: Looking for fileId ${fileId} in logFiles:`,
      logFiles
    );
    console.log(`🔍 getFileName: Found file:`, file);
    return file?.originalName || "Unknown File";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatProcessingTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "N/A";
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <AdaptiveLayout
      title="Analysis History"
      subtitle={filterFileId ? `Showing analysis for: ${filterFileName || `File ID ${filterFileId}`}` : "Review your past log file analyses"}
    >
      {/* File Filter Alert */}
      {filterFileId && (
        <Alert className="mb-4">
          <AlertDescription className="flex items-center justify-between">
            <span>
              Showing analysis results for <strong>{filterFileName || `File ID ${filterFileId}`}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterFileId(null);
                setFilterFileName("");
                // Clear URL parameters
                window.history.replaceState({}, '', window.location.pathname);
              }}
            >
              Show All Files
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Analyses</p>
                <p className="text-2xl font-bold">{statistics.totalAnalyses}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Errors</p>
                <p className="text-2xl font-bold">{statistics.totalErrors}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">
                  {statistics.totalCriticalErrors}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Accuracy</p>
                <p className="text-2xl font-bold">
                  {Array.isArray(analysisHistory) &&
                  analysisHistory.length &&
                  analysisHistory.some((a) => a.modelAccuracy > 0)
                    ? (
                        analysisHistory.reduce(
                          (sum, a) => sum + (a.modelAccuracy || 0),
                          0
                        ) /
                        analysisHistory.filter((a) => a.modelAccuracy > 0)
                          .length
                      ).toFixed(1) + "%"
                    : "0.0%"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Analysis History</CardTitle>
            <div className="flex items-center space-x-2">
              {selectedItems.length > 0 ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.length} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                </>
              ) : (
                combinedHistory &&
                combinedHistory.some(
                  (item) =>
                    item.status === "processing" || item.status === "pending"
                ) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => retriggerAnalysisMutation.mutate()}
                    disabled={retriggerAnalysisMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retrigger Pending Analysis
                  </Button>
                )
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : combinedHistory && combinedHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={
                          selectedItems.length === combinedHistory.length &&
                          combinedHistory.length > 0
                        }
                        onChange={() =>
                          selectedItems.length === combinedHistory.length
                            ? deselectAll()
                            : selectAll()
                        }
                        className="rounded"
                        title="Select all items"
                        aria-label="Select all items"
                      />
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      File Name
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Store
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Kiosk
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Progress
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Total Errors
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Critical
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      High
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Medium
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Low
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Processing Time
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Accuracy
                    </th>
                    <th className="py-3 px-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {combinedHistory.map((analysis) => (
                    <tr
                      key={`${analysis.status ? "processing" : "completed"}-${
                        analysis.id
                      }`}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(analysis.id)}
                          onChange={() => toggleSelectItem(analysis.id)}
                          className="rounded"
                          title={`Select ${
                            analysis.filename || getFileName(analysis.fileId)
                          }`}
                          aria-label={`Select ${
                            analysis.filename || getFileName(analysis.fileId)
                          }`}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {analysis.filename || getFileName(analysis.fileId)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-muted-foreground">
                          {analysis.storeNumber || "-"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-muted-foreground">
                          {analysis.kioskNumber || "-"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-32">
                          <ProgressBar
                            progress={analysis.progress ?? 0}
                            status={analysis.status || "completed"}
                            currentStep={analysis.currentStep}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(
                              analysis.analysisTimestamp ||
                                analysis.analysisDate ||
                                ""
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium">
                        {analysis.status === "processing" ||
                        analysis.status === "pending" ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          analysis.totalErrors || 0
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {analysis.status === "processing" ||
                        analysis.status === "pending" ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800"
                          >
                            {analysis.criticalErrors || 0}
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {analysis.status === "processing" ||
                        analysis.status === "pending" ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-orange-100 text-orange-800"
                          >
                            {analysis.highErrors || 0}
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {analysis.status === "processing" ||
                        analysis.status === "pending" ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800"
                          >
                            {analysis.mediumErrors || 0}
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {analysis.status === "processing" ||
                        analysis.status === "pending" ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            {analysis.lowErrors || 0}
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {analysis.status === "processing" ||
                            analysis.status === "pending"
                              ? "In Progress..."
                              : analysis.processingTime
                              ? formatProcessingTime(analysis.processingTime)
                              : "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {analysis.status === "processing" ||
                        analysis.status === "pending" ? (
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-800"
                          >
                            Pending
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800"
                          >
                            {analysis.modelAccuracy &&
                            analysis.modelAccuracy > 0
                              ? analysis.modelAccuracy.toFixed(1)
                              : "0.0"}
                            %
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          {analysis.status === "completed" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  console.log(
                                    "🔍 Frontend: Selecting analysis for details:",
                                    analysis
                                  );
                                  setSelectedAnalysis(analysis);
                                }}
                                className="text-primary hover:text-primary"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExport(analysis)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(analysis.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(analysis.status === "processing" ||
                            analysis.status === "pending") && (
                            <span className="text-muted-foreground text-sm">
                              Processing...
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No Analysis History</h3>
              <p className="text-muted-foreground mb-4">
                You haven't analyzed any log files yet.
              </p>

              {/* Debug Information */}
              {(historyError || filesError) && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <h4 className="font-medium text-red-800 mb-2">
                    Debug Information:
                  </h4>
                  {historyError && (
                    <p className="text-sm text-red-700 mb-2">
                      <strong>Analysis History Error:</strong>{" "}
                      {historyError.message}
                    </p>
                  )}
                  {filesError && (
                    <p className="text-sm text-red-700 mb-2">
                      <strong>Files Error:</strong> {filesError.message}
                    </p>
                  )}
                  <p className="text-sm text-red-700">
                    <strong>Analysis History:</strong>{" "}
                    {Array.isArray(analysisHistory)
                      ? `${analysisHistory.length} items`
                      : analysisHistory
                      ? `Invalid type: ${typeof analysisHistory}`
                      : "null/undefined"}
                  </p>
                  <p className="text-sm text-red-700">
                    <strong>Log Files:</strong>{" "}
                    {logFiles ? `${logFiles.length} items` : "null/undefined"}
                  </p>
                  <p className="text-sm text-red-700">
                    <strong>Combined History:</strong>{" "}
                    {combinedHistory
                      ? `${combinedHistory.length} items`
                      : "null/undefined"}
                  </p>
                </div>
              )}

              <Button onClick={() => (window.location.href = "/upload")}>
                Upload Your First File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Analysis Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Analysis Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">File Information</h4>
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <p>
                      <strong>File:</strong>{" "}
                      {selectedAnalysis.filename ||
                        getFileName(selectedAnalysis.fileId)}
                    </p>
                    <p>
                      <strong>Analysis Date:</strong>{" "}
                      {formatDateTime(
                        selectedAnalysis.analysisDate ||
                          selectedAnalysis.analysisTimestamp ||
                          selectedAnalysis.uploadTimestamp ||
                          ""
                      )}
                    </p>
                    <p>
                      <strong>Processing Time:</strong>{" "}
                      {formatProcessingTime(selectedAnalysis.processingTime)}
                    </p>
                    <p>
                      <strong>Model Accuracy:</strong>{" "}
                      {selectedAnalysis.modelAccuracy &&
                      selectedAnalysis.modelAccuracy > 0
                        ? selectedAnalysis.modelAccuracy.toFixed(1)
                        : "NaN"}
                      %
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Error Summary</h4>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="text-2xl font-bold mb-2">
                      {selectedAnalysis.totalErrors}
                    </div>
                    <p className="text-muted-foreground">Total Errors Found</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Severity Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Critical</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-800"
                      >
                        {selectedAnalysis.criticalErrors}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span>High</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-orange-100 text-orange-800"
                      >
                        {selectedAnalysis.highErrors}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span>Medium</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800"
                      >
                        {selectedAnalysis.mediumErrors}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Low</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        {selectedAnalysis.lowErrors}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Patterns Section */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Error Patterns</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log(
                      `🔍 Frontend: Toggling showErrorPatterns from ${showErrorPatterns} to ${!showErrorPatterns}`
                    );
                    console.log(
                      "🔍 Frontend: Current selectedAnalysis:",
                      selectedAnalysis
                    );
                    setShowErrorPatterns(!showErrorPatterns);
                  }}
                >
                  {showErrorPatterns ? "Hide" : "Show"} Patterns
                </Button>
              </div>

              {showErrorPatterns && (
                <div className="bg-muted rounded-lg p-4">
                  {(() => {
                    console.log(
                      `🔍 Frontend UI: patternsLoading: ${patternsLoading}`
                    );
                    console.log(
                      `🔍 Frontend UI: patternsError:`,
                      patternsError
                    );
                    console.log(
                      `🔍 Frontend UI: errorPatterns:`,
                      errorPatterns
                    );
                    console.log(
                      `🔍 Frontend UI: errorPatterns type:`,
                      typeof errorPatterns
                    );
                    console.log(
                      `🔍 Frontend UI: errorPatterns length:`,
                      errorPatterns?.length
                    );
                    console.log(
                      `🔍 Frontend UI: selectedAnalysis:`,
                      selectedAnalysis
                    );
                    console.log(
                      `🔍 Frontend UI: Render condition - patternsLoading: ${patternsLoading}, errorPatterns exists: ${!!errorPatterns}, length > 0: ${
                        errorPatterns && errorPatterns.length > 0
                      }`
                    );
                    return null;
                  })()}
                  {patternsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading patterns...</span>
                    </div>
                  ) : errorPatterns && errorPatterns.length > 0 ? (
                    <div className="space-y-3">
                      {errorPatterns
                        .sort((a, b) => {
                          // Sort by severity priority: Critical → High → Medium → Low
                          const severityOrder = {
                            critical: 0,
                            high: 1,
                            medium: 2,
                            low: 3,
                          };
                          const aSeverity =
                            severityOrder[
                              a.severity as keyof typeof severityOrder
                            ] ?? 4;
                          const bSeverity =
                            severityOrder[
                              b.severity as keyof typeof severityOrder
                            ] ?? 4;
                          if (aSeverity !== bSeverity)
                            return aSeverity - bSeverity;
                          // If same severity, sort by occurrence count (descending)
                          return (b.count || 0) - (a.count || 0);
                        })
                        .map((pattern, index) => (
                          <div
                            key={index}
                            className="border rounded-lg p-3 bg-background"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant="secondary"
                                  className={
                                    pattern.severity === "critical"
                                      ? "bg-red-100 text-red-800"
                                      : pattern.severity === "high"
                                      ? "bg-orange-100 text-orange-800"
                                      : pattern.severity === "medium"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-800"
                                  }
                                >
                                  {pattern.severity}
                                </Badge>
                                <span className="font-medium">
                                  {pattern.errorType}
                                </span>
                              </div>
                              <Badge variant="outline">
                                {pattern.count} occurrences
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Pattern:</strong> {pattern.pattern}
                            </p>
                            {pattern.examples.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-1">
                                  Examples:
                                </p>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {pattern.examples.map((example, i) => (
                                    <li key={i} className="truncate">
                                      • {example}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No error patterns found for this analysis.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => handleExport(selectedAnalysis)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setSelectedAnalysis(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md m-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete this analysis? This action cannot
              be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={confirmDelete} className="flex-1">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdaptiveLayout>
  );
}
