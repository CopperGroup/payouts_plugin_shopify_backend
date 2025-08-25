import { Router } from 'express';
import { initiateAuth, handleCallback } from '../controllers/auth.controller';
import { decodeJwtFromQuery } from '../middleware/verifyJwt';

const router = Router();

// The decodeJwtFromQuery middleware will run first to check for a logged-in merchant.
// e.g., GET /api/auth/install?shop=my-shop.myshopify.com&token=MERCHANT_JWT
router.get('/install', decodeJwtFromQuery, initiateAuth);

router.get('/callback', handleCallback);

export default router;