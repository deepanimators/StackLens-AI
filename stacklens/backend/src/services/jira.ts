import axios from 'axios';

export const createJiraTicket = async (alert: any) => {
    const jiraUrl = process.env.JIRA_URL || 'https://your-domain.atlassian.net';
    const jiraUser = process.env.JIRA_USER || 'user@example.com';
    const jiraToken = process.env.JIRA_API_TOKEN;

    if (!jiraToken) {
        console.log('Mocking Jira ticket creation (no token provided)');
        return `MOCK-${Math.floor(Math.random() * 1000)}`;
    }

    try {
        const response = await axios.post(
            `${jiraUrl}/rest/api/3/issue`,
            {
                fields: {
                    project: {
                        key: 'PROJ'
                    },
                    summary: `[StackLens] ${alert.issue_code}: ${alert.service}`,
                    description: {
                        type: 'doc',
                        version: 1,
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: `Alert ID: ${alert.id}\nSeverity: ${alert.severity}\nSuggested Fix: ${alert.suggested_fix}\n\nLog: ${alert.log_summary}`
                                    }
                                ]
                            }
                        ]
                    },
                    issuetype: {
                        name: 'Bug'
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${jiraUser}:${jiraToken}`).toString('base64')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.key;
    } catch (error) {
        console.error('Failed to create Jira ticket:', error);
        throw new Error('Jira creation failed');
    }
};
