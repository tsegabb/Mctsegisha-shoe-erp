import { pool, query, withTransaction } from '../config/db.ts';
import { notFound } from '../errors/AppError.ts';
import type { AuthUser } from '../types/auth.types.ts';
import { generateSku } from '../utils/crypto.ts';
import { Params, likeContains, variantStockSource } from '../utils/sql.ts';
import type {
  CreateSupplierInput, CreateVariantInput, CreateWarehouseInput, UpdateSupplierInput, UpdateVariantInput, UpdateWarehouseInput,
} from '../validators/inventory.validator.ts';
import { audit } from './audit.service.ts';
import { assertWarehouseAccess, isPrivileged, resolveWarehouseScope } from './scope.service.ts';
import { recordMovement, adjustStock } from './stock.service.ts';
import { mapVariant } from './products.service.ts';

// ---------------------------------------------------------------- variants
const mapVariantRow = (r: any) => ({
  ...mapVariant(r), productName: r.product_name, productBrand: r.brand_name, category: r.category_name,
});

export async function getAllVariantsList(scope: string[] | null = null, filters: { productId?: string; search?: string; includeInactive?: boolean } = {}) {
  const p = new Params();
  const scopeRef = scope ? p.add(scope) : undefined;
  const where: string[] = [];
  if (!filters.includeInactive) where.push('v.is_active AND p.is_active');
  if (filters.productId) where.push(`v.product_id = ${p.add(filters.productId)}`);
  if (filters.search) {
    const ref = p.add(likeContains(filters.search));
    where.push(`(v.sku ILIKE ${ref} OR p.name ILIKE ${ref} OR b.name ILIKE ${ref} OR v.barcode ILIKE ${ref})`);
  }
  const { rows } = await query(
    `SELECT v.*, p.name AS product_name, b.name AS brand_name, c.name AS category_name
     FROM ${variantStockSource(scopeRef)} v
     JOIN products p ON p.id = v.product_id
     JOIN brands b ON b.id = p.brand_id
     JOIN categories c ON c.id = p.category_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY v.sku ASC LIMIT 5000`, p.values);
  return rows.map(mapVariantRow);
}

async function variantById(id: string, db = pool as any) {
  const { rows } = await query(
    `SELECT v.*, p.name AS product_name, b.name AS brand_name, c.name AS category_name
     FROM variants_with_stock v JOIN products p ON p.id = v.product_id JOIN brands b ON b.id = p.brand_id JOIN categories c ON c.id = p.category_id
     WHERE v.id = $1`, [id], db);
  if (!rows[0]) throw notFound('Variant not found');
  return mapVariantRow(rows[0]);
}

export const variantsService = {
  async list(user: AuthUser, q: { warehouseId?: string; shopId?: string; productId?: string; search?: string; includeInactive?: string }) {
    const scope = await resolveWarehouseScope(user, q.warehouseId ?? q.shopId);
    return getAllVariantsList(scope, { productId: q.productId, search: q.search, includeInactive: q.includeInactive === 'true' });
  },

  async create(actor: AuthUser, input: CreateVariantInput) {
    return withTransaction(async (tx) => {
      if (input.currentStock) await assertWarehouseAccess(actor, [input.warehouseId], tx);
      const prod = await query('SELECT p.name, b.name AS brand FROM products p JOIN brands b ON b.id = p.brand_id WHERE p.id = $1', [input.productId], tx);
      if (!prod.rows[0]) throw notFound('Product not found');
      const sku = input.sku ?? generateSku(prod.rows[0].brand, prod.rows[0].name, input.size, input.color);

      const { rows } = await query(
        `INSERT INTO variants (product_id, size, color, sku, barcode, price, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [input.productId, input.size, input.color, sku, input.barcode ?? null, input.price, input.isActive ?? true], tx);
      const id = rows[0].id as string;

      if (input.currentStock && input.warehouseId) {
        await adjustStock(tx, input.warehouseId, id, input.currentStock);
        await recordMovement(tx, { variantId: id, type: 'in', quantity: input.currentStock, to: input.warehouseId, reason: 'Initial stock', createdBy: actor.name });
      }
      await audit(tx, 'variant.created', { variantId: id, sku, initialStock: input.currentStock ?? 0 }, actor);
      return variantById(id, tx);
    });
  },

  async update(actor: AuthUser, id: string, input: UpdateVariantInput) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
    if (input.size !== undefined) set('size', input.size);
    if (input.color !== undefined) set('color', input.color);
    if (input.sku !== undefined) set('sku', input.sku);
    if (input.barcode !== undefined) set('barcode', input.barcode);
    if (input.price !== undefined) set('price', input.price);
    if (input.isActive !== undefined) set('is_active', input.isActive);
    vals.push(id);
    const res = await query(`UPDATE variants SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id, price`, vals);
    if (!res.rows[0]) throw notFound('Variant not found');
    if (input.price !== undefined) await audit(pool, 'variant.price_changed', { variantId: id, price: input.price }, actor);
    return variantById(id);
  },

  async remove(actor: AuthUser, id: string) {
    const { rows } = await query('DELETE FROM variants WHERE id = $1 RETURNING sku', [id]); // sales/movements RESTRICT -> 409
    if (!rows[0]) throw notFound('Variant not found');
    await audit(pool, 'variant.deleted', { variantId: id, sku: rows[0].sku }, actor);
  },
};

// -------------------------------------------------------------- warehouses
const mapWarehouse = (r: any) => ({
  id: r.id, name: r.name, code: r.code, location: r.location, capacity: r.capacity,
  isActive: r.is_active, shopId: r.shop_id ?? null, createdAt: r.created_at,
});

export const warehousesService = {
  async list(user: AuthUser) {
    const scope = isPrivileged(user) ? null : await resolveWarehouseScope(user);
    const p = new Params();
    const { rows } = await query(
      `SELECT * FROM warehouses ${scope ? `WHERE id = ANY(${p.add(scope)}::uuid[])` : ''} ORDER BY name ASC`, p.values);
    return rows.map(mapWarehouse);
  },

  async create(actor: AuthUser, w: CreateWarehouseInput) {
    const { rows } = await query(
      'INSERT INTO warehouses (name, code, location, capacity, shop_id, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [w.name, w.code, w.location, w.capacity, w.shopId ?? null, w.isActive ?? true]);
    await audit(pool, 'warehouse.created', { warehouseId: rows[0].id, code: w.code }, actor);
    return mapWarehouse(rows[0]);
  },

  async update(actor: AuthUser, id: string, w: UpdateWarehouseInput) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
    if (w.name !== undefined) set('name', w.name);
    if (w.code !== undefined) set('code', w.code);
    if (w.location !== undefined) set('location', w.location);
    if (w.capacity !== undefined) set('capacity', w.capacity);
    if (w.shopId !== undefined) set('shop_id', w.shopId);
    if (w.isActive !== undefined) set('is_active', w.isActive);
    vals.push(id);
    const { rows } = await query(`UPDATE warehouses SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (!rows[0]) throw notFound('Warehouse not found');
    await audit(pool, 'warehouse.updated', { warehouseId: id, changes: { ...w } }, actor);
    return mapWarehouse(rows[0]);
  },

  async remove(actor: AuthUser, id: string) {
    const { rows } = await query('DELETE FROM warehouses WHERE id = $1 RETURNING code', [id]); // stock/sales/movements RESTRICT -> 409
    if (!rows[0]) throw notFound('Warehouse not found');
    await audit(pool, 'warehouse.deleted', { warehouseId: id, code: rows[0].code }, actor);
  },
};

// --------------------------------------------------------------- suppliers
const mapSupplier = (r: any) => ({
  id: r.id, name: r.name, contactPerson: r.contact_person, email: r.email, phone: r.phone, address: r.address,
  isActive: r.is_active, createdAt: r.created_at,
});

export const suppliersService = {
  async list() {
    const { rows } = await query('SELECT * FROM suppliers ORDER BY name ASC');
    return rows.map(mapSupplier);
  },

  async create(actor: AuthUser, s: CreateSupplierInput) {
    const { rows } = await query(
      'INSERT INTO suppliers (name, contact_person, email, phone, address, is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [s.name, s.contactPerson, s.email, s.phone, s.address, s.isActive ?? true]);
    await audit(pool, 'supplier.created', { supplierId: rows[0].id, name: s.name }, actor);
    return mapSupplier(rows[0]);
  },

  async update(actor: AuthUser, id: string, s: UpdateSupplierInput) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
    if (s.name !== undefined) set('name', s.name);
    if (s.contactPerson !== undefined) set('contact_person', s.contactPerson);
    if (s.email !== undefined) set('email', s.email);
    if (s.phone !== undefined) set('phone', s.phone);
    if (s.address !== undefined) set('address', s.address);
    if (s.isActive !== undefined) set('is_active', s.isActive);
    vals.push(id);
    const { rows } = await query(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (!rows[0]) throw notFound('Supplier not found');
    await audit(pool, 'supplier.updated', { supplierId: id }, actor);
    return mapSupplier(rows[0]);
  },

  async remove(actor: AuthUser, id: string) {
    const { rows } = await query('DELETE FROM suppliers WHERE id = $1 RETURNING name', [id]);
    if (!rows[0]) throw notFound('Supplier not found');
    await audit(pool, 'supplier.deleted', { supplierId: id, name: rows[0].name }, actor);
  },
};

