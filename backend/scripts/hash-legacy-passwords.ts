/**
 * One-off: if users.password still holds PLAINTEXT from the old app, hash it in place.
 * Detects bcrypt hashes by their "$2a$/$2b$/$2y$" prefix and leaves those untouched.
 *   npx tsx backend/scripts/hash-legacy-passwords.ts
 */
import bcrypt from 'bcryptjs';
import { closePool, pool } from '../src/config/db.ts';
import { env } from '../src/config/env.ts';

const { rows } = await pool.query(`SELECT id, password FROM users WHERE password !~ '^\\$2[aby]\\$'`);
for (const r of rows) await pool.query('UPDATE users SET password = $1 WHERE id = $2', [await bcrypt.hash(r.password, env.BCRYPT_ROUNDS), r.id]);
console.log(`Hashed ${rows.length} plaintext password(s). Ask those users to change them – they were stored in the clear.`);
await closePool();
