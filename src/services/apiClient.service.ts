import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';

// ... (existing interfaces and createApiClient function) ...
interface CreatePaymentSessionPayload {
  amount: string;
  currency: string;
  merchantId: string;
  customer: {
    name: string;
    metadata: {
      ip: string;
      country: string;
    };
  };
  itemIds: string[];
}

interface CreatePaymentSessionResponse {
  paymentAddress: string;
  memo: string;
  network: string;
  expiresAt: string;
}

interface ShopifyProduct {
  id: string;
  title: string;
  price: string;
  imageUrl?: string;
}

const createApiClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return client;
};

const checkoutServiceClient = createApiClient(process.env.CHECKOUT_SERVICE_API_URL!);
const itemsServiceClient = createApiClient(process.env.ITEMS_SERVICE_API_URL!);
const merchantKycClient = createApiClient(process.env.MERCHANT_KYC_API_URL!);


// ... (existing functions: createPaymentSession, syncProducts, authenticateMerchant, connectShopifyStore) ...
export const createPaymentSession = async (
  payload: CreatePaymentSessionPayload
): Promise<CreatePaymentSessionResponse> => {
  try {
    const response = await checkoutServiceClient.post('/sessions', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating payment session:', error);
    throw new Error('Failed to create payment session.');
  }
};

export const syncProducts = async (merchantId: string, products: ShopifyProduct[]): Promise<void> => {
  try {
    await itemsServiceClient.post(`/sync/${merchantId}`, { products });
  } catch (error) {
    console.error('Error syncing products:', error);
    throw new Error('Failed to sync products.');
  }
};

export const authenticateMerchant = async (authToken: string): Promise<any> => {
  try {
    const response = await merchantKycClient.post('/verify-token', { token: authToken });
    return response.data;
  } catch (error) {
    console.error('Error authenticating merchant:', error);
    throw new Error('Merchant authentication failed.');
  }
};

export const connectShopifyStore = async (merchantId: string, storeData: {
    shopDomain: string;
    accessToken: string;
}): Promise<any> => {
    try {
        const payload = {
            type: 'shopify',
            ...storeData,
        };
        const response = await merchantKycClient.post(`/merchants/${merchantId}/stores`, payload);
        return response.data;
    } catch (error) {
        console.error(`Error connecting store for merchant ${merchantId}:`, error);
        throw new Error('Failed to connect Shopify store.');
    }
};

export const getMerchantById = async (merchantId: string): Promise<any> => {
    try {
        const response = await merchantKycClient.get(`/merchants/${merchantId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching merchant ${merchantId}:`, error);
        throw new Error('Failed to fetch merchant data.');
    }
};

// --- ADDED THIS EXPORTED FUNCTION ---
export const loginMerchant = async (email: string, password: string): Promise<{ merchant: any; token: string } | null> => {
  try {
    const response = await merchantKycClient.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('Error authenticating with merchant service:', error);
    return null;
  }
};