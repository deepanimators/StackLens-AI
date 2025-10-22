import { Router } from 'express';
import { z } from 'zod';
import { ErrorIntelligenceService, ErrorEvent } from '../../services/error-intelligence';

const router = Router();
const errorIntelligenceService = new ErrorIntelligenceService();

// Input validation schemas
const ErrorEventSchema = z.object({
    id: z.string().optional(),
    timestamp: z.string().datetime().optional(),
    errorType: z.string(),
    message: z.string(),
    stackTrace: z.string().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    context: z.record(z.any()).optional(),
    tags: z.array(z.string()).optional(),
    userId: z.string().optional(),
    sessionId: z.string().optional()
});

const AnalysisQuerySchema = z.object({
    timeRange: z.object({
        start: z.string().datetime(),
        end: z.string().datetime()
    }).optional(),
    severity: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
    errorTypes: z.array(z.string()).optional(),
    userId: z.string().optional(),
    limit: z.number().min(1).max(1000).default(100)
});

/**
 * POST /api/error-intelligence/analyze
 * Analyze a new error event and detect patterns
 */
router.post('/analyze', async (req, res) => {
    try {
        const errorEvent = ErrorEventSchema.parse(req.body);

        // Add timestamp if not provided
        if (!errorEvent.timestamp) {
            errorEvent.timestamp = new Date().toISOString();
        }

        // Add unique ID if not provided
        if (!errorEvent.id) {
            errorEvent.id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        const analysisResult = await errorIntelligenceService.analyzeError({
            ...errorEvent,
            timestamp: new Date(errorEvent.timestamp)
        } as ErrorEvent);

        res.json({
            success: true,
            data: {
                errorId: errorEvent.id,
                analysisResult,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error analyzing error event:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Invalid request data'
        });
    }
});

/**
 * GET /api/error-intelligence/patterns
 * Get detected error patterns with optional filtering
 */
router.get('/patterns', async (req, res) => {
    try {
        const query = AnalysisQuerySchema.parse(req.query);

        const patterns = await errorIntelligenceService.getPatterns({
            timeRange: query.timeRange ? {
                start: new Date(query.timeRange.start),
                end: new Date(query.timeRange.end)
            } : undefined,
            severity: query.severity,
            errorTypes: query.errorTypes,
            userId: query.userId,
            limit: query.limit
        });

        res.json({
            success: true,
            data: {
                patterns,
                totalCount: patterns.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching patterns:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Invalid query parameters'
        });
    }
});

/**
 * GET /api/error-intelligence/predictions
 * Get error predictions based on current patterns
 */
router.get('/predictions', async (req, res) => {
    try {
        const query = AnalysisQuerySchema.parse(req.query);

        const predictions = await errorIntelligenceService.getPredictions({
            timeRange: query.timeRange ? {
                start: new Date(query.timeRange.start),
                end: new Date(query.timeRange.end)
            } : undefined,
            severity: query.severity,
            errorTypes: query.errorTypes,
            limit: query.limit
        });

        res.json({
            success: true,
            data: {
                predictions,
                totalCount: predictions.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching predictions:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Invalid query parameters'
        });
    }
});

/**
 * GET /api/error-intelligence/root-causes/:errorId
 * Get root cause analysis for a specific error
 */
router.get('/root-causes/:errorId', async (req, res) => {
    try {
        const { errorId } = req.params;

        const rootCauses = await errorIntelligenceService.analyzeRootCause(errorId);

        res.json({
            success: true,
            data: {
                errorId,
                rootCauses,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error analyzing root cause:', error);
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Error not found'
        });
    }
});

/**
 * POST /api/error-intelligence/bulk-analyze
 * Analyze multiple error events in batch
 */
router.post('/bulk-analyze', async (req, res) => {
    try {
        const { errors } = req.body;

        if (!Array.isArray(errors) || errors.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Expected array of error events'
            });
        }

        if (errors.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 errors allowed per batch'
            });
        }

        // Validate each error event
        const validatedErrors = errors.map(error => ErrorEventSchema.parse(error));

        const results = await errorIntelligenceService.analyzeBulkErrors(
            validatedErrors.map(error => ({
                ...error,
                id: error.id || `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: error.timestamp ? new Date(error.timestamp) : new Date()
            })) as ErrorEvent[]
        );

        res.json({
            success: true,
            data: {
                results,
                processedCount: validatedErrors.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in bulk analysis:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Bulk analysis failed'
        });
    }
});

/**
 * GET /api/error-intelligence/stats
 * Get error intelligence statistics and metrics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await errorIntelligenceService.getStatistics();

        res.json({
            success: true,
            data: {
                stats,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});

/**
 * POST /api/error-intelligence/train
 * Trigger ML model training with current error data
 */
router.post('/train', async (req, res) => {
    try {
        const { force = false } = req.body;

        const trainingResult = await errorIntelligenceService.trainModel(force);

        res.json({
            success: true,
            data: {
                trainingResult,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error training model:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Model training failed'
        });
    }
});

/**
 * GET /api/error-intelligence/similar/:errorId
 * Find similar errors to the specified error
 */
router.get('/similar/:errorId', async (req, res) => {
    try {
        const { errorId } = req.params;
        const { limit = 10, threshold = 0.7 } = req.query;

        const similarErrors = await errorIntelligenceService.findSimilarErrors(
            errorId,
            {
                limit: Number(limit),
                threshold: Number(threshold)
            }
        );

        res.json({
            success: true,
            data: {
                errorId,
                similarErrors,
                totalCount: similarErrors.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error finding similar errors:', error);
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Error not found'
        });
    }
});

/**
 * DELETE /api/error-intelligence/clear-data
 * Clear all stored error data and analysis results
 */
router.delete('/clear-data', async (req, res) => {
    try {
        const { confirm } = req.body;

        if (confirm !== 'DELETE_ALL_DATA') {
            return res.status(400).json({
                success: false,
                error: 'Must provide confirmation: { "confirm": "DELETE_ALL_DATA" }'
            });
        }

        await errorIntelligenceService.clearAllData();

        res.json({
            success: true,
            data: {
                message: 'All error intelligence data cleared',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear data'
        });
    }
});

/**
 * GET /api/error-intelligence/health
 * Check system health and service availability
 */
router.get('/health', async (req, res) => {
    try {
        const health = await errorIntelligenceService.getSystemHealth();

        res.json({
            success: true,
            data: {
                health,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error checking health:', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed'
        });
    }
});

export default router;