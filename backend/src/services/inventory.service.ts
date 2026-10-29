import { isPostgresConnected, dbInstance, inMemoryDb } from '../config/db.ts';
import { getNotificationSettings, sendLowStockEmailSummary } from '../../notifications.ts';
import { mockData } from '../db/schema/index.ts';

export enum MovementType {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment'
}

export enum OrderStatus {
  PENDING = 'pending',
  SHIPPED = 'shipped',
  RECEIVED = 'received',
  CANCELLED = 'cancelled'
}

export interface MovementQueryOptions {
  warehouseId?: string;
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface OrderQueryOptions {
  supplierId?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function getAllVariantsList(warehouseId?: string): Promise<any[]> {
  if (isPostgresConnected && dbInstance) {
    let q = `
      SELECT v.*, p.name as product_name, p.category as product_category, b.name as brand_name, p.warehouse_ids
      FROM variants v
      LEFT JOIN products p ON v.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
    `;
    const params: any[] = [];
    if (warehouseId) {
      q += ` WHERE (
        p.warehouse_ids IS NULL 
        OR p.warehouse_ids = '' 
        OR p.warehouse_ids LIKE '%' || $1 || '%' 
        OR EXISTS (
          SELECT 1 FROM movements m 
          WHERE m.variant_id = v.id 
          AND (m.from_warehouse_id = $1 OR m.to_warehouse_id = $1)
        )
      )`;
      params.push(warehouseId);
    }
    q += ` ORDER BY v.sku ASC`;
    let result = await dbInstance.session.client.query(q, params);

    if (warehouseId && result.rows.length === 0) {
      const fallbackQ = `
        SELECT v.*, p.name as product_name, p.category as product_category, b.name as brand_name, p.warehouse_ids
        FROM variants v
        LEFT JOIN products p ON v.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
        ORDER BY v.sku ASC
      `;
      result = await dbInstance.session.client.query(fallbackQ);
    }

    return result.rows.map((vr: any) => ({
      id: vr.id,
      productId: vr.product_id,
      size: vr.size,
      color: vr.color,
      sku: vr.sku,
      currentStock: vr.current_stock,
      barcode: vr.barcode,
      price: parseFloat(vr.price),
      createdAt: vr.created_at,
      productName: vr.product_name,
      productBrand: vr.brand_name,
      category: vr.product_category || vr.category || 'Sneakers'
    }));
  } else {
    let list = inMemoryDb.variants;
    if (warehouseId) {
      const filteredList = list.filter((v: any) => {
        const product = inMemoryDb.products.find((p: any) => p.id === v.productId);
        const rawWh = product?.warehouseIds || product?.warehouse_ids;
        let pWarehouseIds: string[] = [];
        if (Array.isArray(rawWh)) {
          pWarehouseIds = rawWh;
        } else if (typeof rawWh === 'string' && rawWh.trim() !== '') {
          pWarehouseIds = rawWh.split(',').filter(Boolean);
        }
        const hasWarehouse = pWarehouseIds.length === 0 || pWarehouseIds.includes(warehouseId);
        const hasMovement = inMemoryDb.movements?.some((m: any) => m.variantId === v.id && (m.fromWarehouseId === warehouseId || m.toWarehouseId === warehouseId));
        return hasWarehouse || hasMovement;
      });
      if (filteredList.length > 0) {
        list = filteredList;
      }
    }
    return list.map(v => {
      const product = inMemoryDb.products.find(p => p.id === v.productId);
      const brand = product ? inMemoryDb.brands.find(b => b.id === product.brandId) : null;
      return {
        ...v,
        currentStock: v.currentStock,
        productName: product?.name,
        productBrand: brand?.name,
        category: product?.category || (v as any).category || 'Sneakers'
      };
    });
  }
}

export async function triggerAutoNotificationCheck() {
  try {
    const settings = getNotificationSettings();
    if (settings.enableAutoEmail) {
      const list = await getAllVariantsList();
      await sendLowStockEmailSummary(list, false);
    }
  } catch (error) {
    console.error('Error during automatic low-stock email trigger:', error);
  }
}

export const inventoryService = {
  // --- VARIANTS ---
  async getVariants(warehouseId?: string) {
    return getAllVariantsList(warehouseId);
  },

  async createVariant(v: { id: string; productId: string; size: string; color: string; sku: string; barcode?: string; price: number; currentStock: number }) {
    if (isPostgresConnected && dbInstance) {
      const q = `
        INSERT INTO variants (id, product_id, size, color, sku, barcode, price, current_stock)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const result = await dbInstance.session.client.query(q, [
        v.id, v.productId, v.size, v.color, v.sku, v.barcode || null, v.price, v.currentStock
      ]);
      const row = result.rows[0];
      return {
        id: row.id,
        productId: row.product_id,
        size: row.size,
        color: row.color,
        sku: row.sku,
        barcode: row.barcode,
        price: parseFloat(row.price),
        currentStock: row.current_stock,
        createdAt: row.created_at
      };
    } else {
      const newVariant = {
        id: v.id,
        productId: v.productId,
        size: v.size,
        color: v.color,
        sku: v.sku,
        barcode: v.barcode || '',
        price: parseFloat(v.price as any),
        currentStock: v.currentStock,
        createdAt: new Date().toISOString()
      };
      inMemoryDb.variants.push(newVariant);
      return newVariant;
    }
  },

  async updateVariant(id: string, v: { size: string; color: string; sku: string; barcode?: string; price: number; currentStock: number }) {
    if (isPostgresConnected && dbInstance) {
      const q = `
        UPDATE variants
        SET size = $1, color = $2, sku = $3, barcode = $4, price = $5, current_stock = $6
        WHERE id = $7
        RETURNING *
      `;
      const result = await dbInstance.session.client.query(q, [
        v.size, v.color, v.sku, v.barcode || null, v.price, v.currentStock, id
      ]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        productId: row.product_id,
        size: row.size,
        color: row.color,
        sku: row.sku,
        barcode: row.barcode,
        price: parseFloat(row.price),
        currentStock: row.current_stock,
        createdAt: row.created_at
      };
    } else {
      const idx = inMemoryDb.variants.findIndex(vr => vr.id === id);
      if (idx === -1) return null;

      inMemoryDb.variants[idx] = {
        ...inMemoryDb.variants[idx],
        size: v.size,
        color: v.color,
        sku: v.sku,
        barcode: v.barcode || '',
        price: parseFloat(v.price as any),
        currentStock: v.currentStock
      };
      return inMemoryDb.variants[idx];
    }
  },

  async deleteVariant(id: string) {
    if (isPostgresConnected && dbInstance) {
      const result = await dbInstance.session.client.query('DELETE FROM variants WHERE id = $1 RETURNING *', [id]);
      return result.rows.length > 0;
    } else {
      const idx = inMemoryDb.variants.findIndex(v => v.id === id);
      if (idx === -1) return false;
      inMemoryDb.variants.splice(idx, 1);
      return true;
    }
  },

  // --- WAREHOUSES ---
  async getWarehouses() {
    if (isPostgresConnected && dbInstance) {
      const result = await dbInstance.session.client.query('SELECT * FROM warehouses ORDER BY name ASC');
      return result.rows;
    } else {
      return inMemoryDb.warehouses;
    }
  },

  async createWarehouse(w: { id: string; name: string; code: string; location?: string; capacity: number }) {
    if (isPostgresConnected && dbInstance) {
      const q = `
        INSERT INTO warehouses (id, name, code, location, capacity)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const result = await dbInstance.session.client.query(q, [w.id, w.name, w.code, w.location || '', w.capacity]);
      return result.rows[0];
    } else {
      const newWh = {
        id: w.id,
        name: w.name,
        code: w.code,
        location: w.location || '',
        capacity: w.capacity,
        createdAt: new Date().toISOString()
      };
      inMemoryDb.warehouses.push(newWh);
      return newWh;
    }
  },

  async updateWarehouse(id: string, w: { name: string; code: string; location?: string; capacity: number }) {
    if (isPostgresConnected && dbInstance) {
      const q = `
        UPDATE warehouses
        SET name = $1, code = $2, location = $3, capacity = $4
        WHERE id = $5
        RETURNING *
      `;
      const result = await dbInstance.session.client.query(q, [w.name, w.code, w.location || '', w.capacity, id]);
      if (result.rows.length === 0) return null;
      return result.rows[0];
    } else {
      const idx = inMemoryDb.warehouses.findIndex(wh => wh.id === id);
      if (idx === -1) return null;

      inMemoryDb.warehouses[idx] = {
        ...inMemoryDb.warehouses[idx],
        name: w.name,
        code: w.code,
        location: w.location || '',
        capacity: w.capacity
      };
      return inMemoryDb.warehouses[idx];
    }
  },

  async deleteWarehouse(id: string) {
    if (isPostgresConnected && dbInstance) {
      const result = await dbInstance.session.client.query('DELETE FROM warehouses WHERE id = $1 RETURNING *', [id]);
      return result.rows.length > 0;
    } else {
      const idx = inMemoryDb.warehouses.findIndex(w => w.id === id);
      if (idx === -1) return false;
      inMemoryDb.warehouses.splice(idx, 1);
      return true;
    }
  },

  // --- SUPPLIERS ---
  async getSuppliers() {
    if (isPostgresConnected && dbInstance) {
      const result = await dbInstance.session.client.query('SELECT * FROM suppliers ORDER BY name ASC');
      return result.rows;
    } else {
      return inMemoryDb.suppliers;
    }
  },

  async createSupplier(s: { id: string; name: string; contactPerson?: string; email: string; phone?: string; address?: string }) {
    if (isPostgresConnected && dbInstance) {
      const q = `
        INSERT INTO suppliers (id, name, contact_person, email, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const result = await dbInstance.session.client.query(q, [
        s.id, s.name, s.contactPerson || '', s.email, s.phone || '', s.address || ''
      ]);
      return result.rows[0];
    } else {
      const newSup = {
        id: s.id,
        name: s.name,
        contactPerson: s.contactPerson || '',
        email: s.email,
        phone: s.phone || '',
        address: s.address || '',
        createdAt: new Date().toISOString()
      };
      inMemoryDb.suppliers.push(newSup);
      return newSup;
    }
  },

  async updateSupplier(id: string, s: { name: string; contactPerson?: string; email: string; phone?: string; address?: string }) {
    if (isPostgresConnected && dbInstance) {
      const q = `
        UPDATE suppliers
        SET name = $1, contact_person = $2, email = $3, phone = $4, address = $5
        WHERE id = $6
        RETURNING *
      `;
      const result = await dbInstance.session.client.query(q, [
        s.name, s.contactPerson || '', s.email, s.phone || '', s.address || '', id
      ]);
      if (result.rows.length === 0) return null;
      return result.rows[0];
    } else {
      const idx = inMemoryDb.suppliers.findIndex(sup => sup.id === id);
      if (idx === -1) return null;

      inMemoryDb.suppliers[idx] = {
        ...inMemoryDb.suppliers[idx],
        name: s.name,
        contactPerson: s.contactPerson || '',
        email: s.email,
        phone: s.phone || '',
        address: s.address || ''
      };
      return inMemoryDb.suppliers[idx];
    }
  },

  async deleteSupplier(id: string) {
    if (isPostgresConnected && dbInstance) {
      const result = await dbInstance.session.client.query('DELETE FROM suppliers WHERE id = $1 RETURNING *', [id]);
      return result.rows.length > 0;
    } else {
      const idx = inMemoryDb.suppliers.findIndex(s => s.id === id);
      if (idx === -1) return false;
      inMemoryDb.suppliers.splice(idx, 1);
      return true;
    }
  },

  // --- MOVEMENTS ---
  async getMovements(options?: MovementQueryOptions) {
    if (isPostgresConnected && dbInstance) {
      const whereClauses: string[] = [];
      const params: any[] = [];

      if (options?.warehouseId) {
        params.push(options.warehouseId);
        whereClauses.push(`(m.from_warehouse_id = $${params.length} OR m.to_warehouse_id = $${params.length})`);
      }

      if (options?.type && options.type.toLowerCase() !== 'all') {
        params.push(options.type.trim());
        whereClauses.push(`LOWER(m.type) = LOWER($${params.length})`);
      }

      if (options?.search && options.search.trim()) {
        params.push(`%${options.search.trim()}%`);
        whereClauses.push(`(p.name ILIKE $${params.length} OR v.sku ILIKE $${params.length} OR m.reason ILIKE $${params.length} OR m.created_by ILIKE $${params.length})`);
      }

      if (options?.startDate) {
        params.push(options.startDate);
        whereClauses.push(`m.created_at >= $${params.length}::timestamp`);
      }

      if (options?.endDate) {
        params.push(options.endDate);
        whereClauses.push(`m.created_at <= $${params.length}::timestamp`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countSql = `
        SELECT COUNT(*) as total
        FROM movements m
        LEFT JOIN variants v ON m.variant_id = v.id
        LEFT JOIN products p ON v.product_id = p.id
        ${whereSql}
      `;
      const countRes = await dbInstance.session.client.query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const page = options?.page && options.page > 0 ? options.page : 1;
      const limit = options?.limit && options.limit > 0 ? options.limit : undefined;

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
        SELECT m.*, v.size, v.color, v.sku, p.name as product_name, b.name as brand_name,
               w1.name as from_warehouse_name, w2.name as to_warehouse_name
        FROM movements m
        LEFT JOIN variants v ON m.variant_id = v.id
        LEFT JOIN products p ON v.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN warehouses w1 ON m.from_warehouse_id = w1.id
        LEFT JOIN warehouses w2 ON m.to_warehouse_id = w2.id
        ${whereSql}
        ORDER BY m.created_at DESC
        ${limitOffsetSql}
      `;

      const result = await dbInstance.session.client.query(dataSql, queryParams);
      const mapped = result.rows.map((row: any) => ({
        id: row.id,
        variantId: row.variant_id,
        fromWarehouseId: row.from_warehouse_id,
        toWarehouseId: row.to_warehouse_id,
        quantity: row.quantity,
        type: row.type,
        reason: row.reason,
        createdBy: row.created_by,
        createdAt: row.created_at,
        variant: {
          id: row.variant_id,
          size: row.size,
          color: row.color,
          sku: row.sku,
          productName: row.product_name,
          productBrand: row.brand_name
        },
        fromWarehouseName: row.from_warehouse_name,
        toWarehouseName: row.to_warehouse_name
      }));

      if (options?.page || options?.limit) {
        return {
          data: mapped,
          total,
          page,
          limit: limit || total,
          totalPages: limit ? Math.ceil(total / limit) : 1
        };
      }

      return mapped;
    } else {
      let filtered = inMemoryDb.movements.map(mv => {
        const variant = inMemoryDb.variants.find(v => v.id === mv.variantId);
        const product = variant ? inMemoryDb.products.find(p => p.id === variant.productId) : null;
        const brand = product ? inMemoryDb.brands.find(b => b.id === product.brandId) : null;
        const fromWH = inMemoryDb.warehouses.find(w => w.id === mv.fromWarehouseId);
        const toWH = inMemoryDb.warehouses.find(w => w.id === mv.toWarehouseId);

        return {
          ...mv,
          variant: variant ? {
            ...variant,
            productName: product?.name,
            productBrand: brand?.name
          } : undefined,
          fromWarehouseName: fromWH?.name,
          toWarehouseName: toWH?.name
        };
      });

      if (options?.warehouseId) {
        filtered = filtered.filter(m => m.fromWarehouseId === options.warehouseId || m.toWarehouseId === options.warehouseId);
      }

      if (options?.type && options.type.toLowerCase() !== 'all') {
        filtered = filtered.filter(m => String(m.type).toLowerCase() === options.type!.toLowerCase());
      }

      if (options?.search && options.search.trim()) {
        const q = options.search.trim().toLowerCase();
        filtered = filtered.filter(m =>
          (m.variant?.productName && m.variant.productName.toLowerCase().includes(q)) ||
          (m.variant?.sku && m.variant.sku.toLowerCase().includes(q)) ||
          (m.reason && m.reason.toLowerCase().includes(q)) ||
          (m.createdBy && m.createdBy.toLowerCase().includes(q))
        );
      }

      if (options?.startDate) {
        const start = new Date(options.startDate).getTime();
        filtered = filtered.filter(m => new Date(m.createdAt).getTime() >= start);
      }

      if (options?.endDate) {
        const end = new Date(options.endDate).getTime();
        filtered = filtered.filter(m => new Date(m.createdAt).getTime() <= end);
      }

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = filtered.length;
      const page = options?.page && options.page > 0 ? options.page : 1;
      const limit = options?.limit && options.limit > 0 ? options.limit : undefined;

      let paginated = filtered;
      if (limit) {
        const start = (page - 1) * limit;
        paginated = filtered.slice(start, start + limit);
      }

      if (options?.page || options?.limit) {
        return {
          data: paginated,
          total,
          page,
          limit: limit || total,
          totalPages: limit ? Math.ceil(total / limit) : 1
        };
      }

      return paginated;
    }
  },

  async createMovement(m: { variantId: string; fromWarehouseId?: string | null; toWarehouseId?: string | null; quantity: number; type: MovementType; reason: string; createdBy?: string }) {
    const qty = m.quantity;
    const type = m.type;
    const reason = m.reason;
    const variantId = m.variantId;
    const fromWarehouseId = m.fromWarehouseId || null;
    const toWarehouseId = m.toWarehouseId || null;

    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        let vRes = await client.query('SELECT current_stock FROM variants WHERE id = $1 FOR UPDATE', [variantId]);
        if (vRes.rows.length === 0) {
          const targetMock = mockData.variants.find(m => m.id === variantId);
          const pId = targetMock ? targetMock.productId : 'p1';
          const targetProd = mockData.products.find(p => p.id === pId);
          const bId = targetProd ? targetProd.brandId || 'b1' : 'b1';
          const targetBrand = mockData.brands.find(b => b.id === bId);

          if (targetBrand) {
            await client.query('INSERT INTO brands (id, name, logo_url, description) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [targetBrand.id, targetBrand.name, targetBrand.logoUrl || null, targetBrand.description || null]);
          }
          if (targetProd) {
            await client.query('INSERT INTO products (id, name, description, brand_id, category, gender, base_price, warehouse_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING', [targetProd.id, targetProd.name, targetProd.description || '', bId, targetProd.category, targetProd.gender, targetProd.basePrice, 'w1,w2']);
          } else {
            await client.query('INSERT INTO products (id, name, description, brand_id, category, gender, base_price, warehouse_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING', ['p1', 'Shoe Product', 'Footwear item', 'b1', 'Sneakers', 'Unisex', 100, 'w1,w2']);
          }

          if (targetMock) {
            await client.query('INSERT INTO variants (id, product_id, size, color, sku, current_stock, barcode, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING', [targetMock.id, targetMock.productId, targetMock.size, targetMock.color, targetMock.sku, targetMock.currentStock || 50, targetMock.barcode || '12345', targetMock.price]);
          } else {
            await client.query('INSERT INTO variants (id, product_id, size, color, sku, current_stock, barcode, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING', [variantId, pId, 'EU 42', 'Black', `SKU-${variantId.toUpperCase()}`, 50, `BC-${variantId}`, 100]);
          }

          vRes = await client.query('SELECT current_stock FROM variants WHERE id = $1 FOR UPDATE', [variantId]);
        }

        let currentStock = parseInt(vRes.rows[0].current_stock || '0', 10);
        let newStock = currentStock;

        const normType = String(type).toUpperCase();
        let dbType: string = MovementType.ADJUSTMENT;

        if (normType === 'IN' || normType === 'INCOMING') {
          newStock += qty;
          dbType = MovementType.INCOMING;
        } else if (normType === 'OUT' || normType === 'OUTGOING') {
          newStock = Math.max(0, newStock - qty);
          dbType = MovementType.OUTGOING;
        } else if (normType === 'TRANSFER') {
          dbType = MovementType.TRANSFER;
        } else {
          dbType = MovementType.ADJUSTMENT;
          const r = (reason || '').toLowerCase();
          if (r.includes('damage') || r.includes('lost') || r.includes('loss') || r.includes('remove') || r.includes('out') || r.includes('deduct') || r.includes('minus')) {
            newStock = Math.max(0, newStock - qty);
          } else {
            newStock += qty;
          }
        }

        await client.query('UPDATE variants SET current_stock = $1 WHERE id = $2', [newStock, variantId]);

        const id = crypto.randomUUID();
        const insertQ = `
          INSERT INTO movements (id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, reason, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        const result = await client.query(insertQ, [
          id, variantId, fromWarehouseId, toWarehouseId, qty, dbType, reason, m.createdBy || 'System'
        ]);

        await client.query('COMMIT');
        triggerAutoNotificationCheck().catch(err => console.error('Auto notification check error:', err));
        return result.rows[0];
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      const vIdx = inMemoryDb.variants.findIndex(v => v.id === variantId);
      if (vIdx === -1) return null;

      let currentStock = inMemoryDb.variants[vIdx].currentStock || 0;
      const normType = String(type).toUpperCase();
      let dbType: string = MovementType.ADJUSTMENT;

      if (normType === 'IN' || normType === 'INCOMING') {
        currentStock += qty;
        dbType = MovementType.INCOMING;
      } else if (normType === 'OUT' || normType === 'OUTGOING') {
        currentStock = Math.max(0, currentStock - qty);
        dbType = MovementType.OUTGOING;
      } else if (normType === 'TRANSFER') {
        dbType = MovementType.TRANSFER;
      } else {
        dbType = MovementType.ADJUSTMENT;
        const r = (reason || '').toLowerCase();
        if (r.includes('damage') || r.includes('lost') || r.includes('loss') || r.includes('remove') || r.includes('out') || r.includes('deduct') || r.includes('minus')) {
          currentStock = Math.max(0, currentStock - qty);
        } else {
          currentStock += qty;
        }
      }

      inMemoryDb.variants[vIdx].currentStock = Math.max(0, currentStock);

      const id = crypto.randomUUID();
      const newMv = {
        id,
        variantId,
        fromWarehouseId,
        toWarehouseId,
        quantity: qty,
        type: dbType,
        reason,
        createdBy: m.createdBy || 'System',
        createdAt: new Date().toISOString()
      };

      inMemoryDb.movements.push(newMv);
      triggerAutoNotificationCheck().catch(err => console.error('Auto notification check error:', err));
      return newMv;
    }
  },

  // --- ORDERS ---
  async getOrders(options?: OrderQueryOptions) {
    if (isPostgresConnected && dbInstance) {
      const whereClauses: string[] = [];
      const params: any[] = [];

      if (options?.supplierId && options.supplierId.toLowerCase() !== 'all') {
        params.push(options.supplierId);
        whereClauses.push(`o.supplier_id = $${params.length}`);
      }

      if (options?.status && options.status.toLowerCase() !== 'all') {
        params.push(options.status.trim());
        whereClauses.push(`LOWER(o.status) = LOWER($${params.length})`);
      }

      if (options?.search && options.search.trim()) {
        params.push(`%${options.search.trim()}%`);
        whereClauses.push(`(o.order_number ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
      }

      if (options?.startDate) {
        params.push(options.startDate);
        whereClauses.push(`o.created_at >= $${params.length}::timestamp`);
      }

      if (options?.endDate) {
        params.push(options.endDate);
        whereClauses.push(`o.created_at <= $${params.length}::timestamp`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countSql = `
        SELECT COUNT(*) as total
        FROM orders o
        JOIN suppliers s ON o.supplier_id = s.id
        ${whereSql}
      `;
      const countRes = await dbInstance.session.client.query(countSql, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const page = options?.page && options.page > 0 ? options.page : 1;
      const limit = options?.limit && options.limit > 0 ? options.limit : undefined;

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
        SELECT o.*, s.name as supplier_name
        FROM orders o
        JOIN suppliers s ON o.supplier_id = s.id
        ${whereSql}
        ORDER BY o.created_at DESC
        ${limitOffsetSql}
      `;

      const result = await dbInstance.session.client.query(dataSql, queryParams);
      const orderRows = result.rows;
      const orderIds = orderRows.map((r: any) => r.id);

      const itemsMap: Record<string, any[]> = {};
      if (orderIds.length > 0) {
        const itemQ = `
          SELECT oi.*, v.sku, v.size, v.color, p.name as product_name
          FROM order_items oi
          JOIN variants v ON oi.variant_id = v.id
          JOIN products p ON v.product_id = p.id
          WHERE oi.order_id = ANY($1)
        `;
        const itemRes = await dbInstance.session.client.query(itemQ, [orderIds]);
        for (const oi of itemRes.rows) {
          if (!itemsMap[oi.order_id]) itemsMap[oi.order_id] = [];
          itemsMap[oi.order_id].push({
            id: oi.id,
            orderId: oi.order_id,
            variantId: oi.variant_id,
            quantity: oi.quantity,
            unitCost: parseFloat(oi.unit_cost),
            variant: {
              id: oi.variant_id,
              sku: oi.sku,
              size: oi.size,
              color: oi.color,
              productName: oi.product_name
            }
          });
        }
      }

      const ordersList = orderRows.map((row: any) => ({
        id: row.id,
        supplierId: row.supplier_id,
        orderNumber: row.order_number,
        status: row.status,
        totalCost: parseFloat(row.total_cost),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        supplierName: row.supplier_name,
        items: itemsMap[row.id] || []
      }));

      if (options?.page || options?.limit) {
        return {
          data: ordersList,
          total,
          page,
          limit: limit || total,
          totalPages: limit ? Math.ceil(total / limit) : 1
        };
      }

      return ordersList;
    } else {
      let filtered = inMemoryDb.orders.map(o => {
        const supplier = inMemoryDb.suppliers.find(s => s.id === o.supplierId);
        const items = inMemoryDb.orderItems
          .filter(oi => oi.orderId === o.id)
          .map(oi => {
            const variant = inMemoryDb.variants.find(v => v.id === oi.variantId);
            const product = variant ? inMemoryDb.products.find(p => p.id === variant.productId) : null;
            return {
              ...oi,
              variant: variant ? {
                ...variant,
                productName: product?.name
              } : undefined
            };
          });

        return {
          ...o,
          supplierName: supplier?.name,
          items
        };
      });

      if (options?.supplierId && options.supplierId.toLowerCase() !== 'all') {
        filtered = filtered.filter(o => o.supplierId === options.supplierId);
      }

      if (options?.status && options.status.toLowerCase() !== 'all') {
        filtered = filtered.filter(o => String(o.status).toLowerCase() === options.status!.toLowerCase());
      }

      if (options?.search && options.search.trim()) {
        const q = options.search.trim().toLowerCase();
        filtered = filtered.filter(o =>
          (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
          (o.supplierName && o.supplierName.toLowerCase().includes(q))
        );
      }

      if (options?.startDate) {
        const start = new Date(options.startDate).getTime();
        filtered = filtered.filter(o => new Date(o.createdAt).getTime() >= start);
      }

      if (options?.endDate) {
        const end = new Date(options.endDate).getTime();
        filtered = filtered.filter(o => new Date(o.createdAt).getTime() <= end);
      }

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = filtered.length;
      const page = options?.page && options.page > 0 ? options.page : 1;
      const limit = options?.limit && options.limit > 0 ? options.limit : undefined;

      let paginated = filtered;
      if (limit) {
        const start = (page - 1) * limit;
        paginated = filtered.slice(start, start + limit);
      }

      if (options?.page || options?.limit) {
        return {
          data: paginated,
          total,
          page,
          limit: limit || total,
          totalPages: limit ? Math.ceil(total / limit) : 1
        };
      }

      return paginated;
    }
  },

  async createOrder(order: { supplierId: string; orderNumber?: string; items: { variantId: string; quantity: number; unitCost: number }[] }) {
    const supplierId = order.supplierId;
    const orderNo = order.orderNumber || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
    const items = order.items || [];
    const totalCost = items.reduce((acc, it) => acc + (parseInt((it.quantity || (it as any).quantityOrdered || (it as any).qty || 1) as any, 10) * parseFloat((it.unitCost || 0) as any)), 0);

    const orderId = crypto.randomUUID();

    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        let validSupplierId = supplierId;
        let supExists = false;
        if (validSupplierId && typeof validSupplierId === 'string' && validSupplierId.length === 36) {
          const supCheck = await client.query('SELECT id FROM suppliers WHERE id = $1', [validSupplierId]);
          if (supCheck.rows.length > 0) {
            supExists = true;
          }
        }

        if (!supExists) {
          const anySup = await client.query('SELECT id FROM suppliers LIMIT 1');
          if (anySup.rows.length > 0) {
            validSupplierId = anySup.rows[0].id;
          } else {
            validSupplierId = crypto.randomUUID();
            await client.query(
              'INSERT INTO suppliers (id, name, contact_person, email, phone, address) VALUES ($1, $2, $3, $4, $5, $6)',
              [validSupplierId, 'Addis Pharmaceuticals Distributors', 'W/ro Hiwot', 'contact@addispharma.et', '0116625550', 'Addis Ababa, Ethiopia']
            );
          }
        }

        const insertOrderQ = `
          INSERT INTO orders (id, supplier_id, order_number, total_cost, status)
          VALUES ($1, $2, $3, $4, 'pending')
          RETURNING *
        `;
        const orderRes = await client.query(insertOrderQ, [orderId, validSupplierId, orderNo, totalCost]);

        for (const item of items) {
          const itemid = crypto.randomUUID();
          let validVariantId = item.variantId;
          let varExists = false;
          if (validVariantId && typeof validVariantId === 'string' && validVariantId.length === 36) {
            const varCheck = await client.query('SELECT id FROM variants WHERE id = $1', [validVariantId]);
            if (varCheck.rows.length > 0) {
              varExists = true;
            }
          }

          if (!varExists) {
            const anyVar = await client.query('SELECT id FROM variants LIMIT 1');
            if (anyVar.rows.length > 0) {
              validVariantId = anyVar.rows[0].id;
            } else {
              const prodId = crypto.randomUUID();
              await client.query(
                'INSERT INTO products (id, name, description, category) VALUES ($1, $2, $3, $4)',
                [prodId, 'Default Product', 'Standard Item', 'General']
              );
              validVariantId = crypto.randomUUID();
              await client.query(
                'INSERT INTO variants (id, product_id, sku, size, color, current_stock, min_stock, price, cost_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [validVariantId, prodId, 'SKU-DEF-001', 'EU 42', 'Black', 100, 10, 100, 50]
              );
            }
          }

          const qty = parseInt((item.quantity || (item as any).quantityOrdered || (item as any).qty || 1) as any, 10);
          const unitCost = parseFloat((item.unitCost || 0) as any);

          await client.query(
            'INSERT INTO order_items (id, order_id, variant_id, quantity, unit_cost) VALUES ($1, $2, $3, $4, $5)',
            [itemid, orderId, validVariantId, qty, unitCost]
          );
        }

        await client.query('COMMIT');

        const orderRow = orderRes.rows[0];
        const supRes = await pool.query('SELECT name FROM suppliers WHERE id = $1', [orderRow.supplier_id]);
        const supplierName = supRes.rows.length > 0 ? supRes.rows[0].name : 'Supplier';

        const itemRes = await pool.query(`
          SELECT oi.*, v.sku, v.size, v.color, p.name as product_name
          FROM order_items oi
          JOIN variants v ON oi.variant_id = v.id
          JOIN products p ON v.product_id = p.id
          WHERE oi.order_id = $1
        `, [orderRow.id]);

        return {
          id: orderRow.id,
          supplierId: orderRow.supplier_id,
          orderNumber: orderRow.order_number,
          status: orderRow.status,
          totalCost: parseFloat(orderRow.total_cost),
          createdAt: orderRow.created_at,
          updatedAt: orderRow.updated_at,
          supplierName,
          items: itemRes.rows.map((oi: any) => ({
            id: oi.id,
            orderId: oi.order_id,
            variantId: oi.variant_id,
            quantity: oi.quantity,
            unitCost: parseFloat(oi.unit_cost),
            variant: {
              id: oi.variant_id,
              sku: oi.sku,
              size: oi.size,
              color: oi.color,
              productName: oi.product_name
            }
          }))
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      const newOrder = {
        id: orderId,
        supplierId,
        orderNumber: orderNo,
        status: OrderStatus.PENDING,
        totalCost,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      inMemoryDb.orders.push(newOrder);

      for (const item of items) {
        const itemid = crypto.randomUUID();
        const qty = parseInt((item.quantity || (item as any).quantityOrdered || (item as any).qty || 1) as any, 10);
        const unitCost = parseFloat((item.unitCost || 0) as any);
        inMemoryDb.orderItems.push({
          id: itemid,
          orderId,
          variantId: item.variantId || (item as any).id || 'v1',
          quantity: qty,
          unitCost: unitCost
        });
      }

      const supplier = inMemoryDb.suppliers.find(s => s.id === supplierId);
      const itemsList = inMemoryDb.orderItems
        .filter(oi => oi.orderId === orderId)
        .map(oi => {
          const variant = inMemoryDb.variants.find(v => v.id === oi.variantId);
          const product = variant ? inMemoryDb.products.find(p => p.id === variant.productId) : null;
          return {
            ...oi,
            variant: variant ? {
              ...variant,
              productName: product?.name
            } : undefined
          };
        });

      return {
        ...newOrder,
        supplierName: supplier?.name || 'Supplier',
        items: itemsList
      };
    }
  },

  async updateOrderStatus(id: string, status: OrderStatus) {
    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const orderRes = await client.query('SELECT status, order_number FROM orders WHERE id = $1 FOR UPDATE', [id]);
        if (orderRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return null;
        }

        const prevStatus = orderRes.rows[0].status;
        const orderNo = orderRes.rows[0].order_number;

        const updateRes = await client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, id]);

        if (status === 'received' && prevStatus !== 'received') {
          const whRes = await client.query("SELECT id FROM warehouses WHERE code = 'WH-MAIN' LIMIT 1");
          const mainWhId = whRes.rows.length > 0 ? whRes.rows[0].id : null;

          const itemsRes = await client.query('SELECT variant_id, quantity FROM order_items WHERE order_id = $1', [id]);
          
          for (const item of itemsRes.rows) {
            const varId = item.variant_id;
            const qty = parseInt(item.quantity);

            await client.query('UPDATE variants SET current_stock = current_stock + $1 WHERE id = $2', [qty, varId]);

            const mId = crypto.randomUUID();
            await client.query(`
              INSERT INTO movements (id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, reason, created_by)
              VALUES ($1, $2, null, $3, $4, 'incoming', $5, 'Supplier Delivery')
            `, [mId, varId, mainWhId, qty, `Fulfillment of ${orderNo}`]);
          }
        }

        await client.query('COMMIT');
        triggerAutoNotificationCheck().catch(err => console.error('Auto notification check error:', err));

        const row = updateRes.rows[0];
        const supRes = await pool.query('SELECT name FROM suppliers WHERE id = $1', [row.supplier_id]);
        const supplierName = supRes.rows.length > 0 ? supRes.rows[0].name : '';

        const itemRes = await pool.query(`
          SELECT oi.*, v.sku, v.size, v.color, p.name as product_name
          FROM order_items oi
          JOIN variants v ON oi.variant_id = v.id
          JOIN products p ON v.product_id = p.id
          WHERE oi.order_id = $1
        `, [row.id]);

        return {
          id: row.id,
          supplierId: row.supplier_id,
          orderNumber: row.order_number,
          status: row.status,
          totalCost: parseFloat(row.total_cost),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          supplierName,
          items: itemRes.rows.map((oi: any) => ({
            id: oi.id,
            orderId: oi.order_id,
            variantId: oi.variant_id,
            quantity: oi.quantity,
            unitCost: parseFloat(oi.unit_cost),
            variant: {
              id: oi.variant_id,
              sku: oi.sku,
              size: oi.size,
              color: oi.color,
              productName: oi.product_name
            }
          }))
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      const idx = inMemoryDb.orders.findIndex(o => o.id === id);
      if (idx === -1) return null;

      const prevStatus = inMemoryDb.orders[idx].status;
      inMemoryDb.orders[idx].status = status;
      inMemoryDb.orders[idx].updatedAt = new Date().toISOString();

      if (status === 'received' && prevStatus !== 'received') {
        const orderNo = inMemoryDb.orders[idx].orderNumber;
        const mainWh = inMemoryDb.warehouses.find(w => w.code === 'WH-MAIN') || inMemoryDb.warehouses[0];
        const mainWhId = mainWh ? mainWh.id : null;

        const orderItemsList = inMemoryDb.orderItems.filter(oi => oi.orderId === id);

        for (const item of orderItemsList) {
          const vIdx = inMemoryDb.variants.findIndex(v => v.id === item.variantId);
          if (vIdx !== -1) {
            inMemoryDb.variants[vIdx].currentStock += item.quantity;

            const mId = crypto.randomUUID();
            inMemoryDb.movements.push({
              id: mId,
              variantId: item.variantId,
              fromWarehouseId: null,
              toWarehouseId: mainWhId,
              quantity: item.quantity,
              type: MovementType.INCOMING,
              reason: `Fulfillment of ${orderNo}`,
              createdBy: 'Supplier Delivery',
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      const o = inMemoryDb.orders[idx];
      const supplier = inMemoryDb.suppliers.find(s => s.id === o.supplierId);
      const itemsList = inMemoryDb.orderItems
        .filter(oi => oi.orderId === o.id)
        .map(oi => {
          const variant = inMemoryDb.variants.find(v => v.id === oi.variantId);
          const product = variant ? inMemoryDb.products.find(p => p.id === variant.productId) : null;
          return {
            ...oi,
            variant: variant ? {
              ...variant,
              productName: product?.name
            } : undefined
          };
        });

      triggerAutoNotificationCheck().catch(err => console.error('Auto notification check error:', err));

      return {
        ...o,
        supplierName: supplier?.name,
        items: itemsList
      };
    }
  }
};
