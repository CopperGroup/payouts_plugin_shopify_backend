import { createClient } from 'redis';
import { config } from './env';

// Create a Redis client instance
export const redisClient = createClient({
  url: config.REDIS_URL,
});

// It's still good practice to listen for errors on the client
redisClient.on('error', (err) => console.error('Redis Client Error', err));

// The Shopify RedisSessionStorage adapter will handle the .connect() call itself.