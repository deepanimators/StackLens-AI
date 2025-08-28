import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  X,
  Brain,
  Search,
  Wrench,
  Code,
  Shield,
  Download,
  CheckCircle,
  Copy,
  ExternalLink,
  Lightbulb,
  Target,
  RefreshCw,
  AlertTriangle,
  Info,
  FileText,
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
  aiSuggestion?: {
    rootCause: string;
    howCaused?: string;
    resolutionSteps: string[];
    codeExample?: string;
    preventionMeasures: string[];
    confidence: number;
    detailedExplanation?: string;
    impact?: string;
    relatedLogs?: string[];
  };
}

interface AISuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: ErrorLog;
}

export default function AISuggestionModal({
  isOpen,
  onClose,
  error,
}: AISuggestionModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState(error?.aiSuggestion);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug logging
  console.log(
    `🤖 AI Suggestion Modal: Error ID ${error?.id}, has aiSuggestion:`,
    !!error?.aiSuggestion
  );
  if (error?.aiSuggestion) {
    console.log(
      `🤖 AI Suggestion Modal: aiSuggestion data:`,
      error.aiSuggestion
    );
  }

  // Reset suggestion state when error changes
  useEffect(() => {
    setSuggestion(error?.aiSuggestion);
  }, [error?.id, error?.aiSuggestion]);

  const generateSuggestionMutation = useMutation({
    mutationFn: async () => {
      if (!error?.id || error.id <= 0) {
        throw new Error(`Invalid error ID: ${error?.id}`);
      }
      console.log(`Generating suggestion for error ID: ${error.id}`);
      const response = await authenticatedRequest(
        "POST",
        `/api/errors/${error.id}/suggestion`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSuggestion(data.suggestion); // Fix: Extract suggestion from response
      queryClient.invalidateQueries({ queryKey: ["/api/errors"] });
      toast({
        title: "Success",
        description: "AI suggestion generated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate AI suggestion",
        variant: "destructive",
      });
    },
  });

  const handleGenerateSuggestion = async () => {
    setIsGenerating(true);
    try {
      await generateSuggestionMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (suggestion?.codeExample) {
      await navigator.clipboard.writeText(suggestion.codeExample);
      toast({
        title: "Copied",
        description: "Code example copied to clipboard",
      });
    }
  };

  const handleExportSolution = async () => {
    try {
      const content = {
        error: {
          message: error.message,
          severity: error.severity,
          errorType: error.errorType,
          lineNumber: error.lineNumber,
        },
        suggestion: suggestion,
        timestamp: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-solution-${error.id}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Solution exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export solution",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    return (
      SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ||
      SEVERITY_COLORS.medium
    );
  };

  // Early return if error is invalid
  if (!error || !error.id || error.id <= 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        aria-describedby="ai-suggestion-description"
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI Resolution Suggestion</span>
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div id="ai-suggestion-description" className="sr-only">
            AI-powered analysis and resolution suggestions for error:{" "}
            {error.errorType} with {error.severity} severity
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Error Context */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Target className="h-4 w-4" />
                <span>Error Context</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${getSeverityColor(error.severity)}20`,
                      color: getSeverityColor(error.severity),
                      borderColor: `${getSeverityColor(error.severity)}40`,
                    }}
                  >
                    {error.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Error Type</p>
                  <p className="font-medium">{error.errorType || "Unknown"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">
                    Full Error Message
                  </p>
                  <div className="mt-2 bg-muted rounded-lg p-3 font-mono text-sm">
                    {error.fullText ||
                      error.message ||
                      "No error message available"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {suggestion ? (
            <div className="space-y-6">
              {/* Root Cause Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Search className="h-4 w-4 text-blue-600" />
                    <span>Root Cause Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {suggestion?.rootCause}
                  </p>
                </CardContent>
              </Card>

              {/* How this error could be caused */}
              {suggestion?.howCaused && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span>How This Error Could Be Caused</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {suggestion.howCaused}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* How this error could be caused */}
              {suggestion?.howCaused && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span>How This Error Could Be Caused</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {suggestion.howCaused}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Explanation */}
              {suggestion?.detailedExplanation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <Info className="h-4 w-4 text-cyan-600" />
                      <span>Detailed Explanation</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {suggestion.detailedExplanation}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Impact */}
              {suggestion?.impact && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span>Impact</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {suggestion.impact}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Related Logs */}
              {suggestion?.relatedLogs && suggestion.relatedLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span>Related Log Entries</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {suggestion.relatedLogs.map((log, idx) => (
                        <li
                          key={idx}
                          className="bg-muted rounded p-2 font-mono text-xs"
                        >
                          {log}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Resolution Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Wrench className="h-4 w-4 text-orange-600" />
                    <span>Resolution Steps</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {suggestion?.resolutionSteps?.map((step, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground leading-relaxed">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Code Example */}
              {suggestion?.codeExample && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <Code className="h-4 w-4 text-green-600" />
                        <span>Code Example</span>
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCode}
                        className="flex items-center space-x-2"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm leading-relaxed">
                        <code>{suggestion?.codeExample}</code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prevention Measures */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span>Prevention Measures</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {suggestion?.preventionMeasures?.map((measure, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground leading-relaxed">
                          {measure}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Confidence Score */}
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>AI Confidence Score</span>
                  <Badge variant="outline" className="ml-2">
                    {Math.round(
                      (suggestion?.confidence || 0) *
                        (suggestion?.confidence <= 1 ? 100 : 1)
                    )}
                    % confident
                  </Badge>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            /* No Suggestion Available */
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">
                    No AI Suggestion Available
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Generate an AI-powered analysis and resolution suggestion
                    for this error.
                  </p>
                  <Button
                    onClick={handleGenerateSuggestion}
                    disabled={
                      isGenerating || generateSuggestionMutation.isPending
                    }
                    className="flex items-center space-x-2"
                  >
                    {isGenerating || generateSuggestionMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Brain className="h-4 w-4" />
                    )}
                    <span>
                      {isGenerating || generateSuggestionMutation.isPending
                        ? "Generating..."
                        : "Generate AI Suggestion"}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        {suggestion && (
          <div className="flex-shrink-0 border-t pt-4">
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleExportSolution}>
                <Download className="h-4 w-4 mr-2" />
                Export Solution
              </Button>
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
