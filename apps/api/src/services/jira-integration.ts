/**
 * Jira Integration Service
 * Handles automatic ticket creation and management in Jira Cloud
 * Integrates with StackLens AI error detection system
 */

import axios, { AxiosInstance } from "axios";

export interface JiraTicketData {
    errorType: string;
    severity: string;
    message: string;
    storeNumber?: string;
    kioskNumber?: string;
    mlConfidence?: number;
    errorDetails?: Record<string, unknown>;
}

export interface JiraCreateResponse {
    id: string;
    key: string;
    self: string;
}

export class JiraIntegrationService {
    private client: AxiosInstance;
    private configured: boolean = false;
    private host: string;
    private projectKey: string;
    private userEmail: string;

    constructor() {
        // Support both JIRA_HOST and JIRA_DOMAIN for backwards compatibility
        this.host = process.env.JIRA_HOST || (process.env.JIRA_DOMAIN ? `https://${process.env.JIRA_DOMAIN}` : "");
        this.projectKey = process.env.JIRA_PROJECT_KEY || "";
        // Support both JIRA_USER_EMAIL and JIRA_EMAIL for backwards compatibility
        this.userEmail = process.env.JIRA_USER_EMAIL || process.env.JIRA_EMAIL || "";
        const apiToken = process.env.JIRA_API_TOKEN || "";

        this.configured = !!(this.host && this.projectKey && this.userEmail && apiToken);

        // Debug log for Jira configuration
        console.log(`[JiraIntegrationService] Configuration check:
          - JIRA_HOST: ${process.env.JIRA_HOST ? 'set' : 'not set'}
          - JIRA_DOMAIN: ${process.env.JIRA_DOMAIN ? 'set' : 'not set'}
          - JIRA_PROJECT_KEY: ${process.env.JIRA_PROJECT_KEY ? 'set' : 'not set'}
          - JIRA_EMAIL: ${process.env.JIRA_EMAIL ? 'set' : 'not set'}
          - JIRA_USER_EMAIL: ${process.env.JIRA_USER_EMAIL ? 'set' : 'not set'}
          - JIRA_API_TOKEN: ${process.env.JIRA_API_TOKEN ? 'set (hidden)' : 'not set'}
          - Resolved host: ${this.host || 'empty'}
          - Configured: ${this.configured}`);

        // Initialize axios client with Basic Auth
        this.client = axios.create({
            baseURL: `${this.host}/rest/api/3`,
            auth: {
                username: this.userEmail,
                password: apiToken,
            },
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
    }

    isConfigured(): boolean {
        return this.configured;
    }

    /**
     * Create a new Jira issue/ticket
     */
    async createTicket(data: JiraTicketData): Promise<JiraCreateResponse> {
        if (!this.configured) {
            throw new Error("Jira integration not configured. Please set JIRA_* environment variables.");
        }

        const priority = this.mapSeverityToPriority(data.severity);
        const description = this.formatDescription(data);

        try {
            const response = await this.client.post<JiraCreateResponse>("/issues", {
                fields: {
                    project: { key: this.projectKey },
                    summary: `[${data.severity}] ${data.errorType}: ${data.message.substring(0, 100)}`,
                    description: {
                        version: 3,
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                                content: [
                                    {
                                        type: "text",
                                        text: description,
                                    },
                                ],
                            },
                        ],
                    },
                    issuetype: { name: "Bug" },
                    priority: { name: priority },
                    labels: ["stacklens-ai", data.severity.toLowerCase()],
                    customfield_10000: data.storeNumber || "Unknown",
                    customfield_10001: data.kioskNumber || "Unknown",
                },
            });

            console.log(`[JiraIntegrationService] Created ticket: ${response.data.key}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.data?.errorMessages?.join(", ") || error.message;
                console.error(`[JiraIntegrationService] Failed to create ticket: ${errorMsg}`);
                throw new Error(`Jira ticket creation failed: ${errorMsg}`);
            }
            throw error;
        }
    }

    /**
     * Find existing tickets for an error type
     */
    async findExistingTicket(
        errorType: string,
        storeNumber?: string
    ): Promise<{ key: string; id: string } | null> {
        if (!this.configured) {
            return null;
        }

        try {
            let jql = `project = "${this.projectKey}" AND type = Bug AND status != Done AND summary ~ "${errorType}"`;

            if (storeNumber) {
                jql += ` AND customfield_10000 = "${storeNumber}"`;
            }

            const response = await this.client.get("/search", {
                params: { jql, maxResults: 1 },
            });

            if (response.data.issues && response.data.issues.length > 0) {
                const issue = response.data.issues[0];
                return { key: issue.key, id: issue.id };
            }

            return null;
        } catch (error) {
            console.warn("[JiraIntegrationService] Error searching for existing ticket:", error);
            return null;
        }
    }

    /**
     * Update existing ticket with new error occurrence
     */
    async updateTicket(ticketKey: string, data: JiraTicketData): Promise<void> {
        if (!this.configured) {
            throw new Error("Jira integration not configured.");
        }

        try {
            const comment = `New occurrence detected:\n${this.formatDescription(data)}`;

            await this.client.post(`/issues/${ticketKey}/comments`, {
                body: {
                    version: 3,
                    type: "doc",
                    content: [
                        {
                            type: "paragraph",
                            content: [{ type: "text", text: comment }],
                        },
                    ],
                },
            });

            console.log(`[JiraIntegrationService] Updated ticket: ${ticketKey}`);
        } catch (error) {
            console.error("[JiraIntegrationService] Failed to update ticket:", error);
            throw error;
        }
    }

    /**
     * Add comment to ticket
     */
    async addComment(ticketKey: string, message: string): Promise<void> {
        if (!this.configured) {
            throw new Error("Jira integration not configured.");
        }

        try {
            await this.client.post(`/issues/${ticketKey}/comments`, {
                body: {
                    version: 3,
                    type: "doc",
                    content: [
                        {
                            type: "paragraph",
                            content: [{ type: "text", text: message }],
                        },
                    ],
                },
            });
        } catch (error) {
            console.error("[JiraIntegrationService] Failed to add comment:", error);
            throw error;
        }
    }

    /**
     * Map error severity to Jira priority
     */
    private mapSeverityToPriority(severity: string): string {
        const severityMap: Record<string, string> = {
            CRITICAL: "Blocker",
            FATAL: "Blocker",
            EMERGENCY: "Blocker",
            ERROR: "High",
            SEVERE: "High",
            HIGH: "High",
            WARNING: "Medium",
            WARN: "Medium",
            MEDIUM: "Medium",
            LOW: "Low",
            INFO: "Low",
        };

        return severityMap[severity.toUpperCase()] || "Medium";
    }

    /**
     * Format description for Jira ticket
     */
    private formatDescription(data: JiraTicketData): string {
        let description = `*Error Type:* ${data.errorType}\n`;
        description += `*Severity:* ${data.severity}\n`;
        description += `*Message:* ${data.message}\n`;

        if (data.storeNumber) {
            description += `*Store:* ${data.storeNumber}\n`;
        }

        if (data.kioskNumber) {
            description += `*Kiosk:* ${data.kioskNumber}\n`;
        }

        if (data.mlConfidence) {
            description += `*ML Confidence:* ${(data.mlConfidence * 100).toFixed(2)}%\n`;
        }

        if (data.errorDetails) {
            description += `\n*Additional Details:*\n`;
            description += "```json\n" + JSON.stringify(data.errorDetails, null, 2) + "\n```";
        }

        description += `\n_Created automatically by StackLens AI_`;

        return description;
    }

    /**
     * Get Jira status/configuration
     */
    getStatus(): {
        configured: boolean;
        host?: string;
        project?: string;
        message: string;
    } {
        return {
            configured: this.configured,
            host: this.configured ? this.host : undefined,
            project: this.configured ? this.projectKey : undefined,
            message: this.configured
                ? "Jira integration is configured and ready"
                : "Jira integration not configured. Set JIRA_DOMAIN, JIRA_PROJECT_KEY, JIRA_EMAIL, and JIRA_API_TOKEN environment variables (or JIRA_HOST/JIRA_USER_EMAIL).",
        };
    }
}

// Export singleton
export const jiraService = new JiraIntegrationService();
