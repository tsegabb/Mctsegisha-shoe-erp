import { z } from 'zod';
import {
  GENDERS, MOVEMENT_ALIASES, MOVEMENT_TYPES, PAYMENT_ALIASES, PAYMENT_METHODS, ROLES, ROLE_ALIASES, toSnake,
} from '../constants/domain.ts';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rejects malformed ids with a 400 before PostgreSQL can raise 22P02. */
export const uuid = z.string().trim().regex(UUID_RE, 'Must be a valid UUID');
export const idParams = z.object({ params: z.object({ id: uuid }) });

/** Query-string uuid where the UI may send "all" / "all branches" / "" to mean "no filter". */
export const optionalFilterUuid = z.preprocess(
  (v) => (typeof v === 'string' && (v === '' || /^all/i.test(v)) ? undefined : v),
  uuid.optional(),
);
export const optionalFilterText = (max = 100) =>
  z.preprocess((v) => (typeof v === 'string' && (v === '' || v.toLowerCase() === 'all') ? undefined : v), z.string().trim().max(max).optional());

export const text = (max = 255) => z.string().trim().min(1, 'Required').max(max);
export const optionalText = (max = 1000) => z.string().trim().max(max).optional();
export const money = z.number().finite().min(0).max(999_999_999.99);
export const positiveMoney = z.number().finite().positive().max(999_999_999.99);
export const qty = z.number().int().min(1).max(1_000_000);
export const nullableUuid = uuid.nullable().optional();

export const isoDate = z.string().trim().refine((s) => !Number.isNaN(Date.parse(s)), 'Must be an ISO date (YYYY-MM-DD or full ISO timestamp)');
export const sortOrder = z.enum(['asc', 'desc']).optional();

/** Enum field that accepts case/space variants and legacy aliases ("Sales Staff", "incoming", "Telebirr"). */
export function snakeEnum<const T extends readonly [string, ...string[]]>(values: T, aliases: Record<string, string> = {}) {
  return z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    const s = toSnake(v);
    return aliases[s] ?? s;
  }, z.enum(values));
}

export const roleField = snakeEnum(ROLES, ROLE_ALIASES);
export const genderField = snakeEnum(GENDERS);
export const paymentMethodField = snakeEnum(PAYMENT_METHODS, PAYMENT_ALIASES);
export const movementTypeField = snakeEnum(MOVEMENT_TYPES, MOVEMENT_ALIASES);

export const phoneField = z.string().trim().regex(/^\+?[0-9][0-9\s-]{5,18}$/, 'Invalid phone number');
export const passwordField = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be at most 72 characters');
