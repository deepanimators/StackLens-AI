import { Request, Response } from 'express';
import { sendToKafka } from '../services/kafkaProducer';
import { v4 as uuidv4 } from 'uuid';

export const ingestLog = async (req: Request, res: Response) => {
    try {
        const logs = Array.isArray(req.body) ? req.body : [req.body];

        // Basic validation and enrichment
        const enrichedLogs = logs.map(log => ({
            ...log,
            ingested_at: new Date().toISOString(),
            request_id: log.request_id || uuidv4(), // Ensure request_id exists
            source: 'http-ingest'
        }));

        await sendToKafka('otel-logs', enrichedLogs);

        res.status(200).json({ status: 'ok', count: enrichedLogs.length });
    } catch (error) {
        console.error('Ingest error:', error);
        res.status(500).json({ error: 'Failed to ingest logs' });
    }
};
