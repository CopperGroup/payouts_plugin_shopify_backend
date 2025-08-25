import '@shopify/shopify-api/adapters/node';
import { shopifyApi, Session, ApiVersion } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2025-04';
import { RedisSessionStorage } from '@shopify/shopify-app-session-storage-redis';
import { config } from '../config/env';
import { Request, Response } from 'express';

// --- Redis session storage ---
export const session_storage = new RedisSessionStorage(config.REDIS_URL);

// --- Debug wrapper for storeSession ---
const origStore = session_storage.storeSession.bind(session_storage);
session_storage.storeSession = async (session: Session) => {
  console.log("📝 Attempting to store session in Redis:", {
    id: session.id,
    shop: session.shop,
    isOnline: session.isOnline,
  });

  const result = await origStore(session);

  console.log("✅ Session stored:", result);
  return result;
};

// --- Shopify API instance ---
export const shopify = shopifyApi({
  apiKey: config.SHOPIFY_API_KEY,
  apiSecretKey: config.SHOPIFY_API_SECRET,
  scopes: config.SHOPIFY_SCOPES.split(','),
  hostName: config.HOST.replace(/https?:\/\//, ''),
  apiVersion: ApiVersion.April25,
  isEmbeddedApp: true,
  restResources,
  sessionStorage: session_storage,
  auth: {
    cookie: {
      sameSite: 'none',
      secure: true,
    },
  },
});

// --- Begin OAuth flow ---
export const beginAuth = async (req: Request, res: Response, shop: string) => {
  const callbackPath = '/api/auth/callback';

  await shopify.auth.begin({
    shop: shop,
    callbackPath: callbackPath,
    isOnline: false,
    rawRequest: req,
    rawResponse: res,
  });
};

// --- Handle OAuth callback ---
export const validateAuthCallback = async (req: Request, res: Response): Promise<Session | Response<void>> => {
  const callback = await shopify.auth.callback({
    rawRequest: req,
    rawResponse: res,
  });

  if (callback.session) {
    console.log("🔑 Callback returned session:", {
      id: callback.session.id,
      shop: callback.session.shop,
      isOnline: callback.session.isOnline,
    });

    const check = await session_storage.loadSession(callback.session.id);
    if (!check) {
      console.error("❌ Session not found in Redis, storing manually...");
      await session_storage.storeSession(callback.session);
    }
  } else {
    console.warn("⚠️ No session returned from callback.");
  }

    // 🔑 This is the missing piece
    const { host, shop } = req.query as { host?: string; shop?: string };
    if (!host || !shop) {
        console.error("❌ Missing host or shop in callback query:", req.query);
        return res.status(400).send("Missing host or shop parameter");
    }

    // 3️⃣ Redirect обратно в embedded Shopify App
    const redirectUrl = `https://${shop}/admin/apps/${config.SHOPIFY_API_KEY}?host=${host}`;
    console.log("➡️ Redirecting back to Shopify Admin:", redirectUrl);
    res.redirect(redirectUrl);

  return callback.session;
};


// --- Example REST call ---
export const getRestProducts = async (session: Session) => {
  const products = await shopify.rest.Product.all({
    session: session,
  });
  console.log('📦 Fetched products:', products.data);
  return products.data;
};

