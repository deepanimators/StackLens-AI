import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Clock, 
  Database,
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  Maximize2,
  Download,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import RealTimeDashboard from './real-time-dashboard';
import InteractiveCharts from './interactive-charts';
import CustomDashboard, { Widget } from './custom-dashboard';
import { useDashboard } from './dashboard-context';

interface AnalyticsOverviewProps {
  className?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  change: number;
  status: 'good' | 'warning' | 'critical';
  trend: number[];
}

interface SystemHealth {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  uptime: string;
  errors: number;
  warnings: number;
}

export function AnalyticsOverview({ className }: AnalyticsOverviewProps) {
  const { state: dashboardState, actions: dashboardActions } = useDashboard();
  const [activeTab, setActiveTab] = useState('overview');
  const [isConnected, setIsConnected] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  // Sample metrics data - replace with real data source
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([
    {
      name: 'Response Time',
      value: 245,
      unit: 'ms',
      change: -12.5,
      status: 'good',
      trend: [280, 265, 250, 245, 240, 245]
    },
    {
      name: 'Error Rate',
      value: 0.8,
      unit: '%',
      change: 15.3,
      status: 'warning',
      trend: [0.5, 0.6, 0.7, 0.8, 0.9, 0.8]
    },
    {
      name: 'Active Users',
      value: 1247,
      unit: '',
      change: 8.2,
      status: 'good',
      trend: [1100, 1150, 1200, 1220, 1235, 1247]
    },
    {
      name: 'Throughput',
      value: 5421,
      unit: 'req/min',
      change: 3.7,
      status: 'good',
      trend: [5200, 5300, 5350, 5400, 5410, 5421]
    }
  ]);

  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    cpu: 68,
    memory: 72,
    disk: 45,
    network: 23,
    uptime: '15d 4h 32m',
    errors: 3,
    warnings: 12
  });

  // Sample widgets for overview dashboard
  const [overviewWidgets, setOverviewWidgets] = useState<Widget[]>([
    {
      id: 'metric-response-time',
      type: 'metric',
      title: 'Avg Response Time',
      description: 'Average API response time',
      config: {
        metricKey: 'response_time',
        format: 'duration',
        threshold: { warning: 500, critical: 1000 }
      },
      layout: { i: 'metric-response-time', x: 0, y: 0, w: 3, h: 2 },
      isVisible: true,
      isEditable: false
    },
    {
      id: 'chart-user-activity',
      type: 'chart',
      title: 'User Activity',
      description: 'Real-time user activity trends',
      config: {
        chartType: 'line',
        dataSource: 'user_activity',
        colors: ['#3b82f6']
      },
      layout: { i: 'chart-user-activity', x: 3, y: 0, w: 6, h: 4 },
      isVisible: true,
      isEditable: false
    },
    {
      id: 'alert-recent',
      type: 'alert',
      title: 'Recent Alerts',
      description: 'Latest system alerts and notifications',
      config: {
        alertTypes: ['error', 'warning', 'info'],
        maxAlerts: 5
      },
      layout: { i: 'alert-recent', x: 9, y: 0, w: 3, h: 4 },
      isVisible: true,
      isEditable: false
    }
  ]);

  // Simulate WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      setIsConnected(true);
      toast({
        title: "Connected",
        description: "Real-time data connection established."
      });
    };

    const disconnectWebSocket = () => {
      setIsConnected(false);
      toast({
        title: "Disconnected",
        description: "Real-time data connection lost.",
        variant: "destructive"
      });
    };

    // Simulate connection
    setTimeout(connectWebSocket, 1000);

    // Simulate occasional disconnections
    const interval = setInterval(() => {
      if (Math.random() < 0.1) {
        disconnectWebSocket();
        setTimeout(connectWebSocket, 2000);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [toast]);

  // Auto refresh data
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      // Simulate data updates
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: metric.value + (Math.random() - 0.5) * 10,
        change: (Math.random() - 0.5) * 20,
        trend: [...metric.trend.slice(1), metric.value + (Math.random() - 0.5) * 10]
      })));

      setSystemHealth(prev => ({
        ...prev,
        cpu: Math.max(0, Math.min(100, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(0, Math.min(100, prev.memory + (Math.random() - 0.5) * 8)),
        network: Math.max(0, Math.min(100, prev.network + (Math.random() - 0.5) * 15))
      }));

      setLastUpdate(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval]);

  // Manual refresh
  const handleManualRefresh = () => {
    setLastUpdate(new Date());
    toast({
      title: "Data Refreshed",
      description: "All metrics have been updated."
    });
  };

  // Reset metrics
  const handleResetMetrics = () => {
    setMetrics([
      {
        name: 'Response Time',
        value: 245,
        unit: 'ms',
        change: -12.5,
        status: 'good',
        trend: [280, 265, 250, 245, 240, 245]
      },
      {
        name: 'Error Rate',
        value: 0.8,
        unit: '%',
        change: 15.3,
        status: 'warning',
        trend: [0.5, 0.6, 0.7, 0.8, 0.9, 0.8]
      },
      {
        name: 'Active Users',
        value: 1247,
        unit: '',
        change: 8.2,
        status: 'good',
        trend: [1100, 1150, 1200, 1220, 1235, 1247]
      },
      {
        name: 'Throughput',
        value: 5421,
        unit: 'req/min',
        change: 3.7,
        status: 'good',
        trend: [5200, 5300, 5350, 5400, 5410, 5421]
      }
    ]);

    toast({
      title: "Metrics Reset",
      description: "All metrics have been reset to default values."
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Format change percentage
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Overview</h1>
          <p className="text-muted-foreground">
            Real-time system metrics and performance insights
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2 text-sm">
            {isConnected ? (
              <><Wifi className="h-4 w-4 text-green-500" /><span className="text-green-600">Connected</span></>
            ) : (
              <><WifiOff className="h-4 w-4 text-red-500" /><span className="text-red-600">Disconnected</span></>
            )}
          </div>
          
          {/* Auto Refresh Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={isAutoRefresh}
              onCheckedChange={setIsAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
          </div>
          
          {/* Refresh Interval */}
          <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10s</SelectItem>
              <SelectItem value="30">30s</SelectItem>
              <SelectItem value="60">1m</SelectItem>
              <SelectItem value="300">5m</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Manual Refresh */}
          <Button variant="outline" size="sm" onClick={handleManualRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          {/* Reset Metrics */}
          <Button variant="outline" size="sm" onClick={handleResetMetrics}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Last Update */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
        <span>Refresh: {isAutoRefresh ? `Every ${refreshInterval}s` : 'Manual'}</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="real-time">Real-time</TabsTrigger>
          <TabsTrigger value="charts">Interactive Charts</TabsTrigger>
          <TabsTrigger value="custom">Custom Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">
                        {metric.value.toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          {metric.unit}
                        </span>
                      </div>
                      <div className={cn("text-xs", getStatusColor(metric.status))}>
                        {formatChange(metric.change)} from last period
                      </div>
                    </div>
                    <div className={cn("p-2 rounded-full", {
                      'bg-green-100 text-green-600': metric.status === 'good',
                      'bg-yellow-100 text-yellow-600': metric.status === 'warning',
                      'bg-red-100 text-red-600': metric.status === 'critical'
                    })}>
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                System Health
              </CardTitle>
              <CardDescription>
                Current system resource utilization and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CPU Usage</span>
                    <span className="text-sm text-muted-foreground">{systemHealth.cpu}%</span>
                  </div>
                  <Progress value={systemHealth.cpu} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Memory</span>
                    <span className="text-sm text-muted-foreground">{systemHealth.memory}%</span>
                  </div>
                  <Progress value={systemHealth.memory} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Disk I/O</span>
                    <span className="text-sm text-muted-foreground">{systemHealth.disk}%</span>
                  </div>
                  <Progress value={systemHealth.disk} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Network</span>
                    <span className="text-sm text-muted-foreground">{systemHealth.network}%</span>
                  </div>
                  <Progress value={systemHealth.network} className="h-2" />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Uptime:</span>
                  <span className="font-medium">{systemHealth.uptime}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-muted-foreground">Errors:</span>
                  <Badge variant="destructive">{systemHealth.errors}</Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-muted-foreground">Warnings:</span>
                  <Badge variant="secondary">{systemHealth.warnings}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Active Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">1,247</div>
                <div className="text-sm text-muted-foreground">
                  +8.2% from last hour
                </div>
                <Progress value={65} className="mt-3" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Database Queries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">15.2K</div>
                <div className="text-sm text-muted-foreground">
                  +3.7% from last hour
                </div>
                <Progress value={78} className="mt-3" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Server Load
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">68%</div>
                <div className="text-sm text-muted-foreground">
                  -2.1% from last hour
                </div>
                <Progress value={68} className="mt-3" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="real-time">
          <RealTimeDashboard 
            className="space-y-6"
            metrics={metrics.map(m => ({
              id: m.name.toLowerCase().replace(/\s+/g, '_'),
              name: m.name,
              value: m.value,
              previousValue: m.trend[m.trend.length - 2] || m.value,
              change: m.change,
              changePercentage: m.change,
              trend: m.change >= 0 ? 'up' as const : 'down' as const,
              timestamp: new Date(),
              unit: m.unit,
              format: m.unit === '%' ? 'percentage' as const : 'number' as const
            }))}
            alerts={[
              {
                id: 'alert-1',
                type: 'warning',
                title: 'High Response Time',
                message: 'API response time exceeded threshold',
                timestamp: new Date(Date.now() - 5 * 60 * 1000),
                acknowledged: false
              },
              {
                id: 'alert-2', 
                type: 'error',
                title: 'Database Connection Lost',
                message: 'Connection to primary database failed',
                timestamp: new Date(Date.now() - 15 * 60 * 1000),
                acknowledged: false
              }
            ]}
          />
        </TabsContent>

        <TabsContent value="charts">
          <InteractiveCharts 
            className="space-y-6"
            charts={[
              {
                id: 'user-activity',
                title: 'User Activity',
                type: 'line',
                data: Array.from({ length: 24 }, (_, i) => ({
                  name: `${i}:00`,
                  value: Math.floor(Math.random() * 1000) + 500,
                  timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString()
                }))
              },
              {
                id: 'error-rates',
                title: 'Error Rates by Category', 
                type: 'bar',
                data: [
                  { name: '4xx Errors', value: 45, timestamp: new Date().toISOString() },
                  { name: '5xx Errors', value: 12, timestamp: new Date().toISOString() },
                  { name: 'Timeouts', value: 8, timestamp: new Date().toISOString() },
                  { name: 'Network', value: 3, timestamp: new Date().toISOString() }
                ]
              },
              {
                id: 'performance-metrics',
                title: 'Performance Overview',
                type: 'area',
                data: Array.from({ length: 12 }, (_, i) => ({
                  name: new Date(Date.now() - (11 - i) * 30 * 60 * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
                  'Response Time': Math.floor(Math.random() * 200) + 150,
                  'CPU Usage': Math.floor(Math.random() * 40) + 30,
                  'Memory Usage': Math.floor(Math.random() * 30) + 50,
                  timestamp: new Date(Date.now() - (11 - i) * 30 * 60 * 1000).toISOString()
                }))
              }
            ]}
          />
        </TabsContent>

        <TabsContent value="custom">
          {dashboardState.activeDashboard ? (
            <CustomDashboard
              widgets={dashboardState.dashboards.find(d => d.id === dashboardState.activeDashboard)?.widgets || []}
              onWidgetUpdate={(widget) => dashboardActions.updateWidget(dashboardState.activeDashboard!, widget)}
              onWidgetDelete={(widgetId) => dashboardActions.deleteWidget(dashboardState.activeDashboard!, widgetId)}
              onWidgetAdd={(widget) => dashboardActions.addWidget(dashboardState.activeDashboard!, widget)}
              onLayoutChange={(layout) => dashboardActions.updateLayout(dashboardState.activeDashboard!, layout)}
              onDashboardSave={() => {
                toast({
                  title: "Dashboard Saved",
                  description: "All changes have been saved successfully."
                });
              }}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Dashboard Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Create or select a dashboard to start customizing your analytics view.
                  </p>
                  <Button onClick={() => dashboardActions.loadDashboards()}>
                    Load Dashboards
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsOverview;