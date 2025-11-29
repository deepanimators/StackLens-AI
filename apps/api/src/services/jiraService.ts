import axios from 'axios';

interface JiraTicket {
    key: string;
    id: string;
    self: string;
    fields: {
        summary: string;
        description: any; // Jira uses a specific document format
        status: {
            name: string;
        };
        priority: {
            name: string;
        };
    };
}

export class JiraService {
    private domain: string;
    private email: string;
    private apiToken: string;
    private projectKey: string;
    private baseUrl: string;

    constructor() {
        this.domain = process.env.JIRA_DOMAIN || '';
        this.email = process.env.JIRA_EMAIL || '';
        this.apiToken = process.env.JIRA_API_TOKEN || '';
        this.projectKey = process.env.JIRA_PROJECT_KEY || 'KAN'; // Default to KAN if not set
        this.baseUrl = `https://${this.domain}/rest/api/3`;

        if (!this.domain || !this.email || !this.apiToken) {
            console.warn('Jira credentials not fully configured. Jira integration will be disabled.');
        }
    }

    private getAuthHeader() {
        return `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')}`;
    }

    /**
     * Search for an existing open ticket with the same summary
     */
    async findExistingTicket(summary: string): Promise<JiraTicket | null> {
        if (!this.domain) return null;

        try {
            // Escape special characters in summary for JQL
            // Remove special characters that cause JQL parsing issues
            const escapedSummary = summary
                .replace(/[[\](){}:?^~*!\\]/g, ' ')  // Remove JQL special chars
                .replace(/"/g, '\\"')  // Escape quotes
                .substring(0, 100);  // Limit length to avoid issues

            // JQL to find open tickets with matching summary
            const jql = `project = "${this.projectKey}" AND summary ~ "${escapedSummary}" AND statusCategory != Done`;
            const response = await axios.get(`${this.baseUrl}/search`, {
                params: {
                    jql,
                    maxResults: 1,
                    fields: 'summary,status,priority'
                },
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Accept': 'application/json'
                }
            });

            if (response.data.issues && response.data.issues.length > 0) {
                return response.data.issues[0];
            }
            return null;
        } catch (error: any) {
            // Log just the error message, not the full stack trace for expected errors
            if (error.response?.status === 400 || error.response?.status === 410) {
                console.warn('Jira search failed (possibly invalid JQL), proceeding to create new ticket');
            } else {
                console.error('Error searching for Jira ticket:', error.response?.data || error.message);
            }
            return null;
        }
    }

    /**
     * Build rich Jira description from AI analysis data
     */
    private buildRichDescription(alert: any, aiAnalysisData: any): any {
        const severityValue = (alert.severity || 'alert').toUpperCase();
        const categoryValue = alert.category || alert.rule_name || 'System Alert';
        const messageValue = alert.message || 'Alert triggered';

        const content: any[] = [];

        // Alert Details Section
        content.push({
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "🚨 Alert Details" }]
        });
        content.push({
            type: "paragraph",
            content: [
                { type: "text", text: "Severity: ", marks: [{ type: "strong" }] },
                { type: "text", text: `${severityValue}\n` },
                { type: "text", text: "Category: ", marks: [{ type: "strong" }] },
                { type: "text", text: `${categoryValue}\n` },
                { type: "text", text: "Message: ", marks: [{ type: "strong" }] },
                { type: "text", text: messageValue }
            ]
        });

        // Error Categories
        if (aiAnalysisData.errorCategories && aiAnalysisData.errorCategories.length > 0) {
            content.push({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "📊 Error Categories" }]
            });
            content.push({
                type: "bulletList",
                content: aiAnalysisData.errorCategories.map((cat: string) => ({
                    type: "listItem",
                    content: [{ type: "paragraph", content: [{ type: "text", text: cat }] }]
                }))
            });
        }

        // Error Types
        if (aiAnalysisData.errorTypes && aiAnalysisData.errorTypes.length > 0) {
            content.push({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "🔴 Error Types" }]
            });
            content.push({
                type: "bulletList",
                content: aiAnalysisData.errorTypes.map((type: string) => ({
                    type: "listItem",
                    content: [{ type: "paragraph", content: [{ type: "text", text: type }] }]
                }))
            });
        }

        // Error Pattern
        if (aiAnalysisData.pattern) {
            content.push({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "🔍 Error Pattern" }]
            });
            content.push({
                type: "paragraph",
                content: [{ type: "text", text: aiAnalysisData.pattern }]
            });
        }

        // Root Cause
        if (aiAnalysisData.rootCause) {
            content.push({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "🎯 Root Cause Analysis" }]
            });
            content.push({
                type: "paragraph",
                content: [{ type: "text", text: aiAnalysisData.rootCause }]
            });
        }

        // System Impact
        if (aiAnalysisData.estimatedImpact || aiAnalysisData.systemImpact) {
            content.push({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "⚠️ System Impact" }]
            });
            content.push({
                type: "paragraph",
                content: [{ type: "text", text: aiAnalysisData.systemImpact || aiAnalysisData.estimatedImpact }]
            });
        }

        // Immediate Actions
        if (aiAnalysisData.immediateActions && aiAnalysisData.immediateActions.length > 0) {
            content.push({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "🚀 Immediate Actions Required" }]
            });
            content.push({
                type: "orderedList",
                content: aiAnalysisData.immediateActions.map((action: string) => ({
                    type: "listItem",
                    content: [{ type: "paragraph", content: [{ type: "text", text: action }] }]
                }))
            });
        }

        // AI Suggestions
        if (aiAnalysisData.suggestions && aiAnalysisData.suggestions.length > 0) {
            content.push({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "💡 AI Suggestions" }]
            });
            content.push({
                type: "bulletList",
                content: aiAnalysisData.suggestions.map((suggestion: string) => ({
                    type: "listItem",
                    content: [{ type: "paragraph", content: [{ type: "text", text: `✓ ${suggestion}` }] }]
                }))
            });
        }

        // Long-term Fixes
        if (aiAnalysisData.longTermFixes && aiAnalysisData.longTermFixes.length > 0) {
            content.push({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "⚙️ Long-term Fixes" }]
            });
            content.push({
                type: "bulletList",
                content: aiAnalysisData.longTermFixes.map((fix: string) => ({
                    type: "listItem",
                    content: [{ type: "paragraph", content: [{ type: "text", text: fix }] }]
                }))
            });
        }

        // Affected Components
        if (aiAnalysisData.affectedComponents && aiAnalysisData.affectedComponents.length > 0) {
            content.push({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "🔧 Affected Components" }]
            });
            content.push({
                type: "bulletList",
                content: aiAnalysisData.affectedComponents.map((comp: string) => ({
                    type: "listItem",
                    content: [{ type: "paragraph", content: [{ type: "text", text: comp }] }]
                }))
            });
        }

        // Resolution Time Estimate
        if (aiAnalysisData.resolutionTimeEstimate) {
            content.push({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "⏱️ Estimated Resolution Time" }]
            });
            content.push({
                type: "paragraph",
                content: [{ type: "text", text: aiAnalysisData.resolutionTimeEstimate }]
            });
        }

        // Footer
        content.push({
            type: "rule"
        });
        content.push({
            type: "paragraph",
            content: [
                { type: "text", text: "Created automatically by ", marks: [{ type: "em" }] },
                { type: "text", text: "StackLens AI", marks: [{ type: "strong" }, { type: "em" }] },
                { type: "text", text: " Error Analysis System", marks: [{ type: "em" }] }
            ]
        });

        return {
            type: "doc",
            version: 1,
            content
        };
    }

    /**
     * Sanitize a string to be used as a Jira label
     * Labels cannot contain spaces and should be lowercase
     */
    private sanitizeLabel(value: string): string {
        return value
            .replace(/\s+/g, '-')      // Replace spaces with hyphens
            .replace(/[^a-zA-Z0-9\-_]/g, '') // Remove special characters
            .toLowerCase()
            .substring(0, 50);          // Limit length
    }

    /**
     * Map severity to Jira priority
     * Jira priorities: Highest, High, Medium, Low, Lowest
     */
    private mapSeverityToPriority(severity: string, aiSeverity?: string): string {
        // Use AI-determined severity if available, otherwise use alert severity
        const effectiveSeverity = (aiSeverity || severity || 'medium').toLowerCase();

        switch (effectiveSeverity) {
            case 'critical':
                return 'Highest';
            case 'high':
                return 'High';
            case 'medium':
            case 'warning':
                return 'Medium';
            case 'low':
                return 'Low';
            case 'info':
            case 'informational':
                return 'Lowest';
            default:
                return 'Medium';
        }
    }

    /**
     * Build labels from error categories, error types, and other metadata
     */
    private buildLabels(alert: any, aiAnalysisData: any): string[] {
        const labels: string[] = ['ai-generated', 'stacklens'];
        const addedLabels = new Set<string>(['ai-generated', 'stacklens']);

        // Add severity as label
        const severity = (aiAnalysisData.severity || alert.severity || '').toLowerCase();
        if (severity && !addedLabels.has(severity)) {
            labels.push(severity);
            addedLabels.add(severity);
        }

        // Add alert category/rule_name
        const categoryValue = alert.category || alert.rule_name || '';
        if (categoryValue && categoryValue !== 'System Alert') {
            const sanitizedCategory = this.sanitizeLabel(categoryValue);
            if (sanitizedCategory && !addedLabels.has(sanitizedCategory)) {
                labels.push(sanitizedCategory);
                addedLabels.add(sanitizedCategory);
            }
        }

        // Add Error Categories from AI analysis
        if (aiAnalysisData.errorCategories && Array.isArray(aiAnalysisData.errorCategories)) {
            for (const cat of aiAnalysisData.errorCategories) {
                if (typeof cat === 'string') {
                    const sanitizedCat = this.sanitizeLabel(cat);
                    if (sanitizedCat && !addedLabels.has(sanitizedCat)) {
                        labels.push(sanitizedCat);
                        addedLabels.add(sanitizedCat);
                    }
                }
            }
        }

        // Add Error Types from AI analysis
        if (aiAnalysisData.errorTypes && Array.isArray(aiAnalysisData.errorTypes)) {
            for (const errType of aiAnalysisData.errorTypes) {
                if (typeof errType === 'string') {
                    const sanitizedType = this.sanitizeLabel(errType);
                    if (sanitizedType && !addedLabels.has(sanitizedType)) {
                        labels.push(sanitizedType);
                        addedLabels.add(sanitizedType);
                    }
                }
            }
        }

        // Add Affected Components as labels
        if (aiAnalysisData.affectedComponents && Array.isArray(aiAnalysisData.affectedComponents)) {
            for (const comp of aiAnalysisData.affectedComponents) {
                if (typeof comp === 'string') {
                    const sanitizedComp = this.sanitizeLabel(comp);
                    if (sanitizedComp && !addedLabels.has(sanitizedComp)) {
                        labels.push(sanitizedComp);
                        addedLabels.add(sanitizedComp);
                    }
                }
            }
        }

        // Limit to 15 labels max (Jira recommendation)
        return labels.slice(0, 15);
    }

    /**
     * Create a new Jira ticket
     */
    async createTicket(alert: any, aiAnalysisRaw: string): Promise<string | null> {
        if (!this.domain) return null;

        try {
            // Support both 'category' and 'rule_name' fields
            const categoryValue = alert.category || alert.rule_name || 'System Alert';
            const severityValue = (alert.severity || 'alert').toUpperCase();
            const messageValue = alert.message || 'Alert triggered';

            // Parse the AI analysis JSON if it's a string
            let aiAnalysisData: any = {};
            try {
                if (typeof aiAnalysisRaw === 'string') {
                    // Clean up markdown code blocks if present
                    const jsonStr = aiAnalysisRaw.replace(/```json\n?|\n?```/g, '').trim();
                    aiAnalysisData = JSON.parse(jsonStr);
                } else if (typeof aiAnalysisRaw === 'object') {
                    aiAnalysisData = aiAnalysisRaw;
                }
            } catch (parseError) {
                console.warn('Failed to parse AI analysis JSON, using raw text');
                aiAnalysisData = { pattern: aiAnalysisRaw };
            }

            // Check for existing ticket first
            const searchSummary = `${severityValue} ${categoryValue} ${messageValue}`.substring(0, 50);
            const existingTicket = await this.findExistingTicket(searchSummary);

            if (existingTicket) {
                console.log(`Existing ticket found: ${existingTicket.key}. Escalating priority.`);
                // Escalate priority based on AI analysis severity
                const escalatedPriority = this.mapSeverityToPriority(alert.severity, aiAnalysisData.severity);
                await this.updateTicketPriority(existingTicket.key, escalatedPriority);
                await this.addComment(existingTicket.key, `Alert re-occurred.\n\nUpdated AI Analysis:\n${JSON.stringify(aiAnalysisData, null, 2)}`);
                return existingTicket.key;
            }

            // Build labels from error categories, types, and components
            const labels = this.buildLabels(alert, aiAnalysisData);

            // Build rich description from AI analysis
            const description = this.buildRichDescription(alert, aiAnalysisData);

            // Map priority from both alert severity and AI analysis severity
            const priority = this.mapSeverityToPriority(alert.severity, aiAnalysisData.severity);

            // Build summary with proper category - include first error type if available
            const primaryErrorType = aiAnalysisData.errorTypes?.[0] || '';
            const ticketSummary = primaryErrorType
                ? `[${severityValue}] ${categoryValue}: ${primaryErrorType}`
                : `[${severityValue}] ${categoryValue}: ${messageValue}`;

            const bodyData = {
                fields: {
                    project: {
                        key: this.projectKey
                    },
                    summary: ticketSummary.substring(0, 255), // Jira summary max length
                    description: description,
                    issuetype: {
                        name: "Task"
                    },
                    priority: {
                        name: priority
                    },
                    labels: labels
                }
            };

            console.log(`Creating Jira ticket with priority: ${priority}, labels: ${labels.join(', ')}`);

            const response = await axios.post(`${this.baseUrl}/issue`, bodyData, {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Created Jira ticket: ${response.data.key}`);
            return response.data.key;

        } catch (error: any) {
            console.error('Error creating Jira ticket:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Update ticket priority
     */
    async updateTicketPriority(ticketKey: string, priorityName: string) {
        try {
            await axios.put(`${this.baseUrl}/issue/${ticketKey}`, {
                fields: {
                    priority: {
                        name: priorityName
                    }
                }
            }, {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error(`Failed to update priority for ${ticketKey}`, error);
        }
    }

    /**
     * Add a comment to a ticket
     */
    async addComment(ticketKey: string, comment: string) {
        try {
            const commentBody = {
                body: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: comment
                                }
                            ]
                        }
                    ]
                }
            };

            await axios.post(`${this.baseUrl}/issue/${ticketKey}/comment`, commentBody, {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error(`Failed to add comment to ${ticketKey}`, error);
        }
    }
}

export const jiraService = new JiraService();
