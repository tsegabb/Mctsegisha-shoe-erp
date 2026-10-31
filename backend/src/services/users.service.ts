import { query, withTransaction } from '../config/db.ts';
import { PRIVILEGED_ROLES, type Role } from '../constants/domain.ts';
import { conflict, forbidden, notFound, unprocessable } from '../errors/AppError.ts';
import type { AuthUser } from '../types/auth.types.ts';
import type { CreateUserInput, UpdateUserInput } from '../validators/auth.validator.ts';
import { audit } from './audit.service.ts';
import { assertPasswordPolicy, hashPassword } from './auth.service.ts';

const PUBLIC_SELECT = `
  SELECT u.id, u.name, u.email, u.phone, u.role, u.shop_id, u.is_active, u.created_at, s.name AS shop_name
  FROM users u LEFT JOIN shops s ON s.id = u.shop_id`;

const map = (r: any) => ({
  id: r.id, name: r.name, email: r.email, phone: r.phone ?? '', role: r.role as Role,
  shopId: r.shop_id ?? null, shopName: r.shop_name ?? null, isActive: r.is_active, createdAt: r.created_at,
});

const isPriv = (r: Role) => PRIVILEGED_ROLES.includes(r);

/** Only an owner may create, change or remove another owner. */
function assertCanTouchRole(actor: AuthUser, role: Role) {
  if (role === 'owner' && actor.role !== 'owner') throw forbidden('Only an owner can manage owner accounts');
}

async function assertNotLastPrivileged(db: any, userId: string) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM users WHERE is_active AND role IN ('owner','admin') AND id <> $1`, [userId], db);
  if (rows[0].n === 0) throw conflict('This is the last active owner/admin – at least one must remain');
}

export const usersService = {
  async list() {
    const { rows } = await query(`${PUBLIC_SELECT} ORDER BY u.name ASC`);
    return rows.map(map);
  },

  async create(actor: AuthUser, input: CreateUserInput) {
    assertCanTouchRole(actor, input.role as Role);
    if (!isPriv(input.role as Role) && !input.shopId) throw unprocessable('shopId is required for branch roles (manager, cashier, staff, warehouse)');
    assertPasswordPolicy(input.password);
    const digits = (input.phone ?? '').replace(/\D/g, '');
    const email = input.email ?? `${digits}@staff.invalid`; // phone-only staff log in with this generated address
    const hash = await hashPassword(input.password);

    return withTransaction(async (tx) => {
      const { rows } = await query(
        `INSERT INTO users (name, email, phone, password, role, shop_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [input.name, email, input.phone ?? null, hash, input.role, input.shopId ?? null], tx);
      await audit(tx, 'user.created', { userId: rows[0].id, email, role: input.role }, actor);
      const { rows: out } = await query(`${PUBLIC_SELECT} WHERE u.id = $1`, [rows[0].id], tx);
      return map(out[0]);
    });
  },

  async update(actor: AuthUser, id: string, input: UpdateUserInput) {
    return withTransaction(async (tx) => {
      const { rows: cur } = await query('SELECT id, role, is_active, shop_id FROM users WHERE id = $1 FOR UPDATE', [id], tx);
      if (!cur[0]) throw notFound('User not found');
      assertCanTouchRole(actor, cur[0].role);
      if (input.role) assertCanTouchRole(actor, input.role as Role);

      const demotes = input.role && !isPriv(input.role as Role) && isPriv(cur[0].role);
      const deactivates = input.isActive === false && cur[0].is_active && isPriv(cur[0].role);
      if (demotes || deactivates) {
        if (id === actor.id) throw conflict('You cannot demote or deactivate your own account');
        await assertNotLastPrivileged(tx, id);
      }
      const finalRole = (input.role ?? cur[0].role) as Role;
      const finalShop = input.shopId === undefined ? cur[0].shop_id : input.shopId;
      if (!isPriv(finalRole) && !finalShop) throw unprocessable('shopId is required for branch roles');

      const sets: string[] = [];
      const vals: unknown[] = [];
      const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
      if (input.name !== undefined) set('name', input.name);
      if (input.email !== undefined) set('email', input.email);
      if (input.phone !== undefined) set('phone', input.phone);
      if (input.role !== undefined) set('role', input.role);
      if (input.shopId !== undefined) set('shop_id', input.shopId);
      if (input.isActive !== undefined) set('is_active', input.isActive);
      vals.push(id);
      await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals, tx);
      await audit(tx, 'user.updated', { userId: id, changes: { ...input } }, actor);
      const { rows } = await query(`${PUBLIC_SELECT} WHERE u.id = $1`, [id], tx);
      return map(rows[0]);
    });
  },

  async remove(actor: AuthUser, id: string) {
    if (id === actor.id) throw conflict('You cannot delete your own account');
    return withTransaction(async (tx) => {
      const { rows } = await query('SELECT role, is_active FROM users WHERE id = $1 FOR UPDATE', [id], tx);
      if (!rows[0]) throw notFound('User not found');
      assertCanTouchRole(actor, rows[0].role);
      if (isPriv(rows[0].role) && rows[0].is_active) await assertNotLastPrivileged(tx, id);
      await query('DELETE FROM users WHERE id = $1', [id], tx); // 23503 (user has receipts) -> 409 "deactivate instead"
      await audit(tx, 'user.deleted', { userId: id }, actor);
    });
  },

  async resetPassword(actor: AuthUser, id: string, newPassword: string) {
    assertPasswordPolicy(newPassword);
    const { rows } = await query('SELECT role FROM users WHERE id = $1', [id]);
    if (!rows[0]) throw notFound('User not found');
    assertCanTouchRole(actor, rows[0].role);
    await withTransaction(async (tx) => {
      await query('UPDATE users SET password = $1 WHERE id = $2', [await hashPassword(newPassword), id], tx);
      await audit(tx, 'user.password_reset', { userId: id }, actor);
    });
  },
};
