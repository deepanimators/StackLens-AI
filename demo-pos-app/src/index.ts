/**
 * Main Express application for POS Demo Service
 * Sets up routes, middleware, error handling
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { logger } from './logger';
import { createProductsRouter } from './routes/products';
import { createOrdersRouter } from './routes/orders';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
    });
  });
  
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    service: 'pos-demo',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use(createProductsRouter());
app.use(createOrdersRouter());

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn('404 Not Found', {
    method: req.method,
    path: req.path,
  });
  
  return res.status(404).json({
    error: 'Endpoint not found',
    error_code: 'NOT_FOUND',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  return res.status(500).json({
    error: 'Internal server error',
    error_code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`POS Demo Service started on port ${PORT}`, {
    env: process.env.NODE_ENV || 'development',
    port: PORT,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
