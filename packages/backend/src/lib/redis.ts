import Redis from 'ioredis';
import { logger } from './logger';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let lastErrorTime = 0;
const ERROR_LOG_INTERVAL = 60000; // 1 minute

const logRedisError = (type: string, err: any) => {
  const now = Date.now();
  if (now - lastErrorTime > ERROR_LOG_INTERVAL) {
    logger.error({ err }, `[Redis] ${type} error (silencing for 60s)`);
    lastErrorTime = now;
  }
};

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  // Reduce retry frequency to further reduce noise
  retryStrategy: (times) => Math.min(times * 100, 5000),
});

redis.on('error', (err) => {
  logRedisError('Main', err);
});

redis.on('connect', () => {
  logger.info('[Redis] Connected to server');
  lastErrorTime = 0; // Reset so next error is logged immediately
});

export const createRedisClient = () => {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 100, 5000),
  });
  client.on('error', (err) => {
    logRedisError('Subscriber', err);
  });
  return client;
};
