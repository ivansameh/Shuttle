import { Request } from 'express';

export interface PaginationOptions {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Utility to parse pagination parameters from the request query.
 * Default: page 1, limit 20
 */
export const parsePagination = (req: Request): PaginationOptions => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
  
  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
};

/**
 * Helper to build a paginated response object.
 */
export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  options: PaginationOptions
): PaginatedResult<T> => {
  return {
    success: true,
    data,
    pagination: {
      total,
      page: options.page,
      limit: options.limit,
      pages: Math.ceil(total / options.limit),
    },
  };
};
