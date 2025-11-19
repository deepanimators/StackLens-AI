import { Router } from 'express';
import * as controllers from '../controllers';

const router = Router();

router.get('/products', controllers.listProducts);
router.post('/products/seed', controllers.seedProduct);
router.post('/order', controllers.createOrder);
router.post('/logs/ingest', controllers.ingestLogs);
router.get('/health', controllers.healthCheck);

// Log trigger endpoints for POS demo
router.post('/info', controllers.logInfo);
router.post('/error', controllers.logError);
router.post('/checkout', controllers.logCheckout);
router.post('/log', controllers.logCustom);

export default router;
