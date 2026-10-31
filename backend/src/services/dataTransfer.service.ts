import { pool, query, withTransaction } from '../config/db.ts';
import { badRequest, notFound } from '../errors/AppError.ts';
import { listBackups, loadBackupContent, triggerBackup } from '../lib/settingsStore.ts';
import type { AuthUser } from '../types/auth.types.ts';
import { generateSku } from '../utils/crypto.ts';
import { audit } from './audit.service.ts';
import { catalogService } from './catalog.service.ts';
import { adjustStock, recordMovement } from './stock.service.ts';

/**
 * Tables included in backup / export / restore, parents first (FK order).
 * `users` and `shops` are deliberately excluded: password hashes must not sit in a JSON file,
 * and restoring must never be able to lock everybody out. `audit_logs` is append-only and excluded too.
 */
export const BACKUP_TABLES = [
  'brands', 'categories', 'suppliers', 'warehouses', 'products', 'variants', 'warehouse_stock',
  'orders', 'order_items', 'receipts', 'sales', 'movements', 'cash_activities',
] as const;

async function dumpAll() {
  const data: Record<string, unknown[]> = {};
  for (const t of BACKUP_TABLES) data[t] = (await query(`SELECT * FROM ${t}`)).rows; // table names come from the constant above
  return data;
}

export const dataTransferService = {
  listBackups,

  async createBackup(actor: AuthUser) {
    const result = triggerBackup({ version: 2, timestamp: new Date().toISOString(), data: await dumpAll() });
    await audit(pool, 'backup.created', { filename: result.filename }, actor);
    return result;
  },

  async exportAll() {
    return { version: 2, exportedAt: new Date().toISOString(), data: await dumpAll() };
  },

  /** Owner-only, requires explicit confirmation. Takes a safety backup first, restores in one transaction. */
  async restore(actor: AuthUser, filename: string) {
    let dump: any;
    try { dump = loadBackupContent(filename); } catch { throw notFound('Backup file not found'); }
    if (dump?.version !== 2 || typeof dump.data !== 'object') throw badRequest('Unsupported backup format (expected a v2 backup)');

    const safety = triggerBackup({ version: 2, timestamp: new Date().toISOString(), data: await dumpAll() });

    await withTransaction(async (tx) => {
      await query(`TRUNCATE ${[...BACKUP_TABLES].reverse().join(', ')}`, [], tx);
      for (const t of BACKUP_TABLES) {
        const rows = dump.data[t];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        // Column list comes from the catalog (skips generated columns such as sales.profit), data via jsonb_populate_recordset.
        const cols = (await query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'NEVER' ORDER BY ordinal_position`,
          [t], tx)).rows.map((r) => `"${String(r.column_name).replace(/"/g, '""')}"`).join(', ');
        await query(`INSERT INTO ${t} (${cols}) OVERRIDING SYSTEM VALUE SELECT ${cols} FROM jsonb_populate_recordset(null::${t}, $1::jsonb)`, [JSON.stringify(rows)], tx);
      }
      await query(`SELECT setval(pg_get_serial_sequence('receipts', 'receipt_number'), COALESCE((SELECT MAX(receipt_number) FROM receipts), 0) + 1, false)`, [], tx);
      await audit(tx, 'backup.restored', { filename, safetyBackup: safety.filename }, actor);
    });
    return { message: 'Database restored from backup', safetyBackup: safety.filename };
  },

  async importProducts(actor: AuthUser, input: { warehouseId?: string; products: any[] }) {
    return withTransaction(async (tx) => {
      let variants = 0;
      for (const item of input.products) {
        const brandId = await catalogService.brandIdByName(tx, item.brandName || 'Generic');
        const categoryId = (await catalogService.categoryIdByName(tx, item.category || 'Casual', true))!;
        const gender = String(item.gender || 'unisex').toLowerCase();
        const prod = await query(
          `INSERT INTO products (name, description, brand_id, category_id, gender, base_price) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [item.name, item.description ?? '', brandId, categoryId, ['men', 'women', 'unisex', 'boys', 'girls', 'kids'].includes(gender) ? gender : 'unisex', item.basePrice], tx);
        const vs = item.variants?.length ? item.variants : [{ size: '40', color: 'Black' }];
        for (const v of vs) {
          const ins = await query(
            'INSERT INTO variants (product_id, size, color, sku, barcode, price) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
            [prod.rows[0].id, v.size, v.color, v.sku || generateSku(item.name, v.size, v.color), v.barcode ?? null, v.price ?? item.basePrice], tx);
          if (v.currentStock && input.warehouseId) {
            await adjustStock(tx, input.warehouseId, ins.rows[0].id, v.currentStock);
            await recordMovement(tx, { variantId: ins.rows[0].id, type: 'in', quantity: v.currentStock, to: input.warehouseId, reason: 'Bulk import', createdBy: actor.name });
          }
          variants++;
        }
      }
      await audit(tx, 'import.products', { products: input.products.length, variants }, actor);
      return { message: `${input.products.length} products (${variants} variants) successfully imported` };
    });
  },
};
