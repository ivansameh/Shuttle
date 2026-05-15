import rateLimit from 'express-rate-limit';

/**
 * Tier 1: Auth Endpoints
 * Prevents brute-force attacks on login and registration.
 * Limit: 5 requests per 1 minute per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    data: null,
    error: 'Too many login attempts. Please try again after a minute.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Tier 2: Rider/Driver API
 * General purpose rate limiting for authenticated users.
 * Limit: 60 requests per 1 minute per IP (as a proxy for user).
 */
export const userRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: {
    success: false,
    data: null,
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tier 3: Admin API
 * Higher limit for administrative operations.
 * Limit: 120 requests per 1 minute per IP.
 */
export const adminRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,
  message: {
    success: false,
    data: null,
    error: 'Too many administrative requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
