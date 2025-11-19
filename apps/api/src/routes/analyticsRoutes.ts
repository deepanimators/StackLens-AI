import { Router } from 'express';

const analyticsRouter = Router();

interface Metric {
    window: string;
    timestamp: string;
    total_requests: number;
    error_count: number;
    error_rate: number;
    latency_p50: number;
    latency_p99: number;
    throughput: number;
}

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'offline';
    uptime: number;
    lastUpdate: string;
}

interface Alert {
    id: string;
    rule_name: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: string;
    status: 'active' | 'resolved';
}

// In-memory storage for demo (in production use database)
const metrics: Metric[] = [];
const alerts: Alert[] = [];

// Initialize with sample data
function initializeSampleData() {
    const now = new Date();

    // Add sample metrics
    for (let i = 20; i > 0; i--) {
        metrics.push({
            window: '1min',
            timestamp: new Date(now.getTime() - i * 3000).toISOString(),
            total_requests: Math.floor(Math.random() * 1000) + 500,
            error_count: Math.floor(Math.random() * 50),
            error_rate: Math.random() * 5,
            latency_p50: Math.random() * 100 + 50,
            latency_p99: Math.random() * 200 + 150,
            throughput: Math.random() * 100 + 50,
        });
    }

    // Add sample alerts
    alerts.push({
        id: 'alert-1',
        rule_name: 'High Latency',
        severity: 'warning',
        message: 'Transaction latency above threshold',
        metric: 'latency_p99',
        value: 450.75,
        threshold: 400,
        timestamp: new Date(now.getTime() - 60000).toISOString(),
        status: 'active'
    });

    alerts.push({
        id: 'alert-2',
        rule_name: 'POS Sync Status',
        severity: 'info',
        message: 'POS Demo connected and syncing',
        metric: 'connection_status',
        value: 1,
        threshold: 1,
        timestamp: new Date(now.getTime() - 30000).toISOString(),
        status: 'active'
    });
}

initializeSampleData();

/**
 * GET /api/analytics/metrics
 * Retrieve metrics for realtime analytics
 */
analyticsRouter.get('/metrics', (req, res) => {
    try {
        const { window = '1min', limit = 20 } = req.query;

        const limitNum = Math.min(parseInt(limit as string) || 20, 100);
        const recentMetrics = metrics.slice(-limitNum);

        res.json({
            success: true,
            data: {
                window,
                metrics: recentMetrics,
                timestamp: new Date().toISOString(),
                total: recentMetrics.length,
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch metrics'
        });
    }
});

/**
 * GET /api/analytics/health-status
 * Retrieve system health status
 */
analyticsRouter.get('/health-status', (req, res) => {
    try {
        const uptime = process.uptime();

        // Determine status based on metrics
        const recentMetrics = metrics.slice(-10);
        const avgErrorRate = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.error_rate, 0) / recentMetrics.length
            : 2;

        let status: 'healthy' | 'degraded' | 'offline' = 'healthy';
        if (avgErrorRate > 5) {
            status = 'degraded';
        } else if (avgErrorRate > 10) {
            status = 'offline';
        }

        const healthStatus: HealthStatus = {
            status,
            uptime,
            lastUpdate: new Date().toISOString()
        };

        res.json({
            success: true,
            data: healthStatus
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch health status'
        });
    }
});

/**
 * GET /api/analytics/alerts
 * Retrieve active or resolved alerts
 */
analyticsRouter.get('/alerts', (req, res) => {
    try {
        const { status = 'active', severity, limit = 50 } = req.query;

        let filteredAlerts = alerts;

        // Filter by status
        if (status && status !== 'all') {
            filteredAlerts = filteredAlerts.filter(a => a.status === status);
        }

        // Filter by severity
        if (severity) {
            filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
        }

        // Limit results
        const limitNum = Math.min(parseInt(limit as string) || 50, 200);
        const result = filteredAlerts.slice(-limitNum);

        res.json({
            success: true,
            data: {
                alerts: result,
                total: result.length,
                timestamp: new Date().toISOString(),
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch alerts'
        });
    }
});

/**
 * POST /api/analytics/metrics
 * Add a new metric (for testing)
 */
analyticsRouter.post('/metrics', (req, res) => {
    try {
        const {
            total_requests = 0,
            error_count = 0,
            error_rate = 0,
            latency_p50 = 0,
            latency_p99 = 0,
            throughput = 0,
            window = '1min'
        } = req.body;

        const metric: Metric = {
            window,
            timestamp: new Date().toISOString(),
            total_requests,
            error_count,
            error_rate,
            latency_p50,
            latency_p99,
            throughput
        };

        metrics.push(metric);

        // Keep only last 1000 metrics
        if (metrics.length > 1000) {
            metrics.shift();
        }

        res.status(201).json({
            success: true,
            data: metric
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add metric'
        });
    }
});

/**
 * POST /api/analytics/alerts
 * Create a new alert
 */
analyticsRouter.post('/alerts', (req, res) => {
    try {
        const {
            rule_name,
            severity,
            message,
            metric = 'unknown',
            value = 0,
            threshold = 0,
            status = 'active'
        } = req.body;

        if (!rule_name || !severity || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: rule_name, severity, and message'
            });
        }

        const alert: Alert = {
            id: `alert-${Date.now()}`,
            rule_name,
            severity: severity as 'critical' | 'warning' | 'info',
            message,
            metric,
            value,
            threshold,
            timestamp: new Date().toISOString(),
            status: status as 'active' | 'resolved'
        };

        alerts.push(alert);

        // Keep only last 500 alerts
        if (alerts.length > 500) {
            alerts.shift();
        }

        res.status(201).json({
            success: true,
            data: alert
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create alert'
        });
    }
});

/**
 * PUT /api/analytics/alerts/:id
 * Update alert status
 */
analyticsRouter.put('/alerts/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const alert = alerts.find(a => a.id === id);
        if (!alert) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found'
            });
        }

        alert.status = status || alert.status;

        res.json({
            success: true,
            data: alert
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update alert'
        });
    }
});

export default analyticsRouter;
