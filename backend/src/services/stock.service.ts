import { query, withTransaction, type Queryable } from '../config/db.ts';
import { MOVEMENT_DIRECTION, type MovementType } from '../constants/domain.ts';
import { insufficientStock, notFound } from '../errors/AppError.ts';
import type { AuthUser } from '../types/auth.types.ts';
import { pageResult, resolvePaging } from '../utils/pagination.ts';
import { Params, likeContains } from '../utils/sql.ts';
import type { CreateMovementInput, ListMovementsQuery } from '../validators/inventory.validator.ts';
import { audit } from './audit.service.ts';
import { notifyLowStock } from './notifications.service.ts';
import { assertWarehouseAccess, resolveWarehouseScope } from './scope.service.ts';

/**
 * The ONLY way stock changes. Wraps the atomic SQL function adjust_stock(warehouse, variant, delta):
 * positive = add, negative = remove, and PostgreSQL raises 23514 instead of letting stock go below zero.
 * Must be called inside the caller's transaction so the stock change and its movement row commit together.
 */
export async function adjustStock(tx: Queryable, warehouseId: string, variantId: string, delta: number): Promise<number> {
  if (delta === 0) return 0;
  try {
    const { rows } = await query<{ quantity: number }>('SELECT adjust_stock($1, $2, $3) AS quantity', [warehouseId, variantId, delta], tx);
    return rows[0].quantity;
  } catch (err: any) {
    if (err?.code === '23514') throw insufficientStock({ warehouseId, variantId, requested: Math.abs(delta) });
    throw err;
  }
}

export interface MovementRecord {
  variantId: string;
  type: MovementType;
  quantity: number;
  from?: string | null;
  to?: string | null;
  reason: string;
  createdBy: string;
}

export async function recordMovement(tx: Queryable, m: MovementRecord) {
  const { rows } = await query(
    `INSERT INTO movements (variant_id, from_warehouse_id, to_warehouse_id, quantity, type, reason, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [m.variantId, m.from ?? null, m.to ?? null, m.quantity, m.type, m.reason, m.createdBy], tx);
  return rows[0];
}

const mapMovement = (r: any) => ({
  id: r.id, variantId: r.variant_id, fromWarehouseId: r.from_warehouse_id, toWarehouseId: r.to_warehouse_id,
  quantity: r.quantity, type: r.type, reason: r.reason, createdBy: r.created_by, createdAt: r.created_at,
  ...(r.sku !== undefined && {
    variant: { id: r.variant_id, size: r.size, color: r.color, sku: r.sku, productName: r.product_name, productBrand: r.brand_name },
    fromWarehouseName: r.from_name, toWarehouseName: r.to_name,
  }),
});

export const stockService = {
  async createMovement(user: AuthUser, input: CreateMovementInput) {
    const dir = MOVEMENT_DIRECTION[input.type as MovementType];
    const type = input.type as MovementType;

    const movement = await withTransaction(async (tx) => {
      const v = await query('SELECT id FROM variants WHERE id = $1', [input.variantId], tx);
      if (!v.rows[0]) throw notFound('Variant not found');

      let from: string | null = null;
      let to: string | null = null;
      const ops: Array<[string, number]> = []; // (warehouseId, delta)

      if (dir === 'in') { to = input.toWarehouseId ?? input.warehouseId!; ops.push([to, input.quantity]); }
      else if (dir === 'out') { from = input.fromWarehouseId ?? input.warehouseId!; ops.push([from, -input.quantity]); }
      else if (dir === 'transfer') { from = input.fromWarehouseId!; to = input.toWarehouseId!; ops.push([from, -input.quantity], [to, input.quantity]); }
      else { // signed adjustment
        const wh = (input.warehouseId ?? input.toWarehouseId ?? input.fromWarehouseId)!;
        if (input.quantity > 0) to = wh; else from = wh;
        ops.push([wh, input.quantity]);
      }

      await assertWarehouseAccess(user, [from, to], tx);

      // Deterministic lock order (by warehouse id) so two opposite transfers cannot deadlock each other.
      ops.sort((a, b) => a[0].localeCompare(b[0]));
      for (const [wh, delta] of ops) await adjustStock(tx, wh, input.variantId, delta);

      const row = await recordMovement(tx, {
        variantId: input.variantId, type, quantity: input.quantity, from, to,
        reason: input.reason || 'Stock adjustment', createdBy: user.name,
      });
      await audit(tx, 'stock.movement', { movementId: row.id, type, variantId: input.variantId, quantity: input.quantity, from, to }, user);
      return row;
    });

    notifyLowStock(); // fire-and-forget, throttled
    return mapMovement(movement);
  },

  async list(user: AuthUser, q: ListMovementsQuery) {
    const scope = await resolveWarehouseScope(user, q.warehouseId ?? q.shopId);
    const paging = resolvePaging(q);
    const p = new Params();
    const where: string[] = [];
    if (scope) { const ref = p.add(scope); where.push(`(m.from_warehouse_id = ANY(${ref}::uuid[]) OR m.to_warehouse_id = ANY(${ref}::uuid[]))`); }
    if (q.variantId) where.push(`m.variant_id = ${p.add(q.variantId)}`);
    if (q.type) where.push(`m.type = ${p.add(q.type)}`);
    if (q.search) {
      const ref = p.add(likeContains(q.search));
      where.push(`(p.name ILIKE ${ref} OR v.sku ILIKE ${ref} OR m.reason ILIKE ${ref} OR m.created_by ILIKE ${ref})`);
    }
    if (q.startDate) where.push(`m.created_at >= ${p.add(q.startDate)}::timestamptz`);
    if (q.endDate) where.push(`m.created_at <= ${p.add(q.endDate)}::timestamptz`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const from = `FROM movements m JOIN variants v ON v.id = m.variant_id JOIN products p ON p.id = v.product_id ${whereSql}`;

    const total = (await query(`SELECT COUNT(*)::int AS n ${from}`, p.values)).rows[0].n;
    const limitRef = p.add(paging.limit);
    const offsetRef = p.add(paging.offset);
    const { rows } = await query(
      `SELECT m.*, v.size, v.color, v.sku, p.name AS product_name,
              (SELECT name FROM brands WHERE id = p.brand_id) AS brand_name,
              (SELECT name FROM warehouses WHERE id = m.from_warehouse_id) AS from_name,
              (SELECT name FROM warehouses WHERE id = m.to_warehouse_id) AS to_name
       ${from} ORDER BY m.created_at DESC, m.id LIMIT ${limitRef} OFFSET ${offsetRef}`, p.values);
    return pageResult(rows.map(mapMovement), total, paging);
  },
};

