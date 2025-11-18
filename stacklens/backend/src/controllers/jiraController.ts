import { Request, Response } from 'express';
import { createJiraTicket } from '../services/jira';
import { pool } from '../services/db';

export const createTicket = async (req: Request, res: Response) => {
    const { alertId } = req.params;

    try {
        // Fetch alert details
        const result = await pool.query('SELECT * FROM alerts WHERE id = $1', [alertId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        const alert = result.rows[0];

        // Create Jira ticket
        const ticketKey = await createJiraTicket(alert);

        // Update alert with ticket key
        await pool.query('UPDATE alerts SET jira_issue_key = $1, status = $2 WHERE id = $3', [ticketKey, 'assigned', alertId]);

        res.json({ ticketKey });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
};
