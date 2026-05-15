import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

/**
 * Reusable middleware to validate request body against a Zod schema.
 * Returns standardized 400 error with field-level details on failure.
 */
export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and transform the request body
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Map Zod errors to a flattened field -> message structure
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          success: false,
          data: null,
          error: 'Validation failed',
          details,
        });
      }

      next(error);
    }
  };
};
