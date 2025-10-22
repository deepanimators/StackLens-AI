import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RealTimeWebSocketService, WebSocketConfig, WebSocketEventData } from '@/services/websocket';
import { WebSocketMessage, RealTimeMetric, RealTimeAlert } from '@/components/analytics/real-time-dashboard';

export interface UseWebSocketOptions extends Partial<WebSocketConfig> {
    autoConnect?: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
    onMetricUpdate?: (metric: RealTimeMetric) => void;
    onAlert?: (alert: RealTimeAlert) => void;
}

export interface WebSocketHookReturn {
    // Connection state
    isConnected: boolean;
    isConnecting: boolean;
    connectionState: string;
    reconnectAttempts: number;
    error: Error | null;

    // Actions
    connect: () => Promise<void>;
    disconnect: () => void;
    sendMessage: (message: WebSocketMessage) => void;

    // Metrics
    subscribeToMetrics: (metricIds: string[]) => void;
    unsubscribeFromMetrics: (metricIds: string[]) => void;
    requestHistoricalData: (metricId: string, startTime: Date, endTime: Date) => void;

    // Alerts
    acknowledgeAlert: (alertId: string) => void;

    // Real-time data
    metrics: Map<string, RealTimeMetric>;
    alerts: RealTimeAlert[];
    latestMessage: WebSocketMessage | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHookReturn {
    const {
        url = 'ws://localhost:8080/ws',
        autoConnect = true,
        reconnectInterval = 5000,
        maxReconnectAttempts = 5,
        heartbeatInterval = 30000,
        debug = false,
        onConnect,
        onDisconnect,
        onError,
        onMetricUpdate,
        onAlert
    } = options;

    // State
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionState, setConnectionState] = useState('CLOSED');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [error, setError] = useState<Error | null>(null);
    const [metrics, setMetrics] = useState<Map<string, RealTimeMetric>>(new Map());
    const [alerts, setAlerts] = useState<RealTimeAlert[]>([]);
    const [latestMessage, setLatestMessage] = useState<WebSocketMessage | null>(null);

    // WebSocket service ref
    const wsServiceRef = useRef<RealTimeWebSocketService | null>(null);

    // Initialize WebSocket service
    const initializeService = useCallback(() => {
        if (wsServiceRef.current) {
            wsServiceRef.current.destroy();
        }

        wsServiceRef.current = new RealTimeWebSocketService({
            url,
            reconnectInterval,
            maxReconnectAttempts,
            heartbeatInterval,
            debug
        });

        // Setup event listeners
        wsServiceRef.current.on('connect', () => {
            setIsConnected(true);
            setIsConnecting(false);
            setConnectionState('OPEN');
            setError(null);
            setReconnectAttempts(0);
            onConnect?.();
        });

        wsServiceRef.current.on('disconnect', () => {
            setIsConnected(false);
            setIsConnecting(false);
            setConnectionState('CLOSED');
            onDisconnect?.();
        });

        wsServiceRef.current.on('error', (eventData: WebSocketEventData) => {
            const errorObj = eventData.error || new Error('WebSocket error');
            setError(errorObj);
            setIsConnecting(false);
            onError?.(errorObj);
        });

        wsServiceRef.current.on('reconnect', (eventData: WebSocketEventData) => {
            setReconnectAttempts(eventData.data?.attempt || 0);
            setIsConnecting(true);
        });

        wsServiceRef.current.on('message', (eventData: WebSocketEventData) => {
            const message = eventData.data as WebSocketMessage;
            setLatestMessage(message);

            // Process message based on type
            switch (message.type) {
                case 'metric_update':
                    if (message.payload?.metrics) {
                        const newMetrics = new Map(metrics);
                        message.payload.metrics.forEach((metric: RealTimeMetric) => {
                            newMetrics.set(metric.id, metric);
                            onMetricUpdate?.(metric);
                        });
                        setMetrics(newMetrics);
                    } else if (message.payload?.metric) {
                        const metric = message.payload.metric as RealTimeMetric;
                        setMetrics(prev => new Map(prev.set(metric.id, metric)));
                        onMetricUpdate?.(metric);
                    }
                    break;

                case 'alert':
                    if (message.payload?.alert) {
                        const alert = message.payload.alert as RealTimeAlert;
                        setAlerts(prev => {
                            const filtered = prev.filter(a => a.id !== alert.id);
                            return [alert, ...filtered];
                        });
                        onAlert?.(alert);
                    } else if (message.payload?.alerts) {
                        setAlerts(message.payload.alerts);
                    }
                    break;

                case 'heartbeat':
                    // Update connection state timestamp
                    setConnectionState('OPEN');
                    break;

                case 'error':
                    setError(new Error(message.payload?.error || 'Server error'));
                    break;
            }
        });

        // Update connection state periodically
        const stateInterval = setInterval(() => {
            if (wsServiceRef.current) {
                setConnectionState(wsServiceRef.current.getConnectionState());
            }
        }, 1000);

        return () => clearInterval(stateInterval);
    }, [url, reconnectInterval, maxReconnectAttempts, heartbeatInterval, debug, onConnect, onDisconnect, onError, onMetricUpdate, onAlert, metrics]);

    // Connect function
    const connect = useCallback(async () => {
        if (!wsServiceRef.current) return;

        setIsConnecting(true);
        setError(null);

        try {
            await wsServiceRef.current.connect();
        } catch (err) {
            setError(err as Error);
            setIsConnecting(false);
        }
    }, []);

    // Disconnect function
    const disconnect = useCallback(() => {
        wsServiceRef.current?.disconnect();
        setIsConnected(false);
        setIsConnecting(false);
    }, []);

    // Send message function
    const sendMessage = useCallback((message: WebSocketMessage) => {
        wsServiceRef.current?.sendMessage(message);
    }, []);

    // Subscribe to metrics
    const subscribeToMetrics = useCallback((metricIds: string[]) => {
        wsServiceRef.current?.subscribeToMetrics(metricIds);
    }, []);

    // Unsubscribe from metrics
    const unsubscribeFromMetrics = useCallback((metricIds: string[]) => {
        wsServiceRef.current?.unsubscribeFromMetrics(metricIds);
    }, []);

    // Request historical data
    const requestHistoricalData = useCallback((metricId: string, startTime: Date, endTime: Date) => {
        wsServiceRef.current?.requestHistoricalData(metricId, startTime, endTime);
    }, []);

    // Acknowledge alert
    const acknowledgeAlert = useCallback((alertId: string) => {
        wsServiceRef.current?.acknowledgeAlert(alertId);

        // Optimistically update local state
        setAlerts(prev => prev.map(alert =>
            alert.id === alertId
                ? { ...alert, acknowledged: true }
                : alert
        ));
    }, []);

    // Initialize service on mount
    useEffect(() => {
        const cleanup = initializeService();

        if (autoConnect) {
            connect();
        }

        return () => {
            cleanup?.();
            wsServiceRef.current?.destroy();
        };
    }, [initializeService, autoConnect, connect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wsServiceRef.current?.destroy();
        };
    }, []);

    return {
        // Connection state
        isConnected,
        isConnecting,
        connectionState,
        reconnectAttempts,
        error,

        // Actions
        connect,
        disconnect,
        sendMessage,

        // Metrics
        subscribeToMetrics,
        unsubscribeFromMetrics,
        requestHistoricalData,

        // Alerts
        acknowledgeAlert,

        // Real-time data
        metrics,
        alerts: alerts.slice(0, 50), // Limit to 50 most recent alerts
        latestMessage
    };
}

// Higher-order component for WebSocket integration
export interface WithWebSocketProps {
    webSocket: WebSocketHookReturn;
}

export function withWebSocket<P extends object>(
    Component: React.ComponentType<P & WithWebSocketProps>,
    options?: UseWebSocketOptions
) {
    return function WebSocketWrappedComponent(props: P) {
        const webSocketHook = useWebSocket(options);

        return React.createElement(Component, { ...props, webSocket: webSocketHook } as P & WithWebSocketProps);
    };
}

// Mock WebSocket hook for development/testing
export function useMockWebSocket(): WebSocketHookReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [metrics, setMetrics] = useState<Map<string, RealTimeMetric>>(new Map());
    const [alerts, setAlerts] = useState<RealTimeAlert[]>([]);

    // Simulate connection
    useEffect(() => {
        const timer = setTimeout(() => setIsConnected(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Generate mock data
    useEffect(() => {
        if (!isConnected) return;

        const interval = setInterval(() => {
            // Mock metrics
            const mockMetrics = new Map([
                ['response_time', {
                    id: 'response_time',
                    name: 'Response Time',
                    value: Math.floor(Math.random() * 200) + 200,
                    previousValue: 250,
                    change: Math.floor(Math.random() * 50) - 25,
                    changePercentage: Math.floor(Math.random() * 20) - 10,
                    trend: Math.random() > 0.5 ? 'up' as const : 'down' as const,
                    timestamp: new Date(),
                    unit: 'ms',
                    format: 'duration' as const
                }],
                ['active_users', {
                    id: 'active_users',
                    name: 'Active Users',
                    value: Math.floor(Math.random() * 500) + 1000,
                    previousValue: 1200,
                    change: Math.floor(Math.random() * 100) - 50,
                    changePercentage: Math.floor(Math.random() * 10) - 5,
                    trend: Math.random() > 0.5 ? 'up' as const : 'down' as const,
                    timestamp: new Date(),
                    format: 'number' as const
                }]
            ]);

            setMetrics(mockMetrics);

            // Occasionally add mock alerts
            if (Math.random() < 0.1) {
                const mockAlert: RealTimeAlert = {
                    id: `alert-${Date.now()}`,
                    type: Math.random() > 0.5 ? 'warning' : 'error',
                    title: 'Mock Alert',
                    message: 'This is a mock alert for testing',
                    timestamp: new Date(),
                    acknowledged: false
                };

                setAlerts(prev => [mockAlert, ...prev.slice(0, 49)]);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [isConnected]);

    return {
        isConnected,
        isConnecting: false,
        connectionState: isConnected ? 'OPEN' : 'CLOSED',
        reconnectAttempts: 0,
        error: null,
        connect: async () => setIsConnected(true),
        disconnect: () => setIsConnected(false),
        sendMessage: () => { },
        subscribeToMetrics: () => { },
        unsubscribeFromMetrics: () => { },
        requestHistoricalData: () => { },
        acknowledgeAlert: (alertId: string) => {
            setAlerts(prev => prev.map(alert =>
                alert.id === alertId
                    ? { ...alert, acknowledged: true }
                    : alert
            ));
        },
        metrics,
        alerts,
        latestMessage: null
    };
}

export default useWebSocket;