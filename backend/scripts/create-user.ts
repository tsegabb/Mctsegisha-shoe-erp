/**
 * Create (or reset the password of) a user with a properly hashed password.
 *   NEW_USER_PASSWORD='...' npx tsx backend/scripts/create-user.ts --email owner@example.com --name "Owner" --role owner [--shop <uuid>] [--reset]
 * The password is read from the environment so it never lands in shell history.
 */
import bcrypt from 'bcryptjs';
import { closePool, pool } from '../src/config/db.ts';
import { env } from '../src/config/env.ts';
import { ROLES } from '../src/constants/domain.ts';

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : undefined; };
const email = arg('email')?.toLowerCase();
const name = arg('name');
const role = arg('role') ?? 'owner';
const shop = arg('shop') ?? null;
const password = process.env.NEW_USER_PASSWORD;

if (!email || !name || !password) { console.error('Required: --email, --name and NEW_USER_PASSWORD env var'); process.exit(1); }
if (!(ROLES as readonly string[]).includes(role)) { console.error(`--role must be one of ${ROLES.join(', ')}`); process.exit(1); }
if (password.length < 10) { console.error('Use a password of at least 10 characters'); process.exit(1); }

const hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
const reset = process.argv.includes('--reset');
const sql = reset
  ? `INSERT INTO users (name, email, password, role, shop_id) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, is_active = true RETURNING id`
  : `INSERT INTO users (name, email, password, role, shop_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`;
const { rows } = await pool.query(sql, [name, email, hash, role, shop]);
console.log(`✅ ${reset ? 'Upserted' : 'Created'} ${role} ${email} (${rows[0].id})`);
await closePool();
