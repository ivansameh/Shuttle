import pino from 'pino';

/**
 * Structured logger using Pino.
 * In development, it uses pino-pretty for readable output.
 * In production, it outputs raw JSON for log aggregation.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'authorization',
      'req.headers.authorization',
      'user.password',
      'body.password',
    ],
    remove: true,
  },
  transport: process.env.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
