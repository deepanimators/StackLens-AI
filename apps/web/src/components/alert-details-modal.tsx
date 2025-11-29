import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  X,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  Zap,
  FileText,
  Copy,
  Send,
  RefreshCw,
  Activity,
  Target,
} from "lucide-react";

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

interface AIAnalysis {
  errorCategories?: string[];
  severity?: string;
  pattern?: string;
  errorTypes?: string[];
  rootCause?: string;
  suggestions?: string[];
  immediateActions?: string[];
  longTermFixes?: string[];
  estimatedImpact?: string;
  affectedComponents?: string[];
  relatedLogs?: string[];
  resolutionTimeEstimate?: string;
}

interface AlertDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: AlertData | null;
  aiAnalysis?: AIAnalysis | null;
}

export default function AlertDetailsModal({
  isOpen,
  onClose,
  alert,
  aiAnalysis,
}: AlertDetailsModalProps) {
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const { toast } = useToast();

  // Check Jira integration status
  const { data: jiraStatus } = useQuery({
    queryKey: ["/api/jira/status"],
    queryFn: () => authenticatedRequest("GET", "/api/jira/status"),
    enabled: isOpen,
  });

  // Create Jira ticket mutation
  const createJiraTicketMutation = useMutation({
    mutationFn: async () => {
      if (!alert) throw new Error("No alert selected");
      
      const ticketData = {
        errorType: alert.rule_name,
        severity: alert.severity.toUpperCase(),
        message: alert.message,
        errorDetails: {
          metric: alert.metric,
          value: alert.value,
          threshold: alert.threshold,
          timestamp: alert.timestamp,
          aiAnalysis: aiAnalysis || {},
        },
        mlConfidence: 0.95, // High confidence for realtime alerts
      };

      return authenticatedRequest("POST", "/api/automation/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketData),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Jira Ticket Created",
        description: `Ticket ${data.ticketKey} has been created successfully`,
      });
      setIsCreatingTicket(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Jira ticket",
        variant: "destructive",
      });
      setIsCreatingTicket(false);
    },
  });

  const handleCreateJiraTicket = () => {
    setIsCreatingTicket(true);
    createJiraTicketMutation.mutate();
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "warning":
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  if (!alert) return null;

  const shouldShowJiraOption = 
    jiraStatus?.data?.configured && 
    (alert.severity === "critical" || alert.severity === "warning");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Alert Details & Workflow Automation</span>
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Alert Details</TabsTrigger>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
              <TabsTrigger value="automation">Workflow Automation</TabsTrigger>
            </TabsList>

            {/* Alert Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Alert Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Severity</p>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <Badge variant={alert.status === "active" ? "destructive" : "secondary"}>
                        {alert.status}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Rule Name</p>
                    <p className="font-medium">{alert.rule_name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Message</p>
                    <p className="text-sm">{alert.message}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Metric</p>
                      <p className="font-medium">{alert.metric}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Value</p>
                      <p className="font-medium text-red-600">{alert.value.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Threshold</p>
                      <p className="font-medium">{alert.threshold.toFixed(2)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Timestamp</p>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyToClipboard(JSON.stringify(alert, null, 2))}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Alert Data
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4 mt-4">
              {aiAnalysis ? (
                <>
                  {/* Root Cause */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span>Root Cause Analysis</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{aiAnalysis.rootCause}</p>
                      {aiAnalysis.resolutionTimeEstimate && (
                        <div className="mt-3 flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Estimated Resolution Time: {aiAnalysis.resolutionTimeEstimate}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pattern & Impact */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span>Pattern & Impact</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Pattern</p>
                        <p className="text-sm">{aiAnalysis.pattern}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Estimated Impact</p>
                        <p className="text-sm">{aiAnalysis.estimatedImpact}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Immediate Actions */}
                  {aiAnalysis.immediateActions && aiAnalysis.immediateActions.length > 0 && (
                    <Card className="border-red-200 bg-red-50/50">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base text-red-700">
                          <Zap className="h-4 w-4" />
                          <span>Immediate Actions Required</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {aiAnalysis.immediateActions.map((action, idx) => (
                            <li key={idx} className="flex items-start space-x-2 text-sm">
                              <span className="text-red-600 font-bold mt-0.5">→</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI Suggestions */}
                  {aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base">
                          <Lightbulb className="h-4 w-4 text-amber-600" />
                          <span>AI Suggestions</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {aiAnalysis.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="flex items-start space-x-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Long-term Fixes */}
                  {aiAnalysis.longTermFixes && aiAnalysis.longTermFixes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span>Long-term Preventive Measures</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {aiAnalysis.longTermFixes.map((fix, idx) => (
                            <li key={idx} className="flex items-start space-x-2 text-sm">
                              <span className="text-blue-600 font-bold mt-0.5">⚙</span>
                              <span>{fix}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Related Logs */}
                  {aiAnalysis.relatedLogs && aiAnalysis.relatedLogs.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <span>Related Log Entries</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs max-h-48 overflow-y-auto">
                          {aiAnalysis.relatedLogs.map((log, idx) => (
                            <div key={idx}>{log}</div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      No AI analysis available for this alert
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Workflow Automation Tab */}
            <TabsContent value="automation" className="space-y-4 mt-4">
              {shouldShowJiraOption ? (
                <>
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      This {alert.severity} severity alert qualifies for automatic Jira ticket creation.
                      You can create a ticket to track and resolve this issue.
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <ExternalLink className="h-5 w-5" />
                        <span>Jira Integration</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Ticket Details Preview</p>
                        <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                          <div><strong>Type:</strong> Bug</div>
                          <div><strong>Priority:</strong> {alert.severity === "critical" ? "Blocker" : "High"}</div>
                          <div><strong>Summary:</strong> [{alert.severity.toUpperCase()}] {alert.rule_name}: {alert.message}</div>
                          <div><strong>Labels:</strong> stacklens-ai, realtime-alert, {alert.severity.toLowerCase()}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={handleCreateJiraTicket}
                          disabled={isCreatingTicket || createJiraTicketMutation.isPending}
                          className="flex-1"
                        >
                          {(isCreatingTicket || createJiraTicketMutation.isPending) ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Creating Ticket...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Create Jira Ticket
                            </>
                          )}
                        </Button>
                      </div>

                      {createJiraTicketMutation.isSuccess && createJiraTicketMutation.data && (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            <strong>Success!</strong> Ticket {createJiraTicketMutation.data.ticketKey} created.
                            <Button
                              variant="link"
                              size="sm"
                              className="ml-2 p-0 h-auto text-green-700"
                              onClick={() => window.open(createJiraTicketMutation.data.ticketUrl, '_blank')}
                            >
                              View in Jira <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                      <Separator />

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Manual Resolution Workflow</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Review the AI analysis for root cause and immediate actions</li>
                          <li>Apply immediate fixes to mitigate the issue</li>
                          <li>Monitor system metrics to confirm resolution</li>
                          <li>Document the resolution steps in Jira</li>
                          <li>Implement long-term preventive measures</li>
                        </ol>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center space-y-4">
                    {!jiraStatus?.data?.configured ? (
                      <>
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                        <p className="text-muted-foreground">
                          Jira integration is not configured. Contact your administrator to enable automated ticket creation.
                        </p>
                      </>
                    ) : (
                      <>
                        <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          This alert's severity ({alert.severity}) does not qualify for automatic Jira ticket creation.
                          Only critical and high-severity alerts can create tickets automatically.
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
