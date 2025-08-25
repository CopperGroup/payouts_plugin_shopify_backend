import { Router } from 'express';
import { initiateAuth, handleCallback, beginTopLevelAuth } from '../controllers/auth.controller';
import { decodeJwtFromQuery } from '../middleware/verifyJwt';

const router = Router();

// Step 1: Start install/auth request
router.get('/install', decodeJwtFromQuery, (req, res) => {
  const shop = req.query.shop as string;

  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }

  // Redirect merchant out of iframe → to top-level page
  return res.redirect(`/api/auth/toplevel?shop=${shop}`);
});

// Step 2: Top-level redirect page (sets cookies properly)
router.get('/toplevel', beginTopLevelAuth);

// Step 3: Actual OAuth begin (runs shopify.auth.begin)
router.get('/begin', initiateAuth);

// Step 4: Shopify OAuth callback
router.get('/callback', handleCallback);

export default router;
