import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attaches a unique UUID to each request to allow for log correlation.
 */
export const requestIdMiddleware = (req: any, res: Response, next: NextFunction) => {
  const id = req.headers['x-request-id'] || uuidv4();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
};
