import { Router } from 'express';
import * as controllers from '../controllers';

const router = Router();

router.get('/products', controllers.listProducts);
router.post('/products/seed', controllers.seedProduct);
router.post('/order', controllers.createOrder);
router.post('/logs/ingest', controllers.ingestLogs);
router.get('/health', controllers.healthCheck);

export default router;
