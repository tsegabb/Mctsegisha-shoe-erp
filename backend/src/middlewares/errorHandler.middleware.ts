import { Request, Response, NextFunction } from 'express';
import { apiResponse } from '../utils/apiResponse.ts';
import { logger } from '../utils/logger.ts';

export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error(`Error in route ${req.method} ${req.path}:`, err);
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Unable to complete the request. Please try again.';
  
  return apiResponse.error(res, message, status);
}

