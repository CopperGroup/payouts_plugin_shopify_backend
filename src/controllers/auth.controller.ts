import { Request, Response } from 'express';
import { shopify, beginAuth } from '../services/shopify.service';
import { connectShopifyStore, loginMerchant } from '../services/apiClient.service';
import { config } from '../config/env';
import { Session } from '@shopify/shopify-api';

// --- Type definition for the GraphQL response ---
interface MetafieldMutationResponse {
    data: {
        metafieldsSet: {
            metafields: { id: string; namespace: string; key: string; value: string; }[];
            userErrors: { field: string[]; message: string; }[];
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
    
    // --- ADDED LOGGING ---
    // Let's inspect the headers being sent back to the browser.
    // We expect to see a 'Set-Cookie' header here.
    console.log('Response headers being sent from initiateAuth:', res.getHeaders());

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
    console.log('Received callback with query:', JSON.stringify(req.query, null, 2));

    // The callback function will automatically handle the session storage.
    // It may also handle the redirect internally depending on the library version.
    await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    // --- FIX: Add a check to prevent double execution ---
    // If the library has already sent headers, do not attempt to redirect again.
    if (res.headersSent) {
        console.log('Headers already sent by shopify.auth.callback. Skipping manual redirect.');
        return;
    }

    const host = req.query.host as string;
    if (!host) {
        return res.status(400).send("Missing host parameter");
    }
    const decodedHost = Buffer.from(host, 'base64').toString('utf-8');
    
    res.redirect(`https://${decodedHost}/apps/${config.SHOPIFY_API_KEY}`);

  } catch (error: any) {
    // --- FIX: Add more detailed error logging ---
    console.error('Error during OAuth callback:', error.message);
    if (error.response) {
      console.error('Error response body:', error.response.body);
    }
    if (!res.headersSent) {
      res.status(500).send(error.message);
    }
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

        const response = await client.query<MetafieldMutationResponse>({
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