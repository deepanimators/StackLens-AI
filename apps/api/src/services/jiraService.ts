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
            // JQL to find open tickets with matching summary
            const jql = `project = "${this.projectKey}" AND summary ~ "${summary}" AND statusCategory != Done`;
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
        } catch (error) {
            console.error('Error searching for Jira ticket:', error);
            return null;
        }
    }

    /**
     * Create a new Jira ticket
     */
    async createTicket(alert: any, aiAnalysis: string): Promise<string | null> {
        if (!this.domain) return null;

        try {
            // Check for existing ticket first
            const summary = `[${alert.severity.toUpperCase()}] ${alert.category}: ${alert.message}`;
            const existingTicket = await this.findExistingTicket(summary);

            if (existingTicket) {
                console.log(`Existing ticket found: ${existingTicket.key}. Escalating priority.`);
                await this.updateTicketPriority(existingTicket.key, 'High'); // Escalate to High/Critical
                await this.addComment(existingTicket.key, `Alert re-occurred. AI Analysis:\n${aiAnalysis}`);
                return existingTicket.key;
            }

            // Create new ticket
            const description = {
                type: "doc",
                version: 1,
                content: [
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: `Alert Details:\nSeverity: ${alert.severity}\nCategory: ${alert.category}\nMessage: ${alert.message}\n\n`
                            }
                        ]
                    },
                    {
                        type: "heading",
                        attrs: { level: 2 },
                        content: [{ type: "text", text: "AI Analysis" }]
                    },
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: aiAnalysis || "No analysis provided."
                            }
                        ]
                    }
                ]
            };

            const bodyData = {
                fields: {
                    project: {
                        key: this.projectKey
                    },
                    summary: summary,
                    description: description,
                    issuetype: {
                        name: "Task"
                    },
                    priority: {
                        name: alert.severity === 'critical' ? 'Highest' : 'High'
                    },
                    labels: ["ai-generated", "stacklens", alert.category]
                }
            };

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
