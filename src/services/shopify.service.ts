import '@shopify/shopify-api/adapters/node';
import { shopifyApi, Session, ApiVersion } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2025-04';
import { RedisSessionStorage } from '@shopify/shopify-app-session-storage-redis';
import { config } from '../config/env';
import { redisClient } from '../config/redis';
import { Request, Response } from 'express';

const session_storage = new RedisSessionStorage(redisClient);

export const shopify = shopifyApi({
  apiKey: config.SHOPIFY_API_KEY,
  apiSecretKey: config.SHOPIFY_API_SECRET,
  scopes: config.SHOPIFY_SCOPES.split(','),
  hostName: config.HOST.replace(/https?:\/\//, ''),
  apiVersion: ApiVersion.April25,
  isEmbeddedApp: true,
  restResources,
  sessionStorage: session_storage,
  
  // --- IMPORTANT FIX ---
  // This section explicitly configures the OAuth cookie to work in an
  // embedded context. Modern browsers require 'SameSite: none' and 'Secure'
  // for cookies set by an iframe.
  auth: {
    cookie: {
      sameSite: 'none',
      secure: true,
    },
  },
  // The 'future' flag is not needed and has been removed.
});

// ... (the rest of the file remains the same)
export const beginAuth = async (req: Request, res: Response, shop: string) => {
  const callbackPath = '/api/auth/callback';
  
  console.log(callbackPath)
  await shopify.auth.begin({
    shop: shop,
    callbackPath: callbackPath,
    isOnline: false,
    rawRequest: req,
    rawResponse: res,
  });
};

export const validateAuthCallback = async (req: Request, res: Response): Promise<Session> => {
  const callback = await shopify.auth.callback({
    rawRequest: req,
    rawResponse: res,
  });

  return callback.session;
};

export const getRestProducts = async (session: Session) => {
    const products = await shopify.rest.Product.all({
        session: session,
    });
    console.log('Fetched products:', products.data);
    return products.data;
};