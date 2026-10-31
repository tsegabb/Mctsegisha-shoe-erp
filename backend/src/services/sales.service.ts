import { query, withTransaction, type Queryable } from '../config/db.ts';
import { DEFAULT_COST_RATIO, MANAGEMENT_ROLES } from '../constants/domain.ts';
import { badRequest, conflict, forbidden, insufficientStock, notFound, unprocessable } from '../errors/AppError.ts';
import { getGeneralSettings } from '../lib/settingsStore.ts';
import type { AuthUser } from '../types/auth.types.ts';
import { logger } from '../utils/logger.ts';
import { pageResult, resolvePaging } from '../utils/pagination.ts';
import { COUNTED_SALE, Params, likeContains, num } from '../utils/sql.ts';
import { env } from '../config/env.ts';
import type { CreateSaleInput, ListSalesQuery, ProcessReturnInput } from '../validators/sale.validator.ts';
import { audit } from './audit.service.ts';
import { notifyLowStock } from './notifications.service.ts';
import { assertWarehouseAccess, resolveWarehouseScope, type WarehouseScope } from './scope.service.ts';
import { adjustStock, recordMovement } from './stock.service.ts';

const SORTS: Record<string, string> = { created_at: 's.created_at', profit: 's.profit', quantity: 's.quantity', selling_price: 's.selling_price' };
const isManager = (u: AuthUser) => MANAGEMENT_ROLES.includes(u.role);

const mapSale = (r: any) => ({
  id: r.id, receiptId: r.receipt_id, receiptNumber: r.receipt_number ?? null, variantId: r.variant_id, warehouseId: r.warehouse_id,
  quantity: r.quantity, sellingPrice: num(r.selling_price), costPrice: num(r.cost_price), profit: num(r.profit),
  paymentMethod: r.payment_method, status: r.status, returnedQty: r.returned_qty, returnedAmount: num(r.returned_amount),
  createdAt: r.created_at,
  ...(r.sku !== undefined && {
    productName: r.product_name, brandName: r.brand_name, size: r.size, color: r.color, sku: r.sku, cashierName: r.cashier_name ?? null,
    variant: { id: r.variant_id, size: r.size, color: r.color, sku: r.sku, price: num(r.variant_price), productName: r.product_name, productBrand: r.brand_name, brandName: r.brand_name },
  }),
});

/** Picks the warehouse to sell from: explicit one, else the in-scope warehouse holding the most stock of the variant. */
async function pickWarehouse(tx: Queryable, user: AuthUser, scope: WarehouseScope, variantId: string, qty: number, requested?: string | null) {
  if (requested) return requested;
  const p = new Params();
  const where = [`variant_id = ${p.add(variantId)}`, `quantity >= ${p.add(qty)}`];
  if (scope) where.push(`warehouse_id = ANY(${p.add(scope)}::uuid[])`);
  const { rows } = await query(`SELECT warehouse_id FROM warehouse_stock WHERE ${where.join(' AND ')} ORDER BY quantity DESC, warehouse_id LIMIT 1`, p.values, tx);
  if (!rows[0]) throw insufficientStock({ variantId, requested: qty });
  return rows[0].warehouse_id as string;
}

export const salesService = {
  async list(user: AuthUser, q: ListSalesQuery) {
    const scope = await resolveWarehouseScope(user, q.warehouseId ?? q.shopId);
    const paging = resolvePaging(q);
    const p = new Params();
    const where: string[] = [];
    if (scope) where.push(`s.warehouse_id = ANY(${p.add(scope)}::uuid[])`);
    if (q.search) { const ref = p.add(likeContains(q.search)); where.push(`(p.name ILIKE ${ref} OR v.sku ILIKE ${ref} OR b.name ILIKE ${ref})`); }
    if (q.paymentMethod) where.push(`s.payment_method = ${p.add(q.paymentMethod)}`);
    if (q.status) where.push(`s.status = ${p.add(q.status)}`);
    if (q.startDate) where.push(`s.created_at >= ${p.add(q.startDate)}::timestamptz`);
    if (q.endDate) where.push(`s.created_at <= ${p.add(q.endDate)}::timestamptz`);
    const from = `FROM sales s JOIN variants v ON v.id = s.variant_id JOIN products p ON p.id = v.product_id JOIN brands b ON b.id = p.brand_id
                  LEFT JOIN receipts r ON r.id = s.receipt_id LEFT JOIN users u ON u.id = r.cashier_id
                  ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;
    const total = (await query(`SELECT COUNT(*)::int AS n ${from}`, p.values)).rows[0].n;
    const limitRef = p.add(paging.limit);
    const offsetRef = p.add(paging.offset);
    const { rows } = await query(
      `SELECT s.*, r.receipt_number, u.name AS cashier_name, v.size, v.color, v.sku, v.price AS variant_price, p.name AS product_name, b.name AS brand_name
       ${from} ORDER BY ${SORTS[q.sortBy ?? 'created_at']} ${q.sortOrder === 'asc' ? 'ASC' : 'DESC'}, s.id LIMIT ${limitRef} OFFSET ${offsetRef}`, p.values);
    return pageResult(rows.map(mapSale), total, paging);
  },

  async create(user: AuthUser, input: CreateSaleInput) {
    const scope = await resolveWarehouseScope(user, input.warehouseId ?? undefined);
    const maxDiscount = getGeneralSettings().pricingTax.maxDiscount;

    const result = await withTransaction(async (tx) => {
      const receipt = (await query('INSERT INTO receipts (shop_id, cashier_id) VALUES ($1,$2) RETURNING id, receipt_number', [user.shopId, user.id], tx)).rows[0];
      const lines: any[] = [];

      // Sorted by variant so concurrent multi-line sales lock stock rows in the same order.
      for (const item of [...input.items].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
        const { rows } = await query(
          `SELECT v.id, v.sku, v.price, v.is_active, p.name, p.cost_price, p.is_active AS product_active
           FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = $1`, [item.variantId], tx);
        const v = rows[0];
        if (!v) throw notFound(`Variant ${item.variantId} not found`);
        if (!v.is_active || !v.product_active) throw conflict(`${v.name} (${v.sku}) is inactive and cannot be sold`);

        // Price guard: cashiers cannot undercut the list price by more than the configured max discount.
        const floor = num(v.price) * (1 - maxDiscount / 100);
        if (!isManager(user) && item.sellingPrice < floor - 0.005) {
          throw forbidden(`Discount on ${v.sku} exceeds the allowed ${maxDiscount}%. Ask a manager.`);
        }

        // Cost comes from the catalogue. Only managers may override it; the client can never inflate profit.
        let cost: number;
        if (v.cost_price !== null) cost = num(v.cost_price);
        else if (isManager(user) && item.costPrice !== undefined) cost = item.costPrice;
        else { cost = Math.round(num(v.price) * DEFAULT_COST_RATIO * 100) / 100; logger.warn(`Product ${v.name} has no cost_price; estimating cost at ${DEFAULT_COST_RATIO * 100}% of list price`); }
        if (isManager(user) && item.costPrice !== undefined && v.cost_price !== null) cost = item.costPrice;

        const warehouseId = await pickWarehouse(tx, user, scope, item.variantId, item.quantity, input.warehouseId);
        await assertWarehouseAccess(user, [warehouseId], tx);
        await adjustStock(tx, warehouseId, item.variantId, -item.quantity); // 23514 -> 409 Insufficient stock

        // NOTE: `profit` is a generated column – it is never written.
        const sale = (await query(
          `INSERT INTO sales (receipt_id, variant_id, warehouse_id, quantity, selling_price, cost_price, payment_method)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [receipt.id, item.variantId, warehouseId, item.quantity, item.sellingPrice, cost, input.paymentMethod], tx)).rows[0];
        await recordMovement(tx, { variantId: item.variantId, type: 'sale', quantity: item.quantity, from: warehouseId, reason: `Sold ${item.quantity} × ${v.name} (${v.sku})`, createdBy: user.name });
        lines.push(mapSale({ ...sale, receipt_number: receipt.receipt_number }));
      }
      return { receiptId: receipt.id as string, receiptNumber: receipt.receipt_number as number, lines };
    });

    notifyLowStock();
    const total = result.lines.reduce((s, l) => s + l.sellingPrice * l.quantity, 0);
    // First line is spread at top level so single-item POS clients keep working unchanged.
    return { ...result.lines[0], receiptId: result.receiptId, receiptNumber: result.receiptNumber, total: Math.round(total * 100) / 100, items: result.lines };
  },

  async processReturn(user: AuthUser, input: ProcessReturnInput) {
    return withTransaction(async (tx) => {
      const sale = (await query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [input.saleId], tx)).rows[0];
      if (!sale) throw notFound('Original sale not found');
      if (sale.warehouse_id) await assertWarehouseAccess(user, [sale.warehouse_id], tx);
      if (!['completed', 'partially_returned'].includes(sale.status)) throw conflict(`A sale with status "${sale.status}" cannot be returned`);

      const remaining = sale.quantity - sale.returned_qty;
      if (input.quantity > remaining) throw unprocessable(`Cannot return ${input.quantity}; only ${remaining} remain eligible`);

      // Refund math in integer cents. The server decides the amount; only managers (route-guarded) may override it.
      const unit = Math.round(num(sale.selling_price) * 100);
      const maxCents = unit * sale.quantity - Math.round(num(sale.returned_amount) * 100);
      const cents = input.refundAmount !== undefined ? Math.round(input.refundAmount * 100) : unit * input.quantity;
      if (cents > maxCents) throw unprocessable('Refund exceeds the amount originally paid for this sale');

      const newQty = sale.returned_qty + input.quantity;
      const status = newQty >= sale.quantity ? 'returned' : 'partially_returned';
      const updated = (await query(
        'UPDATE sales SET returned_qty = $1, returned_amount = returned_amount + $2, status = $3 WHERE id = $4 RETURNING *',
        [newQty, cents / 100, status, sale.id], tx)).rows[0];

      if (input.restock) {
        const wh = sale.warehouse_id ?? input.warehouseId;
        if (!wh) throw badRequest('warehouseId is required to restock a legacy sale without a warehouse');
        await assertWarehouseAccess(user, [wh], tx);
        await adjustStock(tx, wh, sale.variant_id, input.quantity);
        await recordMovement(tx, { variantId: sale.variant_id, type: 'return', quantity: input.quantity, to: wh, reason: `Customer return: ${input.reason}`, createdBy: user.name });
      }
      await audit(tx, 'sale.returned', { saleId: sale.id, quantity: input.quantity, refund: cents / 100, restock: input.restock }, user);
      return { success: true, sale: mapSale(updated) };
    });
  },

  /** Per-method totals (net of returns), split into "today" (business time zone) and all-time. */
  async reconcile(scope: WarehouseScope) {
    const p = new Params();
    const tz = p.add(env.APP_TIMEZONE);
    const scopeSql = scope ? `AND s.warehouse_id = ANY(${p.add(scope)}::uuid[])` : '';
    const net = 'GREATEST(s.quantity * s.selling_price - s.returned_amount, 0)';
    const isToday = `(s.created_at AT TIME ZONE ${tz})::date = (now() AT TIME ZONE ${tz})::date`;
    const { rows } = await query(
      `SELECT s.payment_method AS method,
              COALESCE(SUM(${net}), 0) AS total, COALESCE(SUM(${net}) FILTER (WHERE ${isToday}), 0) AS today,
              COUNT(*)::int AS cnt, (COUNT(*) FILTER (WHERE ${isToday}))::int AS today_cnt
       FROM sales s WHERE ${COUNTED_SALE} ${scopeSql} GROUP BY s.payment_method`, p.values);

    const by = (m: string) => rows.find((r) => r.method === m);
    const t = (m: string, k: 'today' | 'total') => num(by(m)?.[k]);
    const sum = (k: 'today' | 'total') => rows.reduce((a, r) => a + num(r[k]), 0);
    const methods = Object.fromEntries(['cash', 'card', 'mobile_money', 'bank_transfer', 'credit', 'other'].map((m) => [m, { today: t(m, 'today'), historical: t(m, 'total') }]));

    return {
      reconciledAt: new Date().toISOString(),
      byMethod: methods,
      todaysCashSales: t('cash', 'today'), todaysDigitalSales: sum('today') - t('cash', 'today'), todaysTotalSales: sum('today'),
      historicalCashSales: t('cash', 'total'), historicalDigitalSales: sum('total') - t('cash', 'total'), historicalTotalSales: sum('total'),
      // Legacy keys. The DB cannot tell Telebirr from CBE Birr (both are mobile_money), see AUDIT.md.
      todaysTelebirrSales: t('mobile_money', 'today'), historicalTelebirrSales: t('mobile_money', 'total'),
      todaysCbeSales: t('bank_transfer', 'today'), historicalCbeSales: t('bank_transfer', 'total'),
      todaysCardSales: t('card', 'today'), historicalCardSales: t('card', 'total'),
      counts: { todayTotal: rows.reduce((a, r) => a + r.today_cnt, 0), historicalTotal: rows.reduce((a, r) => a + r.cnt, 0) },
    };
  },
};
