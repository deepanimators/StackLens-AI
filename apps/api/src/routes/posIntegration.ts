import { Router } from 'express';
import { sendToKafka } from '../services/kafkaProducer.js';
import { v4 as uuidv4 } from 'uuid';

const posRouter = Router();

interface POSConnection {
    id: string;
    name: string;
    endpoint: string;
    apiKey: string;
    syncInterval: string;
    errorTracking: boolean;
    performanceMonitoring: boolean;
    customEvents: boolean;
    isActive: boolean;
    lastSync: Date;
    createdAt: Date;
}

// In-memory storage (in production, use database)
const posConnections: Map<string, POSConnection> = new Map();

// Initialize with demo connection
posConnections.set('demo-pos', {
    id: 'demo-pos',
    name: 'POS Demo - Production Ready',
    endpoint: 'http://localhost:3000',
    apiKey: 'demo-key',
    syncInterval: 'realtime',
    errorTracking: true,
    performanceMonitoring: true,
    customEvents: true,
    isActive: true,
    lastSync: new Date(),
    createdAt: new Date(),
});

/**
 * GET /api/pos-integration/connections
 * Retrieve all POS connections
 */
posRouter.get('/connections', (req, res) => {
    const connections = Array.from(posConnections.values()).map(conn => ({
        ...conn,
        apiKey: conn.apiKey.replace(/.(?=.{0,}$)/g, '*'), // Mask API key
    }));
    res.json(connections);
});

/**
 * POST /api/pos-integration/connections
 * Create a new POS connection
 */
posRouter.post('/connections', async (req, res) => {
    try {
        const { name, endpoint, apiKey, syncInterval, errorTracking, performanceMonitoring, customEvents } = req.body;

        if (!name || !endpoint || !apiKey) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const connectionId = uuidv4();
        const connection: POSConnection = {
            id: connectionId,
            name,
            endpoint,
            apiKey,
            syncInterval: syncInterval || 'realtime',
            errorTracking: errorTracking !== false,
            performanceMonitoring: performanceMonitoring !== false,
            customEvents: customEvents !== false,
            isActive: true,
            lastSync: new Date(),
            createdAt: new Date(),
        };

        posConnections.set(connectionId, connection);

        // Log the connection event
        await sendToKafka('otel-logs', [
            {
                service: 'stacklens-admin',
                level: 'INFO',
                message: `POS Connection Created: ${name}`,
                timestamp: new Date().toISOString(),
                context: {
                    connectionId,
                    endpoint,
                    syncInterval,
                },
            },
        ]);

        res.status(201).json({
            ...connection,
            apiKey: connection.apiKey.replace(/.(?=.{0,}$)/g, '*'),
        });
    } catch (error) {
        console.error('Error creating POS connection:', error);
        res.status(500).json({ error: 'Failed to create connection' });
    }
});

/**
 * PUT /api/pos-integration/connections/:id
 * Update a POS connection
 */
posRouter.put('/connections/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const connection = posConnections.get(id);

        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        const { name, endpoint, syncInterval, errorTracking, performanceMonitoring, customEvents, isActive } = req.body;

        const updated: POSConnection = {
            ...connection,
            name: name || connection.name,
            endpoint: endpoint || connection.endpoint,
            syncInterval: syncInterval || connection.syncInterval,
            errorTracking: errorTracking !== undefined ? errorTracking : connection.errorTracking,
            performanceMonitoring: performanceMonitoring !== undefined ? performanceMonitoring : connection.performanceMonitoring,
            customEvents: customEvents !== undefined ? customEvents : connection.customEvents,
            isActive: isActive !== undefined ? isActive : connection.isActive,
        };

        posConnections.set(id, updated);

        res.json({
            ...updated,
            apiKey: updated.apiKey.replace(/.(?=.{0,}$)/g, '*'),
        });
    } catch (error) {
        console.error('Error updating POS connection:', error);
        res.status(500).json({ error: 'Failed to update connection' });
    }
});

/**
 * DELETE /api/pos-integration/connections/:id
 * Delete a POS connection
 */
posRouter.delete('/connections/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const connection = posConnections.get(id);

        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        posConnections.delete(id);

        // Log the disconnection event
        await sendToKafka('otel-logs', [
            {
                service: 'stacklens-admin',
                level: 'INFO',
                message: `POS Connection Disconnected: ${connection.name}`,
                timestamp: new Date().toISOString(),
                context: {
                    connectionId: id,
                },
            },
        ]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting POS connection:', error);
        res.status(500).json({ error: 'Failed to delete connection' });
    }
});

/**
 * POST /api/pos-integration/sync
 * Manually trigger sync for a POS connection
 */
posRouter.post('/sync/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const connection = posConnections.get(id);

        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        if (!connection.isActive) {
            return res.status(400).json({ error: 'Connection is not active' });
        }

        // Update last sync time
        connection.lastSync = new Date();

        // Send sync event to Kafka
        await sendToKafka('otel-logs', [
            {
                service: 'stacklens-pos-integration',
                level: 'INFO',
                message: `POS Sync Started: ${connection.name}`,
                timestamp: new Date().toISOString(),
                context: {
                    connectionId: id,
                    endpoint: connection.endpoint,
                    syncInterval: connection.syncInterval,
                },
            },
        ]);

        res.json({
            success: true,
            message: `Sync initiated for ${connection.name}`,
            lastSync: connection.lastSync,
        });
    } catch (error) {
        console.error('Error syncing POS connection:', error);
        res.status(500).json({ error: 'Failed to sync' });
    }
});

/**
 * GET /api/pos-integration/health
 * Check health of all POS connections
 */
posRouter.get('/health', (req, res) => {
    const connections = Array.from(posConnections.values());
    const health = connections.map(conn => ({
        id: conn.id,
        name: conn.name,
        status: conn.isActive ? 'connected' : 'disconnected',
        lastSync: conn.lastSync,
        endpoint: conn.endpoint,
    }));

    res.json({
        totalConnections: connections.length,
        activeConnections: connections.filter(c => c.isActive).length,
        connections: health,
    });
});

export default posRouter;
