import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer;

export const initWebSocket = (server: Server) => {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws) => {
        console.log('Client connected to WebSocket');
        ws.on('message', (message) => {
            console.log('Received:', message.toString());
        });
    });
};

export const broadcastAlert = (alert: any) => {
    if (!wss) return;
    const message = JSON.stringify({ type: 'alert.created', data: alert });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};
