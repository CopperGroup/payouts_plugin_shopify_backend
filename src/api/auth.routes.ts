import { Router } from 'express';
import { 
    initiateAuth, 
    handleCallback,
    loginAndLinkAccount,
    fixCookieSameSite // <-- Import the new middleware
} from '../controllers/auth.controller';
import { verifyAuthenticatedSession } from '../middleware/verifyShopify';

const router = Router();

// This route starts the OAuth process.
// `initiateAuth` runs, then our `fixCookieSameSite` middleware runs to correct the cookie.
router.get('/install', initiateAuth, fixCookieSameSite);

// This is the callback URL Shopify redirects to after the merchant approves.
router.get('/callback', handleCallback);

// This route is called by the frontend after the merchant logs in.
router.post('/login', verifyAuthenticatedSession, loginAndLinkAccount);

export default router;