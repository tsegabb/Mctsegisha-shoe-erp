import { query, type Queryable } from '../config/db.ts';

const mapBrand = (r: any) => ({ id: r.id, name: r.name, logoUrl: r.logo_url, description: r.description });
const mapCategory = (r: any) => ({ id: r.id, name: r.name, description: r.description, createdAt: r.created_at });

export const catalogService = {
  async getBrands() {
    const { rows } = await query('SELECT id, name, logo_url, description FROM brands ORDER BY name ASC');
    return rows.map(mapBrand);
  },

  async createBrand(b: { name: string; logoUrl?: string; description?: string }) {
    const { rows } = await query(
      'INSERT INTO brands (name, logo_url, description) VALUES ($1,$2,$3) RETURNING id, name, logo_url, description',
      [b.name, b.logoUrl || null, b.description || null]); // brands_name_lower_uq -> 409 on duplicates
    return mapBrand(rows[0]);
  },

  async getCategories() {
    const { rows } = await query('SELECT id, name, description, created_at FROM categories ORDER BY name ASC');
    return rows.map(mapCategory);
  },

  async createCategory(c: { name: string; description?: string }) {
    const { rows } = await query(
      `INSERT INTO categories (name, description) VALUES ($1,$2)
       ON CONFLICT (name) DO UPDATE SET description = COALESCE(EXCLUDED.description, categories.description)
       RETURNING id, name, description, created_at`,
      [c.name, c.description || null]);
    return mapCategory(rows[0]);
  },

  /** Find-or-create helpers used by catalog/import flows (inside a transaction). */
  async brandIdByName(db: Queryable, name: string): Promise<string> {
    const found = await query('SELECT id FROM brands WHERE lower(name) = lower($1)', [name], db);
    if (found.rows[0]) return found.rows[0].id;
    const ins = await query(
      `INSERT INTO brands (name) VALUES ($1) ON CONFLICT ((lower(name))) DO UPDATE SET name = brands.name RETURNING id`, [name], db);
    return ins.rows[0].id;
  },

  async categoryIdByName(db: Queryable, name: string, createIfMissing = false): Promise<string | null> {
    const found = await query('SELECT id FROM categories WHERE lower(name) = lower($1)', [name], db);
    if (found.rows[0]) return found.rows[0].id;
    if (!createIfMissing) return null;
    const ins = await query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = categories.name RETURNING id', [name], db);
    return ins.rows[0].id;
  },
};
