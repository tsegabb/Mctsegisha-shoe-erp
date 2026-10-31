import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { badRequest } from '../errors/AppError.ts';

/**
 * Validates { body, query, params } against a Zod schema before any controller or DB code runs.
 * Unknown keys are stripped (no mass-assignment); numbers/dates are coerced where the schema says so.
 * The parsed result is exposed as `req.valid`.
 */
export const validate =
  (schema: ZodType): RequestHandler =>
  async (req, _res, next) => {
    const result = await schema.safeParseAsync({ body: req.body ?? {}, query: req.query, params: req.params });
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.filter((p) => p !== 'body' && p !== 'query' && p !== 'params').join('.') || undefined,
        in: i.path[0],
        message: i.message,
      }));
      const summary = details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join('; ');
      return next(badRequest(`Validation failed: ${summary}`, details));
    }
    req.valid = result.data as any;
    next();
  };
