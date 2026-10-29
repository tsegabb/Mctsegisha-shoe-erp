import { isPostgresConnected, dbInstance, inMemoryDb } from '../config/db.ts';
import { triggerAutoNotificationCheck } from './inventory.service.ts';
import { mockData } from '../db/schema/index.ts';
import crypto from 'crypto';

export interface SalesQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  status?: string;
  sortBy?: 'created_at' | 'profit' | 'quantity' | 'selling_price';
  sortOrder?: 'asc' | 'desc';
}

export const salesService = {
  async getSales(warehouseId?: string, options?: SalesQueryOptions) {
    const isAll = !warehouseId || warehouseId.toLowerCase() === 'all' || warehouseId.toLowerCase() === 'all branches';

    if (isPostgresConnected && dbInstance) {
      let targetWarehouseIds: string[] = [];
      if (warehouseId && !isAll) {
        try {
          const whRes = await dbInstance.session.client.query(
            `SELECT id, name FROM warehouses WHERE id = $1 OR LOWER(name) = LOWER($1) OR ($1 ILIKE '%main%' AND LOWER(name) ILIKE '%main%') OR ($1 ILIKE '%branch%' AND LOWER(name) ILIKE '%main%')`,
            [warehouseId]
          );
          if (whRes.rows.length > 0) {
            targetWarehouseIds = Array.from(new Set([warehouseId, ...whRes.rows.map((r: any) => r.id)]));
          } else if (warehouseId.toLowerCase().includes('main')) {
            targetWarehouseIds = [warehouseId, 'w1'];
          } else {
            targetWarehouseIds = [warehouseId];
          }
        } catch (err) {
          targetWarehouseIds = [warehouseId];
        }
      }

      const whereClauses: string[] = [];
      const params: any[] = [];

      if (!isAll && targetWarehouseIds.length > 0) {
        params.push(targetWarehouseIds);
        whereClauses.push(`(s.warehouse_id = ANY($${params.length}) OR s.warehouse_id IS NULL)`);
      }

      if (options?.search && options.search.trim()) {
        params.push(`%${options.search.trim()}%`);
        whereClauses.push(`(p.name ILIKE $${params.length} OR v.sku ILIKE $${params.length} OR b.name ILIKE $${params.length})`);
      }

      if (options?.paymentMethod && options.paymentMethod.toLowerCase() !== 'all') {
        params.push(options.paymentMethod.trim());
        whereClauses.push(`LOWER(s.payment_method) = LOWER($${params.length})`);
      }

      if (options?.status && options.status.toLowerCase() !== 'all') {
        params.push(options.status.trim());
        whereClauses.push(`LOWER(s.status) = LOWER($${params.length})`);
      }

      if (options?.startDate) {
        params.push(options.startDate);
        whereClauses.push(`s.created_at >= $${params.length}::timestamp`);
      }

      if (options?.endDate) {
        params.push(options.endDate);
        whereClauses.push(`s.created_at <= $${params.length}::timestamp`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      let sortCol = 's.created_at';
      if (options?.sortBy === 'profit') sortCol = 's.profit';
      else if (options?.sortBy === 'quantity') sortCol = 's.quantity';
      else if (options?.sortBy === 'selling_price') sortCol = 's.selling_price';

      const sortDir = (options?.sortOrder && options.sortOrder.toLowerCase() === 'asc') ? 'ASC' : 'DESC';

      // Count query
      const countSql = `
        SELECT COUNT(*) as total
        FROM sales s
        LEFT JOIN variants v ON s.variant_id = v.id
        LEFT JOIN products p ON v.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
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
        SELECT s.*, v.size, v.color, v.sku, v.price as variant_price, p.name as product_name, b.name as brand_name
        FROM sales s
        LEFT JOIN variants v ON s.variant_id = v.id
        LEFT JOIN products p ON v.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
        ${whereSql}
        ORDER BY ${sortCol} ${sortDir}
        ${limitOffsetSql}
      `;

      const result = await dbInstance.session.client.query(dataSql, queryParams);
      const salesList = result.rows.map((row: any) => ({
        id: row.id,
        variantId: row.variant_id,
        warehouseId: row.warehouse_id,
        quantity: parseInt(row.quantity),
        sellingPrice: parseFloat(row.selling_price),
        costPrice: parseFloat(row.cost_price),
        profit: parseFloat(row.profit),
        paymentMethod: row.payment_method || 'cash',
        status: row.status || 'Completed',
        returnedQty: row.returned_qty ? parseInt(row.returned_qty) : 0,
        returnedAmount: row.returned_amount ? parseFloat(row.returned_amount) : 0,
        createdAt: row.created_at,
        productName: row.product_name,
        brandName: row.brand_name,
        size: row.size,
        color: row.color,
        sku: row.sku,
        variant: {
          id: row.variant_id,
          size: row.size,
          color: row.color,
          sku: row.sku,
          price: parseFloat(row.variant_price),
          productName: row.product_name,
          productBrand: row.brand_name,
          brandName: row.brand_name
        }
      }));

      if (options?.page || options?.limit) {
        return {
          data: salesList,
          total,
          page,
          limit: limit || total,
          totalPages: limit ? Math.ceil(total / limit) : 1
        };
      }

      return salesList;
    } else {
      let targetWarehouseIds: string[] = [];
      if (warehouseId && !isAll) {
        const matchingWhs = (inMemoryDb.warehouses || []).filter((w: any) =>
          w.id === warehouseId ||
          w.name.toLowerCase() === warehouseId.toLowerCase() ||
          (warehouseId.toLowerCase().includes('main') && w.name.toLowerCase().includes('main'))
        );
        targetWarehouseIds = Array.from(new Set([warehouseId, ...matchingWhs.map((w: any) => w.id)]));
      }

      let filtered = inMemoryDb.sales
        .filter((s: any) => isAll || targetWarehouseIds.includes(s.warehouseId) || !s.warehouseId)
        .map((s: any) => {
          const variant = inMemoryDb.variants.find((v: any) => v.id === s.variantId);
          const product = variant ? inMemoryDb.products.find((p: any) => p.id === variant.productId) : null;
          const brand = product ? inMemoryDb.brands.find((b: any) => b.id === product.brandId) : null;
          return {
            id: s.id,
            variantId: s.variantId,
            warehouseId: s.warehouseId,
            quantity: s.quantity,
            sellingPrice: s.sellingPrice,
            costPrice: s.costPrice,
            profit: s.profit,
            paymentMethod: s.paymentMethod || 'cash',
            status: s.status || 'Completed',
            returnedQty: s.returnedQty || 0,
            returnedAmount: s.returnedAmount || 0,
            createdAt: s.createdAt,
            productName: product?.name,
            brandName: brand?.name,
            size: variant?.size,
            color: variant?.color,
            sku: variant?.sku,
            variant: variant ? {
              id: variant.id,
              productId: variant.productId,
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              price: variant.price,
              createdAt: variant.createdAt,
              productName: product?.name,
              productBrand: brand?.name,
              brandName: brand?.name
            } : undefined
          };
        });

      if (options?.search && options.search.trim()) {
        const q = options.search.trim().toLowerCase();
        filtered = filtered.filter(s =>
          (s.productName && s.productName.toLowerCase().includes(q)) ||
          (s.sku && s.sku.toLowerCase().includes(q)) ||
          (s.brandName && s.brandName.toLowerCase().includes(q))
        );
      }

      if (options?.paymentMethod && options.paymentMethod.toLowerCase() !== 'all') {
        filtered = filtered.filter(s => s.paymentMethod.toLowerCase() === options.paymentMethod!.toLowerCase());
      }

      if (options?.status && options.status.toLowerCase() !== 'all') {
        filtered = filtered.filter(s => s.status.toLowerCase() === options.status!.toLowerCase());
      }

      if (options?.startDate) {
        const start = new Date(options.startDate).getTime();
        filtered = filtered.filter(s => new Date(s.createdAt).getTime() >= start);
      }

      if (options?.endDate) {
        const end = new Date(options.endDate).getTime();
        filtered = filtered.filter(s => new Date(s.createdAt).getTime() <= end);
      }

      filtered.sort((a, b) => {
        let valA = new Date(a.createdAt).getTime();
        let valB = new Date(b.createdAt).getTime();
        if (options?.sortBy === 'profit') { valA = a.profit; valB = b.profit; }
        else if (options?.sortBy === 'quantity') { valA = a.quantity; valB = b.quantity; }
        else if (options?.sortBy === 'selling_price') { valA = a.sellingPrice; valB = b.sellingPrice; }

        if (valA < valB) return options?.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return options?.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

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

  async createSale(sale: { variantId: string; quantity: number; sellingPrice: number; costPrice?: number; warehouseId?: string; paymentMethod?: string }) {
    const qty = sale.quantity;
    const variantId = sale.variantId;
    const warehouseId = sale.warehouseId;
    const paymentMethod = sale.paymentMethod || 'cash';

    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Fetch variant to verify existence and check stock
        let varRes = await client.query('SELECT v.*, p.name as product_name FROM variants v JOIN products p ON v.product_id = p.id WHERE v.id = $1 FOR UPDATE', [variantId]);
        if (varRes.rows.length === 0) {
          const targetMock = mockData.variants.find(m => m.id === variantId);
          const pId = targetMock ? targetMock.productId : 'p1';
          const targetProd = mockData.products.find(p => p.id === pId);
          const prodName = targetProd ? targetProd.name : 'Shoe Product';
          const bId = targetProd ? targetProd.brandId || 'b1' : 'b1';
          const targetBrand = mockData.brands.find(b => b.id === bId);

          if (targetBrand) {
            await client.query('INSERT INTO brands (id, name, logo_url, description) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [targetBrand.id, targetBrand.name, targetBrand.logoUrl || null, targetBrand.description || null]);
          }
          if (targetProd) {
            await client.query('INSERT INTO products (id, name, description, brand_id, category, gender, base_price, warehouse_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING', [targetProd.id, targetProd.name, targetProd.description || '', bId, targetProd.category, targetProd.gender, targetProd.basePrice, 'w1,w2']);
          } else {
            await client.query('INSERT INTO products (id, name, description, brand_id, category, gender, base_price, warehouse_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING', ['p1', prodName, 'Footwear item', 'b1', 'Sneakers', 'Unisex', sale.sellingPrice, 'w1,w2']);
          }

          if (targetMock) {
            await client.query('INSERT INTO variants (id, product_id, size, color, sku, current_stock, barcode, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING', [targetMock.id, targetMock.productId, targetMock.size, targetMock.color, targetMock.sku, Math.max(targetMock.currentStock || 50, qty + 10), targetMock.barcode || '12345', targetMock.price]);
          } else {
            await client.query('INSERT INTO variants (id, product_id, size, color, sku, current_stock, barcode, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING', [variantId, pId, 'EU 42', 'Black', `SKU-${variantId.toUpperCase()}`, qty + 50, `BC-${variantId}`, sale.sellingPrice]);
          }

          varRes = await client.query('SELECT v.*, p.name as product_name FROM variants v JOIN products p ON v.product_id = p.id WHERE v.id = $1 FOR UPDATE', [variantId]);
        }

        const variant = varRes.rows[0];
        if (parseInt(variant.current_stock) < qty) {
          await client.query('ROLLBACK');
          return { error: `Insufficient stock! Only ${variant.current_stock} pairs of ${variant.product_name} remaining.`, status: 400 };
        }

        const finalCostPrice = sale.costPrice || (parseFloat(variant.price) * 0.6);
        const finalSellingPrice = sale.sellingPrice;
        const profit = qty * (finalSellingPrice - finalCostPrice);

        // Resolve warehouse
        let finalWarehouseId: string | null = null;
        if (warehouseId) {
          const whCheck = await client.query('SELECT id FROM warehouses WHERE id = $1', [warehouseId]);
          if (whCheck.rows.length > 0) {
            finalWarehouseId = warehouseId;
          }

          // Ensure product warehouse_ids includes this warehouse if not present
          const shopCheck = await client.query(`
            SELECT p.id, p.warehouse_ids FROM variants v 
            JOIN products p ON v.product_id = p.id 
            WHERE v.id = $1
          `, [variantId]);
          if (shopCheck.rows.length > 0) {
            const pRow = shopCheck.rows[0];
            const currentWhStr = pRow.warehouse_ids || '';
            if (currentWhStr && !currentWhStr.includes(warehouseId)) {
              const updatedWh = `${currentWhStr},${warehouseId}`;
              await client.query(`UPDATE products SET warehouse_ids = $1 WHERE id = $2`, [updatedWh, pRow.id]);
            }
          }
        }

        if (!finalWarehouseId) {
          const firstWh = await client.query('SELECT id FROM warehouses LIMIT 1');
          if (firstWh.rows.length > 0) {
            finalWarehouseId = firstWh.rows[0].id;
          }
        }

        // Reduce stock
        await client.query('UPDATE variants SET current_stock = current_stock - $1 WHERE id = $2', [qty, variantId]);

        // Record Sale
        const saleId = crypto.randomUUID();
        await client.query(`
          INSERT INTO sales (id, variant_id, warehouse_id, quantity, selling_price, cost_price, profit, payment_method, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [saleId, variantId, finalWarehouseId, qty, finalSellingPrice, finalCostPrice, profit, paymentMethod]);

        // Record Movement (audit trail)
        const mvId = crypto.randomUUID();
        await client.query(`
          INSERT INTO movements (id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, reason, created_by, created_at)
          VALUES ($1, $2, $3, null, $4, 'outgoing', $5, 'POS Sale', NOW())
        `, [mvId, variantId, finalWarehouseId, qty, `Sold ${qty} pairs of ${variant.product_name} (${variant.sku})`]);

        await client.query('COMMIT');
        triggerAutoNotificationCheck().catch(err => console.error('Auto notification check error:', err));

        return {
          data: { id: saleId, variantId, quantity: qty, sellingPrice: finalSellingPrice, costPrice: finalCostPrice, profit, paymentMethod }
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      let vIdx = inMemoryDb.variants.findIndex((v: any) => v.id === variantId);
      if (vIdx === -1) {
        const targetMock = mockData.variants.find(m => m.id === variantId);
        if (targetMock) {
          inMemoryDb.variants.push({ ...targetMock, currentStock: Math.max(targetMock.currentStock || 50, qty + 10) });
          vIdx = inMemoryDb.variants.length - 1;
        } else {
          const newV = {
            id: variantId,
            productId: 'p1',
            size: 'EU 42',
            color: 'Black',
            sku: `SKU-${variantId.toUpperCase()}`,
            currentStock: qty + 50,
            barcode: `BC-${variantId}`,
            price: sale.sellingPrice
          };
          inMemoryDb.variants.push(newV);
          vIdx = inMemoryDb.variants.length - 1;
        }
      }

      const variant = inMemoryDb.variants[vIdx];
      const product = inMemoryDb.products.find((p: any) => p.id === variant.productId);
      const productName = product ? product.name : 'Unknown Shoe';

      if (variant.currentStock < qty) {
        return { error: `Insufficient stock! Only ${variant.currentStock} pairs of ${productName} remaining.`, status: 400 };
      }

      if (warehouseId && product) {
        let rawWh = product.warehouseIds || product.warehouse_ids || [];
        if (typeof rawWh === 'string') rawWh = rawWh.split(',').filter(Boolean);
        if (!rawWh.includes(warehouseId)) {
          product.warehouseIds = [...rawWh, warehouseId];
        }
      }

      const finalCostPrice = sale.costPrice || (variant.price * 0.6);
      const finalSellingPrice = sale.sellingPrice;
      const profit = qty * (finalSellingPrice - finalCostPrice);

      // Reduce stock
      inMemoryDb.variants[vIdx].currentStock -= qty;

      // Record Sale
      const saleId = crypto.randomUUID();
      const newSale = {
        id: saleId,
        variantId,
        warehouseId: warehouseId || null,
        quantity: qty,
        sellingPrice: finalSellingPrice,
        costPrice: finalCostPrice,
        profit,
        paymentMethod,
        createdAt: new Date().toISOString()
      };
      inMemoryDb.sales.push(newSale);

      // Record Movement
      const mvId = crypto.randomUUID();
      inMemoryDb.movements.push({
        id: mvId,
        variantId,
        fromWarehouseId: warehouseId || null,
        toWarehouseId: null,
        quantity: qty,
        type: 'outgoing',
        reason: `Sold ${qty} pairs of ${productName} (${variant.sku})`,
        createdBy: 'POS Sale',
        createdAt: new Date().toISOString()
      });

      triggerAutoNotificationCheck().catch(err => console.error('Auto notification check error:', err));

      return { data: newSale };
    }
  },

  async processReturn(payload: { saleId?: string; totalReturnAmount?: number; totalReturnQty?: number; reason?: string; restock?: boolean }) {
    const { saleId, totalReturnAmount = 0, totalReturnQty = 1, reason = 'Customer Return', restock = true } = payload;
    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (saleId) {
          const saleRes = await client.query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [saleId]);
          if (saleRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Original sale record not found.' };
          }
          const sale = saleRes.rows[0];
          const currReturnedQty = parseInt(sale.returned_qty || '0');
          const origQty = parseInt(sale.quantity || '1');
          
          if (currReturnedQty + totalReturnQty > origQty) {
            await client.query('ROLLBACK');
            return { success: false, error: `Cannot return ${totalReturnQty} items. Only ${origQty - currReturnedQty} remain eligible for return.` };
          }

          const newReturnedQty = currReturnedQty + totalReturnQty;
          const currReturnedAmount = parseFloat(sale.returned_amount || '0');
          const newReturnedAmount = currReturnedAmount + totalReturnAmount;
          const origUnitSellingPrice = parseFloat(sale.selling_price || '0');
          const origTotalValue = origQty * origUnitSellingPrice;

          let newStatus = 'Partially Returned';
          if (newReturnedQty >= origQty || newReturnedAmount >= origTotalValue) {
            newStatus = 'Returned';
          }

          await client.query(
            'UPDATE sales SET status = $1, returned_qty = $2, returned_amount = $3 WHERE id = $4',
            [newStatus, newReturnedQty, newReturnedAmount, saleId]
          );

          if (restock && sale.variant_id) {
            await client.query('UPDATE variants SET current_stock = current_stock + $1 WHERE id = $2', [totalReturnQty, sale.variant_id]);
            const mvId = crypto.randomUUID();
            await client.query(
              `INSERT INTO movements (id, variant_id, from_warehouse_id, to_warehouse_id, quantity, type, reason, created_by, created_at)
               VALUES ($1, $2, $3, NULL, $4, 'incoming', $5, 'Return Process', NOW())`,
              [mvId, sale.variant_id, sale.warehouse_id, totalReturnQty, `Customer Return: ${reason}`]
            );
          }
        }
        await client.query('COMMIT');
        return { success: true };
      } catch (e: any) {
        await client.query('ROLLBACK');
        console.error('Error processing return in DB:', e);
        return { success: false, error: e.message };
      } finally {
        client.release();
      }
    } else {
      if (saleId) {
        const idx = inMemoryDb.sales.findIndex((s: any) => s.id === saleId);
        if (idx !== -1) {
          const sale = inMemoryDb.sales[idx];
          const newReturnedQty = (sale.returnedQty || 0) + totalReturnQty;
          const newReturnedAmount = (sale.returnedAmount || 0) + totalReturnAmount;
          const origQty = sale.quantity || 1;
          const origTotalValue = origQty * (sale.sellingPrice || 0);

          sale.returnedQty = newReturnedQty;
          sale.returnedAmount = newReturnedAmount;
          sale.status = (newReturnedQty >= origQty || newReturnedAmount >= origTotalValue) ? 'Returned' : 'Partially Returned';

          if (restock && sale.variantId) {
            const v = inMemoryDb.variants.find((varItem: any) => varItem.id === sale.variantId);
            if (v) {
              v.currentStock += totalReturnQty;
            }
            inMemoryDb.movements.push({
              id: crypto.randomUUID(),
              variantId: sale.variantId,
              fromWarehouseId: sale.warehouseId || null,
              toWarehouseId: null,
              quantity: totalReturnQty,
              type: 'incoming',
              reason: `Customer Return: ${reason}`,
              createdBy: 'Return Process',
              createdAt: new Date().toISOString()
            });
          }
        }
      }
      return { success: true };
    }
  },

  async reconcileTransactions(warehouseId?: string) {
    const sales = await this.getSales(warehouseId);
    const todayStr = new Date().toISOString().split('T')[0];

    let todaysCashSales = 0;
    let todaysDigitalSales = 0;
    let todaysTelebirrSales = 0;
    let todaysCbeSales = 0;
    let todaysCardSales = 0;
    let todaysOtherDigitalSales = 0;

    let historicalCashSales = 0;
    let historicalDigitalSales = 0;
    let historicalTelebirrSales = 0;
    let historicalCbeSales = 0;
    let historicalCardSales = 0;
    let historicalOtherDigitalSales = 0;

    let todaysCount = 0;
    let historicalCount = 0;
    let todaysTelebirrCount = 0;
    let historicalTelebirrCount = 0;

    for (const sale of sales) {
      if (sale.status === 'Cancelled') continue;

      const totalAmount = Math.max(0, (sale.sellingPrice || 0) * (sale.quantity || 0) - (sale.returnedAmount || 0));
      const method = (sale.paymentMethod || 'cash').toLowerCase().trim();
      const saleDateStr = sale.createdAt ? new Date(sale.createdAt).toISOString().split('T')[0] : todayStr;
      const isToday = saleDateStr === todayStr;

      const isCash = method === 'cash';
      const isTelebirr = method === 'telebirr';
      const isCbe = method === 'cbe' || method === 'cbe birr' || method === 'cbebirr';
      const isCard = method === 'card' || method === 'visa' || method === 'mastercard';

      // Historical aggregation
      historicalCount++;
      if (isCash) {
        historicalCashSales += totalAmount;
      } else {
        historicalDigitalSales += totalAmount;
        if (isTelebirr) {
          historicalTelebirrSales += totalAmount;
          historicalTelebirrCount++;
        } else if (isCbe) {
          historicalCbeSales += totalAmount;
        } else if (isCard) {
          historicalCardSales += totalAmount;
        } else {
          historicalOtherDigitalSales += totalAmount;
        }
      }

      // Today aggregation
      if (isToday) {
        todaysCount++;
        if (isCash) {
          todaysCashSales += totalAmount;
        } else {
          todaysDigitalSales += totalAmount;
          if (isTelebirr) {
            todaysTelebirrSales += totalAmount;
            todaysTelebirrCount++;
          } else if (isCbe) {
            todaysCbeSales += totalAmount;
          } else if (isCard) {
            todaysCardSales += totalAmount;
          } else {
            todaysOtherDigitalSales += totalAmount;
          }
        }
      }
    }

    return {
      warehouseId: warehouseId || 'all',
      reconciledAt: new Date().toISOString(),
      todaysCashSales,
      todaysDigitalSales,
      todaysTelebirrSales,
      todaysCbeSales,
      todaysCardSales,
      todaysOtherDigitalSales,
      todaysTotalSales: todaysCashSales + todaysDigitalSales,

      historicalCashSales,
      historicalDigitalSales,
      historicalTelebirrSales,
      historicalCbeSales,
      historicalCardSales,
      historicalOtherDigitalSales,
      historicalTotalSales: historicalCashSales + historicalDigitalSales,

      digitalBreakdown: {
        telebirr: { today: todaysTelebirrSales, historical: historicalTelebirrSales },
        cbe: { today: todaysCbeSales, historical: historicalCbeSales },
        card: { today: todaysCardSales, historical: historicalCardSales },
        other: { today: todaysOtherDigitalSales, historical: historicalOtherDigitalSales }
      },

      counts: {
        todayTotal: todaysCount,
        todayTelebirr: todaysTelebirrCount,
        historicalTotal: historicalCount,
        historicalTelebirr: historicalTelebirrCount
      }
    };
  }
};
