// Telemetry is optional - don't crash if it fails
let telemetryStarted = false;
try {
    require('./utils/telemetry'); // Try to load telemetry
    const { startTelemetry } = require('./utils/telemetry');
    startTelemetry();
    telemetryStarted = true;
} catch (error) {
    console.warn('⚠️ OpenTelemetry initialization failed, continuing without telemetry:', error);
}

import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    if (!telemetryStarted) {
        logger.warn('Running without OpenTelemetry - traces will not be exported');
    }
});
