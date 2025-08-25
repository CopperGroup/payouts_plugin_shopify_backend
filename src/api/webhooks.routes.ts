import { Router, Request, Response } from 'express';
import { verifyShopifyWebhook } from '../middleware/verifyShopify';

const router = Router();

// This endpoint receives all webhooks from Shopify
// The verifyShopifyWebhook middleware ensures the request is legitimate
router.post('/', verifyShopifyWebhook, (req: Request, res: Response) => {
    const { 'x-shopify-topic': topic, 'x-shopify-shop-domain': shop } = req.headers;
    
    console.log(`Received webhook topic: ${topic} for shop: ${shop}`);
    console.log('Webhook body:', req.body);

    // Process the webhook here based on the topic
    // For example, if (topic === 'products/update') { ... }

    // Always respond with a 200 OK to acknowledge receipt
    res.status(200).send('Webhook received');
});

export default router;