import { Router } from 'express';
import { 
    initiateAuth, 
    handleCallback,
    loginAndLinkAccount 
} from '../controllers/auth.controller';
import { verifyAuthenticatedSession } from '../middleware/verifyShopify';

const router = Router();

// This route starts the OAuth process. No custom middleware is needed.
router.get('/install', initiateAuth);

// This is the callback URL Shopify redirects to after the merchant approves.
router.get('/callback', handleCallback);

// NEW: This route is called by the frontend after the merchant logs in.
// It's protected by a middleware that verifies the request is coming from
// an authenticated Shopify session.
router.post('/login', verifyAuthenticatedSession, loginAndLinkAccount);

export default router;