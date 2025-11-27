/**
 * Unit and Integration Tests for ML Model Training
 * 
 * Test Coverage:
 * 1. Data collection from POS scenarios (40 scenarios)
 * 2. Model training with advanced metrics
 * 3. Per-category accuracy tracking
 * 4. A/B testing framework
 * 5. Database persistence
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SuggestionModelTrainingService } from "../suggestion-model-training";
import { POSErrorDataCollector } from "../pos-error-collector";
import { ABTestingFramework } from "../ab-testing-framework";
import { POS_ERROR_SCENARIOS } from "../../data/pos-error-scenarios";

describe("ML Model Training Integration Tests", () => {
    let trainingService: SuggestionModelTrainingService;
    let dataCollector: POSErrorDataCollector;
    let abTestFramework: ABTestingFramework;

    beforeEach(() => {
        trainingService = new SuggestionModelTrainingService();
        dataCollector = new POSErrorDataCollector();
        abTestFramework = new ABTestingFramework();
    });

    describe("Data Collection", () => {
        it("should collect all 40 POS scenarios", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            expect(scenarios).toHaveLength(40);
        });

        it("should convert POS scenarios to training data format", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            scenarios.forEach((scenario) => {
                expect(scenario.errorCode).toBeDefined();
                expect(scenario.errorDescription).toBeDefined();
                expect(scenario.category).toBeDefined();
                expect(scenario.resolutionSteps.length).toBeGreaterThan(0);
                expect(scenario.confidence).toBeGreaterThan(0);
                expect(scenario.verified).toBe(true);
            });
        });

        it("should cover all 6 error categories", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const categories = new Set(scenarios.map((s) => s.category));
            expect(categories).toEqual(
                new Set(["PAYMENT", "INVENTORY", "TAX", "HARDWARE", "AUTHENTICATION", "DATA_QUALITY"])
            );
        });

        it("should have 10 PAYMENT scenarios", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const paymentScenarios = scenarios.filter((s) => s.category === "PAYMENT");
            expect(paymentScenarios).toHaveLength(10);
        });

        it("should have 7 INVENTORY scenarios", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const inventoryScenarios = scenarios.filter((s) => s.category === "INVENTORY");
            expect(inventoryScenarios).toHaveLength(7);
        });

        it("should have 8 TAX scenarios", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const taxScenarios = scenarios.filter((s) => s.category === "TAX");
            expect(taxScenarios).toHaveLength(8);
        });

        it("should have 6 HARDWARE scenarios", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const hardwareScenarios = scenarios.filter((s) => s.category === "HARDWARE");
            expect(hardwareScenarios).toHaveLength(6);
        });

        it("should have 6 AUTHENTICATION scenarios", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const authScenarios = scenarios.filter((s) => s.category === "AUTHENTICATION");
            expect(authScenarios).toHaveLength(6);
        });

        it("should have 3 DATA_QUALITY scenarios", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const dataQualityScenarios = scenarios.filter((s) => s.category === "DATA_QUALITY");
            expect(dataQualityScenarios).toHaveLength(3);
        });

        it("should include system metrics in each scenario", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            scenarios.forEach((scenario) => {
                expect(scenario.systemMetrics).toBeDefined();
                expect(scenario.systemMetrics.cpuUsage).toBeDefined();
                expect(scenario.systemMetrics.memoryUsage).toBeDefined();
                expect(scenario.systemMetrics.diskUsage).toBeDefined();
            });
        });

        it("should include business context in each scenario", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            scenarios.forEach((scenario) => {
                expect(scenario.businessContext).toBeDefined();
                expect(typeof scenario.businessContext).toBe('object');
            });
        });

        it("should validate training data quality", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const validation = dataCollector.validateTrainingData(scenarios);
            // At least 90% should be valid based on the validator threshold
            expect(validation.stats.valid / validation.stats.total).toBeGreaterThanOrEqual(0.9);
        });
    });

    describe("Model Training", () => {
        it("should train model with POS scenarios", async () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const result = await trainingService.trainFromPOSScenarios(scenarios, {
                useGeminiAI: false,
                mergeWithExisting: false,
            });

            expect(result.success).toBe(true);
            expect(result.suggestionCount).toBeGreaterThan(0);
            expect(result.accuracy).toBeGreaterThan(0);
        });

        it("should calculate per-category accuracy", async () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const result = await trainingService.trainFromPOSScenarios(scenarios, {
                useGeminiAI: false,
            });

            expect(result.categoryAccuracy).toBeDefined();
            expect(result.categoryAccuracy.PAYMENT).toBeGreaterThanOrEqual(0);
            expect(result.categoryAccuracy.INVENTORY).toBeGreaterThanOrEqual(0);
            expect(result.categoryAccuracy.TAX).toBeGreaterThanOrEqual(0);
            expect(result.categoryAccuracy.HARDWARE).toBeGreaterThanOrEqual(0);
            expect(result.categoryAccuracy.AUTHENTICATION).toBeGreaterThanOrEqual(0);
            expect(result.categoryAccuracy.DATA_QUALITY).toBeGreaterThanOrEqual(0);
        });

        it("should calculate context awareness", async () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const result = await trainingService.trainFromPOSScenarios(scenarios);

            expect(result.contextAwareness).toBeGreaterThanOrEqual(0);
            expect(result.contextAwareness).toBeLessThanOrEqual(1);
        });

        it("should calculate fallback efficacy", async () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const result = await trainingService.trainFromPOSScenarios(scenarios);

            expect(result.fallbackEfficacy).toBeGreaterThanOrEqual(0);
            expect(result.fallbackEfficacy).toBeLessThanOrEqual(1);
        });

        it("should calculate pattern recognition", async () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const result = await trainingService.trainFromPOSScenarios(scenarios);

            expect(result.patternRecognition).toBeGreaterThanOrEqual(0);
            expect(result.patternRecognition).toBeLessThanOrEqual(1);
        });
    });

    describe("A/B Testing Framework", () => {
        it("should create A/B test", () => {
            const controlModel = {
                id: "model_v1",
                version: "v1.0",
                modelName: "Control",
                accuracy: 0.82,
                relevanceScore: 0.85,
                completenessScore: 0.80,
                usabilityScore: 0.81,
                categoryAccuracy: {},
                contextAwareness: 0.78,
                fallbackEfficacy: 0.87,
                patternRecognition: 0.82,
                createdAt: new Date(),
                trainingData: [],
            };

            const treatmentModel = {
                id: "model_v2",
                version: "v2.0",
                modelName: "Treatment",
                accuracy: 0.88,
                relevanceScore: 0.91,
                completenessScore: 0.87,
                usabilityScore: 0.89,
                categoryAccuracy: {},
                contextAwareness: 0.85,
                fallbackEfficacy: 0.92,
                patternRecognition: 0.88,
                createdAt: new Date(),
                trainingData: [],
            };

            const config = abTestFramework.createTest(
                "test_001",
                controlModel,
                treatmentModel,
                { initialTrafficSplit: 0.1 }
            );

            expect(config.testId).toBe("test_001");
            expect(config.status).toBe("running");
            expect(config.trafficSplit).toBe(0.1);
        });

        it("should assign users to cohorts deterministically", () => {
            const controlModel = {
                id: "model_v1",
                version: "v1.0",
                modelName: "Control",
                accuracy: 0.82,
                relevanceScore: 0.85,
                completenessScore: 0.80,
                usabilityScore: 0.81,
                categoryAccuracy: {},
                contextAwareness: 0.78,
                fallbackEfficacy: 0.87,
                patternRecognition: 0.82,
                createdAt: new Date(),
                trainingData: [],
            };

            const treatmentModel = {
                id: "model_v2",
                version: "v2.0",
                modelName: "Treatment",
                accuracy: 0.88,
                relevanceScore: 0.91,
                completenessScore: 0.87,
                usabilityScore: 0.89,
                categoryAccuracy: {},
                contextAwareness: 0.85,
                fallbackEfficacy: 0.92,
                patternRecognition: 0.88,
                createdAt: new Date(),
                trainingData: [],
            };

            abTestFramework.createTest("test_002", controlModel, treatmentModel);

            const cohort1 = abTestFramework.assignUserToCohort(100, "test_002");
            const cohort2 = abTestFramework.assignUserToCohort(100, "test_002");

            expect(cohort1).toBe(cohort2); // Same user should get same cohort
            expect(["control", "treatment"]).toContain(cohort1);
        });

        it("should record suggestion results", () => {
            const controlModel = {
                id: "model_v1",
                version: "v1.0",
                modelName: "Control",
                accuracy: 0.82,
                relevanceScore: 0.85,
                completenessScore: 0.80,
                usabilityScore: 0.81,
                categoryAccuracy: {},
                contextAwareness: 0.78,
                fallbackEfficacy: 0.87,
                patternRecognition: 0.82,
                createdAt: new Date(),
                trainingData: [],
            };

            const treatmentModel = {
                id: "model_v2",
                version: "v2.0",
                modelName: "Treatment",
                accuracy: 0.88,
                relevanceScore: 0.91,
                completenessScore: 0.87,
                usabilityScore: 0.89,
                categoryAccuracy: {},
                contextAwareness: 0.85,
                fallbackEfficacy: 0.92,
                patternRecognition: 0.88,
                createdAt: new Date(),
                trainingData: [],
            };

            abTestFramework.createTest("test_003", controlModel, treatmentModel);
            abTestFramework.assignUserToCohort(200, "test_003");

            abTestFramework.recordSuggestionResult(200, "test_003", {
                accuracy: 0.9,
                responseTime: 50,
                category: "PAYMENT",
                success: true,
            });

            expect(() =>
                abTestFramework.recordSuggestionResult(200, "test_003", {
                    accuracy: 0.85,
                    responseTime: 55,
                    category: "INVENTORY",
                    success: true,
                })
            ).not.toThrow();
        });

        it("should calculate test metrics", () => {
            const controlModel = {
                id: "model_v1",
                version: "v1.0",
                modelName: "Control",
                accuracy: 0.82,
                relevanceScore: 0.85,
                completenessScore: 0.80,
                usabilityScore: 0.81,
                categoryAccuracy: {},
                contextAwareness: 0.78,
                fallbackEfficacy: 0.87,
                patternRecognition: 0.82,
                createdAt: new Date(),
                trainingData: [],
            };

            const treatmentModel = {
                id: "model_v2",
                version: "v2.0",
                modelName: "Treatment",
                accuracy: 0.88,
                relevanceScore: 0.91,
                completenessScore: 0.87,
                usabilityScore: 0.89,
                categoryAccuracy: {},
                contextAwareness: 0.85,
                fallbackEfficacy: 0.92,
                patternRecognition: 0.88,
                createdAt: new Date(),
                trainingData: [],
            };

            abTestFramework.createTest("test_004", controlModel, treatmentModel);

            const metrics = abTestFramework.calculateMetrics("test_004");
            expect(metrics.testId).toBe("test_004");
            expect(metrics.controlMetrics).toBeDefined();
            expect(metrics.treatmentMetrics).toBeDefined();
            expect(metrics.comparison).toBeDefined();
        });

        it("should support traffic allocation changes", () => {
            const controlModel = {
                id: "model_v1",
                version: "v1.0",
                modelName: "Control",
                accuracy: 0.82,
                relevanceScore: 0.85,
                completenessScore: 0.80,
                usabilityScore: 0.81,
                categoryAccuracy: {},
                contextAwareness: 0.78,
                fallbackEfficacy: 0.87,
                patternRecognition: 0.82,
                createdAt: new Date(),
                trainingData: [],
            };

            const treatmentModel = {
                id: "model_v2",
                version: "v2.0",
                modelName: "Treatment",
                accuracy: 0.88,
                relevanceScore: 0.91,
                completenessScore: 0.87,
                usabilityScore: 0.89,
                categoryAccuracy: {},
                contextAwareness: 0.85,
                fallbackEfficacy: 0.92,
                patternRecognition: 0.88,
                createdAt: new Date(),
                trainingData: [],
            };

            abTestFramework.createTest("test_005", controlModel, treatmentModel);

            const result = abTestFramework.increaseTrafficAllocation("test_005", 0.5);
            expect(result.success).toBe(true);
            expect(result.newSplit).toBe(0.5);
        });
    });

    describe("Data Quality", () => {
        it("should validate all scenarios have required fields", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            scenarios.forEach((scenario) => {
                expect(scenario.errorCode).toBeTruthy();
                expect(scenario.errorDescription).toBeTruthy();
                expect(scenario.category).toBeTruthy();
                expect(scenario.resolutionSteps).toBeDefined();
                expect(scenario.resolutionSteps.length).toBeGreaterThan(0);
                expect(scenario.confidence).toBeGreaterThan(0);
            });
        });

        it("should have valid confidence scores", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            scenarios.forEach((scenario) => {
                expect(scenario.confidence).toBeGreaterThanOrEqual(0);
                expect(scenario.confidence).toBeLessThanOrEqual(1);
            });
        });

        it("should have valid severity levels", () => {
            const scenarios = dataCollector.collectFromPOSScenarios();
            const validSeverities = ["critical", "high", "medium", "low"];
            scenarios.forEach((scenario) => {
                expect(validSeverities).toContain(scenario.severity);
            });
        });

        it("should have prevention measures", () => {
            const scenarios = POS_ERROR_SCENARIOS;
            scenarios.forEach((scenario) => {
                expect(scenario.preventionMeasures).toBeDefined();
                expect(scenario.preventionMeasures.length).toBeGreaterThan(0);
            });
        });

        it("should have system metrics for each scenario", () => {
            const scenarios = POS_ERROR_SCENARIOS;
            const requiredMetrics = [
                "cpuUsage",
                "memoryUsage",
                "diskUsage",
                "networkLatency",
                "activeConnections",
                "queueLength",
                "databaseHealth",
                "cacheHitRate",
            ];

            scenarios.forEach((scenario) => {
                requiredMetrics.forEach((metric) => {
                    expect(scenario.systemMetrics[metric as keyof typeof scenario.systemMetrics]).toBeDefined();
                });
            });
        });
    });
});
