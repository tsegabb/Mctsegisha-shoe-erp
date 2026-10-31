import { pool, query, withTransaction, type Queryable } from '../config/db.ts';
import { MASTER_CATALOG_ITEMS } from '../data/masterCatalogData.ts';
import { notFound, unprocessable } from '../errors/AppError.ts';
import type { AuthUser } from '../types/auth.types.ts';
import { generateSku } from '../utils/crypto.ts';
import { pageResult, resolvePaging } from '../utils/pagination.ts';
import { Params, likeContains, num, variantStockSource } from '../utils/sql.ts';
import type { AddFromCatalogInput, CreateProductInput, ListProductsQuery, UpdateProductInput } from '../validators/product.validator.ts';
import { audit } from './audit.service.ts';
import { catalogService } from './catalog.service.ts';
import { resolveWarehouseScope, type WarehouseScope } from './scope.service.ts';

const SORTS: Record<string, string> = {
  name: 'p.name', price: 'p.base_price', basePrice: 'p.base_price', category: 'c.name', createdAt: 'p.created_at',
};

const PRODUCT_SELECT = `
  SELECT p.*, b.name AS brand_name, b.logo_url AS brand_logo, c.name AS category_name
  FROM products p
  JOIN brands b ON b.id = p.brand_id
  JOIN categories c ON c.id = p.category_id`;

export const mapVariant = (v: any) => ({
  id: v.id, productId: v.product_id, size: v.size, color: v.color, sku: v.sku, barcode: v.barcode,
  price: num(v.price), isActive: v.is_active, currentStock: v.current_stock ?? 0, createdAt: v.created_at,
});

const mapProduct = (p: any, variants: any[] = []) => ({
  id: p.id, name: p.name, description: p.description,
  brandId: p.brand_id, categoryId: p.category_id, category: p.category_name, gender: p.gender,
  basePrice: num(p.base_price), costPrice: p.cost_price === null ? null : num(p.cost_price),
  sku: p.sku, imageUrl: p.image_url, imageUrls: p.image_urls ?? [], isActive: p.is_active,
  createdAt: p.created_at, updatedAt: p.updated_at,
  brand: { id: p.brand_id, name: p.brand_name, logoUrl: p.brand_logo },
  variants: variants.map(mapVariant),
});

async function resolveCategoryId(db: Queryable, input: { categoryId?: string; category?: string }): Promise<string> {
  if (input.categoryId) return input.categoryId;
  const id = await catalogService.categoryIdByName(db, input.category!);
  if (!id) throw unprocessable(`Unknown category "${input.category}". Create it first or send categoryId.`);
  return id;
}

async function loadVariants(db: Queryable, productIds: string[], scope: WarehouseScope) {
  if (productIds.length === 0) return new Map<string, any[]>();
  const p = new Params();
  const idsRef = p.add(productIds);
  const scopeRef = scope ? p.add(scope) : undefined;
  const { rows } = await query(
    `SELECT v.* FROM ${variantStockSource(scopeRef)} v WHERE v.product_id = ANY(${idsRef}::uuid[]) ORDER BY v.size, v.color`, p.values, db);
  const map = new Map<string, any[]>();
  for (const v of rows) (map.get(v.product_id) ?? map.set(v.product_id, []).get(v.product_id)!).push(v);
  return map;
}

export const productsService = {
  async list(user: AuthUser, q: ListProductsQuery) {
    const scope = await resolveWarehouseScope(user, q.warehouseId ?? q.shopId);
    const paging = resolvePaging(q);
    const p = new Params();
    const where: string[] = [];

    if (scope) {
      // Branch view: products that have stock in the branch, plus never-stocked products (so new items stay visible).
      const ref = p.add(scope);
      where.push(`(EXISTS (SELECT 1 FROM variants vv JOIN warehouse_stock ws ON ws.variant_id = vv.id
                            WHERE vv.product_id = p.id AND ws.warehouse_id = ANY(${ref}::uuid[]))
                   OR NOT EXISTS (SELECT 1 FROM variants vv JOIN warehouse_stock ws ON ws.variant_id = vv.id WHERE vv.product_id = p.id))`);
    }
    if (q.search) {
      const ref = p.add(likeContains(q.search));
      where.push(`(p.name ILIKE ${ref} OR p.description ILIKE ${ref} OR b.name ILIKE ${ref} OR p.sku ILIKE ${ref})`);
    }
    if (q.categoryId) where.push(`p.category_id = ${p.add(q.categoryId)}`);
    if (q.category) where.push(`lower(c.name) = lower(${p.add(q.category)})`);
    if (q.brandId) where.push(`p.brand_id = ${p.add(q.brandId)}`);
    if (q.gender) where.push(`p.gender = ${p.add(q.gender.toLowerCase().replace(/[\s-]+/g, '_'))}`);

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sortCol = SORTS[q.sortBy ?? 'createdAt'];
    const dir = q.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const base = `FROM products p JOIN brands b ON b.id = p.brand_id JOIN categories c ON c.id = p.category_id ${whereSql}`;
    const total = (await query(`SELECT COUNT(*)::int AS n ${base}`, p.values)).rows[0].n;

    const limitRef = p.add(paging.limit);
    const offsetRef = p.add(paging.offset);
    const { rows } = await query(
      `SELECT p.*, b.name AS brand_name, b.logo_url AS brand_logo, c.name AS category_name ${base}
       ORDER BY ${sortCol} ${dir}, p.id LIMIT ${limitRef} OFFSET ${offsetRef}`, p.values);

    const variants = await loadVariants(pool, rows.map((r) => r.id), scope);
    return pageResult(rows.map((r) => mapProduct(r, variants.get(r.id))), total, paging);
  },

  async getById(id: string, db: Queryable = pool) {
    const { rows } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [id], db);
    if (!rows[0]) throw notFound('Product not found');
    const variants = await loadVariants(db, [id], null);
    return mapProduct(rows[0], variants.get(id));
  },

  async create(actor: AuthUser, input: CreateProductInput) {
    return withTransaction(async (tx) => {
      const categoryId = await resolveCategoryId(tx, input);
      const { rows } = await query(
        `INSERT INTO products (name, description, brand_id, category_id, gender, base_price, cost_price, sku, image_url, image_urls, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) RETURNING id`,
        [input.name, input.description ?? '', input.brandId, categoryId, input.gender ?? 'unisex', input.basePrice,
         input.costPrice ?? null, input.sku ?? null, input.imageUrl ?? null, JSON.stringify(input.imageUrls ?? []), input.isActive ?? true], tx);
      await audit(tx, 'product.created', { productId: rows[0].id, name: input.name, basePrice: input.basePrice }, actor);
      return productsService.getById(rows[0].id, tx);
    });
  },

  async update(actor: AuthUser, id: string, input: UpdateProductInput) {
    return withTransaction(async (tx) => {
      const sets: string[] = [];
      const vals: unknown[] = [];
      const set = (col: string, v: unknown, cast = '') => { vals.push(v); sets.push(`${col} = $${vals.length}${cast}`); };

      if (input.name !== undefined) set('name', input.name);
      if (input.description !== undefined) set('description', input.description);
      if (input.brandId !== undefined) set('brand_id', input.brandId);
      if (input.categoryId !== undefined || input.category !== undefined) set('category_id', await resolveCategoryId(tx, input));
      if (input.gender !== undefined) set('gender', input.gender);
      if (input.basePrice !== undefined) set('base_price', input.basePrice);
      if (input.costPrice !== undefined) set('cost_price', input.costPrice);
      if (input.sku !== undefined) set('sku', input.sku);
      if (input.imageUrl !== undefined) set('image_url', input.imageUrl);
      if (input.imageUrls !== undefined) set('image_urls', JSON.stringify(input.imageUrls), '::jsonb');
      if (input.isActive !== undefined) set('is_active', input.isActive);
      if (sets.length === 0) return productsService.getById(id, tx);

      vals.push(id);
      const res = await query(`UPDATE products SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id`, vals, tx);
      if (!res.rows[0]) throw notFound('Product not found');
      if (input.basePrice !== undefined || input.costPrice !== undefined) {
        await audit(tx, 'product.price_changed', { productId: id, basePrice: input.basePrice, costPrice: input.costPrice }, actor);
      }
      return productsService.getById(id, tx);
    });
  },

  async remove(actor: AuthUser, id: string) {
    await withTransaction(async (tx) => {
      const { rows } = await query('DELETE FROM products WHERE id = $1 RETURNING name', [id], tx); // variants cascade; sales/movements RESTRICT -> 409
      if (!rows[0]) throw notFound('Product not found');
      await audit(tx, 'product.deleted', { productId: id, name: rows[0].name }, actor);
    });
  },

  getMasterCatalog: () => MASTER_CATALOG_ITEMS,

  async addFromCatalog(actor: AuthUser, d: AddFromCatalogInput) {
    return withTransaction(async (tx) => {
      const brandId = await catalogService.brandIdByName(tx, d.manufacturer?.trim() || 'Generic');
      const catName = d.category && d.category !== '--' ? d.category : 'Sneakers';
      const categoryId = (await catalogService.categoryIdByName(tx, catName, true))!;
      const description = `Model/Line: ${d.genericName || '--'} | Cut/Style: ${d.form || '--'} | Size/Tech: ${d.strength || '--'} | Brand: ${d.manufacturer || '--'}`;

      const prod = await query(
        `INSERT INTO products (name, description, brand_id, category_id, gender, base_price, cost_price)
         VALUES ($1,$2,$3,$4,'unisex',$5,$6) RETURNING id`,
        [d.name, description, brandId, categoryId, d.sellingPrice, d.costPrice || null], tx);

      // One placeholder variant; real sizes/colours are added through POST /variants.
      await query(
        `INSERT INTO variants (product_id, size, color, sku, price) VALUES ($1,'Standard','Standard',$2,$3)`,
        [prod.rows[0].id, generateSku(d.manufacturer ?? 'GEN', d.name), d.sellingPrice], tx);

      await audit(tx, 'product.created_from_catalog', { productId: prod.rows[0].id, name: d.name }, actor);
      return productsService.getById(prod.rows[0].id, tx);
    });
  },
};

