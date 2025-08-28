import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ErrorTable from "@/components/error-table";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  X,
  FileText,
  Calendar,
  Clock,
  Activity,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Bot,
  Target,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { SEVERITY_COLORS } from "@/lib/constants";

interface ErrorLog {
  id: number;
  lineNumber: number;
  timestamp: string | null;
  severity: string;
  errorType: string;
  message: string;
  fullText: string;
  resolved: boolean;
  fileId?: number;
  aiSuggestion?: any;
  mlPrediction?: any;
}

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: ErrorLog & { filename?: string };
  onGenerateSuggestion?: (error: ErrorLog) => void;
}

interface ErrorsResponse {
  errors: ErrorLog[];
  total: number;
}

export default function AnalysisModal({
  isOpen,
  onClose,
  error,
  onGenerateSuggestion,
}: AnalysisModalProps) {
  // File name is now included directly in the error object from the database query
  // No need for a separate API call
  const [activeTab, setActiveTab] = useState("details");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedErrorId, setSelectedErrorId] = useState(error.id);
  const { toast } = useToast();

  // Reset selectedErrorId when error changes
  useEffect(() => {
    setSelectedErrorId(error.id);
  }, [error.id]);

  // Fetch all errors for the same file (using the original error's fileId)
  const { data: errorsData, isLoading } = useQuery({
    queryKey: ["/api/files", error.fileId, "errors", currentPage],
    queryFn: async (): Promise<ErrorsResponse> => {
      const response = await authenticatedRequest(
        "GET",
        `/api/files/${error.fileId}/errors?page=${currentPage}&limit=${pageSize}`
      );
      return response.json();
    },
    enabled: isOpen && !!error.fileId,
  });

  // Find the currently selected error from the errors list
  const currentError =
    error.id === selectedErrorId
      ? error
      : errorsData?.errors?.find((e) => e.id === selectedErrorId) || error;

  // Fetch error patterns for the file (using the original error's fileId)
  const { data: patternsData, isLoading: patternsLoading } = useQuery({
    queryKey: ["/api/files", error.fileId, "patterns"],
    queryFn: async (): Promise<{ patterns: any[] }> => {
      console.log(
        `🔍 Analysis Modal: Fetching patterns for file ${error.fileId}`
      );
      const response = await authenticatedRequest(
        "GET",
        `/api/files/${error.fileId}/patterns`
      );
      const data = await response.json();
      console.log(`🔍 Analysis Modal: Patterns response:`, data);
      return data;
    },
    enabled: isOpen && !!error.fileId,
  });

  const handleExport = async () => {
    try {
      const response = await authenticatedRequest(
        "GET",
        `/api/export/errors?fileId=${error.fileId}&format=csv`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `error-analysis-${error.fileId}.csv`;
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

  const handleViewDetails = (selectedError: ErrorLog) => {
    // Switch to viewing this error's details in the same modal
    setSelectedErrorId(selectedError.id);
    setActiveTab("details"); // Switch to details tab to show the new error's context
    console.log("Switching to view details for error:", selectedError.id);
  };

  const totalPages = Math.ceil((errorsData?.total || 0) / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, errorsData?.total || 0);

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 5);
        if (totalPages > 5) pages.push("...", totalPages);
      } else if (currentPage >= totalPages - 2) {
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
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
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
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {pages.map((pageNum, index) => (
            <Button
              key={index}
              variant={pageNum === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() =>
                typeof pageNum === "number" && setCurrentPage(pageNum)
              }
              disabled={pageNum === "..."}
              className="min-w-[2rem]"
            >
              {pageNum}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const getSeverityColor = (severity: string) => {
    return (
      SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ||
      SEVERITY_COLORS.medium
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Analysis Details</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Error Context */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Error Context</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">File Name</p>
                  <p className="font-medium">
                    {error.filename || (error.fileId ? `File #${error.fileId}` : "Unknown File")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Line Number</p>
                  <p className="font-medium">{currentError.lineNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">
                    {currentError.timestamp
                      ? new Date(currentError.timestamp).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Error Type</p>
                  <p className="font-medium">{currentError.errorType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${getSeverityColor(
                        currentError.severity
                      )}20`,
                      color: getSeverityColor(currentError.severity),
                      borderColor: `${getSeverityColor(
                        currentError.severity
                      )}40`,
                    }}
                  >
                    {currentError.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={currentError.resolved ? "default" : "secondary"}
                  >
                    {currentError.resolved ? "Resolved" : "Open"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">AI Analysis</p>
                  <div className="flex items-center space-x-2">
                    {currentError.aiSuggestion && (
                      <Lightbulb className="h-4 w-4 text-yellow-600" />
                    )}
                    {currentError.mlPrediction && (
                      <Target className="h-4 w-4 text-blue-600" />
                    )}
                    {!currentError.aiSuggestion &&
                      !currentError.mlPrediction && (
                        <span className="text-sm text-muted-foreground">
                          None
                        </span>
                      )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Full Error Message
                </p>
                <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                  {currentError.fullText}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Detected Errors</TabsTrigger>
              <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
              <TabsTrigger value="predictions">ML Predictions</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Detected Errors</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!error.fileId ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>File information not available</p>
                      <p className="text-sm">
                        Cannot load related errors without file ID
                      </p>
                    </div>
                  ) : isLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : errorsData?.errors ? (
                    <>
                      <ErrorTable
                        errors={errorsData.errors}
                        onViewDetails={handleViewDetails}
                        onGenerateSuggestion={
                          onGenerateSuggestion || (() => {})
                        }
                        showLineNumbers={true}
                        showTimestamp={true}
                      />
                      {renderPagination()}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No errors found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5" />
                    <span>AI Suggestions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentError.aiSuggestion ? (
                    <div className="space-y-4">
                      <Alert>
                        <Bot className="h-4 w-4" />
                        <AlertDescription>
                          AI-powered analysis and resolution suggestions based
                          on error patterns.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Root Cause</h4>
                          <p className="text-sm text-muted-foreground">
                            {currentError.aiSuggestion.rootCause}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Resolution Steps</h4>
                          <ol className="text-sm text-muted-foreground space-y-1">
                            {currentError.aiSuggestion.resolutionSteps?.map(
                              (step: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">
                                    {index + 1}
                                  </span>
                                  <span>{step}</span>
                                </li>
                              )
                            )}
                          </ol>
                        </div>

                        {currentError.aiSuggestion.codeExample && (
                          <div>
                            <h4 className="font-medium mb-2">Code Example</h4>
                            <div className="bg-muted rounded-lg p-3 font-mono text-sm overflow-x-auto">
                              <pre>{currentError.aiSuggestion.codeExample}</pre>
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium mb-2">
                            Prevention Measures
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {currentError.aiSuggestion.preventionMeasures?.map(
                              (measure: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-green-600 mr-2">•</span>
                                  <span>{measure}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            Confidence:{" "}
                            {Math.round(
                              (currentError.aiSuggestion.confidence || 0) *
                                (currentError.aiSuggestion.confidence <= 1
                                  ? 100
                                  : 1)
                            )}
                            %
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No AI suggestions available</p>
                      {onGenerateSuggestion && (
                        <Button
                          onClick={() => onGenerateSuggestion(currentError)}
                          className="mt-4"
                        >
                          Generate AI Suggestion
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>ML Predictions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentError.mlPrediction ? (
                    <div className="space-y-4">
                      <Alert>
                        <Activity className="h-4 w-4" />
                        <AlertDescription>
                          Machine learning model predictions based on historical
                          error patterns.
                        </AlertDescription>
                      </Alert>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold">
                            {currentError.mlPrediction.severity}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Predicted Severity
                          </p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold">
                            {currentError.mlPrediction.errorType}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Predicted Type
                          </p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-2xl font-bold">
                            {Math.round(
                              (currentError.mlPrediction.confidence || 0) *
                                (currentError.mlPrediction.confidence <= 1
                                  ? 100
                                  : 1)
                            )}
                            %
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Confidence
                          </p>
                        </div>
                      </div>

                      {currentError.mlPrediction.features && (
                        <div>
                          <h4 className="font-medium mb-2">Key Features</h4>
                          <div className="flex flex-wrap gap-2">
                            {currentError.mlPrediction.features.map(
                              (feature: string, index: number) => (
                                <Badge key={index} variant="secondary">
                                  {feature}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No ML predictions available</p>
                      <p className="text-sm">
                        Train the ML model to see predictions
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Error Patterns</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!error.fileId ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>File information not available</p>
                      <p className="text-sm">
                        Cannot analyze patterns without file ID
                      </p>
                    </div>
                  ) : patternsLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : patternsData?.patterns &&
                    patternsData.patterns.length > 0 ? (
                    <div className="space-y-4">
                      <Alert>
                        <Activity className="h-4 w-4" />
                        <AlertDescription>
                          Automatically detected error patterns from recurring
                          issues in your log files.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-4">
                        {patternsData.patterns.map(
                          (pattern: any, index: number) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    variant="secondary"
                                    style={{
                                      backgroundColor: `${getSeverityColor(
                                        pattern.severity || "medium"
                                      )}20`,
                                      color: getSeverityColor(
                                        pattern.severity || "medium"
                                      ),
                                      borderColor: `${getSeverityColor(
                                        pattern.severity || "medium"
                                      )}40`,
                                    }}
                                  >
                                    {pattern.severity || "medium"}
                                  </Badge>
                                  <Badge variant="outline">
                                    {pattern.frequency || pattern.count || 1}{" "}
                                    occurrences
                                  </Badge>
                                </div>
                              </div>

                              <h4 className="font-medium mb-2">
                                {pattern.pattern ||
                                  pattern.description ||
                                  "Error Pattern"}
                              </h4>

                              {pattern.regex && (
                                <div className="mb-2">
                                  <p className="text-sm text-muted-foreground mb-1">
                                    Pattern Regex:
                                  </p>
                                  <div className="bg-muted rounded p-2 font-mono text-sm">
                                    {pattern.regex}
                                  </div>
                                </div>
                              )}

                              {pattern.examples &&
                                pattern.examples.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-sm text-muted-foreground mb-1">
                                      Example Errors:
                                    </p>
                                    <div className="space-y-1">
                                      {pattern.examples
                                        .slice(0, 3)
                                        .map(
                                          (
                                            example: string,
                                            exIndex: number
                                          ) => (
                                            <div
                                              key={exIndex}
                                              className="bg-muted rounded p-2 text-sm"
                                            >
                                              {example.length > 100
                                                ? `${example.substring(
                                                    0,
                                                    100
                                                  )}...`
                                                : example}
                                            </div>
                                          )
                                        )}
                                      {pattern.examples.length > 3 && (
                                        <p className="text-sm text-muted-foreground">
                                          +{pattern.examples.length - 3} more
                                          examples
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                              {pattern.category && (
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">
                                    {pattern.category}
                                  </Badge>
                                  {pattern.confidence && (
                                    <Badge variant="outline">
                                      {Math.round(pattern.confidence * 100)}%
                                      confidence
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No error patterns discovered for this analysis</p>
                      <p className="text-sm">
                        The system automatically discovers patterns from
                        recurring errors in your log files.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
