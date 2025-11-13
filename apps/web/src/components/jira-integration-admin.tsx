/**
 * Jira Integration Admin Component
 * Manages Jira configuration, error monitoring, and automation settings
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Activity,
  Settings,
  BarChart3,
  Clock,
  Zap,
  Database,
  Shield,
  Play,
  Square,
  RefreshCw,
  Eye,
} from "lucide-react";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface JiraStatus {
  configured: boolean;
  host?: string;
  project?: string;
  message: string;
}

interface AutomationStatus {
  enabled: boolean;
  totalProcessed: number;
  ticketsCreated: number;
  ticketsUpdated: number;
  skipped: number;
  failed: number;
}

interface WatcherStatus {
  isWatching: boolean;
  watchedFiles: string[];
  totalErrors: number;
  fileStats: Record<
    string,
    {
      path: string;
      lastLineCount: number;
      errorCount: number;
    }
  >;
}

interface ErrorRecord {
  id: number;
  severity: string;
  errorType: string;
  message: string;
  storeNumber?: string;
  kioskNumber?: string;
  timestamp: string;
  resolved: boolean;
}

export function JiraIntegrationAdmin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("status");
  const [sseOpen, setSseOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState<string[]>([]);

  // Fetch Jira Status
  const { data: jiraStatus, refetch: refetchJiraStatus } = useQuery({
    queryKey: ["jira-status"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/jira/status");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch Automation Status
  const { data: automationStatus, refetch: refetchAutomationStatus } = useQuery({
    queryKey: ["automation-status"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/automation/status");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch Watcher Status
  const { data: watcherStatus, refetch: refetchWatcherStatus } = useQuery({
    queryKey: ["watcher-status"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/watcher/status");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Start Watcher Mutation
  const startWatcherMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedRequest("POST", "/api/watcher/start", {
        logFilePath: "data/pos-application.log",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Log watcher started successfully",
      });
      refetchWatcherStatus();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to start watcher: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Stop Watcher Mutation
  const stopWatcherMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedRequest("POST", "/api/watcher/stop");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Log watcher stopped successfully",
      });
      refetchWatcherStatus();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to stop watcher: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Toggle Automation Mutation
  const toggleAutomationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await authenticatedRequest("POST", "/api/automation/toggle", { enabled });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Automation setting updated",
      });
      refetchAutomationStatus();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update automation: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Connect to SSE stream
  useEffect(() => {
    if (!sseOpen) return;

    const eventSource = new EventSource("/api/monitoring/live");

    eventSource.addEventListener("error-detected", (event) => {
      const data = JSON.parse(event.data);
      setLiveEvents((prev) => [
        `[ERROR] ${data.severity}: ${data.errorType}`,
        ...prev.slice(0, 49),
      ]);
    });

    eventSource.addEventListener("ticket-created", (event) => {
      const data = JSON.parse(event.data);
      setLiveEvents((prev) => [
        `[TICKET] Created: ${data.jiraKey} for ${data.severity}`,
        ...prev.slice(0, 49),
      ]);
    });

    eventSource.addEventListener("ticket-updated", (event) => {
      const data = JSON.parse(event.data);
      setLiveEvents((prev) => [
        `[UPDATE] ${data.jiraKey}: ${data.reason}`,
        ...prev.slice(0, 49),
      ]);
    });

    eventSource.onerror = () => {
      eventSource.close();
      setSseOpen(false);
      toast({
        title: "Connection Closed",
        description: "Real-time monitoring connection closed",
      });
    };

    return () => eventSource.close();
  }, [sseOpen, toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Jira Integration</h2>
          <p className="text-sm text-muted-foreground">
            Manage Jira configuration, error automation, and real-time monitoring
          </p>
        </div>
        <Button
          onClick={() => {
            refetchJiraStatus();
            refetchAutomationStatus();
            refetchWatcherStatus();
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          <div className="grid gap-4">
            {/* Jira Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Jira Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {jiraStatus?.data?.configured ? (
                  <Alert className="border-green-500 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>Connected</AlertTitle>
                    <AlertDescription>
                      Jira Cloud is properly configured
                      {jiraStatus?.data?.project && (
                        <p className="mt-2">
                          <strong>Project:</strong> {jiraStatus.data.project}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-red-500 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertTitle>Not Configured</AlertTitle>
                    <AlertDescription>
                      {jiraStatus?.data?.message ||
                        "Jira configuration is incomplete. Set environment variables: JIRA_HOST, JIRA_PROJECT_KEY, JIRA_USER_EMAIL, JIRA_API_TOKEN"}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Log Watcher Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Log Watcher</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={watcherStatus?.data?.isWatching ? "default" : "outline"}
                      >
                        {watcherStatus?.data?.isWatching ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Monitoring {watcherStatus?.data?.watchedFiles?.length || 0} file(s)
                      </span>
                    </div>
                    <p className="text-sm">
                      Total errors detected:{" "}
                      <strong>{watcherStatus?.data?.totalErrors || 0}</strong>
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      onClick={() => startWatcherMutation.mutate()}
                      disabled={watcherStatus?.data?.isWatching || startWatcherMutation.isPending}
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                    <Button
                      onClick={() => stopWatcherMutation.mutate()}
                      disabled={!watcherStatus?.data?.isWatching || stopWatcherMutation.isPending}
                      variant="destructive"
                      size="sm"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Automation Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Error Automation</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={automationStatus?.data?.enabled ? "default" : "outline"}
                      >
                        {automationStatus?.data?.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Processed</p>
                        <p className="text-lg font-semibold">
                          {automationStatus?.data?.totalProcessed || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="text-lg font-semibold text-green-600">
                          {automationStatus?.data?.ticketsCreated || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Updated</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {automationStatus?.data?.ticketsUpdated || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Skipped</p>
                        <p className="text-lg font-semibold text-orange-600">
                          {automationStatus?.data?.skipped || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={automationStatus?.data?.enabled || false}
                    onCheckedChange={(checked) =>
                      toggleAutomationMutation.mutate(checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Jira Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure your Jira Cloud instance for error ticket management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-500 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle>Environment Configuration</AlertTitle>
                <AlertDescription>
                  The following environment variables must be set on the server:
                  <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                    <li>
                      <code className="bg-gray-100 px-2 py-1">JIRA_HOST</code> - Your Jira
                      Cloud URL
                    </li>
                    <li>
                      <code className="bg-gray-100 px-2 py-1">JIRA_PROJECT_KEY</code> - Your
                      project key (e.g., STACK)
                    </li>
                    <li>
                      <code className="bg-gray-100 px-2 py-1">JIRA_USER_EMAIL</code> - Your
                      Jira user email
                    </li>
                    <li>
                      <code className="bg-gray-100 px-2 py-1">JIRA_API_TOKEN</code> - Your API
                      token
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold">Configuration Values</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Jira Host</p>
                      <p className="font-mono break-all">
                        {jiraStatus?.data?.host || "Not configured"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Project Key</p>
                      <p className="font-mono break-all">
                        {jiraStatus?.data?.project || "Not configured"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Automation Rules</span>
              </CardTitle>
              <CardDescription>
                Configure error severity thresholds for automatic Jira ticket creation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-500 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle>ML Confidence Thresholds</AlertTitle>
                <AlertDescription>
                  Jira tickets are created based on error severity and ML prediction confidence
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {/* CRITICAL Threshold */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">CRITICAL</h3>
                      <p className="text-sm text-muted-foreground">
                        Always creates a ticket, regardless of ML confidence
                      </p>
                    </div>
                    <Badge className="bg-red-600">0% Threshold</Badge>
                  </div>
                  <Progress value={100} className="bg-red-100" />
                </div>

                {/* HIGH Threshold */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">HIGH</h3>
                      <p className="text-sm text-muted-foreground">
                        Creates a ticket if ML confidence is 75% or higher
                      </p>
                    </div>
                    <Badge className="bg-orange-600">75% Threshold</Badge>
                  </div>
                  <Progress value={75} className="bg-orange-100" />
                </div>

                {/* MEDIUM Threshold */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">MEDIUM</h3>
                      <p className="text-sm text-muted-foreground">
                        Creates a ticket if ML confidence is 90% or higher
                      </p>
                    </div>
                    <Badge className="bg-yellow-600">90% Threshold</Badge>
                  </div>
                  <Progress value={90} className="bg-yellow-100" />
                </div>

                {/* LOW Threshold */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">LOW</h3>
                      <p className="text-sm text-muted-foreground">
                        Skipped - no automatic tickets created
                      </p>
                    </div>
                    <Badge variant="outline">Disabled</Badge>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  Thresholds are configured on the backend. Adjust them by modifying the
                  ErrorAutomationService configuration in your code.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Real-Time Monitoring</span>
              </CardTitle>
              <CardDescription>
                Watch errors and automation events as they happen in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      sseOpen ? "bg-green-600" : "bg-gray-400"
                    }`}
                  />
                  <span className="text-sm">
                    {sseOpen ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <Button
                  onClick={() => setSseOpen(!sseOpen)}
                  variant={sseOpen ? "destructive" : "default"}
                  size="sm"
                >
                  {sseOpen ? "Stop Monitoring" : "Start Monitoring"}
                </Button>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs text-green-400 space-y-1">
                {liveEvents.length === 0 ? (
                  <div className="text-gray-500">
                    {sseOpen
                      ? "Waiting for events..."
                      : "Click 'Start Monitoring' to see real-time events"}
                  </div>
                ) : (
                  liveEvents.map((event, idx) => (
                    <div key={idx}>{event}</div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Automation History</span>
              </CardTitle>
              <CardDescription>
                View the history of automated actions and created tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-500 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle>Feature Coming Soon</AlertTitle>
                <AlertDescription>
                  Detailed automation history, ticket tracking, and audit logs will be
                  available in the next update. Currently, you can view recent statistics
                  in the Status tab.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Processed</p>
                    <p className="text-2xl font-bold">
                      {automationStatus?.data?.totalProcessed || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">
                      {automationStatus?.data?.totalProcessed === 0
                        ? "N/A"
                        : Math.round(
                            (((automationStatus?.data?.ticketsCreated || 0) +
                              (automationStatus?.data?.ticketsUpdated || 0)) /
                              (automationStatus?.data?.totalProcessed || 1)) *
                              100
                          ) + "%"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default JiraIntegrationAdmin;
