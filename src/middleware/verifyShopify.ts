import { Request, Response, NextFunction } from 'express';
import { shopify } from '../services/shopify.service';
import { config } from '../config/env';
import crypto from 'crypto';

/**
 * Validates the HMAC signature on incoming requests from Shopify.
 * This is crucial for ensuring that the request is authentic and hasn't been tampered with.
 * See: https://shopify.dev/docs/apps/auth/oauth/getting-started#step-5-verify-the-hmac
 */
export const verifyShopifyHmac = (req: Request, res: Response, next: NextFunction) => {
  try {
    const hmac = req.query.hmac as string;
    if (!hmac) {
      return res.status(400).send('Bad Request: Missing HMAC parameter.');
    }

    // Clone the query object and remove the hmac parameter
    const queryWithoutHmac = { ...req.query };
    delete queryWithoutHmac.hmac;

    // Create the query string to validate
    const queryString = new URLSearchParams(queryWithoutHmac as any).toString();

    // Generate the hash
    const generatedHash = crypto
      .createHmac('sha256', config.SHOPIFY_API_SECRET)
      .update(queryString)
      .digest('hex');

    if (generatedHash === hmac) {
      // HMAC is valid, proceed to the next middleware/controller
      next();
    } else {
      // HMAC is invalid, reject the request
      return res.status(403).send('Forbidden: HMAC validation failed.');
    }
  } catch (error) {
    console.error('Error during HMAC validation:', error);
    return res.status(500).send('Internal Server Error');
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