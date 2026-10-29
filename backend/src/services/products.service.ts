import { isPostgresConnected, dbInstance, inMemoryDb } from '../config/db.ts';
import { MASTER_CATALOG_ITEMS } from '../data/masterCatalogData.ts';
import crypto from 'crypto';

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export interface ProductQueryOptions {
  warehouseId?: string;
  search?: string;
  category?: string;
  brandId?: string;
  gender?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const productsService = {
  async getBrands() {
    if (isPostgresConnected && dbInstance) {
      const result = await dbInstance.session.client.query('SELECT * FROM brands ORDER BY name ASC');
      return result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        logoUrl: r.logo_url,
        description: r.description,
        createdAt: r.created_at
      }));
    } else {
      return inMemoryDb.brands;
    }
  },

  async createBrand(brand: { id: string; name: string; logoUrl?: string; description?: string }) {
    if (isPostgresConnected && dbInstance) {
      const q = 'INSERT INTO brands (id, name, logo_url, description) VALUES ($1, $2, $3, $4) RETURNING *';
      const result = await dbInstance.session.client.query(q, [
        brand.id,
        brand.name,
        brand.logoUrl || null,
        brand.description || null
      ]);
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        logoUrl: row.logo_url,
        description: row.description,
        createdAt: row.created_at
      };
    } else {
      const newBrand = {
        id: brand.id,
        name: brand.name,
        logoUrl: brand.logoUrl || '',
        description: brand.description || ''
      };
      inMemoryDb.brands.push(newBrand);
      return newBrand;
    }
  },

  async getProducts(warehouseIdOrOptions?: string | ProductQueryOptions, legacyOptions?: ProductQueryOptions) {
    let opts: ProductQueryOptions = {};
    if (typeof warehouseIdOrOptions === 'string') {
      opts = { warehouseId: warehouseIdOrOptions, ...legacyOptions };
    } else if (warehouseIdOrOptions) {
      opts = warehouseIdOrOptions;
    }

    if (isPostgresConnected && dbInstance) {
      const whereClauses: string[] = [];
      const params: any[] = [];

      if (opts.warehouseId) {
        params.push(opts.warehouseId);
        whereClauses.push(`(p.warehouse_ids IS NULL OR p.warehouse_ids = '' OR p.warehouse_ids LIKE '%' || $${params.length} || '%')`);
      }

      if (opts.search && opts.search.trim()) {
        params.push(`%${opts.search.trim()}%`);
        whereClauses.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR b.name ILIKE $${params.length})`);
      }

      if (opts.category && opts.category.toLowerCase() !== 'all') {
        params.push(opts.category.trim());
        whereClauses.push(`LOWER(p.category) = LOWER($${params.length})`);
      }

      if (opts.brandId && opts.brandId.toLowerCase() !== 'all') {
        params.push(opts.brandId);
        whereClauses.push(`p.brand_id = $${params.length}`);
      }

      if (opts.gender && opts.gender.toLowerCase() !== 'all') {
        params.push(opts.gender.trim());
        whereClauses.push(`LOWER(p.gender) = LOWER($${params.length})`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      let sortCol = 'p.created_at';
      if (opts.sortBy === 'name') sortCol = 'p.name';
      else if (opts.sortBy === 'price' || opts.sortBy === 'basePrice') sortCol = 'p.base_price';
      else if (opts.sortBy === 'category') sortCol = 'p.category';

      const sortDir = (opts.sortOrder && opts.sortOrder.toLowerCase() === 'asc') ? 'ASC' : 'DESC';

      // Count query
      const countSql = `SELECT COUNT(*) as total FROM products p LEFT JOIN brands b ON p.brand_id = b.id ${whereSql}`;
      const countRes = await dbInstance.session.client.query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const page = opts.page && opts.page > 0 ? opts.page : 1;
      const limit = opts.limit && opts.limit > 0 ? opts.limit : undefined;

      let limitOffsetSql = '';
      const queryParams = [...params];
      if (limit) {
        queryParams.push(limit);
        limitOffsetSql += ` LIMIT $${queryParams.length}`;
        const offset = (page - 1) * limit;
        queryParams.push(offset);
        limitOffsetSql += ` OFFSET $${queryParams.length}`;
      }

      const dataSql = `
        SELECT p.*, b.name as brand_name, b.logo_url as brand_logo
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        ${whereSql}
        ORDER BY ${sortCol} ${sortDir}
        ${limitOffsetSql}
      `;

      const result = await dbInstance.session.client.query(dataSql, queryParams);
      const rows = result.rows;

      const productIds = rows.map((r: any) => r.id);
      const variantsMap: Record<string, any[]> = {};

      if (productIds.length > 0) {
        const vResult = await dbInstance.session.client.query(
          `SELECT * FROM variants WHERE product_id = ANY($1) ORDER BY size ASC`,
          [productIds]
        );
        for (const vr of vResult.rows) {
          if (!variantsMap[vr.product_id]) variantsMap[vr.product_id] = [];
          variantsMap[vr.product_id].push({
            id: vr.id,
            productId: vr.product_id,
            size: vr.size,
            color: vr.color,
            sku: vr.sku,
            currentStock: vr.current_stock,
            barcode: vr.barcode,
            price: parseFloat(vr.price),
            createdAt: vr.created_at
          });
        }
      }

      const productsList = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        brandId: row.brand_id,
        category: row.category,
        gender: row.gender,
        basePrice: parseFloat(row.base_price),
        warehouseIds: row.warehouse_ids ? row.warehouse_ids.split(',').filter(Boolean) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        brand: {
          id: row.brand_id,
          name: row.brand_name,
          logoUrl: row.brand_logo
        },
        variants: variantsMap[row.id] || []
      }));

      if (opts.page || opts.limit) {
        return {
          data: productsList,
          total,
          page,
          limit: limit || total,
          totalPages: limit ? Math.ceil(total / limit) : 1
        };
      }

      return productsList;
    } else {
      let list = inMemoryDb.products.filter((p: any) => {
        if (opts.warehouseId) {
          const whs = p.warehouseIds || [];
          if (whs.length > 0 && !whs.includes(opts.warehouseId)) return false;
        }
        if (opts.search && opts.search.trim()) {
          const q = opts.search.trim().toLowerCase();
          const brand = inMemoryDb.brands.find((b: any) => b.id === p.brandId);
          const match = p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            (brand && brand.name.toLowerCase().includes(q));
          if (!match) return false;
        }
        if (opts.category && opts.category.toLowerCase() !== 'all') {
          if ((p.category || '').toLowerCase() !== opts.category.toLowerCase()) return false;
        }
        if (opts.brandId && opts.brandId.toLowerCase() !== 'all') {
          if (p.brandId !== opts.brandId) return false;
        }
        if (opts.gender && opts.gender.toLowerCase() !== 'all') {
          if ((p.gender || '').toLowerCase() !== opts.gender.toLowerCase()) return false;
        }
        return true;
      });

      list.sort((a: any, b: any) => {
        let valA = a.createdAt;
        let valB = b.createdAt;
        if (opts.sortBy === 'name') { valA = a.name; valB = b.name; }
        else if (opts.sortBy === 'price' || opts.sortBy === 'basePrice') { valA = a.basePrice; valB = b.basePrice; }
        else if (opts.sortBy === 'category') { valA = a.category; valB = b.category; }

        if (valA < valB) return opts.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return opts.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      const total = list.length;
      const page = opts.page && opts.page > 0 ? opts.page : 1;
      const limit = opts.limit && opts.limit > 0 ? opts.limit : undefined;

      let paginatedList = list;
      if (limit) {
        const start = (page - 1) * limit;
        paginatedList = list.slice(start, start + limit);
      }

      const mapped = paginatedList.map((p: any) => {
        const brand = inMemoryDb.brands.find((b: any) => b.id === p.brandId);
        const variants = inMemoryDb.variants.filter((v: any) => v.productId === p.id);
        return {
          ...p,
          brand,
          variants,
          warehouseIds: p.warehouseIds || []
        };
      });

      if (opts.page || opts.limit) {
        return {
          data: mapped,
          total,
          page,
          limit: limit || total,
          totalPages: limit ? Math.ceil(total / limit) : 1
        };
      }

      return mapped;
    }
  },

  async createProduct(p: { id: string; name: string; description?: string; brandId: string; category?: string; gender?: string; basePrice: number; warehouseIds?: string[] }) {
    if (isPostgresConnected && dbInstance) {
      const q = `
        INSERT INTO products (id, name, description, brand_id, category, gender, base_price, warehouse_ids)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const result = await dbInstance.session.client.query(q, [
        p.id,
        p.name,
        p.description || '',
        p.brandId,
        p.category || 'Casual',
        p.gender || 'Unisex',
        p.basePrice,
        p.warehouseIds ? p.warehouseIds.join(',') : ''
      ]);
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        brandId: row.brand_id,
        category: row.category,
        gender: row.gender,
        basePrice: parseFloat(row.base_price),
        warehouseIds: row.warehouse_ids ? row.warehouse_ids.split(',').filter(Boolean) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        brand: null,
        variants: []
      };
    } else {
      const newProduct = {
        id: p.id,
        name: p.name,
        description: p.description || '',
        brandId: p.brandId,
        category: p.category || 'Casual',
        gender: p.gender || 'Unisex',
        basePrice: parseFloat(p.basePrice as any),
        warehouseIds: p.warehouseIds || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        brand: null,
        variants: []
      };
      inMemoryDb.products.push(newProduct);
      return newProduct;
    }
  },

  async updateProduct(id: string, p: { name?: string; description?: string; brandId?: string; category?: string; gender?: string; basePrice?: number; warehouseIds?: string[] }) {
    if (isPostgresConnected && dbInstance) {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (p.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(p.name);
      }
      if (p.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(p.description);
      }
      if (p.brandId !== undefined) {
        updates.push(`brand_id = $${paramCount++}`);
        values.push(p.brandId);
      }
      if (p.category !== undefined) {
        updates.push(`category = $${paramCount++}`);
        values.push(p.category);
      }
      if (p.gender !== undefined) {
        updates.push(`gender = $${paramCount++}`);
        values.push(p.gender);
      }
      if (p.basePrice !== undefined) {
        updates.push(`base_price = $${paramCount++}`);
        values.push(p.basePrice);
      }
      if (p.warehouseIds !== undefined) {
        updates.push(`warehouse_ids = $${paramCount++}`);
        values.push(p.warehouseIds ? p.warehouseIds.join(',') : '');
      }

      if (updates.length === 0) {
        const r = await dbInstance.session.client.query('SELECT * FROM products WHERE id = $1', [id]);
        if (r.rows.length === 0) return null;
        const row = r.rows[0];
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          brandId: row.brand_id,
          category: row.category,
          gender: row.gender,
          basePrice: parseFloat(row.base_price),
          warehouseIds: row.warehouse_ids ? row.warehouse_ids.split(',').filter(Boolean) : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      }

      values.push(id);
      const q = `
        UPDATE products 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await dbInstance.session.client.query(q, values);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        brandId: row.brand_id,
        category: row.category,
        gender: row.gender,
        basePrice: parseFloat(row.base_price),
        warehouseIds: row.warehouse_ids ? row.warehouse_ids.split(',').filter(Boolean) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } else {
      const idx = inMemoryDb.products.findIndex(prod => prod.id === id);
      if (idx === -1) return null;
      
      const updated = {
        ...inMemoryDb.products[idx],
        ...p,
        basePrice: p.basePrice !== undefined ? parseFloat(p.basePrice as any) : inMemoryDb.products[idx].basePrice,
        updatedAt: new Date().toISOString()
      };
      inMemoryDb.products[idx] = updated;
      return updated;
    }
  },

  async deleteProduct(id: string) {
    if (isPostgresConnected && dbInstance) {
      const result = await dbInstance.session.client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
      return result.rows.length > 0;
    } else {
      const idx = inMemoryDb.products.findIndex(p => p.id === id);
      if (idx === -1) return false;
      inMemoryDb.products.splice(idx, 1);
      inMemoryDb.variants = inMemoryDb.variants.filter(v => v.productId !== id);
      return true;
    }
  },

  async getMasterCatalog() {
    return MASTER_CATALOG_ITEMS;
  },

  async addFromCatalog(data: {
    name: string;
    genericName?: string;
    form?: string;
    strength?: string;
    manufacturer?: string;
    category?: string;
    sellingPrice: number;
    costPrice: number;
    reorderLevel: number;
    units: any[];
  }) {
    const brands = await this.getBrands();
    let brand = brands.find((b: any) => b.name.toLowerCase() === (data.manufacturer || '').toLowerCase());
    if (!brand) {
      const brandId = generateId();
      brand = await this.createBrand({
        id: brandId,
        name: data.manufacturer || 'Generic',
        description: `Manufacturer for ${data.name}`
      });
    }

    const productId = generateId();
    const category = (data.category && data.category !== '--') ? data.category : 'Sneakers';
    const description = `Model/Line: ${data.genericName || '--'} | Cut/Style: ${data.form || '--'} | Size/Tech: ${data.strength || '--'} | Brand: ${data.manufacturer || '--'}`;

    let createdProduct: any;

    if (isPostgresConnected && dbInstance) {
      const q = `
        INSERT INTO products (id, name, description, brand_id, category, gender, base_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const result = await dbInstance.session.client.query(q, [
        productId,
        data.name,
        description,
        brand.id,
        category,
        'Unisex',
        data.sellingPrice
      ]);
      const row = result.rows[0];
      createdProduct = {
        id: row.id,
        name: row.name,
        description: row.description,
        brandId: row.brand_id,
        category: row.category,
        gender: row.gender,
        basePrice: parseFloat(row.base_price),
        sellingPrice: data.sellingPrice,
        costPrice: data.costPrice,
        reorderLevel: data.reorderLevel,
        units: data.units,
        genericName: data.genericName,
        form: data.form,
        strength: data.strength,
        manufacturer: data.manufacturer,
        brand,
        variants: []
      };

      const variantId = generateId();
      const sku = `SKU-${data.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}-${Math.floor(100 + Math.random() * 900)}`;
      const barcode = `890${Math.floor(100000000 + Math.random() * 900000000)}`;

      const vQuery = `
        INSERT INTO variants (id, product_id, size, color, sku, current_stock, barcode, price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const vResult = await dbInstance.session.client.query(vQuery, [
        variantId,
        productId,
        data.strength || 'Standard',
        data.form || 'Standard',
        sku,
        0,
        barcode,
        data.sellingPrice
      ]);
      const vr = vResult.rows[0];
      createdProduct.variants.push({
        id: vr.id,
        productId: vr.product_id,
        size: vr.size,
        color: vr.color,
        sku: vr.sku,
        currentStock: vr.current_stock,
        barcode: vr.barcode,
        price: parseFloat(vr.price),
        createdAt: vr.created_at
      });
    } else {
      const variantId = generateId();
      const sku = `SKU-${data.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}-${Math.floor(100 + Math.random() * 900)}`;
      const barcode = `890${Math.floor(100000000 + Math.random() * 900000000)}`;

      const newVariant = {
        id: variantId,
        productId: productId,
        size: data.strength || 'Standard',
        color: data.form || 'Standard',
        sku,
        currentStock: 0,
        barcode,
        price: data.sellingPrice,
        createdAt: new Date().toISOString()
      };

      createdProduct = {
        id: productId,
        name: data.name,
        description,
        brandId: brand.id,
        category,
        gender: 'Unisex',
        basePrice: data.sellingPrice,
        sellingPrice: data.sellingPrice,
        costPrice: data.costPrice,
        reorderLevel: data.reorderLevel,
        units: data.units,
        genericName: data.genericName,
        form: data.form,
        strength: data.strength,
        manufacturer: data.manufacturer,
        warehouseIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        brand,
        variants: [newVariant]
      };

      inMemoryDb.products.unshift(createdProduct);
      inMemoryDb.variants.unshift(newVariant);
    }

    return createdProduct;
  },

  async getCategories() {
    if (isPostgresConnected && dbInstance) {
      const result = await dbInstance.session.client.query('SELECT * FROM categories ORDER BY name ASC');
      if (result.rows.length === 0) {
        for (const cat of defaultCategoriesList) {
          await dbInstance.session.client.query(
            'INSERT INTO categories (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
            [cat.id, cat.name, cat.description]
          );
        }
        const seededResult = await dbInstance.session.client.query('SELECT * FROM categories ORDER BY name ASC');
        return seededResult.rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          createdAt: r.created_at
        }));
      }
      return result.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        createdAt: r.created_at
      }));
    } else {
      if (!inMemoryDb.categories) {
        inMemoryDb.categories = [...defaultCategoriesList];
      }
      return inMemoryDb.categories;
    }
  },

  async createCategory(category: { id: string; name: string; description?: string }) {
    if (isPostgresConnected && dbInstance) {
      const q = 'INSERT INTO categories (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING *';
      const result = await dbInstance.session.client.query(q, [
        category.id,
        category.name,
        category.description || null
      ]);
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.created_at
      };
    } else {
      if (!inMemoryDb.categories) {
        inMemoryDb.categories = [...defaultCategoriesList];
      }
      const existing = inMemoryDb.categories.find((c: any) => c.name.toLowerCase() === category.name.toLowerCase());
      if (existing) {
        if (category.description) existing.description = category.description;
        return existing;
      }
      const newCat = {
        id: category.id,
        name: category.name,
        description: category.description || '',
        createdAt: new Date().toISOString()
      };
      inMemoryDb.categories.push(newCat);
      return newCat;
    }
  }
};

const defaultCategoriesList = [
  { id: 'cat1', name: 'Sneakers', description: 'Everyday lifestyle and casual sneakers', createdAt: new Date().toISOString() },
  { id: 'cat2', name: 'Running Shoes', description: 'Performance and trail running shoes', createdAt: new Date().toISOString() },
  { id: 'cat3', name: 'Retro Basketball', description: 'Classic basketball footwear and retros', createdAt: new Date().toISOString() },
  { id: 'cat4', name: 'Performance Running', description: 'High performance marathon and track shoes', createdAt: new Date().toISOString() },
  { id: 'cat5', name: 'Lifestyle / Classics', description: 'Timeless classic shoes and heritage silhouettes', createdAt: new Date().toISOString() },
  { id: 'cat6', name: 'Skateboarding', description: 'Durable skate shoes and boardfeel sneakers', createdAt: new Date().toISOString() },
  { id: 'cat7', name: 'Trail / Outdoor', description: 'All-terrain outdoor and hiking footwear', createdAt: new Date().toISOString() },
  { id: 'cat8', name: 'Sandals & Slides', description: 'Casual slides, clogs, and sandals', createdAt: new Date().toISOString() },
  { id: 'cat9', name: 'Formal Shoes', description: 'Dress shoes, Oxfords, and leather formals', createdAt: new Date().toISOString() },
  { id: 'cat10', name: 'Boots', description: 'Leather boots, Chelsea boots, and work boots', createdAt: new Date().toISOString() },
  { id: 'cat11', name: 'Loafers', description: 'Comfort slip-on loafers and dress shoes', createdAt: new Date().toISOString() }
];
