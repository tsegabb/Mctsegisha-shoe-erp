import { query, type Queryable } from '../config/db.ts';
import { PRIVILEGED_ROLES } from '../constants/domain.ts';
import { forbidden } from '../errors/AppError.ts';
import type { AuthUser } from '../types/auth.types.ts';

/**
 * Branch scoping.  users.shop_id -> shops, and warehouses.shop_id -> shops (migration 001) tie a
 * user to the warehouses they may see and sell from.  `null` means "no restriction".
 */
export type WarehouseScope = string[] | null;

export const isPrivileged = (u: AuthUser) => PRIVILEGED_ROLES.includes(u.role);

export async function warehouseIdsOfShop(shopId: string, db?: Queryable): Promise<string[]> {
  const { rows } = await query<{ id: string }>('SELECT id FROM warehouses WHERE shop_id = $1 AND is_active', [shopId], db);
  return rows.map((r) => r.id);
}

async function allowedFor(user: AuthUser, db?: Queryable): Promise<string[]> {
  if (!user.shopId) throw forbidden('No branch is assigned to your account. Ask an administrator to assign one.');
  const ids = await warehouseIdsOfShop(user.shopId, db);
  if (ids.length === 0) throw forbidden('No warehouse is linked to your branch yet. Ask an administrator.');
  return ids;
}

/** Warehouses the caller may read. Owners/admins: everything (or just the one requested). Others: their branch only. */
export async function resolveWarehouseScope(user: AuthUser, requested?: string | null, db?: Queryable): Promise<WarehouseScope> {
  if (isPrivileged(user)) return requested ? [requested] : null;
  const allowed = await allowedFor(user, db);
  if (requested) {
    if (!allowed.includes(requested)) throw forbidden('Access denied: you are restricted to your assigned branch.');
    return [requested];
  }
  return allowed;
}

/** Throws unless every given warehouse is inside the caller's scope (write-side check). */
export async function assertWarehouseAccess(user: AuthUser, warehouseIds: Array<string | null | undefined>, db?: Queryable): Promise<void> {
  if (isPrivileged(user)) return;
  const allowed = await allowedFor(user, db);
  for (const id of warehouseIds) {
    if (id && !allowed.includes(id)) throw forbidden('Access denied: you can only work with warehouses of your assigned branch.');
  }
}

/** Shop (branch) scope used by cash drawer endpoints. */
export function resolveShopScope(user: AuthUser, requested?: string | null): string | null {
  if (isPrivileged(user)) return requested ?? null;
  if (!user.shopId) throw forbidden('No branch is assigned to your account.');
  if (requested && requested !== user.shopId) throw forbidden('Access denied: you are restricted to your assigned branch.');
  return user.shopId;
}
