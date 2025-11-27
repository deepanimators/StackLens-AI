import { Client } from '@elastic/elasticsearch';

const client = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

export const indexLog = async (log: any) => {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    const index = `stacklens-logs-${date}`;

    try {
        await client.index({
            index,
            document: log
        });
    } catch (error) {
        console.error('Failed to index log to ES:', error);
    }
};
