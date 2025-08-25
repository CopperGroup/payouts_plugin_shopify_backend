import { createClient } from 'redis';
import { config } from './env';

// Create a Redis client instance
export const redisClient = createClient({
  url: config.REDIS_URL,
});

// Listen for errors on the client
redisClient.on('error', (err) => console.error('Redis Client Error', err));

// --- IMPORTANT FIX ---
// We must explicitly connect the client.
// The connect() method returns a promise, so we'll wrap this in a function
// and call it when the server starts.
export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log('✅ Successfully connected to Redis.');
    } catch (err) {
      console.error('❌ Failed to connect to Redis:', err);
      // Exit the process if we can't connect to Redis, as it's critical
      process.exit(1);
    }
  }
};