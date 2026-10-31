import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, query, type Queryable } from '../config/db.ts';
import { env } from '../config/env.ts';
import { badRequest, notFound, unauthorized } from '../errors/AppError.ts';
import { getGeneralSettings } from '../lib/settingsStore.ts';
import type { AuthUser } from '../types/auth.types.ts';
import type { Role } from '../constants/domain.ts';
import { JWT_AUDIENCE, JWT_ISSUER } from '../middlewares/auth.middleware.ts';
import { audit } from './audit.service.ts';

const FROM_USERS = 'FROM users u LEFT JOIN shops s ON s.id = u.shop_id';
const SESSION_SELECT = `SELECT u.id, u.name, u.email, u.phone, u.role, u.shop_id, u.is_active, s.name AS shop_name ${FROM_USERS}`;
const LOGIN_SELECT = `SELECT u.id, u.name, u.email, u.phone, u.role, u.shop_id, u.is_active, u.password, s.name AS shop_name ${FROM_USERS}`;

const toAuthUser = (r: any): AuthUser => ({
  id: r.id, name: r.name, email: r.email, phone: r.phone ?? null, role: r.role as Role,
  shopId: r.shop_id ?? null, shopName: r.shop_name ?? null, isActive: r.is_active,
});

// A real bcrypt hash computed once, so "unknown email" costs the same as "wrong password" (no user enumeration by timing).
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash('not-a-real-password', env.BCRYPT_ROUNDS));

export function assertPasswordPolicy(password: string) {
  const { minPasswordLength, requireSpecialChar } = getGeneralSettings().security;
  if (password.length < Math.max(8, minPasswordLength)) throw badRequest(`Password must be at least ${Math.max(8, minPasswordLength)} characters`);
  if (requireSpecialChar && !/[^A-Za-z0-9]/.test(password)) throw badRequest('Password must contain at least one special character');
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, env.BCRYPT_ROUNDS);

export function permissionsFor(role: Role): string[] {
  const roles = getGeneralSettings().usersPermissions.roles;
  return roles.find((r) => r.name === role)?.permissions ?? [];
}

export const authService = {
  async findSessionUser(id: string, db?: Queryable): Promise<AuthUser | null> {
    const { rows } = await query(`${SESSION_SELECT} WHERE u.id = $1`, [id], db);
    return rows[0] ? toAuthUser(rows[0]) : null;
  },

  async login(email: string, password: string) {
    const { rows } = await query(`${LOGIN_SELECT} WHERE u.email = $1`, [email]); // email is citext
    const row = rows[0];
    const ok = await bcrypt.compare(password, row?.password ?? (await getDummyHash())).catch(() => false);
    if (!row || !ok || !row.is_active) throw unauthorized('Invalid email or password');

    const user = toAuthUser(row);
    const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
      algorithm: 'HS256', subject: user.id, issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: env.JWT_EXPIRES_IN as any,
    });
    return { token, user, permissions: permissionsFor(user.role) };
  },

  async me(user: AuthUser) {
    return { user, permissions: permissionsFor(user.role) };
  },

  async changePassword(user: AuthUser, currentPassword: string, newPassword: string) {
    const { rows } = await query('SELECT password FROM users WHERE id = $1', [user.id]);
    if (!rows[0]) throw notFound('User not found');
    if (!(await bcrypt.compare(currentPassword, rows[0].password))) throw badRequest('Current password is incorrect');
    assertPasswordPolicy(newPassword);
    await query('UPDATE users SET password = $1 WHERE id = $2', [await hashPassword(newPassword), user.id]);
    await audit(pool, 'user.password_changed', { userId: user.id }, user);
  },
};
