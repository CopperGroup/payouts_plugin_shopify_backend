import { Router } from 'express';
import { syncStoreProducts } from '../controllers/store.controller';
import { verifyJwt } from '../middleware/verifyJwt';

const router = Router();

// A protected route to trigger a product sync for the authenticated merchant
// The verifyJwt middleware runs first to validate the token
router.post('/sync', verifyJwt, syncStoreProducts);

export default router;