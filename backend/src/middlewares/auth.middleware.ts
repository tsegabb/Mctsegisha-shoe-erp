import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { unauthorized } from '../errors/AppError.ts';
import { env } from '../config/env.ts';
import { authService } from '../services/auth.service.ts';
import { UUID_RE } from '../validators/common.validator.ts';

export const JWT_ISSUER = 'soleflow-api';
export const JWT_AUDIENCE = 'soleflow-app';

/**
 * Verifies the Bearer JWT, then re-loads the user from the database on every request so that
 * deactivating a user or changing their role/branch takes effect immediately (no stale claims).
 */
export const authMiddleware = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !/^Bearer\s+/i.test(header)) throw unauthorized();

  let sub: string;
  try {
    const payload = jwt.verify(header.replace(/^Bearer\s+/i, '').trim(), env.JWT_SECRET, {
      algorithms: ['HS256'], // pin the algorithm – never accept "none" or asymmetric confusion
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || !UUID_RE.test(payload.sub)) throw new Error('bad claims');
    sub = payload.sub;
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  const user = await authService.findSessionUser(sub);
  if (!user || !user.isActive) throw unauthorized('Session is no longer valid');
  req.user = user;
  next();
});
