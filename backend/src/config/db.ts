import pg from 'pg';
import { env } from './env.ts';
import { logger } from '../utils/logger.ts';

// COUNT(*) etc. come back as int8 (string by default). Our counts are far below 2^53.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(env.DATABASE_URL);

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Client-side timeout. (Server-side `options=-c statement_timeout` is rejected by Neon's pooler.)
  query_timeout: 20_000,
  ssl: isLocal ? false : { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED },
});

pool.on('error', (err) => logger.error('Unexpected idle PostgreSQL client error', err));

export type Queryable = Pick<pg.Pool | pg.PoolClient, 'query'>;
export type Tx = pg.PoolClient;

/** Parameterised query helper. Always pass user input through `params`, never in `text`. */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
  db: Queryable = pool,
): Promise<pg.QueryResult<T>> {
  return db.query<T>(text, params as any[]);
}

const RETRYABLE = new Set(['40001', '40P01']); // serialization failure, deadlock

/** Runs `fn` inside BEGIN/COMMIT. Rolls back on any error and retries deadlocks up to 3 times. */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err: any) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* connection is already broken – the original error is what matters */
      }
      if (RETRYABLE.has(err?.code) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 25 * attempt));
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}

export async function pingDb(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/** Fail fast if the app is pointed at a database that does not have the v2 objects it relies on. */
export async function assertSchemaReady(): Promise<void> {
  const { rows } = await pool.query(`
    SELECT
      to_regprocedure('public.adjust_stock(uuid,uuid,integer)') IS NOT NULL AS has_fn,
      to_regclass('public.variants_with_stock') IS NOT NULL                 AS has_view,
      EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='warehouses' AND column_name='shop_id') AS has_wh_shop
  `);
  const r = rows[0];
  if (!r.has_fn || !r.has_view) {
    throw new Error('Database is not on the v2 schema (adjust_stock() / variants_with_stock missing). Run neon_schema_v2_full.sql first.');
  }
  if (!r.has_wh_shop) {
    throw new Error('Missing column warehouses.shop_id. Run backend/db/migrations/001_link_warehouses_to_shops.sql (see AUDIT.md).');
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
