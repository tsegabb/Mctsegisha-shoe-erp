import type { RequestHandler } from 'express';
import { PRIVILEGED_ROLES, type Role } from '../constants/domain.ts';
import { forbidden, unauthorized } from '../errors/AppError.ts';

/** Allows the listed roles. `owner` and `admin` always pass, matching the previous behaviour. */
export const requireRole =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (PRIVILEGED_ROLES.includes(req.user.role) || allowed.includes(req.user.role)) return next();
    next(forbidden('Access denied. Insufficient permissions.'));
  };

/** Strict variant: only the listed roles pass (no owner/admin bypass). Used for destructive operations. */
export const requireExactRole =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (allowed.includes(req.user.role)) return next();
    next(forbidden(`This action is restricted to: ${allowed.join(', ')}`));
  };
