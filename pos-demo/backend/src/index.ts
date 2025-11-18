import './utils/telemetry'; // Must be first
import { startTelemetry } from './utils/telemetry';
import app from './app';
import { logger } from '../utils/logger';

const PORT = process.env.PORT || 3000;

startTelemetry();

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
