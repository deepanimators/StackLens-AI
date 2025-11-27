import app from './app';
import { connectProducer } from './services/kafkaProducer';
import { startConsumer } from './services/kafkaConsumer';
import { initDb } from './services/db';
import { initWebSocket } from './services/websocket';


const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        await initDb();
        await connectProducer();
        await startConsumer();
        const server = app.listen(PORT, () => {
            console.log(`StackLens Backend running on port ${PORT}`);
        });
        initWebSocket(server);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
