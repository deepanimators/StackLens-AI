import { Kafka } from 'kafkajs';

const kafka = new Kafka({
    clientId: 'stacklens-api',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const producer = kafka.producer();

export const connectProducer = async () => {
    await producer.connect();
    console.log('Kafka Producer connected');
};

export const sendToKafka = async (topic: string, messages: any[]) => {
    await producer.send({
        topic,
        messages: messages.map(msg => ({ value: JSON.stringify(msg) }))
    });
};
