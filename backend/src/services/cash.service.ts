import { pool, query } from '../config/db.ts';
import type { CashActivityType, PaymentMethod } from '../constants/domain.ts';
import { env } from '../config/env.ts';
import type { AuthUser } from '../types/auth.types.ts';
import type { CashActivityInput } from '../validators/cash.validator.ts';
import { audit } from './audit.service.ts';
import { resolveShopScope, warehouseIdsOfShop } from './scope.service.ts';
import { salesService } from './sales.service.ts';
import { num } from '../utils/sql.ts';

const TYPE_LABEL: Record<string, string> = {
  income: 'Income', expense: 'Expense', deposit: 'Deposit', withdrawal: 'Cash Drop', sale: 'Sale', refund: 'Refund',
  opening: 'Opening Float', closing: 'Closing', adjustment: 'Adjustment', pos_sale: 'POS Sale',
};
const METHOD_LABEL: Record<string, string> = { cash: 'Cash', card: 'Card', mobile_money: 'Mobile Money', bank_transfer: 'Bank Transfer', credit: 'Credit', other: 'Other' };

/** Cash leaving the drawer vs entering it. Amounts are stored as positive magnitudes; `adjustment` is signed. */
const OUT: CashActivityType[] = ['withdrawal', 'expense', 'refund'];
const IN: CashActivityType[] = ['income', 'deposit'];

async function insertActivity(user: AuthUser, shopId: string | null, type: CashActivityType, amount: number, method: PaymentMethod, note: string) {
  const { rows } = await query(
    'INSERT INTO cash_activities (shop_id, type, amount, method, note, user_name) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [shopId, type, amount, method, note, user.name]); // user name comes from the session, never from the request body
  await audit(pool, 'cash.activity', { activityId: rows[0].id, type, amount, method, shopId }, user);
}

export const cashService = {
  async summary(user: AuthUser, requestedShopId?: string) {
    const shopId = resolveShopScope(user, requestedShopId);
    const scope = shopId ? await warehouseIdsOfShop(shopId) : null;
    const tz = env.APP_TIMEZONE;
    const today = `(created_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date`;

    const [acts, posSales, recon, shop] = await Promise.all([
      query(`SELECT *, ${today} AS is_today FROM cash_activities WHERE ($1::uuid IS NULL OR shop_id = $1) ORDER BY created_at DESC LIMIT 200`, [shopId, tz]),
      query(
        `SELECT s.id, s.selling_price * s.quantity - s.returned_amount AS amount, s.payment_method, s.created_at, p.name AS product_name, u.name AS cashier
         FROM sales s JOIN variants v ON v.id = s.variant_id JOIN products p ON p.id = v.product_id
         LEFT JOIN receipts r ON r.id = s.receipt_id LEFT JOIN users u ON u.id = r.cashier_id
         WHERE s.status NOT IN ('cancelled','voided') AND ($1::uuid[] IS NULL OR s.warehouse_id = ANY($1::uuid[]))
         ORDER BY s.created_at DESC LIMIT 100`, [scope]),
      salesService.reconcile(scope),
      shopId ? query('SELECT name FROM shops WHERE id = $1', [shopId]) : Promise.resolve({ rows: [] as any[] }),
    ]);

    const todays = acts.rows.filter((a) => a.is_today);
    const sum = (types: string[]) => todays.filter((a) => types.includes(a.type)).reduce((s, a) => s + Math.abs(num(a.amount)), 0);
    const openingRow = todays.find((a) => a.type === 'opening');
    const openingFloat = openingRow ? num(openingRow.amount) : 0;
    const cashDropsTotal = sum(['withdrawal']);
    const adjustments = todays.filter((a) => a.type === 'adjustment').reduce((s, a) => s + num(a.amount), 0);
    // Register cash for the current business day: float + cash sales + cash in - cash out (+/- adjustments).
    const currentRegisterCash = Math.max(0, openingFloat + recon.todaysCashSales + sum(IN) - sum(OUT) + adjustments);

    const activities = [
      ...acts.rows.map((a) => ({
        id: a.id, shopId: a.shop_id, type: a.type, typeLabel: TYPE_LABEL[a.type], amount: num(a.amount), method: a.method,
        methodLabel: METHOD_LABEL[a.method], note: a.note ?? '', userName: a.user_name ?? 'Staff', createdAt: a.created_at,
      })),
      ...posSales.rows.map((s) => ({
        id: `pos-${s.id}`, shopId, type: 'pos_sale', typeLabel: TYPE_LABEL.pos_sale, amount: num(s.amount), method: s.payment_method,
        methodLabel: METHOD_LABEL[s.payment_method], note: `Order #${String(s.id).slice(0, 8).toUpperCase()} - ${s.product_name}`,
        userName: s.cashier ?? 'POS', createdAt: s.created_at,
      })),
    ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 100);

    return {
      branchName: shop.rows[0]?.name ?? (shopId ? 'Branch' : 'All branches'),
      currentRegisterCash, openingFloat, cashDropsTotal,
      todaysCashSales: recon.todaysCashSales, todaysDigitalSales: recon.todaysDigitalSales,
      todaysTelebirrSales: recon.todaysTelebirrSales,
      todaysOtherDigitalSales: recon.todaysDigitalSales - recon.todaysTelebirrSales,
      historicalCashSales: recon.historicalCashSales, historicalDigitalSales: recon.historicalDigitalSales,
      historicalTelebirrSales: recon.historicalTelebirrSales,
      historicalOtherDigitalSales: recon.historicalDigitalSales - recon.historicalTelebirrSales,
      digitalBreakdown: recon.byMethod,
      activities,
    };
  },

  async drop(user: AuthUser, amount: number, note: string | undefined, shopId?: string) {
    const shop = resolveShopScope(user, shopId);
    await insertActivity(user, shop, 'withdrawal', amount, 'bank_transfer', note || 'Safe transfer to main vault');
    return cashService.summary(user, shop ?? undefined);
  },

  async setFloat(user: AuthUser, amount: number, note: string | undefined, shopId?: string) {
    const shop = resolveShopScope(user, shopId);
    await insertActivity(user, shop, 'opening', amount, 'cash', note || 'Daily initial register float');
    return cashService.summary(user, shop ?? undefined);
  },

  async record(user: AuthUser, input: CashActivityInput, shopId?: string) {
    const shop = resolveShopScope(user, shopId ?? input.shopId);
    await insertActivity(user, shop, input.type, input.amount, input.method, input.note ?? '');
    return cashService.summary(user, shop ?? undefined);
  },
};
