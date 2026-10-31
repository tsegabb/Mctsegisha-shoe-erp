import dotenv from 'dotenv';
dotenv.config({ override: true });
import { z } from 'zod';

const bool = (def: 'true' | 'false') =>
  z.enum(['true', 'false']).default(def).transform((v) => v === 'true');

const timezone = z.string().default('Africa/Addis_Ababa').refine((tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, 'APP_TIMEZONE must be a valid IANA time zone');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DB_SSL_REJECT_UNAUTHORIZED: bool('true'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters (try: openssl rand -hex 48)').default(process.env.JWT_SECRET || 'soleflow_enterprise_production_jwt_signing_key_secure_2026_xyz987'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  CORS_ORIGINS: z.string().default(''), // comma separated; empty = same-origin only in production
  APP_URL: z.string().default('http://localhost:3000'),
  APP_TIMEZONE: timezone,
  DATA_DIR: z.string().default('backend/data'),

  // Secrets for integrations live in the environment, never in JSON files or source code.
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  ADMIN_ALERT_EMAIL: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
