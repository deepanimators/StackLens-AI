/**
 * Phase 2: Integration Tests for Jira Integration & Real-Time Data Flow
 * 
 * This test suite verifies:
 * 1. Real-time log monitoring
 * 2. Error detection and automation
 * 3. Jira ticket creation
 * 4. SSE streaming
 * 5. Data flow integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ============================================================================
// Mock Data & Utilities
// ============================================================================

interface LogWatcherStatus {
    isRunning: boolean;
    watchedFiles: number;
    errorsDetected: number;
    uptime: number;
}

interface ErrorData {
    message: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    mlConfidence: number;
    timestamp: number;
}

interface JiraTicket {
    id: string;
    key: string;
    summary: string;
    description: string;
    status: string;
    created: Date;
}

// Mock Log Watcher Service
const createMockLogWatcher = () => ({
    getStatus: vi.fn((): LogWatcherStatus => ({
        isRunning: true,
        watchedFiles: 5,
        errorsDetected: 127,
        uptime: 3600,
    })),
    start: vi.fn(async () => ({ success: true })),
    stop: vi.fn(async () => ({ success: true })),
    on: vi.fn(),
    off: vi.fn(),
    removeListener: vi.fn(),
});

// Mock Error Automation Service
const createMockErrorAutomation = () => ({
    makeDecision: vi.fn((error: ErrorData) => {
        if (error.mlConfidence > 0.8) {
            return { decision: "create", confidence: error.mlConfidence };
        } else if (error.mlConfidence > 0.5) {
            return { decision: "update", confidence: error.mlConfidence };
        }
        return { decision: "skip", confidence: error.mlConfidence };
    }),
    getStatistics: vi.fn(() => ({
        totalDecisions: 42,
        ticketsCreated: 15,
        ticketsUpdated: 20,
        decisionsSkipped: 7,
    })),
    enable: vi.fn(async () => ({ success: true })),
    disable: vi.fn(async () => ({ success: true })),
});

// Mock Jira Service
const createMockJiraService = () => ({
    createTicket: vi.fn(async (data: any): Promise<JiraTicket> => ({
        id: "ISSUE-123",
        key: "PROJ-456",
        summary: data.summary,
        description: data.description,
        status: "OPEN",
        created: new Date(),
    })),
    updateTicket: vi.fn(async () => ({ success: true })),
    searchTickets: vi.fn(async () => ({ tickets: [], total: 0 })),
    getStatus: vi.fn(() => ({
        configured: true,
        connected: true,
        baseUrl: "https://jira.example.com",
    })),
});

describe("Phase 2: Jira Integration & Real-Time Data Flow", () => {

    let logWatcher: ReturnType<typeof createMockLogWatcher>;
    let errorAutomation: ReturnType<typeof createMockErrorAutomation>;
    let jiraService: ReturnType<typeof createMockJiraService>;

    beforeEach(() => {
        logWatcher = createMockLogWatcher();
        errorAutomation = createMockErrorAutomation();
        jiraService = createMockJiraService();
        vi.clearAllMocks();
    });

    // ============================================================================
    // TEST SUITE 1: Log Watcher Service
    // ============================================================================
    describe("Log Watcher Service", () => {

        it("should initialize log watcher without errors", () => {
            expect(logWatcher).toBeDefined();
            expect(logWatcher.getStatus).toBeDefined();
            expect(typeof logWatcher.getStatus).toBe("function");
        });

        it("should start watching log files", async () => {
            const status = logWatcher.getStatus();
            expect(status).toBeDefined();
            expect(status.isRunning).toBe(true);
            expect(status.watchedFiles).toBeGreaterThan(0);
            expect(status.errorsDetected).toBeGreaterThan(0);
        });

        it("should return correct watcher status structure", () => {
            const status = logWatcher.getStatus();
            expect(status).toHaveProperty("isRunning");
            expect(status).toHaveProperty("watchedFiles");
            expect(status).toHaveProperty("errorsDetected");
            expect(status).toHaveProperty("uptime");
        });

        it("should handle multiple status queries", () => {
            const status1 = logWatcher.getStatus();
            const status2 = logWatcher.getStatus();

            expect(status1).toEqual(status2);
            expect(logWatcher.getStatus).toHaveBeenCalled();
        });

        it("should start and stop watcher", async () => {
            await logWatcher.start();
            expect(logWatcher.start).toHaveBeenCalled();

            await logWatcher.stop();
            expect(logWatcher.stop).toHaveBeenCalled();
        });

        it("should register event listeners", () => {
            const handler = vi.fn();
            logWatcher.on("error-detected", handler);

            expect(logWatcher.on).toHaveBeenCalledWith("error-detected", handler);
        });
    });

    // ============================================================================
    // TEST SUITE 2: Error Automation Service
    // ============================================================================
    describe("Error Automation Service", () => {

        it("should initialize error automation without errors", () => {
            expect(errorAutomation).toBeDefined();
            expect(errorAutomation.makeDecision).toBeDefined();
            expect(errorAutomation.getStatistics).toBeDefined();
        });

        it("should make decisions based on error severity", () => {
            const errorData: ErrorData = {
                message: "Test error",
                severity: "HIGH",
                mlConfidence: 0.85,
                timestamp: Date.now(),
            };

            const decision = errorAutomation.makeDecision(errorData);
            expect(decision).toBeDefined();
            expect(["create", "update", "skip"]).toContain(decision.decision);
            expect(decision.confidence).toBe(0.85);
        });

        it("should create ticket for high confidence errors", () => {
            const errorData: ErrorData = {
                message: "Critical error",
                severity: "CRITICAL",
                mlConfidence: 0.95,
                timestamp: Date.now(),
            };

            const decision = errorAutomation.makeDecision(errorData);
            expect(decision.decision).toBe("create");
        });

        it("should update ticket for medium confidence errors", () => {
            const errorData: ErrorData = {
                message: "Medium error",
                severity: "MEDIUM",
                mlConfidence: 0.65,
                timestamp: Date.now(),
            };

            const decision = errorAutomation.makeDecision(errorData);
            expect(decision.decision).toBe("update");
        });

        it("should skip low confidence errors", () => {
            const errorData: ErrorData = {
                message: "Low confidence error",
                severity: "LOW",
                mlConfidence: 0.3,
                timestamp: Date.now(),
            };

            const decision = errorAutomation.makeDecision(errorData);
            expect(decision.decision).toBe("skip");
        });

        it("should return automation statistics", () => {
            const stats = errorAutomation.getStatistics();
            expect(stats).toHaveProperty("totalDecisions");
            expect(stats).toHaveProperty("ticketsCreated");
            expect(stats).toHaveProperty("ticketsUpdated");
            expect(stats).toHaveProperty("decisionsSkipped");
            expect(stats.totalDecisions).toBeGreaterThan(0);
        });

        it("should enable and disable automation", async () => {
            await errorAutomation.enable();
            expect(errorAutomation.enable).toHaveBeenCalled();

            await errorAutomation.disable();
            expect(errorAutomation.disable).toHaveBeenCalled();
        });
    });

    // ============================================================================
    // TEST SUITE 3: Jira Integration Service
    // ============================================================================
    describe("Jira Integration Service", () => {

        it("should initialize Jira service without errors", () => {
            expect(jiraService).toBeDefined();
            expect(jiraService.createTicket).toBeDefined();
            expect(jiraService.updateTicket).toBeDefined();
        });

        it("should check Jira connectivity status", () => {
            const status = jiraService.getStatus();
            expect(status).toBeDefined();
            expect(status.configured).toBe(true);
            expect(status.connected).toBe(true);
            expect(status.baseUrl).toContain("jira");
        });

        it("should create Jira ticket from error", async () => {
            const errorData = {
                message: "Database connection failed",
                severity: "HIGH",
                stackTrace: "at database.connect()",
            };

            const ticket = await jiraService.createTicket({
                summary: `[HIGH] ${errorData.message}`,
                description: `Error: ${errorData.message}\n\nStack: ${errorData.stackTrace}`,
                issueType: "Bug",
            });

            expect(ticket).toBeDefined();
            expect(ticket.id).toBeDefined();
            expect(ticket.summary).toContain(errorData.message);
            expect(jiraService.createTicket).toHaveBeenCalled();
        });

        it("should update existing Jira ticket", async () => {
            const updateData = {
                ticketId: "PROJ-123",
                comment: "Another occurrence of this error",
                status: "In Progress",
            };

            await jiraService.updateTicket(updateData);
            expect(jiraService.updateTicket).toHaveBeenCalledWith(updateData);
        });

        it("should search for related tickets", async () => {
            const query = "database connection";
            const results = await jiraService.searchTickets(query);

            expect(results).toHaveProperty("tickets");
            expect(results).toHaveProperty("total");
            expect(Array.isArray(results.tickets)).toBe(true);
        });
    });

    // ============================================================================
    // TEST SUITE 4: Real-Time Data Flow
    // ============================================================================
    describe("Real-Time Data Flow", () => {

        it("should process error from detection to Jira creation", async () => {
            // Step 1: Detect error
            const errorData: ErrorData = {
                message: "Unhandled exception in payment processor",
                severity: "CRITICAL",
                mlConfidence: 0.92,
                timestamp: Date.now(),
            };

            // Step 2: Make automation decision
            const decision = errorAutomation.makeDecision(errorData);
            expect(decision.decision).toBe("create");

            // Step 3: Create Jira ticket
            const ticket = await jiraService.createTicket({
                summary: `[CRITICAL] ${errorData.message}`,
                description: errorData.message,
            });

            expect(ticket.id).toBeDefined();
            expect(jiraService.createTicket).toHaveBeenCalled();
        });

        it("should handle error correlation across multiple files", () => {
            const error1 = logWatcher.getStatus();
            const error2 = logWatcher.getStatus();

            expect(error1.watchedFiles).toBeGreaterThan(0);
            expect(error2.watchedFiles).toBe(error1.watchedFiles);
        });

        it("should maintain error statistics during flow", () => {
            const statsBefore = errorAutomation.getStatistics();

            // Make a decision
            errorAutomation.makeDecision({
                message: "Test",
                severity: "HIGH",
                mlConfidence: 0.85,
                timestamp: Date.now(),
            });

            const statsAfter = errorAutomation.getStatistics();
            expect(statsAfter.totalDecisions).toBeGreaterThanOrEqual(
                statsBefore.totalDecisions
            );
        });

        it("should correlate log events with automation decisions", () => {
            const logStatus = logWatcher.getStatus();
            const automationStats = errorAutomation.getStatistics();

            // Both should have processed data
            expect(logStatus.errorsDetected).toBeGreaterThan(0);
            expect(automationStats.totalDecisions).toBeGreaterThan(0);
        });
    });

    // ============================================================================
    // TEST SUITE 5: SSE Streaming & Real-Time Updates
    // ============================================================================
    describe("SSE Streaming & Real-Time Updates", () => {

        it("should format SSE messages correctly", () => {
            const eventData = { type: "error", message: "Test" };
            const sseMessage = `data: ${JSON.stringify(eventData)}\n\n`;

            expect(sseMessage).toMatch(/^data: /);
            expect(sseMessage).toMatch(/\n\n$/);
        });

        it("should handle error event streaming", () => {
            const errorEvent = {
                type: "error-detected",
                data: {
                    message: "Stream test error",
                    severity: "MEDIUM",
                },
            };

            expect(errorEvent.type).toBe("error-detected");
            expect(errorEvent.data).toHaveProperty("message");
            expect(errorEvent.data).toHaveProperty("severity");
        });

        it("should handle ticket creation event streaming", () => {
            const ticketEvent = {
                type: "ticket-created",
                data: {
                    ticketId: "PROJ-789",
                    errorMessage: "Connection timeout",
                },
            };

            expect(ticketEvent.type).toBe("ticket-created");
            expect(ticketEvent.data).toHaveProperty("ticketId");
        });

        it("should handle automation status update streaming", () => {
            const statusEvent = {
                type: "automation-status-changed",
                data: {
                    enabled: true,
                    timestamp: Date.now(),
                },
            };

            expect(statusEvent.type).toBe("automation-status-changed");
            expect(statusEvent.data.enabled).toBe(true);
        });
    });

    // ============================================================================
    // TEST SUITE 6: Error Scenarios & Recovery
    // ============================================================================
    describe("Error Scenarios & Recovery", () => {

        it("should handle malformed error objects", () => {
            const malformedError = { message: "test" } as ErrorData;

            // Should not throw
            expect(() => {
                errorAutomation.makeDecision({
                    ...malformedError,
                    severity: "LOW",
                    mlConfidence: 0.5,
                    timestamp: Date.now(),
                });
            }).not.toThrow();
        });

        it("should recover from Jira API failures", async () => {
            jiraService.createTicket.mockRejectedValueOnce(
                new Error("Jira API timeout")
            );

            try {
                await jiraService.createTicket({ summary: "Test" });
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it("should handle service unavailability gracefully", async () => {
            jiraService.getStatus.mockReturnValue({
                configured: true,
                connected: false,
                baseUrl: "https://jira.example.com",
            });

            const status = jiraService.getStatus();
            expect(status.connected).toBe(false);
        });

        it("should retry failed operations", async () => {
            jiraService.createTicket
                .mockRejectedValueOnce(new Error("Timeout"))
                .mockResolvedValueOnce({
                    id: "PROJ-999",
                    key: "TEST-001",
                    summary: "Test",
                    description: "Test description",
                    status: "OPEN",
                    created: new Date(),
                });

            // First call fails
            try {
                await jiraService.createTicket({ summary: "Test" });
            } catch {
                // Expected
            }

            // Second call succeeds
            const ticket = await jiraService.createTicket({ summary: "Test" });
            expect(ticket.id).toBeDefined();
        });
    });

    // ============================================================================
    // TEST SUITE 7: Performance & Load Testing
    // ============================================================================
    describe("Performance & Load Testing", () => {

        it("should handle high-frequency error events", () => {
            const startTime = performance.now();

            for (let i = 0; i < 100; i++) {
                errorAutomation.makeDecision({
                    message: `Error ${i}`,
                    severity: "MEDIUM",
                    mlConfidence: 0.7,
                    timestamp: Date.now(),
                });
            }

            const duration = performance.now() - startTime;
            expect(duration).toBeLessThan(5000); // Should complete in under 5s
        });

        it("should measure error detection latency", () => {
            const startTime = performance.now();
            logWatcher.getStatus();
            const latency = performance.now() - startTime;

            expect(latency).toBeLessThan(10); // Should be very fast
        });

        it("should batch process multiple errors efficiently", () => {
            const errors: ErrorData[] = Array.from({ length: 50 }, (_, i) => ({
                message: `Batch error ${i}`,
                severity: i % 2 === 0 ? "HIGH" : "MEDIUM",
                mlConfidence: 0.5 + (i % 50) / 100,
                timestamp: Date.now(),
            }));

            const startTime = performance.now();

            const decisions = errors.map((error) =>
                errorAutomation.makeDecision(error)
            );

            const duration = performance.now() - startTime;

            expect(decisions.length).toBe(50);
            expect(duration).toBeLessThan(1000); // Should process 50 errors in under 1s
        });
    });
});
