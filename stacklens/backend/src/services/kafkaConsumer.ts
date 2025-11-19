import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { indexLog } from './elasticsearch';
import { persistLog } from './db';
import { analyzeLog } from './analyzer';

const kafka = new Kafka({
    clientId: 'stacklens-consumer',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9094').split(','),
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
        initialRetryTime: 300,
        retries: 8,
        maxRetryTime: 30000,
        multiplier: 2
    }
});

const consumer = kafka.consumer({ groupId: 'stacklens-log-group' });

export const startConsumer = async () => {
    let retries = 0;
    const maxRetries = 15;
    const delayMs = 1000;

    while (retries < maxRetries) {
        try {
            await consumer.connect();
            console.log('✅ Kafka Consumer connected successfully');
            break;
        } catch (error) {
            retries++;
            console.warn(`⚠️ Kafka Consumer connection attempt ${retries}/${maxRetries} failed, retrying in ${delayMs}ms...`);
            if (retries >= maxRetries) {
                console.error('❌ Failed to connect to Kafka Consumer after maximum retries');
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    await consumer.subscribe({ topic: 'otel-logs', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }: { topic: string, partition: number, message: any }) => {
            if (!message.value) return;

            try {
                const logData = JSON.parse(message.value.toString());
                await processLog(logData);
            } catch (error) {
                console.error('Error processing message:', error);
            }
        },
    });
    console.log('✅ Kafka Consumer started and listening for messages');
};

const processLog = async (log: any) => {
    // 1. Validate Schema (Basic check)
    if (!log.timestamp || !log.service || !log.message) {
        console.warn('Invalid log format, skipping', log);
        return;
    }

    // 2. Enrich
    const enrichedLog = {
        ...log,
        processed_at: new Date().toISOString(),
        geo: { country: 'US' } // Mock enrichment
    };

    // 3. Index to ES
    await indexLog(enrichedLog);

    // 4. Persist to Postgres
    await persistLog(enrichedLog);

    // 5. Analyze & Alert (TODO)
    await analyzeLog(enrichedLog);
};
