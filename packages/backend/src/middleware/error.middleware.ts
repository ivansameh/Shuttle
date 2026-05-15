import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger';

/**
 * Global error handling middleware.
 * Registered as the last middleware in the Express app.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Handle specific error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma error codes: https://www.prisma.io/docs/reference/api-reference/error-reference#error-codes
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        statusCode = 409;
        message = 'A resource with this value already exists.';
        break;
      case 'P2025': // Record not found
        statusCode = 404;
        message = 'Resource not found.';
        break;
      default:
        statusCode = 500;
        message = 'Database operation failed.';
    }
  }

  // Sanitize message in production for unknown errors
  const isProduction = process.env.NODE_ENV === 'production';
  const responseError = (isProduction && statusCode === 500) 
    ? 'An unexpected error occurred. Please contact support.' 
    : message;

  // Log error with structured context
  logger.error({
    msg: `Request failed: ${req.method} ${req.url}`,
    requestId: (req as any).id,
    statusCode,
    error: responseError,
    stack: !isProduction ? err.stack : undefined,
    details,
  });

  res.status(statusCode).json({
    success: false,
    data: null,
    error: responseError,
    ...(details && { details }),
  });
};
