import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

/**
 * Cache Middleware — Task 2.3
 * 
 * Implements a Redis-backed caching layer for expensive analytics queries.
 * This prevents the backend from hammering PostgreSQL for high-traffic dashboards.
 * 
 * TTL: 15 minutes (900 seconds)
 */
export const cacheAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const key = `cache:analytics:${req.originalUrl}`;

  // If Redis is not connected, skip caching and go straight to DB
  if (redis.status !== 'ready') {
    return next();
  }

  try {
    // 1. Try to fetch from Redis
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      // Cache HIT: return immediately
      res.json(JSON.parse(cachedData));
      return;
    }

    // 2. Cache MISS: Intercept res.json to capture the response body
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      // Only cache successful responses if Redis is still ready
      if (res.statusCode >= 200 && res.statusCode < 300 && body.success && redis.status === 'ready') {
        // Cache for 15 minutes (900 seconds)
        redis.setex(key, 900, JSON.stringify(body)).catch(err => {
          logger.error({ err }, '[Redis] Cache store failure');
        });
      }
      
      return originalJson(body);
    };

    next();
  } catch (error) {
    logger.error({ err: error }, '[Cache] Middleware failure');
    // On cache failure, proceed to the controller as a fallback
    next();
  }
};
