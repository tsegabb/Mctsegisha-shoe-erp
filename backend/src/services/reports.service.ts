import { query } from '../config/db.ts';
import { env } from '../config/env.ts';
import { getNotificationSettings } from '../lib/notifications.ts';
import type { AuthUser } from '../types/auth.types.ts';
import { COUNTED_SALE, NET_PROFIT, NET_REVENUE, Params, num, variantStockSource } from '../utils/sql.ts';
import { lowStockVariants } from './notifications.service.ts';
import { resolveWarehouseScope, type WarehouseScope } from './scope.service.ts';

const salesScope = (p: Params, scope: WarehouseScope) => (scope ? `AND s.warehouse_id = ANY(${p.add(scope)}::uuid[])` : '');

async function salesWindows(scope: WarehouseScope) {
  const p = new Params();
  const w = (days: number, expr: string) => `COALESCE(SUM(${expr}) FILTER (WHERE s.created_at >= now() - interval '${days} days'), 0)`;
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total_count, (COUNT(*) FILTER (WHERE s.created_at >= now() - interval '1 day'))::int AS daily_count,
            COALESCE(SUM(${NET_REVENUE}),0) AS total_revenue, ${w(1, NET_REVENUE)} AS daily_revenue, ${w(7, NET_REVENUE)} AS weekly_revenue,
            ${w(30, NET_REVENUE)} AS monthly_revenue, ${w(365, NET_REVENUE)} AS yearly_revenue,
            COALESCE(SUM(${NET_PROFIT}),0) AS total_profit, ${w(1, NET_PROFIT)} AS daily_profit, ${w(7, NET_PROFIT)} AS weekly_profit,
            ${w(30, NET_PROFIT)} AS monthly_profit, ${w(365, NET_PROFIT)} AS yearly_profit
     FROM sales s WHERE ${COUNTED_SALE} ${salesScope(p, scope)}`, p.values);
  return rows[0];
}

export const reportsService = {
  async getStats(user: AuthUser, requestedWarehouseId?: string) {
    const scope = await resolveWarehouseScope(user, requestedWarehouseId);
    const threshold = getNotificationSettings().threshold;
    const stockScope = () => { const p = new Params(); return { p, ref: scope ? p.add(scope) : undefined }; };

    const totals = (() => { const { p, ref } = stockScope();
      return query(`SELECT COALESCE(SUM(ws.quantity),0)::int AS total_stock, COALESCE(SUM(ws.quantity * v.price),0) AS total_value
                    FROM warehouse_stock ws JOIN variants v ON v.id = ws.variant_id ${ref ? `WHERE ws.warehouse_id = ANY(${ref}::uuid[])` : ''}`, p.values); })();

    const lowCount = (() => { const { p, ref } = stockScope(); const t = p.add(threshold);
      return query(`SELECT COUNT(*)::int AS n FROM ${variantStockSource(ref)} v WHERE v.is_active AND v.current_stock < ${t}`, p.values); })();

    const utilisation = (() => { const { p, ref } = stockScope();
      return query(`SELECT w.id, w.name, w.code, w.location, w.capacity, COALESCE(SUM(ws.quantity),0)::int AS used
                    FROM warehouses w LEFT JOIN warehouse_stock ws ON ws.warehouse_id = w.id
                    ${ref ? `WHERE w.id = ANY(${ref}::uuid[])` : ''} GROUP BY w.id ORDER BY w.name`, p.values); })();

    const movements = (() => { const { p, ref } = stockScope();
      return query(`SELECT m.*, v.size, v.color, v.sku, pr.name AS product_name, b.name AS brand_name
                    FROM movements m JOIN variants v ON v.id = m.variant_id JOIN products pr ON pr.id = v.product_id JOIN brands b ON b.id = pr.brand_id
                    ${ref ? `WHERE m.from_warehouse_id = ANY(${ref}::uuid[]) OR m.to_warehouse_id = ANY(${ref}::uuid[])` : ''}
                    ORDER BY m.created_at DESC LIMIT 10`, p.values); })();

    const brands = (() => { const { p, ref } = stockScope();
      return query(`SELECT b.name, COALESCE(SUM(ws.quantity),0)::int AS value FROM brands b
                    LEFT JOIN products pr ON pr.brand_id = b.id LEFT JOIN variants v ON v.product_id = pr.id
                    LEFT JOIN warehouse_stock ws ON ws.variant_id = v.id ${ref ? `AND ws.warehouse_id = ANY(${ref}::uuid[])` : ''}
                    GROUP BY b.id, b.name ORDER BY value DESC, b.name`, p.values); })();

    const best = (() => { const p = new Params();
      return query(`SELECT pr.name, b.name AS brand, SUM(s.quantity - s.returned_qty)::int AS quantity, SUM(${NET_REVENUE}) AS revenue, SUM(${NET_PROFIT}) AS profit
                    FROM sales s JOIN variants v ON v.id = s.variant_id JOIN products pr ON pr.id = v.product_id JOIN brands b ON b.id = pr.brand_id
                    WHERE ${COUNTED_SALE} ${salesScope(p, scope)} GROUP BY pr.id, pr.name, b.name ORDER BY quantity DESC LIMIT 5`, p.values); })();

    const history = (() => { const p = new Params(); const tz = p.add(env.APP_TIMEZONE);
      return query(`SELECT to_char(d, 'YYYY-MM-DD') AS date, COALESCE(SUM(${NET_REVENUE}),0) AS revenue, COALESCE(SUM(${NET_PROFIT}),0) AS profit
                    FROM generate_series((now() AT TIME ZONE ${tz})::date - 29, (now() AT TIME ZONE ${tz})::date, interval '1 day') d
                    LEFT JOIN sales s ON (s.created_at AT TIME ZONE ${tz})::date = d::date AND ${COUNTED_SALE} ${salesScope(p, scope)}
                    GROUP BY d ORDER BY d`, p.values); })();

    const shops = (() => { const p = new Params(); const sc = scope ? `WHERE w.id = ANY(${p.add(scope)}::uuid[])` : '';
      return query(`SELECT w.id, w.name, w.code, w.location, w.capacity,
                           (SELECT COUNT(*)::int FROM users u WHERE u.shop_id = w.shop_id AND u.is_active) AS employees,
                           COALESCE(sa.cnt,0)::int AS cnt, COALESCE(sa.rev,0) AS rev, COALESCE(sa.prof,0) AS prof
                    FROM warehouses w LEFT JOIN (
                      SELECT s.warehouse_id, COUNT(*) AS cnt, SUM(${NET_REVENUE}) AS rev, SUM(${NET_PROFIT}) AS prof
                      FROM sales s WHERE ${COUNTED_SALE} GROUP BY s.warehouse_id) sa ON sa.warehouse_id = w.id
                    ${sc} ORDER BY w.name`, p.values); })();

    const paymentMethods = (() => { const p = new Params();
      return query(`SELECT s.payment_method AS method, COUNT(*)::int AS count,
                           COALESCE(SUM(${NET_REVENUE}), 0) AS revenue,
                           COALESCE(SUM(${NET_PROFIT}), 0) AS profit
                    FROM sales s WHERE ${COUNTED_SALE} ${salesScope(p, scope)}
                    GROUP BY s.payment_method ORDER BY revenue DESC`, p.values); })();

    const [t, lc, util, mv, br, bs, hist, sh, sw, low, pm] = await Promise.all([
      totals, lowCount, utilisation, movements, brands, best, history, shops, salesWindows(scope), lowStockVariants(threshold, 100), paymentMethods,
    ]);

    const shopBreakdown = sh.rows.map((r) => ({
      id: r.id, name: r.name, code: r.code, location: r.location, capacity: r.capacity,
      assignedEmployeeCount: r.employees, totalSalesCount: r.cnt, totalRevenue: num(r.rev), totalProfit: num(r.prof),
    }));
    const s = sw;
    return {
      totalStock: t.rows[0].total_stock, totalValue: num(t.rows[0].total_value),
      lowStockCount: lc.rows[0].n, lowStockVariants: low,
      warehouseUtilization: util.rows.map((r) => ({ id: r.id, name: r.name, code: r.code, location: r.location, capacity: r.capacity, used: r.used })),
      recentMovements: mv.rows.map((r) => ({
        id: r.id, variantId: r.variant_id, fromWarehouseId: r.from_warehouse_id, toWarehouseId: r.to_warehouse_id, quantity: r.quantity,
        type: r.type, reason: r.reason, createdBy: r.created_by, createdAt: r.created_at,
        variant: { id: r.variant_id, size: r.size, color: r.color, sku: r.sku, productName: r.product_name, productBrand: r.brand_name },
      })),
      brandDistribution: br.rows,
      totalSalesCount: s.total_count, dailySalesCount: s.daily_count,
      totalRevenue: num(s.total_revenue), dailyRevenue: num(s.daily_revenue), weeklyRevenue: num(s.weekly_revenue),
      monthlyRevenue: num(s.monthly_revenue), yearlyRevenue: num(s.yearly_revenue),
      totalProfit: num(s.total_profit), dailyProfit: num(s.daily_profit), weeklyProfit: num(s.weekly_profit),
      monthlyProfit: num(s.monthly_profit), yearlyProfit: num(s.yearly_profit),
      bestSellers: bs.rows.map((r) => ({ name: r.name, brand: r.brand, quantity: r.quantity, revenue: num(r.revenue), profit: num(r.profit) })),
      revenueHistory: hist.rows.map((r) => ({ date: r.date, revenue: num(r.revenue), profit: num(r.profit) })),
      paymentBreakdown: pm.rows.map((r) => ({ method: r.method, count: r.count, revenue: num(r.revenue), profit: num(r.profit) })),
      shopBreakdown,
      topPerformingShop: [...shopBreakdown].sort((a, b) => b.totalRevenue - a.totalRevenue)[0] ?? null,
    };
  },

  async getDashboard(user: AuthUser, requestedWarehouseId?: string) {
    const scope = await resolveWarehouseScope(user, requestedWarehouseId);
    const threshold = getNotificationSettings().threshold;
    const p1 = new Params(); const ref = scope ? p1.add(scope) : undefined;
    const p2 = new Params(); const sSql = salesScope(p2, scope);
    const p3 = new Params(); const eSql = scope ? `AND u.shop_id IN (SELECT shop_id FROM warehouses WHERE id = ANY(${p3.add(scope)}::uuid[]))` : '';
    const p4 = new Params(); const rSql = salesScope(p4, scope);

    const [inv, products, sales, emp, recent, low] = await Promise.all([
      query(`SELECT COALESCE(SUM(ws.quantity),0)::int AS total_stock, COALESCE(SUM(ws.quantity*v.price),0) AS total_value
             FROM warehouse_stock ws JOIN variants v ON v.id = ws.variant_id ${ref ? `WHERE ws.warehouse_id = ANY(${ref}::uuid[])` : ''}`, p1.values),
      query('SELECT COUNT(*)::int AS n FROM products WHERE is_active'),
      query(`SELECT COALESCE(SUM(${NET_REVENUE}),0) AS revenue, COALESCE(SUM(s.quantity * s.cost_price),0) AS cost,
                    COALESCE(SUM(${NET_PROFIT}),0) AS profit, COUNT(*)::int AS cnt FROM sales s WHERE ${COUNTED_SALE} ${sSql}`, p2.values),
      query(`SELECT COUNT(*)::int AS n FROM users u WHERE u.is_active AND u.role IN ('cashier','staff') ${eSql}`, p3.values),
      query(`SELECT s.*, v.size, v.color, v.sku, p.name AS product_name, b.name AS brand_name FROM sales s
             JOIN variants v ON v.id = s.variant_id JOIN products p ON p.id = v.product_id JOIN brands b ON b.id = p.brand_id
             WHERE ${COUNTED_SALE} ${rSql} ORDER BY s.created_at DESC LIMIT 10`, p4.values),
      lowStockVariants(threshold, 100),
    ]);
    const s = sales.rows[0];
    return {
      inventory: { totalStock: inv.rows[0].total_stock, totalValue: num(inv.rows[0].total_value), productCount: products.rows[0].n, lowStockItems: low },
      sales: { totalRevenue: num(s.revenue), totalCost: num(s.cost), totalSalesCount: s.cnt, totalProfit: num(s.profit) },
      customerCount: s.cnt, employeeCount: emp.rows[0].n,
      recentSales: recent.rows.map((r) => ({
        id: r.id, variantId: r.variant_id, warehouseId: r.warehouse_id, quantity: r.quantity, sellingPrice: num(r.selling_price),
        costPrice: num(r.cost_price), profit: num(r.profit), createdAt: r.created_at, size: r.size, color: r.color, sku: r.sku,
        productName: r.product_name, brandName: r.brand_name,
      })),
    };
  },
};
