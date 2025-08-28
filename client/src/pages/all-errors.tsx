import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import AdaptiveLayout from "@/components/adaptive-layout";
import ErrorTable from "@/components/error-table";
import AnalysisModal from "@/components/analysis-modal";
import AISuggestionModal from "@/components/ai-suggestion-modal";
import { authenticatedRequest } from "@/lib/auth";
import { Search, Filter, Download, RefreshCw } from "lucide-react";
import { SEVERITY_LABELS } from "@/lib/constants";

// UI-compatible interface for ErrorLog
interface ErrorLog {
  id: number;
  fileId?: number;
  lineNumber: number;
  timestamp: string | null;
  severity: string;
  errorType: string;
  message: string;
  fullText: string;
  resolved: boolean;
  aiSuggestion?: any;
  mlPrediction?: any;
}

interface ErrorsResponse {
  errors: ErrorLog[];
  total: number;
  page: number;
  limit: number;
}

// Transform API response to UI format
const transformErrorLog = (apiError: any): ErrorLog => {
  // Parse ai_suggestion if it's a string
  let aiSuggestion = apiError.aiSuggestion;
  if (typeof aiSuggestion === "string" && aiSuggestion) {
    try {
      aiSuggestion = JSON.parse(aiSuggestion);
    } catch (e) {
      console.warn("Failed to parse aiSuggestion JSON:", e);
      aiSuggestion = null;
    }
  }

  // Parse ml_prediction if it's a string
  let mlPrediction = apiError.mlPrediction;
  if (typeof mlPrediction === "string" && mlPrediction) {
    try {
      mlPrediction = JSON.parse(mlPrediction);
    } catch (e) {
      console.warn("Failed to parse mlPrediction JSON:", e);
      mlPrediction = null;
    }
  }

  return {
    id: apiError.id,
    fileId: apiError.fileId || undefined,
    lineNumber: apiError.lineNumber || apiError.line_number,
    timestamp: apiError.timestamp
      ? typeof apiError.timestamp === "string"
        ? apiError.timestamp
        : new Date(apiError.timestamp).toISOString()
      : null,
    severity: apiError.severity,
    errorType: apiError.errorType || "Unknown",
    message: apiError.message,
    fullText: apiError.fullText || apiError.stack_trace || apiError.message,
    resolved: Boolean(apiError.resolved),
    aiSuggestion: aiSuggestion,
    mlPrediction: mlPrediction,
  };
};

export default function AllErrors() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [severity, setSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileFilter, setFileFilter] = useState<string>("all");
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>("all");
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showAISuggestionModal, setShowAISuggestionModal] = useState(false);

  const {
    data: errorsData,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [
      "/api/errors",
      {
        page,
        limit,
        severity,
        search: searchQuery,
        fileFilter,
        errorType: errorTypeFilter,
      },
    ],
    queryFn: async (): Promise<ErrorsResponse> => {
      console.log("🔍 All Errors: Making API request", {
        page,
        limit,
        severity,
        searchQuery,
        fileFilter,
        errorTypeFilter,
      });

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(severity && severity !== "all" && { severity }),
        ...(searchQuery && { search: searchQuery }),
        ...(fileFilter && fileFilter !== "all" && { fileFilter }),
        ...(errorTypeFilter &&
          errorTypeFilter !== "all" && { errorType: errorTypeFilter }),
      });

      try {
        const data = await authenticatedRequest("GET", `/api/errors?${params}`);
        console.log("🔍 All Errors: API response received", data);

        // Transform the API response to UI format
        return {
          errors: (data.errors || []).map(transformErrorLog),
          total: data.total || 0,
          page: data.page || page,
          limit: data.limit || limit,
        };
      } catch (error) {
        console.error("🔍 All Errors: API request failed", error);
        throw error;
      }
    },
  });

  // Get files for the file filter dropdown
  const { data: files } = useQuery({
    queryKey: ["/api/files"],
    queryFn: async () => {
      const data = await authenticatedRequest("GET", "/api/files");
      // Handle the actual API response structure: { files: [...] }
      return data.files || [];
    },
  });

  // Get error types for the error type filter dropdown
  const { data: errorTypes } = useQuery({
    queryKey: ["/api/errors/types"],
    queryFn: async () => {
      const data = await authenticatedRequest("GET", "/api/errors/types");
      return data || [];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleSeverityFilter = (newSeverity: string) => {
    setSeverity(newSeverity);
    setPage(1);
  };

  const handleFileFilter = (newFileFilter: string) => {
    setFileFilter(newFileFilter);
    setPage(1);
  };

  const handleErrorTypeFilter = (newErrorType: string) => {
    setErrorTypeFilter(newErrorType);
    setPage(1);
  };

  const handleViewDetails = (error: ErrorLog) => {
    setSelectedError(error);
    setShowAnalysisModal(true);
  };

  const handleGenerateSuggestion = (error: ErrorLog) => {
    setSelectedError(error);
    setShowAISuggestionModal(true);
  };

  const handleExport = async () => {
    try {
      const response = await authenticatedRequest(
        "GET",
        "/api/export/errors?format=csv"
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "all-errors.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const totalPages = Math.ceil((errorsData?.total || 0) / limit);
  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, errorsData?.total || 0);

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, 5);
        if (totalPages > 5) pages.push("...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex}-{endIndex} of {errorsData?.total || 0} errors
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>

          {pages.map((pageNum, index) => (
            <Button
              key={index}
              variant={pageNum === page ? "default" : "outline"}
              size="sm"
              onClick={() => typeof pageNum === "number" && setPage(pageNum)}
              disabled={pageNum === "..."}
            >
              {pageNum}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AdaptiveLayout
      title="All Errors"
      subtitle="Consolidated view of all detected errors"
    >
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search error messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>

            <Select value={severity} onValueChange={handleSeverityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {Object.entries(SEVERITY_LABELS)
                  .filter(([value]) => value && value.trim() !== "")
                  .map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={fileFilter} onValueChange={handleFileFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by file" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                {(files || [])
                  .filter(
                    (file: any) =>
                      file && file.id && file.id.toString().trim() !== ""
                  )
                  .map((file: any) => (
                    <SelectItem key={file.id} value={file.id.toString()}>
                      {file.originalName || `File ${file.id}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={errorTypeFilter}
              onValueChange={handleErrorTypeFilter}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(errorTypes || []).map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={limit.toString()}
              onValueChange={(value) => setLimit(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {errorsData?.errors?.filter((e) => e.severity === "critical")
                .length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {errorsData?.errors?.filter((e) => e.severity === "high")
                .length || 0}
            </div>
            <p className="text-sm text-muted-foreground">High</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {errorsData?.errors?.filter((e) => e.severity === "medium")
                .length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Medium</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {errorsData?.errors?.filter((e) => e.severity === "low").length ||
                0}
            </div>
            <p className="text-sm text-muted-foreground">Low</p>
          </CardContent>
        </Card>
      </div>

      {/* Errors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Error List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <ErrorTable
                errors={errorsData?.errors || []}
                onViewDetails={handleViewDetails}
                onGenerateSuggestion={handleGenerateSuggestion}
                showLineNumbers={true}
                showTimestamp={true}
                showFileName={true}
              />

              {renderPagination()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedError && (
        <>
          <AnalysisModal
            isOpen={showAnalysisModal}
            onClose={() => setShowAnalysisModal(false)}
            error={selectedError}
          />

          <AISuggestionModal
            isOpen={showAISuggestionModal && selectedError !== null}
            onClose={() => setShowAISuggestionModal(false)}
            error={selectedError!}
          />
        </>
      )}
    </AdaptiveLayout>
  );
}
