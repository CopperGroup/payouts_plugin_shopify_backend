import { Response } from 'express';
import { Session } from '@shopify/shopify-api';
import { AuthenticatedRequest } from '../middleware/verifyJwt';
import { getRestProducts } from '../services/shopify.service';
import { getMerchantById } from '../services/apiClient.service';
import { decrypt } from '../utils/crypto';

/**
 * Syncs products from a Shopify store to your internal items-service.
 */
export const syncStoreProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const merchantId = req.merchant?.id;
    if (!merchantId) {
      return res.status(401).json({ message: 'Unauthorized: Merchant ID missing from token.' });
    }

    // 1. Fetch the merchant's data from the merchant-kyc service
    const merchant = await getMerchantById(merchantId);
    if (!merchant || !merchant.stores || merchant.stores.length === 0) {
      return res.status(404).json({ message: 'Merchant data not found or no stores connected.' });
    }

    // 2. Find the Shopify store in the merchant's stores array
    // Note: This assumes one Shopify store. For multiple, you might need to pass a shopDomain.
    const store = merchant.stores.find((s: any) => s.type === 'shopify');
    if (!store) {
        return res.status(404).json({ message: 'Shopify store not connected for this merchant.' });
    }

    // 3. Decrypt the access token to use with the Shopify API
    const accessToken = decrypt(store.accessToken);

    // 4. Create a session object required by the REST resources
    const session = new Session({
        id: `offline_${store.shopDomain}`,
        shop: store.shopDomain,
        state: 'never_used',
        isOnline: false,
        accessToken,
    });

    // 5. Fetch products using the authenticated session
    const products = await getRestProducts(session);
    console.log(`Fetched ${products.length} products from ${store.shopDomain}`);

    res.status(200).json({
        message: `Successfully fetched ${products.length} products.`,
        products: products,
    });

  } catch (error: any) {
    console.error('Error syncing products:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};