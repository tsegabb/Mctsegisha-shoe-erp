import { rateLimit } from 'express-rate-limit';

const json = (error: string) => ({ success: false, error, code: 'RATE_LIMITED' });

/** Brute-force protection for the login endpoint (per IP). */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  skipSuccessfulRequests: true, message: json('Too many login attempts. Try again in 15 minutes.'),
});

/** Generous global ceiling for the API (per IP). */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, message: json('Too many requests. Slow down.'),
});
