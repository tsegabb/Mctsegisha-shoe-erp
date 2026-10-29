import { isPostgresConnected, dbInstance, inMemoryDb } from '../config/db.ts';
import { salesService } from './sales.service.ts';
import crypto from 'crypto';

export interface CashActivity {
  id: string;
  shopId?: string;
  type: string;
  amount: number;
  method: string;
  note: string;
  userName: string;
  time?: string;
  createdAt: string;
}

async function resolveWarehouseId(shopId?: string): Promise<string> {
  if (!shopId) return 'w1';
  if (isPostgresConnected && dbInstance) {
    try {
      const res = await dbInstance.session.client.query(
        `SELECT id FROM warehouses WHERE id = $1 OR LOWER(name) = LOWER($1) OR ($1 ILIKE '%main%' AND LOWER(name) ILIKE '%main%') OR ($1 ILIKE '%branch%' AND LOWER(name) ILIKE '%main%')`,
        [shopId]
      );
      if (res.rows.length > 0) return res.rows[0].id;
    } catch (e) {}
  } else {
    const wh = inMemoryDb.warehouses?.find((w: any) => w.id === shopId || w.name.toLowerCase() === shopId.toLowerCase() || (shopId.toLowerCase().includes('main') && w.name.toLowerCase().includes('main')));
    if (wh) return wh.id;
  }
  return shopId.toLowerCase().includes('main') ? 'w1' : shopId;
}

export const cashService = {
  async getCashSummary(shopId?: string) {
    let activities: CashActivity[] = [];
    let salesData: any[] = [];
    let branchName = 'Main Branch';

    let targetWarehouseIds: string[] = shopId ? [shopId] : [];
    let resolvedWarehouseId: string | undefined = shopId;
    let isAllBranches = !shopId || shopId.toLowerCase() === 'all' || shopId.toLowerCase() === 'all branches';

    // 1. Fetch branch name if shopId provided and resolve warehouse IDs
    if (shopId && !isAllBranches) {
      if (isPostgresConnected && dbInstance) {
        try {
          const res = await dbInstance.session.client.query(
            `SELECT id, name FROM warehouses WHERE id = $1 OR LOWER(name) = LOWER($1) OR ($1 ILIKE '%main%' AND LOWER(name) ILIKE '%main%') OR ($1 ILIKE '%branch%' AND LOWER(name) ILIKE '%main%')`,
            [shopId]
          );
          if (res.rows.length > 0) {
            branchName = res.rows[0].name;
            resolvedWarehouseId = res.rows[0].id;
            targetWarehouseIds = Array.from(new Set([shopId, ...res.rows.map((r: any) => r.id), ...res.rows.map((r: any) => r.name)]));
          } else if (shopId.toLowerCase().includes('main')) {
            resolvedWarehouseId = 'w1';
            targetWarehouseIds = [shopId, 'w1'];
          } else {
            // If no matching warehouse found by ID or name, include all or default
            isAllBranches = true;
          }
        } catch (e) {
          console.warn('Failed to fetch warehouse name:', e);
        }
      } else {
        const wh = inMemoryDb.warehouses?.find((w: any) => w.id === shopId || w.name.toLowerCase() === shopId.toLowerCase() || (shopId.toLowerCase().includes('main') && w.name.toLowerCase().includes('main')));
        if (wh) {
          branchName = wh.name;
          resolvedWarehouseId = wh.id;
          targetWarehouseIds = Array.from(new Set([shopId, wh.id, wh.name]));
        } else if (shopId.toLowerCase().includes('main')) {
          resolvedWarehouseId = 'w1';
          targetWarehouseIds = [shopId, 'w1'];
        } else {
          isAllBranches = true;
        }
      }
    }

    // 2. Fetch cash activities from PostgreSQL or inMemoryDb
    if (isPostgresConnected && dbInstance) {
      try {
        let q = `SELECT * FROM cash_activities`;
        const params: any[] = [];
        if (!isAllBranches && targetWarehouseIds.length > 0) {
          q += ` WHERE shop_id = ANY($1) OR shop_id IS NULL`;
          params.push(targetWarehouseIds);
        }
        q += ` ORDER BY created_at DESC`;
        const res = await dbInstance.session.client.query(q, params);
        activities = res.rows.map((r: any) => ({
          id: r.id,
          shopId: r.shop_id,
          type: r.type,
          amount: parseFloat(r.amount),
          method: r.method,
          note: r.note || '',
          userName: r.user_name || 'Staff',
          createdAt: new Date(r.created_at).toISOString()
        }));
      } catch (err: any) {
        console.error('Error fetching cash_activities:', err.message);
      }
    } else {
      if (!inMemoryDb.cashActivities) {
        const now = new Date();
        inMemoryDb.cashActivities = [
          {
            id: 'ca-1',
            shopId: 'w1',
            type: 'Opening Float',
            amount: 5000,
            method: 'Cash',
            note: 'Daily initial register float',
            userName: 'Head Cashier',
            createdAt: new Date(now.getTime() - 6 * 3600 * 1000).toISOString()
          },
          {
            id: 'ca-2',
            shopId: 'w1',
            type: 'Cash Drop',
            amount: -2000,
            method: 'Bank Transfer',
            note: 'Safe transfer to main vault',
            userName: 'Store Manager',
            createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString()
          }
        ];
      }
      activities = (inMemoryDb.cashActivities || [])
        .filter((a: any) => isAllBranches || targetWarehouseIds.includes(a.shopId) || !a.shopId)
        .map((a: any) => ({ ...a, amount: parseFloat(a.amount) }));
    }

    // 3. Fetch POS Sales from PostgreSQL or inMemoryDb
    if (isPostgresConnected && dbInstance) {
      try {
        let q = `
          SELECT s.*, p.name as product_name
          FROM sales s
          LEFT JOIN variants v ON s.variant_id = v.id
          LEFT JOIN products p ON v.product_id = p.id
        `;
        const params: any[] = [];
        if (!isAllBranches && targetWarehouseIds.length > 0) {
          q += ` WHERE s.warehouse_id = ANY($1) OR s.warehouse_id IS NULL`;
          params.push(targetWarehouseIds);
        }
        q += ` ORDER BY s.created_at DESC`;
        const res = await dbInstance.session.client.query(q, params);
        salesData = res.rows.map((r: any) => ({
          id: r.id,
          warehouseId: r.warehouse_id,
          amount: parseFloat(r.selling_price) * parseInt(r.quantity),
          paymentMethod: (r.payment_method || 'cash').toLowerCase(),
          status: r.status || 'Completed',
          productName: r.product_name || 'POS Sale Item',
          createdAt: new Date(r.created_at).toISOString()
        }));
      } catch (err: any) {
        console.error('Error fetching sales for cash summary:', err.message);
      }
    } else {
      salesData = (inMemoryDb.sales || [])
        .filter((s: any) => isAllBranches || targetWarehouseIds.includes(s.warehouseId) || !s.warehouseId)
        .map((s: any) => {
          const variant = inMemoryDb.variants.find((v: any) => v.id === s.variantId);
          const product = variant ? inMemoryDb.products.find((p: any) => p.id === variant.productId) : null;
          return {
            id: s.id,
            warehouseId: s.warehouseId,
            amount: parseFloat(s.sellingPrice) * parseInt(s.quantity),
            paymentMethod: (s.paymentMethod || 'cash').toLowerCase(),
            status: s.status || 'Completed',
            productName: product ? product.name : 'POS Sale Item',
            createdAt: s.createdAt || new Date().toISOString()
          };
        });
    }

    // Calculate figures using salesService.reconcileTransactions for accurate consolidated aggregation
    const effectiveWarehouseId = isAllBranches ? undefined : (resolvedWarehouseId || shopId);
    const reconciliation = await salesService.reconcileTransactions(effectiveWarehouseId);

    // Latest opening float activity or default 5000
    const openingFloatActivity = activities.find(a => a.type === 'Opening Float');
    const openingFloat = openingFloatActivity ? Math.abs(openingFloatActivity.amount) : 5000;

    const todaysCashSales = reconciliation.todaysCashSales;
    const todaysDigitalSales = reconciliation.todaysDigitalSales;

    // Total cash drops / safe transfers
    const cashDropsTotal = activities
      .filter(a => a.type === 'Cash Drop' || a.amount < 0)
      .reduce((acc, a) => acc + Math.abs(a.amount), 0);

    // Other manual cash additions (if any)
    const otherCashIn = activities
      .filter(a => a.type !== 'Opening Float' && a.type !== 'Cash Drop' && a.amount > 0)
      .reduce((acc, a) => acc + a.amount, 0);

    // Current Register Cash = Opening Float + Cash Sales + Other Cash In - Cash Drops
    const currentRegisterCash = Math.max(0, openingFloat + todaysCashSales + otherCashIn - cashDropsTotal);

    // Build combined activity list
    const posSaleActivities: CashActivity[] = salesData.map(s => {
      const isCash = s.paymentMethod === 'cash';
      let methodLabel = 'Cash';
      if (s.paymentMethod === 'telebirr') methodLabel = 'Telebirr';
      else if (s.paymentMethod === 'cbe') methodLabel = 'CBE Birr';
      else if (s.paymentMethod === 'card') methodLabel = 'Card';
      else if (s.paymentMethod !== 'cash') methodLabel = s.paymentMethod.toUpperCase();

      return {
        id: `pos-${s.id}`,
        type: 'POS Sale',
        amount: s.amount,
        method: methodLabel,
        note: `Order #${s.id.length > 8 ? s.id.slice(0, 8).toUpperCase() : s.id} - ${s.productName}`,
        userName: 'Abebe B.',
        createdAt: s.createdAt
      };
    });

    // Merge and sort newest first
    const mergedActivities = [...activities, ...posSaleActivities]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(act => {
        const dt = new Date(act.createdAt);
        return {
          ...act,
          time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      });

    return {
      branchName,
      currentRegisterCash,
      todaysCashSales,
      todaysDigitalSales,
      todaysTelebirrSales: reconciliation.todaysTelebirrSales,
      todaysOtherDigitalSales: reconciliation.todaysCbeSales + reconciliation.todaysCardSales + reconciliation.todaysOtherDigitalSales,
      
      historicalCashSales: reconciliation.historicalCashSales,
      historicalDigitalSales: reconciliation.historicalDigitalSales,
      historicalTelebirrSales: reconciliation.historicalTelebirrSales,
      historicalOtherDigitalSales: reconciliation.historicalCbeSales + reconciliation.historicalCardSales + reconciliation.historicalOtherDigitalSales,

      digitalBreakdown: reconciliation.digitalBreakdown,
      openingFloat,
      cashDropsTotal,
      activities: mergedActivities
    };
  },

  async recordCashDrop(data: { amount: number; note?: string; shopId?: string; userName?: string }) {
    const { amount, note, shopId, userName } = data;
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Please enter a valid positive cash drop amount');
    }

    const effectiveShopId = await resolveWarehouseId(shopId);
    const id = `cd-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const activity: CashActivity = {
      id,
      shopId: effectiveShopId,
      type: 'Cash Drop',
      amount: -Math.abs(amount),
      method: 'Bank Transfer',
      note: note || 'Safe transfer to main vault',
      userName: userName || 'Store Manager',
      createdAt: new Date().toISOString()
    };

    if (isPostgresConnected && dbInstance) {
      await dbInstance.session.client.query(
        `INSERT INTO cash_activities (id, shop_id, type, amount, method, note, user_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          activity.id,
          activity.shopId,
          activity.type,
          activity.amount,
          activity.method,
          activity.note,
          activity.userName,
          activity.createdAt
        ]
      );
    } else {
      if (!inMemoryDb.cashActivities) inMemoryDb.cashActivities = [];
      inMemoryDb.cashActivities.unshift(activity);
    }

    return this.getCashSummary(shopId);
  },

  async setOpeningFloat(data: { amount: number; note?: string; shopId?: string; userName?: string }) {
    const { amount, note, shopId, userName } = data;
    if (isNaN(amount) || amount < 0) {
      throw new Error('Please enter a valid non-negative opening float amount');
    }

    const effectiveShopId = await resolveWarehouseId(shopId);
    const id = `of-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const activity: CashActivity = {
      id,
      shopId: effectiveShopId,
      type: 'Opening Float',
      amount: Math.abs(amount),
      method: 'Cash',
      note: note || 'Daily initial register float',
      userName: userName || 'Head Cashier',
      createdAt: new Date().toISOString()
    };

    if (isPostgresConnected && dbInstance) {
      await dbInstance.session.client.query(
        `INSERT INTO cash_activities (id, shop_id, type, amount, method, note, user_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          activity.id,
          activity.shopId,
          activity.type,
          activity.amount,
          activity.method,
          activity.note,
          activity.userName,
          activity.createdAt
        ]
      );
    } else {
      if (!inMemoryDb.cashActivities) inMemoryDb.cashActivities = [];
      inMemoryDb.cashActivities.unshift(activity);
    }

    return this.getCashSummary(shopId);
  },

  async recordActivity(data: { type: string; amount: number; method: string; note?: string; shopId?: string; userName?: string }) {
    const { type, amount, method, note, shopId, userName } = data;
    const effectiveShopId = await resolveWarehouseId(shopId);
    const id = `ca-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const activity: CashActivity = {
      id,
      shopId: effectiveShopId,
      type,
      amount,
      method: method || 'Cash',
      note: note || '',
      userName: userName || 'Staff',
      createdAt: new Date().toISOString()
    };

    if (isPostgresConnected && dbInstance) {
      await dbInstance.session.client.query(
        `INSERT INTO cash_activities (id, shop_id, type, amount, method, note, user_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          activity.id,
          activity.shopId,
          activity.type,
          activity.amount,
          activity.method,
          activity.note,
          activity.userName,
          activity.createdAt
        ]
      );
    } else {
      if (!inMemoryDb.cashActivities) inMemoryDb.cashActivities = [];
      inMemoryDb.cashActivities.unshift(activity);
    }

    return this.getCashSummary(shopId);
  }
};
