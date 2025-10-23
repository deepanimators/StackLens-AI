import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { Search, Filter, Download, RefreshCw, AlertTriangle, Info } from "lucide-react";
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
  severityCounts?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
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

  // Standardize timestamp format with better validation
  let standardizedTimestamp: string | null = null;
  if (apiError.timestamp && apiError.timestamp !== "N/A") {
    try {
      if (typeof apiError.timestamp === "string") {
        // Check if it's already a valid ISO string
        if (apiError.timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/)) {
          standardizedTimestamp = apiError.timestamp;
        } else {
          // Try to parse as date
          const date = new Date(apiError.timestamp);
          if (!isNaN(date.getTime()) && date.getFullYear() > 1970) {
            standardizedTimestamp = date.toISOString();
          } else {
            // Try as Unix timestamp (seconds)
            const numTimestamp = parseInt(apiError.timestamp);
            if (!isNaN(numTimestamp) && numTimestamp > 0) {
              const timestamp = numTimestamp < 10000000000 ? numTimestamp * 1000 : numTimestamp;
              const parsedDate = new Date(timestamp);
              if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1970) {
                standardizedTimestamp = parsedDate.toISOString();
              }
            }
          }
        }
      } else if (typeof apiError.timestamp === "number") {
        const timestamp = apiError.timestamp < 10000000000 ? apiError.timestamp * 1000 : apiError.timestamp;
        const parsedDate = new Date(timestamp);
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1970) {
          standardizedTimestamp = parsedDate.toISOString();
        }
      } else {
        const date = new Date(apiError.timestamp);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1970) {
          standardizedTimestamp = date.toISOString();
        }
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

// Helper functions for URL parameter management with wouter
const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    page: parseInt(params.get("page") || "1"),
    limit: parseInt(params.get("limit") || "25"),
    severity: params.get("severity") || "all",
    search: params.get("search") || "",
    fileFilter: params.get("fileFilter")?.split(",").filter(Boolean) || [],
    errorType: params.get("errorType") || "all",
    userFilter: params.get("userFilter")?.split(",").filter(Boolean) || [],
    storeFilter: params.get("storeFilter")?.split(",").filter(Boolean) || [],
    kioskFilter: params.get("kioskFilter")?.split(",").filter(Boolean) || [],
  };
};

const updateUrlParams = (params: Record<string, any>) => {
  const searchParams = new URLSearchParams();
  
  if (params.page !== 1) searchParams.set("page", params.page.toString());
  if (params.limit !== 25) searchParams.set("limit", params.limit.toString());
  if (params.severity !== "all") searchParams.set("severity", params.severity);
  if (params.search) searchParams.set("search", params.search);
  if (params.fileFilter.length > 0) searchParams.set("fileFilter", params.fileFilter.join(","));
  if (params.errorType !== "all") searchParams.set("errorType", params.errorType);
  if (params.userFilter.length > 0) searchParams.set("userFilter", params.userFilter.join(","));
  if (params.storeFilter.length > 0) searchParams.set("storeFilter", params.storeFilter.join(","));
  if (params.kioskFilter.length > 0) searchParams.set("kioskFilter", params.kioskFilter.join(","));

  const newUrl = `${window.location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  window.history.replaceState({}, '', newUrl);
};

export default function AllErrors() {
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Initialize state from URL parameters
  const initialParams = getUrlParams();
  const [page, setPage] = useState(initialParams.page);
  const [limit, setLimit] = useState(initialParams.limit);
  const [severity, setSeverity] = useState<string>(initialParams.severity);
  const [searchQuery, setSearchQuery] = useState(initialParams.search);
  const [fileFilter, setFileFilter] = useState<string[]>(initialParams.fileFilter);
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>(initialParams.errorType);
  const [userFilter, setUserFilter] = useState<string[]>(initialParams.userFilter);
  const [storeFilter, setStoreFilter] = useState<string[]>(initialParams.storeFilter);
  const [kioskFilter, setKioskFilter] = useState<string[]>(initialParams.kioskFilter);
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

  // Sync state changes with URL parameters
  useEffect(() => {
    updateUrlParams({
      page,
      limit,
      severity,
      search: searchQuery,
      fileFilter,
      errorType: errorTypeFilter,
      userFilter,
      storeFilter,
      kioskFilter
    });
  }, [page, limit, severity, searchQuery, fileFilter, errorTypeFilter, userFilter, storeFilter, kioskFilter]);

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
      if (userFilter && userFilter.length > 0) {
        params.append("userId", userFilter.join(","));
      }
      if (storeFilter && storeFilter.length > 0) {
        params.append("storeNumber", storeFilter.join(","));
      }
      if (kioskFilter && kioskFilter.length > 0) {
        params.append("kioskNumber", kioskFilter.join(","));
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
          severityCounts: data.severityCounts || {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
        };
      } catch (error) {
        console.error("🔍 All Errors: API request failed", error);
        throw error;
      }
    },
  });

  // Get files for the file filter dropdown - filtered by store and kiosk only (independent of user filter)
  const { data: files } = useQuery({
    queryKey: ["/api/files", { storeFilter, kioskFilter, includeAll: true }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("includeAll", "true"); // Get all files for dropdown
      // Note: We intentionally don't filter by user here so the files dropdown shows all available files
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await authenticatedRequest("GET", `/api/files${query}`);
      let allFiles = data.files || [];
      
      // Filter files by store and kiosk on the client side
      if (storeFilter && storeFilter !== "all") {
        allFiles = allFiles.filter((file: any) => file.storeNumber === storeFilter);
      }
      if (kioskFilter && kioskFilter !== "all") {
        allFiles = allFiles.filter((file: any) => file.kioskNumber === kioskFilter);
      }
      
      return allFiles;
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

  // Get kiosks for kiosk filter dropdown (filtered by selected store)
  const { data: allKiosks } = useQuery({
    queryKey: ["/api/kiosks"],
    queryFn: async () => {
      const data = await authenticatedRequest("GET", "/api/kiosks");
      return data || [];
    },
  });

  // Filter kiosks based on selected stores
  const filteredKiosks = useMemo(() => {
    if (!allKiosks) return [];
    if (storeFilter && storeFilter.length > 0) {
      const selectedStores = (stores || []).filter((s: any) => 
        storeFilter.includes(s.storeNumber)
      );
      if (selectedStores.length > 0) {
        const selectedStoreIds = selectedStores.map(s => s.id);
        return allKiosks.filter((k: any) => selectedStoreIds.includes(k.storeId));
      }
    }
    return allKiosks;
  }, [allKiosks, storeFilter, stores]);

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

  const handleUserFilter = (newUserFilter: string[]) => {
    setUserFilter(newUserFilter);
    setFileFilter([]); // Reset file filter when user changes
    setPage(1);
  };

  const handleStoreFilter = (newStoreFilter: string[]) => {
    setStoreFilter(newStoreFilter);
    setKioskFilter([]); // Reset kiosk filter when store changes
    setFileFilter([]); // Reset file filter when store changes
    setPage(1);
  };

  const handleKioskFilter = (newKioskFilter: string[]) => {
    setKioskFilter(newKioskFilter);
    setFileFilter([]); // Reset file filter when kiosk changes
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
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Search */}
          <div className="w-full">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search error messages, types, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </form>
          </div>

          {/* Row 2: User, Store, Kiosk, File Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {isAdmin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">User</label>
                <MultiSelectDropdown
                  options={[
                    { id: "all", label: "All Users", value: "all" },
                    ...(users || []).map((user: any) => ({
                      id: user.id.toString(),
                      label: user.username,
                      value: user.id.toString(),
                    }))
                  ]}
                  selectedValues={userFilter}
                  onSelectionChange={(values) => {
                    handleUserFilter(values);
                  }}
                  placeholder="All Users"
                  searchPlaceholder="Search users..."
                  className="w-full"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Store</label>
              <MultiSelectDropdown
                options={[
                  { id: "all", label: "All Stores", value: "all" },
                  ...(stores || []).map((store: any) => ({
                    id: store.id.toString(),
                    label: `${store.storeNumber} - ${store.name}`,
                    value: store.storeNumber,
                  }))
                ]}
                selectedValues={storeFilter}
                onSelectionChange={(values) => {
                  handleStoreFilter(values);
                }}
                placeholder="All Stores"
                searchPlaceholder="Search stores..."
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Kiosk</label>
              <MultiSelectDropdown
                options={[
                  { id: "all", label: "All Kiosks", value: "all" },
                  ...(filteredKiosks || []).map((kiosk: any) => ({
                    id: kiosk.id.toString(),
                    label: `${kiosk.kioskNumber} - ${kiosk.name}`,
                    value: kiosk.kioskNumber,
                  }))
                ]}
                selectedValues={kioskFilter}
                onSelectionChange={(values) => {
                  handleKioskFilter(values);
                }}
                placeholder={storeFilter.length === 0 ? "Select store first" : "All Kiosks"}
                searchPlaceholder="Search kiosks..."
                className="w-full"
                disabled={storeFilter.length === 0}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">File Name</label>
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
                placeholder="All Files"
                searchPlaceholder="Search files..."
                className="w-full"
              />
            </div>
          </div>

          {/* Row 3: Severities, Types, Item Count, Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Severity</label>
              <Select value={severity} onValueChange={handleSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
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
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Error Type</label>
              <Select
                value={errorTypeFilter}
                onValueChange={handleErrorTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
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
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Items per page</label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 rows</SelectItem>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Actions</label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" onClick={handleExport} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats - Now shows totals from all filtered results, not just current page */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Loading...</p>
                    <div className="text-3xl font-bold">
                      <div className="flex items-center space-x-1 my-2 py-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center ring-2 ring-primary/10">
                    <AlertTriangle className="w-7 h-7 text-primary animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Critical</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                      {errorsData?.severityCounts?.critical || 0}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center ring-2 ring-red-500/10">
                    <AlertTriangle className="w-7 h-7 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">High</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                      {errorsData?.severityCounts?.high || 0}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl flex items-center justify-center ring-2 ring-orange-500/10">
                    <AlertTriangle className="w-7 h-7 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Medium</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text text-transparent">
                      {errorsData?.severityCounts?.medium || 0}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl flex items-center justify-center ring-2 ring-yellow-500/10">
                    <AlertTriangle className="w-7 h-7 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Low</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                      {errorsData?.severityCounts?.low || 0}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center ring-2 ring-blue-500/10">
                    <Info className="w-7 h-7 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
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
