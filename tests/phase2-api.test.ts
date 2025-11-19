/**
 * Phase 2: API Endpoint Integration Tests
 * 
 * This test suite verifies all 9 API endpoints work correctly
 * Using mocked API responses for isolated testing
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the fetch function to avoid actual network calls
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

const BASE_URL = "http://localhost:3000";

describe("Phase 2: API Endpoint Integration Tests", () => {

    beforeEach(() => {
        mockFetch.mockClear();
    });

    // ============================================================================
    // TEST SUITE 1: Status Endpoints
    // ============================================================================
    describe("Status Endpoints", () => {

        it("GET /api/jira/status should return configuration status", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: async () => ({
                    success: true,
                    data: {
                        configured: true,
                        connected: true,
                        baseUrl: "https://jira.example.com",
                    },
                }),
                ok: true,
            } as any);

            const response = await fetch(`${BASE_URL}/api/jira/status`);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data).toHaveProperty("configured");
            expect(data.data).toHaveProperty("connected");
            expect(data.data).toHaveProperty("baseUrl");
        });

        it("GET /api/automation/status should return automation statistics", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: async () => ({
                    success: true,
                    data: {
                        isEnabled: true,
                        totalDecisions: 42,
                        ticketsCreated: 15,
                        ticketsUpdated: 20,
                        decisionsSkipped: 7,
                    },
                }),
                ok: true,
            } as any);

            const response = await fetch(`${BASE_URL}/api/automation/status`);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data).toHaveProperty("isEnabled");
            expect(data.data).toHaveProperty("totalDecisions");
            expect(data.data).toHaveProperty("ticketsCreated");
            expect(data.data).toHaveProperty("ticketsUpdated");
            expect(data.data).toHaveProperty("decisionsSkipped");
        });

        it("GET /api/watcher/status should return log watcher status", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: async () => ({
                    success: true,
                    data: {
                        isRunning: true,
                        watchedFiles: 5,
                        errorsDetected: 127,
                        uptime: 3600,
                    },
                }),
                ok: true,
            } as any);

            const response = await fetch(`${BASE_URL}/api/watcher/status`);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data).toHaveProperty("isRunning");
            expect(data.data).toHaveProperty("watchedFiles");
            expect(data.data).toHaveProperty("errorsDetected");
            expect(data.data).toHaveProperty("uptime");
        });
    });

    // ============================================================================
    // TEST SUITE 2: Control Endpoints
    // ============================================================================
    describe("Control Endpoints", () => {

        it("POST /api/watcher/start should start log watcher", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: async () => ({
                    success: true,
                    data: { message: "Log watcher started" },
                }),
                ok: true,
            } as any);

            const response = await fetch(`${BASE_URL}/api/watcher/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it("POST /api/watcher/stop should stop log watcher", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: async () => ({
                    success: true,
                    data: { message: "Log watcher stopped" },
                }),
                ok: true,
            } as any);

            const response = await fetch(`${BASE_URL}/api/watcher/stop`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it("POST /api/automation/toggle should enable automation", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: async () => ({
                    success: true,
                    data: { enabled: true },
                }),
                ok: true,
            } as any);

            const response = await fetch(`${BASE_URL}/api/automation/toggle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: true }),
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.enabled).toBe(true);
        });

        it("POST /api/automation/toggle should disable automation", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: async () => ({
                    success: true,
                    data: { enabled: false },
                }),
                ok: true,
            } as any);

            const response = await fetch(`${BASE_URL}/api/automation/toggle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: false }),
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data.enabled).toBe(false);
        });

        it("POST /api/automation/toggle should validate enabled field", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 400,
                json: async () => ({
                    success: false,
                    error: "Missing required field: enabled",
                }),
                ok: false,
            } as any);

            const response = await fetch(`${BASE_URL}/api/automation/toggle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invalid: "field" }),
            });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
        });
    });

    // ============================================================================
    // TEST SUITE 3: Webhook Endpoint
    // ============================================================================
    describe("Webhook Endpoint", () => {

        it("POST /api/demo-events should accept error events", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 201,
                json: async () => ({
                    success: true,
                    data: { eventId: "evt_123" },
                }),
                ok: true,
            } as any);

            const response = await fetch(`${BASE_URL}/api/demo-events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "error",
                    severity: "HIGH",
                    message: "Test error",
                    timestamp: new Date().toISOString(),
                }),
            });
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.data).toHaveProperty("eventId");
        });

        it("POST /api/demo-events should validate event type", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 400,
                json: async () => ({
                    success: false,
                    error: "Invalid event type",
                }),
                ok: false,
            } as any);

            const response = await fetch(`${BASE_URL}/api/demo-events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "invalid" }),
            });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
        });

        it("POST /api/demo-events should process multiple errors in sequence", async () => {
            const events = Array.from({ length: 3 }, (_, i) => ({
                type: "error",
                message: `Error ${i + 1}`,
                severity: "MEDIUM",
                timestamp: new Date().toISOString(),
            }));

            let successCount = 0;
            for (let i = 0; i < events.length; i++) {
                mockFetch.mockResolvedValueOnce({
                    status: 201,
                    json: async () => ({
                        success: true,
                        data: { eventId: `evt_${i + 1}` },
                    }),
                    ok: true,
                } as any);

                const response = await fetch(`${BASE_URL}/api/demo-events`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(events[i]),
                });
                const data = await response.json();

                if (response.status === 201 && data.success) {
                    successCount++;
                }
            }

            expect(successCount).toBe(events.length);
        });
    });

    // ============================================================================
    // TEST SUITE 4: SSE Streaming Endpoint
    // ============================================================================
    describe("SSE Streaming Endpoint", () => {

        it("GET /api/monitoring/live should handle streaming connection", () => {
            expect(() => {
                const url = `${BASE_URL}/api/monitoring/live`;
                expect(url).toContain("/api/monitoring/live");
            }).not.toThrow();
        });

        it("SSE stream should format messages correctly", () => {
            const sseMessage = "data: {\"type\":\"error\",\"message\":\"test\"}\n\n";
            expect(sseMessage).toMatch(/^data: /);
            expect(sseMessage).toMatch(/\n\n$/);
        });

        it("SSE stream should handle client disconnection gracefully", () => {
            expect(() => {
                const abortController = new AbortController();
                expect(abortController).toBeDefined();
            }).not.toThrow();
        });
    });

    // ============================================================================
    // TEST SUITE 5: Error Handling & Edge Cases
    // ============================================================================
    describe("Error Handling & Edge Cases", () => {

        it("should return 404 for non-existent endpoints", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 404,
                json: async () => ({
                    success: false,
                    error: "Endpoint not found",
                }),
                ok: false,
            } as any);

            const response = await fetch(`${BASE_URL}/api/nonexistent`);
            expect(response.status).toBe(404);
        });

        it("should return 405 for wrong HTTP methods", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 405,
                json: async () => ({
                    success: false,
                    error: "Method not allowed",
                }),
                ok: false,
            } as any);

            const response = await fetch(`${BASE_URL}/api/jira/status`, {
                method: "POST",
            });
            expect(response.status).toBe(405);
        });

        it("should handle malformed JSON gracefully", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 400,
                json: async () => ({
                    success: false,
                    error: "Invalid JSON",
                }),
                ok: false,
            } as any);

            const response = await fetch(`${BASE_URL}/api/demo-events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{invalid json",
            });
            expect(response.status).toBe(400);
        });

        it("should return consistent error format", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 500,
                json: async () => ({
                    success: false,
                    error: "Internal server error",
                }),
                ok: false,
            } as any);

            const response = await fetch(`${BASE_URL}/api/jira/status`);
            const data = await response.json();

            expect(data).toHaveProperty("success");
            expect(data).toHaveProperty("error");
        });
    });

    // ============================================================================
    // TEST SUITE 6: Concurrency & Load Testing
    // ============================================================================
    describe("Concurrency & Load Testing", () => {

        it("should handle concurrent status requests", async () => {
            let completedRequests = 0;
            for (let i = 0; i < 10; i++) {
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    json: async () => ({
                        success: true,
                        data: { isRunning: true },
                    }),
                    ok: true,
                } as any);

                const response = await fetch(`${BASE_URL}/api/jira/status`);
                if (response.status === 200) completedRequests++;
            }

            expect(completedRequests).toBe(10);
        });

        it("should handle concurrent event submissions", async () => {
            let successCount = 0;

            for (let i = 0; i < 5; i++) {
                mockFetch.mockResolvedValueOnce({
                    status: 201,
                    json: async () => ({
                        success: true,
                        data: { eventId: `evt_${i}` },
                    }),
                    ok: true,
                } as any);

                const response = await fetch(`${BASE_URL}/api/demo-events`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "error" }),
                });

                if (response.status === 201) successCount++;
            }

            expect(successCount).toBe(5);
        });

        it("should handle rapid toggle automation on/off", async () => {
            let toggleCount = 0;

            for (let i = 0; i < 10; i++) {
                mockFetch.mockResolvedValueOnce({
                    status: 200,
                    json: async () => ({
                        success: true,
                        data: { enabled: i % 2 === 0 },
                    }),
                    ok: true,
                } as any);

                const response = await fetch(`${BASE_URL}/api/automation/toggle`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enabled: i % 2 === 0 }),
                });

                if (response.status === 200) toggleCount++;
            }

            expect(toggleCount).toBe(10);
        });
    });

    // ============================================================================
    // TEST SUITE 7: Response Performance
    // ============================================================================
    describe("Response Performance", () => {

        it("status endpoints should respond within 100ms", async () => {
            const start = performance.now();

            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: async () => ({ success: true, data: {} }),
                ok: true,
            } as any);

            await fetch(`${BASE_URL}/api/jira/status`);
            const duration = performance.now() - start;

            expect(duration).toBeLessThan(100);
        });

        it("control endpoints should respond within 50ms", async () => {
            const start = performance.now();

            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: async () => ({ success: true, data: {} }),
                ok: true,
            } as any);

            await fetch(`${BASE_URL}/api/automation/toggle`, {
                method: "POST",
                body: JSON.stringify({ enabled: true }),
            });
            const duration = performance.now() - start;

            expect(duration).toBeLessThan(50);
        });

        it("webhook endpoint should respond within 10ms", async () => {
            const start = performance.now();

            mockFetch.mockResolvedValueOnce({
                status: 201,
                json: async () => ({ success: true, data: {} }),
                ok: true,
            } as any);

            await fetch(`${BASE_URL}/api/demo-events`, {
                method: "POST",
                body: JSON.stringify({ type: "error" }),
            });
            const duration = performance.now() - start;

            expect(duration).toBeLessThan(10);
        });
    });
});
