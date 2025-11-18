import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { indexLog } from './elasticsearch';
import { persistLog } from './db';
import { analyzeLog } from './analyzer';

const kafka = new Kafka({
    clientId: 'stacklens-consumer',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const consumer = kafka.consumer({ groupId: 'stacklens-log-group' });

export const startConsumer = async () => {
    await consumer.connect();
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
    console.log('Kafka Consumer started');
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
