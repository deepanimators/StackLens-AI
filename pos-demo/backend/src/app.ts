import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { createJiraTicket } from './services/jiraService';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(requestLogger);

app.use('/api', routes);

app.post('/admin/create-jira', async (req, res, next) => {
    try {
        const result = await createJiraTicket(req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

app.use(errorHandler);

export default app;
