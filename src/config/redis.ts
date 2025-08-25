import { createClient } from 'redis';
import { config } from './env';

// We create the client for potential other uses, but the Shopify library will not use this instance.
export const redisClient = createClient({
  url: config.REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// We no longer need the connectRedis function.

export const logRedisContent = async () => {
    const client = createClient({ url: config.REDIS_URL });
    await client.connect();
  
    const keys = await client.keys('*');
    console.log('🗝️ All Redis keys:', keys);
  
    for (const key of keys) {
      const value = await client.get(key);
      console.log(`➡️ ${key}:`, value);
    }
  
    await client.disconnect();
  };