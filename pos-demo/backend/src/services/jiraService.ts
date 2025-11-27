import { logger } from '../utils/logger';

export const createJiraTicket = async (alertPayload: any) => {
    // Mock Jira creation
    logger.info('Creating Jira ticket', { alert: alertPayload });

    // In a real app, we'd call Jira API here.
    // For demo/CI, we just return a mock ID.

    return {
        key: `PROJ-${Math.floor(Math.random() * 1000)}`,
        self: 'https://jira.example.com/rest/api/2/issue/10000'
    };
};
