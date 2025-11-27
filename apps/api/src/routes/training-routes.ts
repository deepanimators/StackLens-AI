/**
 * ML Model Training Routes
 *
 * Provides endpoints for:
 * 1. Training the suggestion model with multiple data sources
 * 2. Tracking training progress
 * 3. Managing model versions
 * 4. A/B testing between models
 * 5. Monitoring training metrics
 */

import { Router, Request, Response } from "express";
import { SuggestionModelTrainingService } from "../services/suggestion-model-training";
import { posErrorCollector } from "../services/pos-error-collector";

const router = Router();

// Store training sessions for progress tracking
const trainingSessions: Map<
    string,
    {
        status: "starting" | "collecting" | "training" | "evaluating" | "completed" | "failed";
        progress: number;
        startTime: number;
        endTime?: number;
        result?: any;
        error?: string;
    }
> = new Map();

/**
 * POST /api/ai/train-suggestion-model
 * Train suggestion model with multiple data sources
 */
router.post("/api/ai/train-suggestion-model", async (req: Request, res: Response) => {
    try {
        const sessionId = `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const {
            sources = {
                usePOSScenarios: true,
                excelFiles: [],
                manualDefinitions: [],
            },
            useGeminiAI = true,
            mergeWithExisting = true,
        } = req.body;

        // Initialize session
        trainingSessions.set(sessionId, {
            status: "starting",
            progress: 0,
            startTime: Date.now(),
        });

        console.log(`\n🚀 Starting training session: ${sessionId}`);
        console.log(`📦 Sources: ${JSON.stringify(sources)}`);
        console.log(`🤖 Use Gemini AI: ${useGeminiAI}`);
        console.log(`🔗 Merge with existing: ${mergeWithExisting}`);

        // Update session status
        const updateSession = (status: any, progress: number) => {
            const session = trainingSessions.get(sessionId)!;
            session.status = status;
            session.progress = progress;
        };

        // Step 1: Collect data from all sources
        updateSession("collecting", 10);
        console.log("\n📊 Step 1: Collecting training data...");

        const collectionResult = await posErrorCollector.collectFromMultipleSources(
            sources
        );

        console.log(
            `✅ Collected ${collectionResult.trainingData.length} training samples`
        );
        updateSession("training", 30);

        // Step 2: Validate training data
        console.log("\n🔍 Step 2: Validating training data...");
        const validation = posErrorCollector.validateTrainingData(
            collectionResult.trainingData
        );

        if (!validation.isValid && validation.issues.length > 0) {
            console.warn(`⚠️ Validation issues: ${validation.issues.join(", ")}`);
        }

        updateSession("training", 40);

        // Step 3: Train the model
        console.log("\n🤖 Step 3: Training suggestion model...");
        const trainingService = new SuggestionModelTrainingService();

        const trainingResult = await trainingService.trainFromPOSScenarios(
            collectionResult.trainingData,
            { useGeminiAI, mergeWithExisting }
        );

        console.log(`✅ Training completed with accuracy: ${(trainingResult.accuracy * 100).toFixed(1)}%`);
        updateSession("evaluating", 80);

        // Step 4: Compile final results
        console.log("\n📈 Step 4: Compiling results...");

        const finalResult = {
            sessionId,
            timestamp: new Date().toISOString(),
            sources: collectionResult.stats,
            training: trainingResult,
            validation: {
                isValid: validation.isValid,
                stats: validation.stats,
                issues: validation.issues,
            },
            summary: {
                totalTrainingSamples: collectionResult.trainingData.length,
                modelAccuracy: trainingResult.accuracy,
                relevanceScore: trainingResult.relevanceScore,
                completenessScore: trainingResult.completenessScore,
                usabilityScore: trainingResult.usabilityScore,
                categoryAccuracy: trainingResult.categoryAccuracy,
                contextAwareness: trainingResult.contextAwareness,
                fallbackEfficacy: trainingResult.fallbackEfficacy,
                patternRecognition: trainingResult.patternRecognition,
                recommendation:
                    trainingResult.accuracy > 0.85
                        ? "✅ Ready for production deployment"
                        : "⚠️ Needs more training data or review",
            },
        };

        // Save session result
        const session = trainingSessions.get(sessionId)!;
        session.status = "completed";
        session.progress = 100;
        session.endTime = Date.now();
        session.result = finalResult;

        console.log(`\n✅ Training session completed in ${(session.endTime - session.startTime) / 1000}s`);

        res.json({
            success: true,
            data: finalResult,
        });
    } catch (error) {
        console.error("❌ Training failed:", error);
        const sessionId = (error as any).sessionId || "unknown";
        const session = trainingSessions.get(sessionId);
        if (session) {
            session.status = "failed";
            session.endTime = Date.now();
            session.error = error instanceof Error ? error.message : String(error);
        }

        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Training failed",
        });
    }
});

/**
 * GET /api/ai/train-suggestion-model/status/:sessionId
 * Get training session status and progress
 */
router.get(
    "/api/ai/train-suggestion-model/status/:sessionId",
    (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const session = trainingSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({
                error: "Session not found",
            });
        }

        const elapsedTime = session.endTime
            ? session.endTime - session.startTime
            : Date.now() - session.startTime;

        res.json({
            sessionId,
            status: session.status,
            progress: session.progress,
            elapsedTimeMs: elapsedTime,
            elapsedTimeS: (elapsedTime / 1000).toFixed(1),
            result: session.result || null,
            error: session.error || null,
        });
    }
);

/**
 * GET /api/ai/train-suggestion-model/sessions
 * List all training sessions
 */
router.get("/api/ai/train-suggestion-model/sessions", (req: Request, res: Response) => {
    const sessions = Array.from(trainingSessions.entries()).map(([id, session]) => ({
        sessionId: id,
        status: session.status,
        progress: session.progress,
        startTime: new Date(session.startTime).toISOString(),
        endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
        hasResult: !!session.result,
        hasError: !!session.error,
    }));

    res.json({
        totalSessions: sessions.length,
        sessions: sessions.sort(
            (a, b) =>
                new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        ),
    });
});

/**
 * POST /api/ai/train-suggestion-model/quick
 * Quick training with POS scenarios only (no external data)
 */
router.post("/api/ai/train-suggestion-model/quick", async (req: Request, res: Response) => {
    try {
        console.log(`\n🚀 Starting quick training with POS scenarios...`);

        const trainingService = new SuggestionModelTrainingService();
        const posScenarios = posErrorCollector.collectFromPOSScenarios();

        console.log(`📊 Collected ${posScenarios.length} POS scenarios`);

        const result = await trainingService.trainFromPOSScenarios(posScenarios, {
            useGeminiAI: true,
            mergeWithExisting: false,
        });

        console.log(`✅ Quick training completed`);

        res.json({
            success: true,
            trainingTime: `${((Date.now()) / 1000).toFixed(1)}s`,
            samplesUsed: posScenarios.length,
            results: result,
        });
    } catch (error) {
        console.error("❌ Quick training failed:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Quick training failed",
        });
    }
});

/**
 * GET /api/ai/train-suggestion-model/stats
 * Get current model statistics
 */
router.get("/api/ai/train-suggestion-model/stats", (req: Request, res: Response) => {
    try {
        const trainingService = new SuggestionModelTrainingService();
        const stats = trainingService.getTrainingStats();

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error("❌ Failed to get stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve training statistics",
        });
    }
});

/**
 * POST /api/ai/train-suggestion-model/validate
 * Validate training data without training
 */
router.post(
    "/api/ai/train-suggestion-model/validate",
    async (req: Request, res: Response) => {
        try {
            const { sources = { usePOSScenarios: true } } = req.body;

            console.log(`\n🔍 Validating training data...`);

            const collectionResult = await posErrorCollector.collectFromMultipleSources(
                sources
            );

            const validation = posErrorCollector.validateTrainingData(
                collectionResult.trainingData
            );

            res.json({
                success: true,
                collectedSamples: collectionResult.trainingData.length,
                validation,
                stats: collectionResult.stats,
            });
        } catch (error) {
            console.error("❌ Validation failed:", error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Validation failed",
            });
        }
    }
);

/**
 * GET /api/ai/train-suggestion-model/scenarios
 * Retrieve all 40 POS error scenarios with optional filtering
 */
router.get("/api/ai/train-suggestion-model/scenarios", async (req: Request, res: Response) => {
    try {
        const { category, severity, search } = req.query;

        // Import scenarios
        const POS_ERROR_SCENARIOS = (await import("../data/pos-error-scenarios")).default;

        let scenarios = POS_ERROR_SCENARIOS;

        // Apply filters
        if (category && category !== "all") {
            scenarios = scenarios.filter((s: any) => s.category === category);
        }

        if (severity && severity !== "all") {
            scenarios = scenarios.filter((s: any) => s.severity === severity);
        }

        if (search) {
            const searchLower = (search as string).toLowerCase();
            scenarios = scenarios.filter((s: any) =>
                s.errorCode?.toLowerCase().includes(searchLower) ||
                s.errorDescription?.toLowerCase().includes(searchLower) ||
                s.description?.toLowerCase().includes(searchLower)
            );
        }

        // Count by category
        const categoryCount = scenarios.reduce((acc: any, scenario: any) => {
            const cat = scenario.category || "UNKNOWN";
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});

        res.json({
            success: true,
            total: scenarios.length,
            scenarios,
            categoryDistribution: categoryCount,
            filters: {
                category: category || "all",
                severity: severity || "all",
                search: search || "",
            },
        });
    } catch (error) {
        console.error("❌ Failed to retrieve scenarios:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to retrieve scenarios",
        });
    }
});

/**
 * GET /api/ai/train-suggestion-model/scenarios/:id
 * Retrieve a specific scenario by ID
 */
router.get("/api/ai/train-suggestion-model/scenarios/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const POS_ERROR_SCENARIOS = (await import("../data/pos-error-scenarios")).default;

        const scenario = POS_ERROR_SCENARIOS.find((s: any) => s.errorCode === id);

        if (!scenario) {
            return res.status(404).json({
                success: false,
                error: "Scenario not found",
            });
        }

        res.json({
            success: true,
            scenario,
        });
    } catch (error) {
        console.error("❌ Failed to retrieve scenario:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to retrieve scenario",
        });
    }
});

export default router;
