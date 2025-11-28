/**
 * Error Automation Service
 * Makes intelligent decisions about error handling based on severity and ML confidence
 * Orchestrates Jira ticket creation and database logging
 */

import { EventEmitter } from "events";
import { ParsedError } from "./log-parser";
import { jiraService } from "./jira-integration";

export interface AutomationDecision {
    shouldCreate: boolean;
    reason: string;
    severity: string;
    mlConfidence: number;
    threshold: number;
}

export interface AutomationStatistics {
    enabled: boolean;
    totalProcessed: number;
    ticketsCreated: number;
    ticketsUpdated: number;
    skipped: number;
    failed: number;
    lastAction?: string;
}

export interface AutomationLogRecord {
    errorId?: number;
    decision: "create" | "update" | "skip";
    reason: string;
    severity: string;
    mlConfidence: number;
    threshold: number;
    jiraTicketKey?: string;
    success: boolean;
}

export class ErrorAutomationService extends EventEmitter {
    private enabled: boolean = true;
    private statistics: AutomationStatistics = {
        enabled: true,
        totalProcessed: 0,
        ticketsCreated: 0,
        ticketsUpdated: 0,
        skipped: 0,
        failed: 0,
    };

    // Decision thresholds for ML confidence scores
    private thresholds = {
        CRITICAL: 0.0, // Always create for CRITICAL errors
        HIGH: 0.75, // Create if 75% confidence or higher
        MEDIUM: 0.9, // Create if 90% confidence or higher
        LOW: 1.0, // Skip for LOW severity (threshold unattainable)
    };

    constructor() {
        super();
    }

    /**
     * Make decision on whether to create a Jira ticket
     */
    makeDecision(error: ParsedError, mlConfidence: number = 0.85): AutomationDecision {
        const severity = this.normalizeSeverity(error.severity);
        const threshold = this.thresholds[severity as keyof typeof this.thresholds] || 0.85;

        const shouldCreate = mlConfidence >= threshold;

        return {
            shouldCreate,
            reason: this.generateReason(severity, mlConfidence, threshold),
            severity,
            mlConfidence,
            threshold,
        };
    }

    /**
     * Execute full automation workflow
     */
    async executeAutomation(
        error: ParsedError,
        mlConfidence: number = 0.85,
        storeNumber?: string,
        kioskNumber?: string
    ): Promise<{ success: boolean; ticketKey?: string; action: string; message: string }> {
        if (!this.enabled) {
            const action: AutomationLogRecord = {
                decision: "skip",
                reason: "Automation service disabled",
                severity: error.severity,
                mlConfidence,
                threshold: 0,
                success: true,
            };
            this.statistics.skipped++;
            this.emit("automation-skipped", action);
            return { success: true, action: "SKIPPED", message: "Automation disabled" };
        }

        try {
            // Make decision
            const decision = this.makeDecision(error, mlConfidence);
            this.statistics.totalProcessed++;

            if (!decision.shouldCreate) {
                const action: AutomationLogRecord = {
                    decision: "skip",
                    reason: decision.reason,
                    severity: error.severity,
                    mlConfidence,
                    threshold: decision.threshold,
                    success: true,
                };
                this.statistics.skipped++;
                console.log(
                    `[ErrorAutomationService] Error automation skipped: ${decision.reason}`
                );
                return {
                    success: true,
                    action: "SKIPPED",
                    message: decision.reason,
                };
            }

            // Check for existing ticket
            const existing = await jiraService.findExistingTicket(error.errorType, storeNumber);

            if (existing) {
                // Update existing ticket
                try {
                    await jiraService.updateTicket(existing.key, {
                        errorType: error.errorType,
                        severity: error.severity,
                        message: error.message,
                        storeNumber,
                        kioskNumber,
                        mlConfidence,
                        errorDetails: { lineNumber: error.lineNumber, timestamp: error.timestamp },
                    });

                    const action: AutomationLogRecord = {
                        decision: "update",
                        reason: `Updated existing ticket for duplicate error`,
                        severity: error.severity,
                        mlConfidence,
                        threshold: decision.threshold,
                        jiraTicketKey: existing.key,
                        success: true,
                    };
                    this.statistics.ticketsUpdated++;
                    console.log(
                        `[ErrorAutomationService] Updated existing ticket: ${existing.key}`
                    );
                    this.emit("ticket-updated", action);

                    return {
                        success: true,
                        ticketKey: existing.key,
                        action: "UPDATED",
                        message: `Updated existing ticket ${existing.key}`,
                    };
                } catch (updateError) {
                    console.error("[ErrorAutomationService] Failed to update ticket:", updateError);
                    // Continue to create new ticket if update fails
                }
            }

            // Create new ticket
            try {
                const ticketResponse = await jiraService.createTicket({
                    errorType: error.errorType,
                    severity: error.severity,
                    message: error.message,
                    storeNumber,
                    kioskNumber,
                    mlConfidence,
                    errorDetails: { lineNumber: error.lineNumber, timestamp: error.timestamp },
                });

                const action: AutomationLogRecord = {
                    decision: "create",
                    reason: `Created ticket due to ${decision.severity} error with ${(mlConfidence * 100).toFixed(0)}% confidence`,
                    severity: error.severity,
                    mlConfidence,
                    threshold: decision.threshold,
                    jiraTicketKey: ticketResponse.key,
                    success: true,
                };
                this.statistics.ticketsCreated++;
                console.log(`[ErrorAutomationService] Created ticket: ${ticketResponse.key}`);
                this.emit("ticket-created", action);

                return {
                    success: true,
                    ticketKey: ticketResponse.key,
                    action: "CREATED",
                    message: `Created Jira ticket ${ticketResponse.key}`,
                };
            } catch (createError) {
                const action: AutomationLogRecord = {
                    decision: "create",
                    reason: `Failed to create ticket: ${createError instanceof Error ? createError.message : "Unknown error"}`,
                    severity: error.severity,
                    mlConfidence,
                    threshold: decision.threshold,
                    success: false,
                };
                this.statistics.failed++;
                console.error("[ErrorAutomationService] Failed to create ticket:", createError);
                this.emit("automation-failed", action);

                return {
                    success: false,
                    action: "FAILED",
                    message: `Failed to create Jira ticket: ${createError instanceof Error ? createError.message : "Unknown error"}`,
                };
            }
        } catch (error) {
            console.error("[ErrorAutomationService] Automation workflow error:", error);
            this.statistics.failed++;
            return {
                success: false,
                action: "FAILED",
                message: `Automation service error: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    }

    /**
     * Enable/disable automation
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.statistics.enabled = enabled;
        console.log(
            `[ErrorAutomationService] Automation ${enabled ? "enabled" : "disabled"}`
        );
    }

    /**
     * Get automation statistics
     */
    getStatistics(): AutomationStatistics {
        return { ...this.statistics };
    }

    /**
     * Reset statistics
     */
    resetStatistics(): void {
        this.statistics = {
            enabled: this.enabled,
            totalProcessed: 0,
            ticketsCreated: 0,
            ticketsUpdated: 0,
            skipped: 0,
            failed: 0,
        };
    }

    /**
     * Normalize severity to standard levels
     */
    private normalizeSeverity(severity: string): string {
        if (!severity) return "LOW";
        const normalizedSeverity = severity.toUpperCase();

        if (["CRITICAL", "FATAL", "EMERGENCY"].includes(normalizedSeverity)) {
            return "CRITICAL";
        }
        if (["ERROR", "SEVERE", "HIGH"].includes(normalizedSeverity)) {
            return "HIGH";
        }
        if (["WARNING", "WARN", "MEDIUM"].includes(normalizedSeverity)) {
            return "MEDIUM";
        }

        return "LOW";
    }

    /**
     * Generate human-readable reason for decision
     */
    private generateReason(severity: string, mlConfidence: number, threshold: number): string {
        if (severity === "CRITICAL") {
            return "CRITICAL severity always creates ticket";
        }

        if (mlConfidence >= threshold) {
            return `${severity} severity with ${(mlConfidence * 100).toFixed(1)}% confidence (threshold: ${(threshold * 100).toFixed(0)}%)`;
        }

        return `${severity} severity with ${(mlConfidence * 100).toFixed(1)}% confidence below threshold of ${(threshold * 100).toFixed(0)}%`;
    }
}

// Export singleton
export const errorAutomation = new ErrorAutomationService();
