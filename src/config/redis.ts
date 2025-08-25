import { createClient } from 'redis';
import { config } from './env';

export const redisClient = createClient({
  url: config.REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Add a listener for the 'ready' event
redisClient.on('ready', () => console.log('Redis client is ready.'));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log('✅ Successfully connected to Redis.');
    } catch (err) {
      console.error('❌ Failed to connect to Redis:', err);
      process.exit(1);
    }
  }
};