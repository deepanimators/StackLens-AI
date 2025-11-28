import './utils/telemetry'; // Must be first
import { startTelemetry } from './utils/telemetry';
import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for external access

startTelemetry();

app.listen(Number(PORT), HOST, () => {
    logger.info(`Server running on ${HOST}:${PORT}`);
});
