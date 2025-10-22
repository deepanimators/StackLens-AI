import { WebSocketMessage, RealTimeMetric, RealTimeAlert } from '@/components/analytics/real-time-dashboard';

export type WebSocketEventType = 'connect' | 'disconnect' | 'error' | 'message' | 'reconnect';

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

export interface WebSocketEventData {
  type: WebSocketEventType;
  data?: any;
  error?: Error;
  timestamp: Date;
}

type EventCallback = (data: WebSocketEventData) => void;

export class RealTimeWebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isDestroyed = false;
  private eventCallbacks: Map<WebSocketEventType, Set<EventCallback>> = new Map();
  private messageQueue: WebSocketMessage[] = [];

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      debug: false,
      ...config
    };

    // Initialize event callback sets
    this.eventCallbacks.set('connect', new Set());
    this.eventCallbacks.set('disconnect', new Set());
    this.eventCallbacks.set('error', new Set());
    this.eventCallbacks.set('message', new Set());
    this.eventCallbacks.set('reconnect', new Set());
  }

  // Connect to WebSocket
  public async connect(): Promise<void> {
    if (this.isDestroyed || this.isConnecting || this.isConnected()) {
      return;
    }

    this.isConnecting = true;
    this.log('Attempting to connect to WebSocket...');

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      this.isConnecting = false;
      this.emitEvent('error', { error: error as Error });
      throw error;
    }
  }

  // Disconnect from WebSocket
  public disconnect(): void {
    this.log('Disconnecting WebSocket...');
    
    this.clearTimers();
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Client disconnect');
    }
    
    this.ws = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Destroy the service
  public destroy(): void {
    this.log('Destroying WebSocket service...');
    
    this.isDestroyed = true;
    this.disconnect();
    this.eventCallbacks.clear();
    this.messageQueue.length = 0;
  }

  // Check if connected
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get connection state
  public getConnectionState(): string {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  // Send message
  public sendMessage(message: WebSocketMessage): void {
    if (!this.isConnected()) {
      this.log('WebSocket not connected, queueing message');
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws!.send(JSON.stringify(message));
      this.log('Message sent:', message);
    } catch (error) {
      this.log('Failed to send message:', error);
      this.emitEvent('error', { error: error as Error });
    }
  }

  // Subscribe to metrics
  public subscribeToMetrics(metricIds: string[]): void {
    this.sendMessage({
      type: 'metric_update',
      payload: {
        action: 'subscribe',
        metricIds
      },
      timestamp: new Date()
    });
  }

  // Unsubscribe from metrics
  public unsubscribeFromMetrics(metricIds: string[]): void {
    this.sendMessage({
      type: 'metric_update',
      payload: {
        action: 'unsubscribe',
        metricIds
      },
      timestamp: new Date()
    });
  }

  // Request historical data
  public requestHistoricalData(metricId: string, startTime: Date, endTime: Date): void {
    this.sendMessage({
      type: 'metric_update',
      payload: {
        action: 'historical',
        metricId,
        startTime: startTime.getTime(),
        endTime: endTime.getTime()
      },
      timestamp: new Date()
    });
  }

  // Acknowledge alert
  public acknowledgeAlert(alertId: string): void {
    this.sendMessage({
      type: 'alert',
      payload: {
        action: 'acknowledge',
        alertId
      },
      timestamp: new Date()
    });
  }

  // Add event listener
  public on(event: WebSocketEventType, callback: EventCallback): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.add(callback);
    }
  }

  // Remove event listener
  public off(event: WebSocketEventType, callback: EventCallback): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  // Setup WebSocket event handlers
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Process queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.sendMessage(message);
        }
      }

      // Start heartbeat
      this.startHeartbeat();
      
      this.emitEvent('connect', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.log('Message received:', message);
        this.emitEvent('message', { data: message });
      } catch (error) {
        this.log('Failed to parse message:', error);
        this.emitEvent('error', { error: error as Error });
      }
    };

    this.ws.onerror = (event) => {
      this.log('WebSocket error:', event);
      this.emitEvent('error', { error: new Error('WebSocket connection error') });
    };

    this.ws.onclose = (event) => {
      this.log(`WebSocket closed: ${event.code} - ${event.reason}`);
      this.clearTimers();
      this.ws = null;
      this.isConnecting = false;

      if (!this.isDestroyed) {
        this.emitEvent('disconnect', { data: { code: event.code, reason: event.reason } });
        
        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      }
    };
  }

  // Schedule reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isDestroyed) return;

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    this.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.emitEvent('reconnect', { data: { attempt: this.reconnectAttempts } });
      this.connect().catch(error => {
        this.log('Reconnect failed:', error);
        
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
          this.log('Max reconnect attempts reached');
          this.emitEvent('error', { 
            error: new Error(`Max reconnect attempts (${this.config.maxReconnectAttempts}) reached`) 
          });
        } else {
          this.scheduleReconnect();
        }
      });
    }, delay);
  }

  // Start heartbeat
  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({
          type: 'heartbeat',
          payload: { timestamp: Date.now() },
          timestamp: new Date()
        });
      }
    }, this.config.heartbeatInterval);
  }

  // Clear all timers
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Emit event to all registered callbacks
  private emitEvent(type: WebSocketEventType, data: Partial<WebSocketEventData>): void {
    const callbacks = this.eventCallbacks.get(type);
    if (callbacks && callbacks.size > 0) {
      const eventData: WebSocketEventData = {
        type,
        timestamp: new Date(),
        ...data
      };

      callbacks.forEach(callback => {
        try {
          callback(eventData);
        } catch (error) {
          this.log(`Error in event callback for ${type}:`, error);
        }
      });
    }
  }

  // Logging utility
  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[WebSocket] ${message}`, ...args);
    }
  }
}

// Singleton instance for the application
let webSocketService: RealTimeWebSocketService | null = null;

// Initialize WebSocket service
export function initializeWebSocketService(config: WebSocketConfig): RealTimeWebSocketService {
  if (webSocketService) {
    webSocketService.destroy();
  }
  
  webSocketService = new RealTimeWebSocketService(config);
  return webSocketService;
}

// Get WebSocket service instance
export function getWebSocketService(): RealTimeWebSocketService | null {
  return webSocketService;
}

// Default WebSocket service with mock URL
export function createMockWebSocketService(): RealTimeWebSocketService {
  return new RealTimeWebSocketService({
    url: 'ws://localhost:8080/ws', // Mock WebSocket URL
    reconnectInterval: 3000,
    maxReconnectAttempts: 3,
    heartbeatInterval: 20000,
    debug: true
  });
}

export default RealTimeWebSocketService;