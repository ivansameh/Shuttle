import Redis from 'ioredis';
import { logger } from './logger';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const createRedisClient = () => new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
  logger.error({ err }, '[Redis] Connection error');
});

redis.on('connect', () => {
  logger.info('[Redis] Connected to server');
});
