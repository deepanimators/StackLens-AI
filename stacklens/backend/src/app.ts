import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ingestLog } from './controllers/ingestController';
import { createTicket } from './controllers/jiraController';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Allow larger payloads for batch logs

app.post('/api/ingest/log', ingestLog);
app.post('/admin/alerts/:alertId/create-jira', createTicket);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'stacklens-backend' });
});

export default app;
