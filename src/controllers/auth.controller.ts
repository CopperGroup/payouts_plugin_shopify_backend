import { Response } from 'express';
import { shopify, beginAuth, validateAuthCallback } from '../services/shopify.service';
import { connectShopifyStore } from '../services/apiClient.service';
import { AuthenticatedRequest } from '../middleware/verifyJwt';
import { redisClient } from '../config/redis';
import { config } from '../config/env';
import { Session } from '@shopify/shopify-api';

/**
 * Initiates the OAuth installation process.
 * If a merchant JWT is provided, their ID is stored in Redis to be linked later.
 */
export const initiateAuth = async (req: AuthenticatedRequest, res: Response) => {
  const shop = req.query.shop as string;
  if (!shop) {
    return res.status(400).send("Bad Request: Missing 'shop' query parameter.");
  }

  const merchantId = req.merchant?.id;

  try {
    // The shopify.auth.begin function handles the entire redirection.
    // We don't need to call res.redirect() ourselves.
    // We also don't need to manually handle the session ID here.
    // The library will create a temporary session in Redis.
    await beginAuth(req, res, shop);

    // After beginAuth, we can find the temporary session ID created by the library
    // and associate our internal merchant ID with it.
    const sessionId = await shopify.session.getOfflineId(shop);
    
    if (merchantId && sessionId) {
        // Store the merchant ID against the Shopify session ID in Redis
        await redisClient.set(`merchant_id_for_${sessionId}`, merchantId, { EX: 300 });
        console.log(`Stored merchant ID ${merchantId} for session ${sessionId}`);
    }

  } catch (error: any) {
    console.error('Error initiating authentication:', error.message);
    // Avoid sending another response if headers are already sent
    if (!res.headersSent) {
        res.status(500).send(error.message);
    }
  }
};

/**
 * Handles the callback from Shopify after the merchant authorizes the app.
 */
export const handleCallback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const callback = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
    });

    const { session } = callback;
    const { shop, accessToken } = session;

    if (!accessToken) {
        return res.status(400).send("Could not retrieve access token.");
    }

    const merchantIdKey = `merchant_id_for_${session.id}`;
    const merchantId = await redisClient.get(merchantIdKey);

    if (merchantId) {
        console.log(`Found merchant ID ${merchantId}. Connecting store...`);
        await connectShopifyStore(merchantId, {
            shopDomain: shop,
            accessToken: accessToken,
        });
        await redisClient.del(merchantIdKey);

        // --- ADD METADATA LOGIC ---
        // After connecting, create the metafield to store our internal merchant ID
        await createMerchantIdMetafield(session, merchantId);
        // --- END METADATA LOGIC ---

    } else {
        console.warn(`No merchant ID found for session ${session.id}.`);
    }

    const shopName = shop.split('.')[0];
    res.redirect(`https://admin.shopify.com/store/${shopName}/apps/${config.SHOPIFY_API_KEY}`);

  } catch (error: any) {
    console.error('Error during OAuth callback:', error.message);
    res.status(500).send(error.message);
  }
};

// --- NEW HELPER FUNCTION ---
async function createMerchantIdMetafield(session: Session, merchantId: string) {
    const client = new shopify.clients.Graphql({ session });
    
    // The namespace and key create a unique identifier for our metafield
    const METAFIELD_NAMESPACE = "crypto_payments_app";
    const METAFIELD_KEY = "merchant_id";

    try {
        await client.query({
            data: {
                query: `mutation CreateShopMetafield($metafields: [MetafieldsSetInput!]!) {
                    metafieldsSet(metafields: $metafields) {
                        metafields {
                            id
                            namespace
                            key
                            value
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }`,
                variables: {
                    metafields: [
                        {
                            ownerId: `gid://shopify/Shop/${session.shop}`,
                            namespace: METAFIELD_NAMESPACE,
                            key: METAFIELD_KEY,
                            type: "single_line_text_field",
                            value: merchantId,
                        },
                    ],
                },
            },
        });
        console.log(`Successfully created metafield for merchant ID: ${merchantId}`);
    } catch (error) {
        console.error("Failed to create shop metafield:", error);
    }
}

export const beginTopLevelAuth = (req: any, res: Response) => {
  const shop = req.query.shop;
  res.send(`
    <script>
      window.top.location.href = "/api/auth/begin?shop=${shop}";
    </script>
  `);
};