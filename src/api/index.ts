import { Router } from 'express';
import authRoutes from './auth.routes';
import storeRoutes from './store.routes';
import webhookRoutes from './webhooks.routes';

const router = Router();

// Mount the different route modules on their respective paths
router.use('/auth', authRoutes);
router.use('/store', storeRoutes);
router.use('/webhooks', webhookRoutes);

export default router;