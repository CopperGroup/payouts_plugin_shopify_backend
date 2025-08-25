import { Request, Response, NextFunction } from 'express';
import { shopify } from '../services/shopify.service';
import { config } from '../config/env';
import crypto from 'crypto';

/**
 * Middleware to verify that a request is coming from an authenticated
 * session within the Shopify Admin.
 * UPDATED: This version is compatible with older @shopify/shopify-api libraries.
 */
export const verifyAuthenticatedSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new Error('No authorization header found.');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = await shopify.session.decodeSessionToken(token);
    const shop = payload.dest.replace('https://', '');
    
    // The library needs an offline session ID format to look up in storage
    const sessionId = shopify.session.getOfflineId(shop);
    const session = await shopify.config.sessionStorage.loadSession(sessionId);

    if (!session) {
      throw new Error('No session found for the given shop.');
    }

    // Make the session available to the next handlers
    res.locals.shopify = {
        ...res.locals.shopify,
        session: session,
    };
    
    return next();
  } catch (error: any) {
    console.error('Failed to verify authenticated session:', error.message);
    return res.status(401).send('Unauthorized');
  }
};

/**
 * A middleware specifically for verifying incoming webhooks from Shopify.
 * It uses the shopify-api library's built-in validation.
 */
export const verifyShopifyWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await shopify.webhooks.validate({
            rawBody: req.body, // The raw body is needed for validation
            rawRequest: req,
            rawResponse: res,
        });
        next();
    } catch (error: any) {
        console.error('Webhook validation failed:', error.message);
        res.status(401).send('Could not validate webhook');
    }
}

/**
 * Verifies the HMAC signature on incoming requests from Shopify.
 */
export const verifyShopifyHmac = (req: Request, res: Response, next: NextFunction) => {
  try {
    const hmac = req.query.hmac as string;
    if (!hmac) {
      return res.status(400).send('Bad Request: Missing HMAC parameter.');
    }
    const queryWithoutHmac = { ...req.query };
    delete queryWithoutHmac.hmac;
    const queryString = new URLSearchParams(queryWithoutHmac as any).toString();
    const generatedHash = crypto
      .createHmac('sha265', config.SHOPIFY_API_SECRET)
      .update(queryString)
      .digest('hex');

    if (generatedHash === hmac) {
      next();
    } else {
      return res.status(403).send('Forbidden: HMAC validation failed.');
    }
  } catch (error) {
    console.error('Error during HMAC validation:', error);
    return res.status(500).send('Internal Server Error');
  }
};