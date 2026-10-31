import { pool, query, withTransaction, type Queryable } from '../config/db.ts';
import { ORDER_TRANSITIONS, type OrderStatus } from '../constants/domain.ts';
import { badRequest, conflict, notFound } from '../errors/AppError.ts';
import type { AuthUser } from '../types/auth.types.ts';
import { generateOrderNumber } from '../utils/crypto.ts';
import { pageResult, resolvePaging } from '../utils/pagination.ts';
import { Params, likeContains, num } from '../utils/sql.ts';
import type { CreateOrderInput, ListOrdersQuery } from '../validators/inventory.validator.ts';
import { audit } from './audit.service.ts';
import { notifyLowStock } from './notifications.service.ts';
import { assertWarehouseAccess } from './scope.service.ts';
import { adjustStock, recordMovement } from './stock.service.ts';

const mapItem = (oi: any) => ({
  id: oi.id, orderId: oi.order_id, variantId: oi.variant_id, quantity: oi.quantity, unitCost: num(oi.unit_cost),
  variant: { id: oi.variant_id, sku: oi.sku, size: oi.size, color: oi.color, productName: oi.product_name },
});

const mapOrder = (o: any, items: any[] = []) => ({
  id: o.id, supplierId: o.supplier_id, supplierName: o.supplier_name, orderNumber: o.order_number, status: o.status,
  totalCost: num(o.total_cost), createdAt: o.created_at, updatedAt: o.updated_at, items: items.map(mapItem),
});

async function loadItems(db: Queryable, orderIds: string[]) {
  const map = new Map<string, any[]>();
  if (!orderIds.length) return map;
  const { rows } = await query(
    `SELECT oi.*, v.sku, v.size, v.color, p.name AS product_name
     FROM order_items oi JOIN variants v ON v.id = oi.variant_id JOIN products p ON p.id = v.product_id
     WHERE oi.order_id = ANY($1::uuid[])`, [orderIds], db);
  for (const r of rows) (map.get(r.order_id) ?? map.set(r.order_id, []).get(r.order_id)!).push(r);
  return map;
}

async function orderById(id: string, db: Queryable = pool) {
  const { rows } = await query('SELECT o.*, s.name AS supplier_name FROM orders o JOIN suppliers s ON s.id = o.supplier_id WHERE o.id = $1', [id], db);
  if (!rows[0]) throw notFound('Order not found');
  return mapOrder(rows[0], (await loadItems(db, [id])).get(id));
}

export const ordersService = {
  async list(q: ListOrdersQuery) {
    const paging = resolvePaging(q);
    const p = new Params();
    const where: string[] = [];
    if (q.supplierId) where.push(`o.supplier_id = ${p.add(q.supplierId)}`);
    if (q.status) where.push(`o.status = ${p.add(q.status)}`);
    if (q.search) { const ref = p.add(likeContains(q.search)); where.push(`(o.order_number ILIKE ${ref} OR s.name ILIKE ${ref})`); }
    if (q.startDate) where.push(`o.created_at >= ${p.add(q.startDate)}::timestamptz`);
    if (q.endDate) where.push(`o.created_at <= ${p.add(q.endDate)}::timestamptz`);
    const from = `FROM orders o JOIN suppliers s ON s.id = o.supplier_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;
    const total = (await query(`SELECT COUNT(*)::int AS n ${from}`, p.values)).rows[0].n;
    const limitRef = p.add(paging.limit);
    const offsetRef = p.add(paging.offset);
    const { rows } = await query(`SELECT o.*, s.name AS supplier_name ${from} ORDER BY o.created_at DESC, o.id LIMIT ${limitRef} OFFSET ${offsetRef}`, p.values);
    const items = await loadItems(pool, rows.map((r) => r.id));
    return pageResult(rows.map((r) => mapOrder(r, items.get(r.id))), total, paging);
  },

  async create(actor: AuthUser, input: CreateOrderInput) {
    const orderNumber = input.orderNumber ?? generateOrderNumber();
    return withTransaction(async (tx) => {
      const sup = await query('SELECT is_active FROM suppliers WHERE id = $1', [input.supplierId], tx);
      if (!sup.rows[0]) throw notFound('Supplier not found');
      if (!sup.rows[0].is_active) throw conflict('Supplier is inactive');

      const { rows } = await query(
        `INSERT INTO orders (supplier_id, order_number, status, total_cost) VALUES ($1,$2,'pending',0) RETURNING id`,
        [input.supplierId, orderNumber], tx); // order_number UNIQUE -> 409 if the caller picked a duplicate
      const orderId = rows[0].id as string;

      for (const it of input.items) {
        await query('INSERT INTO order_items (order_id, variant_id, quantity, unit_cost) VALUES ($1,$2,$3,$4)', [orderId, it.variantId, it.quantity, it.unitCost], tx);
      }
      // Total computed by the database (exact numeric math), never trusted from the client.
      await query('UPDATE orders SET total_cost = (SELECT COALESCE(SUM(quantity * unit_cost), 0) FROM order_items WHERE order_id = $1) WHERE id = $1', [orderId], tx);
      await audit(tx, 'order.created', { orderId, orderNumber, items: input.items.length }, actor);
      return orderById(orderId, tx);
    });
  },

  async updateStatus(actor: AuthUser, id: string, next: OrderStatus, warehouseId?: string) {
    const result = await withTransaction(async (tx) => {
      const { rows } = await query('SELECT status, order_number FROM orders WHERE id = $1 FOR UPDATE', [id], tx);
      if (!rows[0]) throw notFound('Order not found');
      const prev = rows[0].status as OrderStatus;
      if (prev === next) return orderById(id, tx);
      if (!ORDER_TRANSITIONS[prev].includes(next)) throw conflict(`Cannot move an order from "${prev}" to "${next}"`);

      let receivedInto: string | null = null;
      if (next === 'received') {
        // Resolve the destination: explicit > warehouse coded WH-MAIN. Never guess silently.
        receivedInto = warehouseId ?? (await query("SELECT id FROM warehouses WHERE code = 'WH-MAIN' AND is_active", [], tx)).rows[0]?.id ?? null;
        if (!receivedInto) throw badRequest('warehouseId is required to receive an order (no WH-MAIN warehouse found)');
        await assertWarehouseAccess(actor, [receivedInto], tx);

        const items = await query('SELECT variant_id, quantity FROM order_items WHERE order_id = $1 ORDER BY variant_id', [id], tx);
        for (const it of items.rows) {
          await adjustStock(tx, receivedInto, it.variant_id, it.quantity);
          await recordMovement(tx, { variantId: it.variant_id, type: 'purchase', quantity: it.quantity, to: receivedInto, reason: `Fulfillment of ${rows[0].order_number}`, createdBy: actor.name });
        }
      }
      await query('UPDATE orders SET status = $1 WHERE id = $2', [next, id], tx);
      await audit(tx, 'order.status_changed', { orderId: id, from: prev, to: next, warehouseId: receivedInto }, actor);
      return orderById(id, tx);
    });
    if (next === 'received') notifyLowStock();
    return result;
  },
};
