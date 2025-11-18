import { persistAlert } from './db';
import { broadcastAlert } from './websocket';

interface Rule {
    id: string;
    condition: (log: any) => boolean;
    severity: 'critical' | 'high' | 'medium' | 'low';
    suggestedFix: string;
}

const rules: Rule[] = [
    {
        id: 'PRICE_MISSING',
        condition: (log) => log.error_code === 'PRICE_MISSING',
        severity: 'high',
        suggestedFix: 'Check product catalog configuration and ensure price is set.'
    },
    {
        id: 'INVENTORY_UNAVAILABLE',
        condition: (log) => log.error_code === 'INVENTORY_UNAVAILABLE',
        severity: 'medium',
        suggestedFix: 'Restock inventory or check inventory sync service.'
    },
    {
        id: 'DB_CONNECTION_ERROR',
        condition: (log) => log.message?.includes('Connection refused') || log.error_code === 'DB_CONNECTION_ERROR',
        severity: 'critical',
        suggestedFix: 'Check database connectivity and credentials.'
    }
];

export const analyzeLog = async (log: any) => {
    for (const rule of rules) {
        if (rule.condition(log)) {
            const alert = {
                issue_code: rule.id,
                severity: rule.severity,
                suggested_fix: rule.suggestedFix,
                log_summary: log.message,
                service: log.service,
                timestamp: new Date().toISOString()
            };

            console.log(`Alert triggered: ${rule.id}`);

            // Persist alert
            const alertId = await persistAlert(alert);

            // Broadcast via WebSocket
            broadcastAlert({ ...alert, id: alertId });
        }
    }
};
