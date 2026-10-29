import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodObject } from 'zod';
import { apiResponse } from '../utils/apiResponse.ts';

export function validate(schema: ZodObject<any, any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(issue => ({
          field: issue.path.join('.').replace(/^(body|query|params)\./, ''),
          message: issue.message
        }));
        return apiResponse.error(res, `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`, 400);
      }
      return next(error);
    }
  };
}
