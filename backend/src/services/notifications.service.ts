import { query } from '../config/db.ts';
import { getNotificationSettings, sendLowStockEmailSummary } from '../lib/notifications.ts';
import { logger } from '../utils/logger.ts';

export async function lowStockVariants(threshold: number, limit = 200) {
  const { rows } = await query(
    `SELECT v.id, v.sku, v.size, v.color, v.current_stock, p.name AS product_name, b.name AS brand_name
     FROM variants_with_stock v JOIN products p ON p.id = v.product_id JOIN brands b ON b.id = p.brand_id
     WHERE v.is_active AND p.is_active AND v.current_stock < $1 ORDER BY v.current_stock ASC, v.sku LIMIT $2`, [threshold, limit]);
  return rows.map((r) => ({ id: r.id, sku: r.sku, size: r.size, color: r.color, currentStock: r.current_stock, productName: r.product_name, productBrand: r.brand_name }));
}

/** Fire-and-forget after stock changes. Never throws into the request that triggered it. */
export function notifyLowStock(): void {
  (async () => {
    const settings = getNotificationSettings();
    if (!settings.enableAutoEmail) return;
    await sendLowStockEmailSummary(await lowStockVariants(settings.threshold), false);
  })().catch((err) => logger.error('Low-stock notification failed', err));
}
