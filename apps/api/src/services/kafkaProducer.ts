import { Kafka } from 'kafkajs';

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'stacklens-api',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
        initialRetryTime: 300,
        retries: 8,
        maxRetryTime: 30000,
        multiplier: 2
    }
});

const producer = kafka.producer();

export const connectProducer = async () => {
    let retries = 0;
    const maxRetries = 15;
    const delayMs = 1000;

    while (retries < maxRetries) {
        try {
            await producer.connect();
            console.log('✅ Kafka Producer connected successfully');
            return;
        } catch (error) {
            retries++;
            console.warn(`⚠️ Kafka Producer connection attempt ${retries}/${maxRetries} failed, retrying in ${delayMs}ms...`);
            if (retries >= maxRetries) {
                console.error('❌ Failed to connect to Kafka Producer after maximum retries');
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
};

export const sendToKafka = async (topic: string, messages: any[]) => {
    await producer.send({
        topic,
        messages: messages.map(msg => ({ value: JSON.stringify(msg) }))
    });
};
