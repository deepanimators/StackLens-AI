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
import MultiSelectDropdown from "@/components/multi-select-dropdown";
import { authenticatedRequest, authenticatedFetch, authManager } from "@/lib/auth";
import { Search, Filter, Download, RefreshCw } from "lucide-react";
import { SEVERITY_LABELS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

// UI-compatible interface for ErrorLog
interface ErrorLog {
  id: number;
  fileId?: number;
  filename?: string;
  lineNumber: number;
  timestamp: string | null;
  severity: string;
  errorType: string;
  message: string;
  fullText: string;
  resolved: boolean;
  aiSuggestion?: any;
  mlPrediction?: any;
  storeNumber?: string | null;
  kioskNumber?: string | null;
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

  // Standardize timestamp format
  let standardizedTimestamp: string | null = null;
  if (apiError.timestamp) {
    try {
      if (typeof apiError.timestamp === "string") {
        // Try to parse as-is first
        const date = new Date(apiError.timestamp);
        if (!isNaN(date.getTime())) {
          standardizedTimestamp = date.toISOString();
        } else {
          // Try as Unix timestamp
          const numTimestamp = parseInt(apiError.timestamp);
          if (!isNaN(numTimestamp)) {
            const timestamp = numTimestamp < 10000000000 ? numTimestamp * 1000 : numTimestamp;
            standardizedTimestamp = new Date(timestamp).toISOString();
          }
        }
      } else if (typeof apiError.timestamp === "number") {
        const timestamp = apiError.timestamp < 10000000000 ? apiError.timestamp * 1000 : apiError.timestamp;
        standardizedTimestamp = new Date(timestamp).toISOString();
      } else {
        standardizedTimestamp = new Date(apiError.timestamp).toISOString();
      }
    } catch (error) {
      console.warn('Failed to parse timestamp for error', apiError.id, ':', apiError.timestamp, error);
      standardizedTimestamp = null;
    }
  }

  return {
    id: apiError.id,
    fileId: apiError.fileId || undefined,
    filename: apiError.filename || apiError.file_path || "Unknown",
    lineNumber: apiError.lineNumber || apiError.line_number,
    timestamp: standardizedTimestamp,
    severity: apiError.severity,
    errorType: apiError.errorType || "Unknown",
    message: apiError.message,
    fullText: apiError.fullText || apiError.stack_trace || apiError.message,
    resolved: Boolean(apiError.resolved),
    aiSuggestion: aiSuggestion,
    mlPrediction: mlPrediction,
    storeNumber: apiError.storeNumber || null,
    kioskNumber: apiError.kioskNumber || null,
  };
};

export default function AllErrors() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [severity, setSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileFilter, setFileFilter] = useState<string[]>([]); // Changed to array for multi-select
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [kioskFilter, setKioskFilter] = useState<string>("all");
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showAISuggestionModal, setShowAISuggestionModal] = useState(false);

  // Get current user info to check admin status
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const data = await authenticatedRequest("GET", "/api/auth/me");
      return data;
    },
  });

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  // Get users list for admin users
  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const data = await authenticatedRequest("GET", "/api/admin/users");
      return data || [];
    },
    enabled: isAdmin,
  });

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
        userId: userFilter,
        storeFilter,
        kioskFilter,
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
        storeFilter,
        kioskFilter,
      });

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      
      if (severity && severity !== "all") {
        params.append("severity", severity);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (fileFilter && fileFilter.length > 0) {
        // Join multiple file IDs with commas for backend processing
        params.append("fileFilter", fileFilter.join(","));
      }
      if (errorTypeFilter && errorTypeFilter !== "all") {
        params.append("errorType", errorTypeFilter);
      }
      if (userFilter && userFilter !== "all") {
        params.append("userId", userFilter);
      }
      if (storeFilter && storeFilter !== "all") {
        params.append("storeNumber", storeFilter);
      }
      if (kioskFilter && kioskFilter !== "all") {
        params.append("kioskNumber", kioskFilter);
      }

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
    queryKey: ["/api/files", { userId: userFilter, includeAll: true }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("includeAll", "true"); // Get all files for dropdown
      if (userFilter && userFilter !== "all") {
        params.append("userId", userFilter);
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await authenticatedRequest("GET", `/api/files${query}`);
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

  // Get stores for store filter dropdown
  const { data: stores } = useQuery({
    queryKey: ["/api/stores"],
    queryFn: async () => {
      const data = await authenticatedRequest("GET", "/api/stores");
      return data || [];
    },
  });

  // Get kiosks for kiosk filter dropdown (filtered by selected store if applicable)
  const { data: kiosks } = useQuery({
    queryKey: ["/api/kiosks", storeFilter],
    queryFn: async () => {
      const data = await authenticatedRequest("GET", "/api/kiosks");
      // Filter kiosks by selected store if a store is selected
      if (storeFilter && storeFilter !== "all") {
        const store = (data || []).find((k: any) => k.storeNumber === storeFilter);
        if (store) {
          return (data || []).filter((k: any) => k.storeId === store.id);
        }
      }
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

  const handleFileFilter = (newFileFilter: string[]) => {
    setFileFilter(newFileFilter);
    setPage(1);
  };

  const handleErrorTypeFilter = (newErrorType: string) => {
    setErrorTypeFilter(newErrorType);
    setPage(1);
  };

  const handleUserFilter = (newUserFilter: string) => {
    setUserFilter(newUserFilter);
    setFileFilter([]); // Reset file filter when user changes
    setPage(1);
  };

  const handleStoreFilter = (newStoreFilter: string) => {
    setStoreFilter(newStoreFilter);
    setKioskFilter("all"); // Reset kiosk filter when store changes
    setPage(1);
  };

  const handleKioskFilter = (newKioskFilter: string) => {
    setKioskFilter(newKioskFilter);
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
      console.log("📤 Starting error export...");
      
      // Show loading toast
      const loadingToast = toast({
        title: "Exporting Errors...",
        description: "Generating CSV file with current filters",
        duration: 0, // Don't auto-dismiss
      });
      
      // Build query parameters based on current filters
      const exportParams = new URLSearchParams();
      exportParams.append("format", "csv");
      
      if (severity && severity !== "all") {
        exportParams.append("severity", severity);
      }
      if (searchQuery) {
        exportParams.append("search", searchQuery);
      }
      if (fileFilter && fileFilter.length > 0) {
        exportParams.append("fileFilter", fileFilter.join(","));
      }
      if (errorTypeFilter && errorTypeFilter !== "all") {
        exportParams.append("errorType", errorTypeFilter);
      }
      if (userFilter && userFilter !== "all") {
        exportParams.append("userId", userFilter);
      }

      const response = await authenticatedFetch(
        "GET", 
        `/api/export/errors?${exportParams.toString()}`
      );

      // Handle the CSV response
      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all-errors-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      // Dismiss loading and show success
      loadingToast.dismiss();
      toast({
        title: "Export Successful",
        description: "Error data exported to CSV file",
      });
      
      console.log("✅ Export completed successfully");
    } catch (error) {
      console.error("❌ Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export error data. Please try again.",
        variant: "destructive",
      });
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

            {isAdmin && (
              <Select value={userFilter} onValueChange={handleUserFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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

            <MultiSelectDropdown
              options={(files || [])
                .filter(
                  (file: any) =>
                    file && file.id && file.id.toString().trim() !== ""
                )
                .map((file: any) => ({
                  id: file.id.toString(),
                  label: file.originalName || `File ${file.id}`,
                  value: file.id.toString(),
                }))}
              selectedValues={fileFilter}
              onSelectionChange={handleFileFilter}
              placeholder="Filter by files..."
              searchPlaceholder="Search files..."
              className="w-64"
            />

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

            <Select value={storeFilter} onValueChange={handleStoreFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {(stores || []).map((store: any) => (
                  <SelectItem key={store.id} value={store.storeNumber}>
                    {store.storeNumber} - {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={kioskFilter} 
              onValueChange={handleKioskFilter}
              disabled={storeFilter === "all"}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by kiosk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Kiosks</SelectItem>
                {(kiosks || []).map((kiosk: any) => (
                  <SelectItem key={kiosk.id} value={kiosk.kioskNumber}>
                    {kiosk.kioskNumber} - {kiosk.name}
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
