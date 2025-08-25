import { Request, Response } from 'express';
import { shopify, beginAuth } from '../services/shopify.service';
import { connectShopifyStore, loginMerchant } from '../services/apiClient.service';
import { config } from '../config/env';
import { Session } from '@shopify/shopify-api';

// --- NEW: Define the shape of the GraphQL response ---
interface MetafieldMutationResponse {
    data: {
        metafieldsSet: {
            metafields: {
                id: string;
                namespace: string;
                key: string;
                value: string;
            }[];
            userErrors: {
                field: string[];
                message: string;
            }[];
        };
    };
}


/**
 * Initiates the OAuth installation process.
 */
export const initiateAuth = async (req: Request, res: Response) => {
  const shop = req.query.shop as string;
  if (!shop) {
    return res.status(400).send("Bad Request: Missing 'shop' query parameter.");
  }

  try {
    await beginAuth(req, res, shop);
  } catch (error: any) {
    console.error('Error initiating authentication:', error.message);
    if (!res.headersSent) {
      res.status(500).send(error.message);
    }
  }
};

/**
 * Handles the callback from Shopify after the merchant authorizes the app.
 */
export const handleCallback = async (req: Request, res: Response) => {
  try {
    await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const host = shopify.utils.sanitizeHost(req.query.host as string);
    if (!host) {
        return res.status(400).send("Missing host parameter");
    }
    
    res.redirect(`https://${host}/apps/${config.SHOPIFY_API_KEY}`);

  } catch (error: any) {
    console.error('Error during OAuth callback:', error.message);
    res.status(500).send(error.message);
  }
};


/**
 * Handles login from the frontend, links the merchant account,
 * and creates the necessary metafield.
 */
export const loginAndLinkAccount = async (req: Request, res: Response) => {
    try {
        const session = res.locals.shopify.session;
        if (!session) {
            return res.status(401).send('Unauthorized: No active Shopify session.');
        }

        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send('Bad Request: Email and password are required.');
        }

        const authResult = await loginMerchant(email, password);
        if (!authResult) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const { token, merchant } = authResult;
        const merchantId = merchant._id;

        console.log(`Linking merchant ${merchantId} to shop ${session.shop}...`);
        await connectShopifyStore(merchantId, {
            shopDomain: session.shop,
            accessToken: session.accessToken!,
        });

        await createMerchantIdMetafield(session, merchantId);

        res.status(200).json({ token, merchant });

    } catch (error: any) {
        console.error('Error during merchant login and linking:', error.message);
        if (error.response && error.response.status === 401) {
             return res.status(401).json({ message: 'Invalid credentials.' });
        }
        res.status(500).send('An internal error occurred.');
    }
};


/**
 * Helper function to create the merchant ID metafield on the Shopify store.
 */
async function createMerchantIdMetafield(session: Session, merchantId: string) {
    const client = new shopify.clients.Graphql({ session });
    
    const METAFIELD_NAMESPACE = "crypto_payments_app";
    const METAFIELD_KEY = "merchant_id";

    try {
        const shopData = await shopify.rest.Shop.all({ session });
        const shopId = shopData.data[0].id;
        const ownerGid = `gid://shopify/Shop/${shopId}`;

        const response = await client.query<MetafieldMutationResponse>({ // <-- Tell TypeScript the type here
            data: {
                query: `mutation CreateShopMetafield($metafields: [MetafieldsSetInput!]!) {
                    metafieldsSet(metafields: $metafields) {
                        metafields { id namespace key value }
                        userErrors { field message }
                    }
                }`,
                variables: {
                    metafields: [
                        {
                            ownerId: ownerGid,
                            namespace: METAFIELD_NAMESPACE,
                            key: METAFIELD_KEY,
                            type: "single_line_text_field",
                            value: merchantId,
                        },
                    ],
                },
            },
        });

        // --- FIX: Now TypeScript knows the exact shape of response.body ---
        const userErrors = response.body?.data?.metafieldsSet?.userErrors;
        if (userErrors && userErrors.length > 0) {
            console.error("Error creating metafield:", userErrors);
            throw new Error(userErrors.map((e:any) => e.message).join(', '));
        }

        console.log(`Successfully created metafield for merchant ID: ${merchantId}`);
    } catch (error) {
        console.error("Failed to create shop metafield:", error);
    }
}