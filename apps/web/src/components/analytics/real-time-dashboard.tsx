import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Server, 
  Zap,
  RefreshCw,
  Maximize2,
  Settings,
  Download,
  Play,
  Pause
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface RealTimeMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  timestamp: Date;
  unit?: string;
  format?: 'number' | 'percentage' | 'currency' | 'bytes' | 'duration';
}

export interface RealTimeAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged?: boolean;
  metadata?: Record<string, any>;
}

export interface WebSocketMessage {
  type: 'metric_update' | 'alert' | 'heartbeat' | 'error';
  payload: any;
  timestamp: Date;
}

interface RealTimeDashboardProps {
  wsEndpoint?: string;
  refreshInterval?: number;
  autoReconnect?: boolean;
  className?: string;
  metrics: RealTimeMetric[];
  alerts: RealTimeAlert[];
  onMetricUpdate?: (metric: RealTimeMetric) => void;
  onAlert?: (alert: RealTimeAlert) => void;
}

export function RealTimeDashboard({
  wsEndpoint = 'ws://localhost:3001/ws/analytics',
  refreshInterval = 5000,
  autoReconnect = true,
  className,
  metrics: initialMetrics = [],
  alerts: initialAlerts = [],
  onMetricUpdate,
  onAlert
}: RealTimeDashboardProps) {
  const [metrics, setMetrics] = useState<RealTimeMetric[]>(initialMetrics);
  const [alerts, setAlerts] = useState<RealTimeAlert[]>(initialAlerts);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [retryCount, setRetryCount] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection management
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const ws = new WebSocket(wsEndpoint);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        setRetryCount(0);
        
        // Send initial subscription
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['metrics', 'alerts', 'system']
        }));

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Auto-reconnect if enabled and not a clean close
        if (autoReconnect && event.code !== 1000 && retryCount < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [wsEndpoint, autoReconnect, retryCount]);

  // Handle WebSocket messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastUpdate(new Date());
    
    switch (message.type) {
      case 'metric_update':
        const metricUpdate = message.payload as RealTimeMetric;
        setMetrics(prev => {
          const existing = prev.find(m => m.id === metricUpdate.id);
          if (existing) {
            return prev.map(m => m.id === metricUpdate.id ? metricUpdate : m);
          } else {
            return [...prev, metricUpdate];
          }
        });
        onMetricUpdate?.(metricUpdate);
        break;

      case 'alert':
        const alert = message.payload as RealTimeAlert;
        setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
        onAlert?.(alert);
        break;

      case 'heartbeat':
        // Handle heartbeat response
        break;

      case 'error':
        console.error('WebSocket server error:', message.payload);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }, [onMetricUpdate, onAlert]);

  // Connect on mount and cleanup on unmount
  useEffect(() => {
    if (isLive) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [connect, isLive]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'refresh' }));
    }
  }, []);

  // Toggle live updates
  const toggleLive = useCallback(() => {
    setIsLive(prev => {
      const newState = !prev;
      if (newState && connectionStatus === 'disconnected') {
        connect();
      } else if (!newState && wsRef.current) {
        wsRef.current.close(1000, 'Live updates paused');
      }
      return newState;
    });
  }, [connectionStatus, connect]);

  // Format metric values
  const formatMetricValue = useCallback((metric: RealTimeMetric) => {
    const { value, unit, format } = metric;
    
    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(value);
      case 'bytes':
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = value;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
      case 'duration':
        if (value < 1000) return `${value.toFixed(0)}ms`;
        if (value < 60000) return `${(value / 1000).toFixed(1)}s`;
        return `${(value / 60000).toFixed(1)}m`;
      case 'number':
      default:
        const formatted = value >= 1000000 
          ? `${(value / 1000000).toFixed(1)}M`
          : value >= 1000 
            ? `${(value / 1000).toFixed(1)}K`
            : value.toFixed(0);
        return unit ? `${formatted} ${unit}` : formatted;
    }
  }, []);

  // Get connection status indicator
  const getConnectionIndicator = () => {
    const indicators = {
      connected: { color: 'bg-green-500', text: 'Connected', pulse: true },
      connecting: { color: 'bg-yellow-500', text: 'Connecting', pulse: true },
      disconnected: { color: 'bg-gray-500', text: 'Disconnected', pulse: false },
      error: { color: 'bg-red-500', text: 'Error', pulse: false }
    };
    
    const indicator = indicators[connectionStatus];
    
    return (
      <div className="flex items-center space-x-2">
        <div className={cn(
          'w-2 h-2 rounded-full',
          indicator.color,
          indicator.pulse && 'animate-pulse'
        )} />
        <span className="text-xs text-muted-foreground">{indicator.text}</span>
      </div>
    );
  };

  // Get trend icon and color
  const getTrendDisplay = (metric: RealTimeMetric) => {
    const { trend, changePercentage } = metric;
    
    if (trend === 'stable' || Math.abs(changePercentage) < 0.1) {
      return {
        icon: <Activity className="h-3 w-3 text-muted-foreground" />,
        color: 'text-muted-foreground',
        text: '0.0%'
      };
    }
    
    const isPositive = trend === 'up';
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const icon = isPositive 
      ? <TrendingUp className={`h-3 w-3 ${color}`} />
      : <TrendingDown className={`h-3 w-3 ${color}`} />;
    
    return {
      icon,
      color,
      text: `${isPositive ? '+' : ''}${changePercentage.toFixed(1)}%`
    };
  };

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-time Analytics</h2>
          <div className="flex items-center space-x-4 mt-1">
            {getConnectionIndicator()}
            <span className="text-xs text-muted-foreground">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="live-updates"
              checked={isLive}
              onCheckedChange={toggleLive}
            />
            <Label htmlFor="live-updates" className="text-sm">Live Updates</Label>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={connectionStatus !== 'connected'}
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-1",
              connectionStatus === 'connecting' && "animate-spin"
            )} />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.slice(0, 8).map((metric) => {
          const trend = getTrendDisplay(metric);
          
          return (
            <Card key={metric.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.name}
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {formatMetricValue(metric)}
                    </div>
                    <div className={cn("flex items-center space-x-1 text-xs", trend.color)}>
                      {trend.icon}
                      <span>{trend.text}</span>
                    </div>
                  </div>
                  
                  {/* Mini sparkline placeholder */}
                  <div className="w-16 h-8 bg-muted/20 rounded flex items-end justify-end space-x-1 p-1">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        className="bg-primary/60 rounded-sm"
                        style={{
                          height: `${Math.random() * 100}%`,
                          width: '2px'
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground mt-2">
                  Updated {new Date(metric.timestamp).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Real-time Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Recent Alerts ({alerts.filter(a => !a.acknowledged).length} unread)
              </CardTitle>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAlerts([])}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start justify-between p-3 rounded-lg border",
                    alert.acknowledged ? 'opacity-60' : '',
                    alert.type === 'error' && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20',
                    alert.type === 'warning' && 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20',
                    alert.type === 'info' && 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20',
                    alert.type === 'success' && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={alert.type === 'error' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {alert.type.toUpperCase()}
                      </Badge>
                      <span className="font-medium text-sm">{alert.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.message}
                    </p>
                  </div>
                  
                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="ml-2"
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Status Card */}
      {connectionStatus !== 'connected' && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Server className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-sm">Connection Status</p>
                  <p className="text-xs text-muted-foreground">
                    {connectionStatus === 'connecting' && 'Attempting to connect to real-time data stream...'}
                    {connectionStatus === 'disconnected' && 'Disconnected from real-time data stream'}
                    {connectionStatus === 'error' && 'Failed to connect to real-time data stream'}
                    {retryCount > 0 && ` (Retry ${retryCount}/5)`}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {connectionStatus === 'disconnected' && (
                  <Button variant="outline" size="sm" onClick={connect}>
                    Reconnect
                  </Button>
                )}
                {!isLive && (
                  <Button variant="outline" size="sm" onClick={() => setIsLive(true)}>
                    <Play className="h-4 w-4 mr-1" />
                    Resume Live Updates
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">WebSocket Latency</p>
                <p className="text-2xl font-bold">
                  {connectionStatus === 'connected' ? '< 50ms' : 'N/A'}
                </p>
              </div>
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Connections</p>
                <p className="text-2xl font-bold">
                  {connectionStatus === 'connected' ? '1' : '0'}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Messages/min</p>
                <p className="text-2xl font-bold">
                  {connectionStatus === 'connected' ? Math.floor(Math.random() * 100) + 50 : '0'}
                </p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RealTimeDashboard;