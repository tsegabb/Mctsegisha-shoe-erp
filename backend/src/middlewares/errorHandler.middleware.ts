import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors/AppError.ts';
import { logger } from '../utils/logger.ts';

interface Mapped { status: number; message: string; code: string; details?: unknown }

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

/** Translates driver / library errors into safe, descriptive HTTP errors. Never leaks SQL text. */
function mapError(err: any): Mapped {
  if (err instanceof AppError) return { status: err.status, message: err.message, code: err.code, details: err.details };

  // body-parser
  if (err?.type === 'entity.parse.failed') return { status: 400, message: 'Malformed JSON body', code: 'BAD_JSON' };
  if (err?.type === 'entity.too.large') return { status: 413, message: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' };

  // jsonwebtoken
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return { status: 401, message: 'Invalid or expired token', code: 'UNAUTHORIZED' };
  }

  // PostgreSQL SQLSTATE codes
  switch (err?.code) {
    case '22P02': // invalid_text_representation (e.g. malformed uuid)
    case '22003': // numeric_value_out_of_range
    case '22007': // invalid datetime format
    case '22008':
      return { status: 400, message: 'One or more values have an invalid format', code: 'INVALID_VALUE' };
    case '23502':
      return { status: 400, message: `Field "${camel(err.column ?? 'unknown')}" is required`, code: 'MISSING_FIELD' };
    case '23503': // foreign_key_violation
      return /is still referenced/i.test(err.detail ?? '')
        ? { status: 409, message: 'This record is used by other data (sales, movements or orders) and cannot be deleted. Deactivate it instead.', code: 'IN_USE' }
        : { status: 422, message: 'A referenced record does not exist', code: 'INVALID_REFERENCE' };
    case '23505': { // unique_violation
      const cols = /Key \(([^)]+)\)=/.exec(err.detail ?? '')?.[1]?.replace(/lower\(|\)/g, '').split(',').map((c: string) => camel(c.trim())).join(', ');
      return { status: 409, message: cols ? `A record with this ${cols} already exists` : 'A record with these details already exists', code: 'DUPLICATE' };
    }
    case '23514': // check_violation – adjust_stock() raises this for "Insufficient stock"
      return /insufficient stock/i.test(err.message ?? '') || /quantity/i.test(err.constraint ?? '')
        ? { status: 409, message: 'Insufficient stock', code: 'INSUFFICIENT_STOCK' }
        : { status: 422, message: 'A value violates a data rule', code: 'CONSTRAINT_VIOLATION', details: { constraint: err.constraint } };
    case '40001':
    case '40P01':
      return { status: 503, message: 'The system is busy, please retry', code: 'RETRY' };
    case '57014':
      return { status: 504, message: 'The request took too long', code: 'TIMEOUT' };
    case 'ECONNREFUSED':
    case 'ETIMEDOUT':
    case '57P01':
    case '08006':
    case '08001':
      return { status: 503, message: 'Database temporarily unavailable', code: 'DB_UNAVAILABLE' };
  }
  if (/timeout exceeded when trying to connect|Connection terminated/i.test(err?.message ?? '')) {
    return { status: 503, message: 'Database temporarily unavailable', code: 'DB_UNAVAILABLE' };
  }
  return { status: 500, message: 'Unable to complete the request. Please try again.', code: 'INTERNAL' };
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`, 'ROUTE_NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const m = mapError(err);
  if (m.status >= 500) logger.error(`${req.method} ${req.originalUrl.split('?')[0]} rid=${req.id}`, err);
  res.status(m.status).json({ success: false, error: m.message, code: m.code, ...(m.details ? { details: m.details } : {}), requestId: req.id });
};
