import { Request, Response, NextFunction } from 'express';

// In a real production app, you would install and import `redis` or `ioredis`.
// import Redis from 'ioredis';
// const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// This is a boilerplate representation of the Redis client for the requested caching layer.
const mockRedisCache = new Map<string, { value: any; expiry: number }>();

export const cacheAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const key = `analytics:${req.originalUrl}`;

  try {
    // 1. Try to fetch from Redis
    /*
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      res.json(JSON.parse(cachedData));
      return;
    }
    */

    // Mock Redis Cache implementation
    const cached = mockRedisCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      res.json(cached.value);
      return;
    }

    // 2. If not in cache, intercept the response to cache it
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Cache for 15 minutes (900 seconds)
      /*
      redisClient.setex(key, 900, JSON.stringify(body)).catch(err => {
        console.error('Redis cache error:', err);
      });
      */

      // Mock Redis Cache save
      mockRedisCache.set(key, { value: body, expiry: Date.now() + 15 * 60 * 1000 });

      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error('Cache middleware error:', error);
    next();
  }
};
