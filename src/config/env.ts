import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  PORT: number;
  HOST: string;
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  SHOPIFY_SCOPES: string;
  JWT_SECRET: string;
  ENCRYPTION_SECRET: string;
  REDIS_URL: string;
  // Services
  MERCHANT_KYC_API_URL: string;
  ITEMS_SERVICE_API_URL: string;
  CHECKOUT_SERVICE_API_URL: string;
}

const getEnvConfig = (): EnvConfig => {
  const requiredEnv = [
    'PORT', 'HOST', 'SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET',
    'SHOPIFY_SCOPES', 'JWT_SECRET', 'ENCRYPTION_SECRET', 'REDIS_URL',
    'MERCHANT_KYC_API_URL', 'ITEMS_SERVICE_API_URL', 'CHECKOUT_SERVICE_API_URL'
  ];

  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  
  if (process.env.ENCRYPTION_SECRET!.length !== 32) {
      throw new Error('ENCRYPTION_SECRET must be exactly 32 characters long.');
  }

  return {
    PORT: parseInt(process.env.PORT!, 10),
    HOST: process.env.HOST!,
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY!,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET!,
    SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES!,
    JWT_SECRET: process.env.JWT_SECRET!,
    ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET!,
    REDIS_URL: process.env.REDIS_URL!,
    // Services
    MERCHANT_KYC_API_URL: process.env.MERCHANT_KYC_API_URL!,
    ITEMS_SERVICE_API_URL: process.env.ITEMS_SERVICE_API_URL!,
    CHECKOUT_SERVICE_API_URL: process.env.CHECKOUT_SERVICE_API_URL!,
  };
};

export const config = getEnvConfig();