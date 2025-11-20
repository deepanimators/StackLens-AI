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

interface POSEvent {
    type: 'info' | 'error' | 'checkout' | 'log';
    message: string;
    timestamp: string;
    source: string;
    [key: string]: any;
}

// In-memory storage for collected metrics and events
const metrics: Metric[] = [];
const alerts: Alert[] = [];
const posEvents: POSEvent[] = [];
let startTime = Date.now();

// Function to generate metrics from POS events
function generateMetricsFromEvents(window: string = '1min'): Metric {
    const now = new Date();
    const recentEvents = posEvents.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        const windowMs = window === '1min' ? 60000 : window === '5min' ? 300000 : 3600000;
        return eventTime >= Date.now() - windowMs;
    });

    const errorEvents = recentEvents.filter(e => e.type === 'error');
    const checkoutEvents = recentEvents.filter(e => e.type === 'checkout');

    const totalRequests = recentEvents.length;
    const errorCount = errorEvents.length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // Simulate latency based on request count
    const latency_p50 = Math.max(10, 50 - (totalRequests / 100));
    const latency_p99 = Math.max(50, 200 - (totalRequests / 50));

    // Throughput: transactions per second
    const throughput = totalRequests > 0 ? totalRequests / 60 : 0;

    return {
        window,
        timestamp: now.toISOString(),
        total_requests: totalRequests,
        error_count: errorCount,
        error_rate: Math.round(errorRate * 100) / 100,
        latency_p50: Math.round(latency_p50 * 100) / 100,
        latency_p99: Math.round(latency_p99 * 100) / 100,
        throughput: Math.round(throughput * 100) / 100,
    };
}

// Function to update alerts based on metrics
function updateAlerts(latestMetric: Metric) {
    // Remove old alerts (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    alerts.length = alerts.filter(a => new Date(a.timestamp).getTime() > oneHourAgo).length;

    // Check for high latency alert
    if (latestMetric.latency_p99 > 200) {
        const existingAlert = alerts.find(a => a.rule_name === 'High Latency' && a.status === 'active');
        if (!existingAlert) {
            alerts.push({
                id: `alert-${Date.now()}`,
                rule_name: 'High Latency',
                severity: 'warning',
                message: 'Transaction latency exceeded threshold',
                metric: 'latency_p99',
                value: latestMetric.latency_p99,
                threshold: 200,
                timestamp: new Date().toISOString(),
                status: 'active'
            });
        }
    }

    // Check for high error rate alert
    if (latestMetric.error_rate > 5) {
        const existingAlert = alerts.find(a => a.rule_name === 'High Error Rate' && a.status === 'active');
        if (!existingAlert) {
            alerts.push({
                id: `alert-${Date.now()}-errors`,
                rule_name: 'High Error Rate',
                severity: 'critical',
                message: 'Error rate exceeded acceptable threshold',
                metric: 'error_rate',
                value: latestMetric.error_rate,
                threshold: 5,
                timestamp: new Date().toISOString(),
                status: 'active'
            });
        }
    }

    // Add info alert for successful checkouts
    if (latestMetric.total_requests > 0) {
        const checkoutRate = posEvents.filter(e => e.type === 'checkout').length / latestMetric.total_requests;
        if (checkoutRate > 0.3) {
            const existingAlert = alerts.find(a => a.rule_name === 'High Activity' && a.status === 'active');
            if (!existingAlert) {
                alerts.push({
                    id: `alert-${Date.now()}-activity`,
                    rule_name: 'High Activity',
                    severity: 'info',
                    message: 'POS system showing high transaction activity',
                    metric: 'checkout_rate',
                    value: Math.round(checkoutRate * 100),
                    threshold: 30,
                    timestamp: new Date().toISOString(),
                    status: 'active'
                });
            }
        }
    }
}

/**
 * POST /api/analytics/events
 * Receive POS events and convert them to metrics
 */
analyticsRouter.post('/events', (req, res) => {
    try {
        const event: POSEvent = {
            type: req.body.type || 'log',
            message: req.body.message || '',
            timestamp: req.body.timestamp || new Date().toISOString(),
            source: req.body.source || 'pos-app',
            ...req.body
        };

        // Add event to collection
        posEvents.push(event);

        // Keep only last 1000 events (5 minutes of data)
        if (posEvents.length > 1000) {
            posEvents.shift();
        }

        // Generate new metrics from updated events
        const newMetric = generateMetricsFromEvents('1min');
        metrics.push(newMetric);

        // Keep only last 500 metrics per window
        if (metrics.length > 500) {
            metrics.shift();
        }

        // Update alerts based on new metrics
        updateAlerts(newMetric);

        res.status(201).json({
            success: true,
            message: 'Event recorded',
            metrics: { total_events: posEvents.length, total_metrics: metrics.length }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to record event'
        });
    }
});

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

/**
 * POST /api/analytics/ai-analysis
 * Analyze errors and provide AI-powered insights via Gemini
 */
analyticsRouter.post('/ai-analysis', async (req, res) => {
    try {
        const { alerts: alertsToAnalyze, metrics: metricsToAnalyze } = req.body;

        if (!alertsToAnalyze || alertsToAnalyze.length === 0) {
            return res.json({
                success: true,
                data: {
                    hasErrors: false,
                    analysis: null
                }
            });
        }

        // Prepare analysis context
        const alertSummary = alertsToAnalyze.map((alert: any) => ({
            name: alert.rule_name,
            severity: alert.severity,
            metric: alert.metric,
            value: alert.value,
            threshold: alert.threshold,
            message: alert.message
        }));

        const metricsSummary = metricsToAnalyze ? {
            errorRate: metricsToAnalyze.error_rate,
            throughput: metricsToAnalyze.throughput,
            latencyP99: metricsToAnalyze.latency_p99,
            totalRequests: metricsToAnalyze.total_requests,
            errorCount: metricsToAnalyze.error_count
        } : null;

        // Build analysis prompt
        const analysisPrompt = `
Analyze the following POS system alerts and metrics and provide structured insights:

ACTIVE ALERTS:
${JSON.stringify(alertSummary, null, 2)}

RECENT METRICS:
${metricsSummary ? JSON.stringify(metricsSummary, null, 2) : 'No recent metrics'}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "errorCategories": ["category1", "category2"],
  "severity": "critical|high|medium|low",
  "pattern": "description of error pattern detected",
  "errorTypes": ["type1", "type2"],
  "rootCause": "likely root cause",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "immediateActions": ["action1", "action2"],
  "longTermFixes": ["fix1", "fix2"],
  "estimatedImpact": "description of system impact"
}

Make the analysis practical and actionable for a POS system operator.
        `;

        // Call Gemini API
        let aiAnalysis = null;
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (apiKey) {
                const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: analysisPrompt
                            }]
                        }]
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

                    // Parse JSON from response
                    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        aiAnalysis = JSON.parse(jsonMatch[0]);
                    }
                }
            }
        } catch (aiError) {
            console.warn('AI analysis failed, returning basic analysis', aiError);
        }

        // Fallback analysis if AI not available
        if (!aiAnalysis) {
            aiAnalysis = {
                errorCategories: alertsToAnalyze.map((a: any) => a.rule_name),
                severity: alertsToAnalyze.some((a: any) => a.severity === 'critical') ? 'critical' : 'high',
                pattern: `${alertsToAnalyze.length} alert(s) detected in system`,
                errorTypes: alertsToAnalyze.map((a: any) => a.metric),
                rootCause: 'System experiencing elevated error conditions',
                suggestions: [
                    'Monitor system metrics in real-time',
                    'Check POS service status',
                    'Review recent transaction logs'
                ],
                immediateActions: [
                    'Increase monitoring frequency',
                    'Notify operations team',
                    'Prepare rollback procedure if needed'
                ],
                longTermFixes: [
                    'Implement rate limiting',
                    'Optimize database queries',
                    'Add redundancy to critical services'
                ],
                estimatedImpact: `${alertsToAnalyze.length} active alerts affecting system reliability`
            };
        }

        res.json({
            success: true,
            data: {
                hasErrors: true,
                analysis: aiAnalysis,
                alertsCount: alertsToAnalyze.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze alerts'
        });
    }
});

export default analyticsRouter;
