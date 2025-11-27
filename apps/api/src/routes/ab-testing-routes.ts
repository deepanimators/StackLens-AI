/**
 * A/B Testing Routes
 *
 * Endpoints for:
 * 1. Creating and managing A/B tests
 * 2. Monitoring test metrics
 * 3. Adjusting traffic allocation
 * 4. Rolling back underperforming models
 */

import { Router, Request, Response } from "express";
import { abTestingFramework } from "../services/ab-testing-framework";
import { SuggestionModelTrainingService } from "../services/suggestion-model-training";

const router = Router();

/**
 * POST /api/ai/ab-test/create
 * Create a new A/B test between two models
 */
router.post("/api/ai/ab-test/create", async (req: Request, res: Response) => {
    try {
        const {
            testId,
            controlModelId,
            treatmentModelId,
            initialTrafficSplit = 0.1,
            minimumSampleSize = 1000,
            confidenceLevel = 0.95,
        } = req.body;

        if (!testId || !controlModelId || !treatmentModelId) {
            return res.status(400).json({
                error: "testId, controlModelId, and treatmentModelId are required",
            });
        }

        // In production, would fetch models from database
        // For now, create mock models
        const controlModel = {
            id: controlModelId,
            version: "v1.0",
            modelName: "StackLens Error Suggestion Model",
            accuracy: 0.82,
            relevanceScore: 0.85,
            completenessScore: 0.80,
            usabilityScore: 0.81,
            categoryAccuracy: {
                PAYMENT: 0.85,
                INVENTORY: 0.80,
                TAX: 0.79,
                HARDWARE: 0.83,
                AUTH: 0.88,
                DATA_QUALITY: 0.76,
            },
            contextAwareness: 0.78,
            fallbackEfficacy: 0.87,
            patternRecognition: 0.82,
            createdAt: new Date(),
            trainingData: [],
        };

        const treatmentModel = {
            id: treatmentModelId,
            version: "v2.0",
            modelName: "StackLens Error Suggestion Model (Enhanced with POS Scenarios)",
            accuracy: 0.88,
            relevanceScore: 0.91,
            completenessScore: 0.87,
            usabilityScore: 0.89,
            categoryAccuracy: {
                PAYMENT: 0.90,
                INVENTORY: 0.86,
                TAX: 0.85,
                HARDWARE: 0.89,
                AUTH: 0.93,
                DATA_QUALITY: 0.82,
            },
            contextAwareness: 0.85,
            fallbackEfficacy: 0.92,
            patternRecognition: 0.88,
            createdAt: new Date(),
            trainingData: [],
        };

        const config = abTestingFramework.createTest(
            testId,
            controlModel,
            treatmentModel,
            {
                initialTrafficSplit,
                minimumSampleSize,
                confidenceLevel,
            }
        );

        res.json({
            success: true,
            data: {
                testId: config.testId,
                status: config.status,
                trafficSplit: config.trafficSplit,
                controlModel: {
                    version: controlModel.version,
                    accuracy: controlModel.accuracy,
                },
                treatmentModel: {
                    version: treatmentModel.version,
                    accuracy: treatmentModel.accuracy,
                },
                message: `A/B test created. Initial traffic allocation: ${(config.trafficSplit * 100).toFixed(1)}% to treatment model.`,
            },
        });
    } catch (error) {
        console.error("❌ Failed to create A/B test:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to create A/B test",
        });
    }
});

/**
 * GET /api/ai/ab-test/:testId/metrics
 * Get current metrics for A/B test
 */
router.get("/api/ai/ab-test/:testId/metrics", (req: Request, res: Response) => {
    try {
        const { testId } = req.params;

        const metrics = abTestingFramework.calculateMetrics(testId);

        res.json({
            success: true,
            data: {
                testId: metrics.testId,
                timestamp: metrics.timestamp,
                controlMetrics: {
                    totalRequests: metrics.controlMetrics.totalRequests,
                    successRate: metrics.controlMetrics.successfulSuggestions / Math.max(1, metrics.controlMetrics.totalRequests),
                    avgAccuracy: metrics.controlMetrics.avgAccuracy,
                    avgResponseTime: `${metrics.controlMetrics.avgResponseTime.toFixed(1)}ms`,
                },
                treatmentMetrics: {
                    totalRequests: metrics.treatmentMetrics.totalRequests,
                    successRate: metrics.treatmentMetrics.successfulSuggestions / Math.max(1, metrics.treatmentMetrics.totalRequests),
                    avgAccuracy: metrics.treatmentMetrics.avgAccuracy,
                    avgResponseTime: `${metrics.treatmentMetrics.avgResponseTime.toFixed(1)}ms`,
                },
                comparison: {
                    accuracyImprovement: `${(metrics.comparison.accuracyDifferencePercent).toFixed(2)}%`,
                    responseTimeDifference: `${(metrics.comparison.responseTimeDifference).toFixed(1)}ms`,
                    isStatisticallySignificant: metrics.comparison.isStatisticallySignificant,
                    pValue: metrics.comparison.pValue.toFixed(4),
                    winner: metrics.comparison.winner,
                    recommendation: metrics.comparison.recommendation,
                },
            },
        });
    } catch (error) {
        console.error("❌ Failed to get A/B test metrics:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to get metrics",
        });
    }
});

/**
 * GET /api/ai/ab-test/:testId/status
 * Get A/B test status
 */
router.get("/api/ai/ab-test/:testId/status", (req: Request, res: Response) => {
    try {
        const { testId } = req.params;

        const status = abTestingFramework.getTestStatus(testId);

        res.json({
            success: true,
            data: {
                testId: status.test.testId,
                status: status.test.status,
                trafficSplit: `${(status.test.trafficSplit * 100).toFixed(1)}%`,
                startDate: status.test.startDate,
                endDate: status.test.endDate,
                userCohorts: {
                    control: status.userCohortCount.control,
                    treatment: status.userCohortCount.treatment,
                },
                latestMetrics: status.metrics,
            },
        });
    } catch (error) {
        console.error("❌ Failed to get A/B test status:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to get status",
        });
    }
});

/**
 * POST /api/ai/ab-test/:testId/allocate-traffic
 * Adjust traffic allocation
 */
router.post(
    "/api/ai/ab-test/:testId/allocate-traffic",
    (req: Request, res: Response) => {
        try {
            const { testId } = req.params;
            const { newSplit } = req.body;

            if (typeof newSplit !== "number" || newSplit < 0 || newSplit > 1) {
                return res.status(400).json({
                    error: "newSplit must be a number between 0 and 1",
                });
            }

            const result = abTestingFramework.increaseTrafficAllocation(
                testId,
                newSplit
            );

            res.json({
                success: true,
                data: {
                    testId,
                    previousSplit: `${(result.previousSplit * 100).toFixed(1)}%`,
                    newSplit: `${(result.newSplit * 100).toFixed(1)}%`,
                    message: result.message,
                },
            });
        } catch (error) {
            console.error("❌ Failed to allocate traffic:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to allocate traffic",
            });
        }
    }
);

/**
 * POST /api/ai/ab-test/:testId/rollback
 * Rollback to control model
 */
router.post("/api/ai/ab-test/:testId/rollback", (req: Request, res: Response) => {
    try {
        const { testId } = req.params;
        const { reason = "Manual rollback" } = req.body;

        const result = abTestingFramework.rollback(testId, reason);

        res.json({
            success: true,
            data: {
                testId,
                status: "rolled_back",
                message: result.message,
            },
        });
    } catch (error) {
        console.error("❌ Failed to rollback test:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to rollback",
        });
    }
});

/**
 * POST /api/ai/ab-test/:testId/complete
 * Complete test and rollout winner
 */
router.post(
    "/api/ai/ab-test/:testId/complete",
    (req: Request, res: Response) => {
        try {
            const { testId } = req.params;

            const result = abTestingFramework.completeTest(testId);

            res.json({
                success: true,
                data: {
                    testId,
                    status: "completed",
                    winner: result.winner,
                    message: result.message,
                },
            });
        } catch (error) {
            console.error("❌ Failed to complete test:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to complete test",
            });
        }
    }
);

/**
 * GET /api/ai/ab-test/:testId/user/:userId
 * Get user's cohort assignment
 */
router.get(
    "/api/ai/ab-test/:testId/user/:userId",
    (req: Request, res: Response) => {
        try {
            const { testId } = req.params;
            const userId = parseInt(req.params.userId);

            if (isNaN(userId)) {
                return res.status(400).json({ error: "Invalid userId" });
            }

            const modelInfo = abTestingFramework.getModelForUser(userId, testId);

            res.json({
                success: true,
                data: {
                    userId,
                    testId,
                    cohort: modelInfo.cohort,
                    modelVersion: modelInfo.model.version,
                    modelAccuracy: modelInfo.model.accuracy,
                },
            });
        } catch (error) {
            console.error("❌ Failed to get user cohort:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to get cohort",
            });
        }
    }
);

/**
 * POST /api/ai/ab-test/:testId/record-result
 * Record suggestion result for A/B testing
 */
router.post(
    "/api/ai/ab-test/:testId/record-result",
    (req: Request, res: Response) => {
        try {
            const { testId } = req.params;
            const {
                userId,
                accuracy,
                responseTime,
                category,
                success,
            } = req.body;

            if (
                typeof userId !== "number" ||
                typeof accuracy !== "number" ||
                typeof responseTime !== "number"
            ) {
                return res.status(400).json({
                    error: "userId, accuracy, and responseTime are required",
                });
            }

            abTestingFramework.recordSuggestionResult(userId, testId, {
                accuracy,
                responseTime,
                category: category || "unknown",
                success: success !== false,
            });

            res.json({
                success: true,
                message: "Result recorded",
            });
        } catch (error) {
            console.error("❌ Failed to record result:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to record result",
            });
        }
    }
);

export default router;
