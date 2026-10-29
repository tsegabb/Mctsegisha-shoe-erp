import { isPostgresConnected, dbInstance, inMemoryDb } from '../config/db.ts';
import { getNotificationSettings } from '../../notifications.ts';

async function resolveWarehouseIds(shopId?: string): Promise<string[]> {
  if (!shopId || shopId.toLowerCase() === 'all' || shopId.toLowerCase() === 'all branches') {
    return [];
  }
  if (isPostgresConnected && dbInstance) {
    try {
      const res = await dbInstance.session.client.query(
        `SELECT id, name FROM warehouses WHERE id = $1 OR LOWER(name) = LOWER($1) OR ($1 ILIKE '%main%' AND LOWER(name) ILIKE '%main%') OR ($1 ILIKE '%branch%' AND LOWER(name) ILIKE '%main%')`,
        [shopId]
      );
      if (res.rows.length > 0) {
        return Array.from(new Set([shopId, ...res.rows.map((r: any) => r.id)]));
      } else if (shopId.toLowerCase().includes('main')) {
        return [shopId, 'w1'];
      }
    } catch (e) {}
  } else {
    const wh = inMemoryDb.warehouses?.find((w: any) => w.id === shopId || w.name.toLowerCase() === shopId.toLowerCase() || (shopId.toLowerCase().includes('main') && w.name.toLowerCase().includes('main')));
    if (wh) return Array.from(new Set([shopId, wh.id]));
    if (shopId.toLowerCase().includes('main')) return [shopId, 'w1'];
  }
  return [shopId];
}

export const reportsService = {
  async getStats(shopId?: string, isSuperAdmin: boolean = false) {
    const settings = getNotificationSettings();
    const targetWarehouseIds = await resolveWarehouseIds(shopId);
    const hasShopFilter = targetWarehouseIds.length > 0;

    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;

      // Filter queries if shopId is provided
      const warehouseWhereClause = hasShopFilter ? 'WHERE id = ANY($1)' : '';
      const salesWhereClause = hasShopFilter ? 'WHERE warehouse_id = ANY($1)' : '';
      const movementsWhereClause = hasShopFilter ? 'WHERE from_warehouse_id = ANY($1) OR to_warehouse_id = ANY($1)' : '';
      const filterParams = hasShopFilter ? [targetWarehouseIds] : [];

      const stockRes = await pool.query('SELECT SUM(current_stock) as total_stock, SUM(current_stock * price) as total_value FROM variants');
      const lowStockRes = await pool.query('SELECT COUNT(*) as low_stock_count FROM variants WHERE current_stock < $1', [settings.threshold]);
      
      const lowStockVariantsRes = await pool.query(`
        SELECT v.*, p.name as product_name, b.name as brand_name
        FROM variants v
        LEFT JOIN products p ON v.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE v.current_stock < $1
        ORDER BY v.current_stock ASC, v.sku ASC
      `, [settings.threshold]);

      const lowStockVariants = lowStockVariantsRes.rows.map((vr: any) => ({
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
        productBrand: vr.brand_name
      }));

      const whRes = await pool.query(`
        SELECT 
          w.id, 
          w.name, 
          w.code,
          w.location,
          w.capacity,
          COALESCE((
            SELECT SUM(quantity) 
            FROM movements 
            WHERE to_warehouse_id = w.id
          ), 0) - COALESCE((
            SELECT SUM(quantity) 
            FROM movements 
            WHERE from_warehouse_id = w.id
          ), 0) as used
        FROM warehouses w
        ${warehouseWhereClause}
      `, filterParams);

      const movementsRes = await pool.query(`
        SELECT m.*, v.size, v.color, v.sku, p.name as product_name, b.name as brand_name
        FROM movements m
        LEFT JOIN variants v ON m.variant_id = v.id
        LEFT JOIN products p ON v.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
        ${movementsWhereClause}
        ORDER BY m.created_at DESC
        LIMIT 10
      `, filterParams);

      const brandRes = await pool.query(`
        SELECT b.name, COALESCE(SUM(v.current_stock), 0) as value
        FROM brands b
        LEFT JOIN products p ON p.brand_id = b.id
        LEFT JOIN variants v ON v.product_id = p.id
        GROUP BY b.id, b.name
      `);

      const totalStock = parseInt(stockRes.rows[0].total_stock) || 0;
      const totalValue = parseFloat(stockRes.rows[0].total_value) || 0;
      const lowStockCount = parseInt(lowStockRes.rows[0].low_stock_count) || 0;

      const recentMovements = movementsRes.rows.map((row: any) => ({
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
        }
      }));

      const warehouseUtilization = whRes.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        location: row.location,
        capacity: row.capacity,
        used: Math.max(0, parseInt(row.used) || 0)
      }));

      const brandDistribution = brandRes.rows.map((row: any) => ({
        name: row.name,
        value: parseInt(row.value) || 0
      }));

      const salesStatsRes = await pool.query(`
        SELECT 
          COUNT(*) as total_sales_count,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END), 0) as daily_sales_count,
          COALESCE(SUM(quantity * selling_price), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN quantity * selling_price ELSE 0 END), 0) as daily_revenue,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN quantity * selling_price ELSE 0 END), 0) as weekly_revenue,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN quantity * selling_price ELSE 0 END), 0) as monthly_revenue,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '365 days' THEN quantity * selling_price ELSE 0 END), 0) as yearly_revenue,
          COALESCE(SUM(profit), 0) as total_profit,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN profit ELSE 0 END), 0) as daily_profit,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN profit ELSE 0 END), 0) as weekly_profit,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN profit ELSE 0 END), 0) as monthly_profit,
          COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '365 days' THEN profit ELSE 0 END), 0) as yearly_profit
        FROM sales
        ${salesWhereClause}
      `, filterParams);

      const salesRow = salesStatsRes.rows[0];
      const totalSalesCount = parseInt(salesRow.total_sales_count) || 0;
      const dailySalesCount = parseInt(salesRow.daily_sales_count) || 0;
      const totalRevenue = parseFloat(salesRow.total_revenue) || 0;
      const dailyRevenue = parseFloat(salesRow.daily_revenue) || 0;
      const weeklyRevenue = parseFloat(salesRow.weekly_revenue) || 0;
      const monthlyRevenue = parseFloat(salesRow.monthly_revenue) || 0;
      const yearlyRevenue = parseFloat(salesRow.yearly_revenue) || 0;

      const totalProfit = parseFloat(salesRow.total_profit) || 0;
      const dailyProfit = parseFloat(salesRow.daily_profit) || 0;
      const weeklyProfit = parseFloat(salesRow.weekly_profit) || 0;
      const monthlyProfit = parseFloat(salesRow.monthly_profit) || 0;
      const yearlyProfit = parseFloat(salesRow.yearly_profit) || 0;

      const bestSellersRes = await pool.query(`
        SELECT p.name, b.name as brand, SUM(s.quantity) as quantity, SUM(s.quantity * s.selling_price) as revenue, SUM(s.profit) as profit
        FROM sales s
        LEFT JOIN variants v ON s.variant_id = v.id
        LEFT JOIN products p ON v.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
        ${salesWhereClause}
        GROUP BY p.id, p.name, b.name
        ORDER BY quantity DESC
        LIMIT 5
      `, filterParams);

      const revenueHistoryRes = await pool.query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, SUM(quantity * selling_price) as revenue, SUM(profit) as profit
        FROM sales
        ${salesWhereClause ? salesWhereClause + " AND created_at >= NOW() - INTERVAL '30 days'" : "WHERE created_at >= NOW() - INTERVAL '30 days'"}
        GROUP BY date
        ORDER BY date ASC
      `, filterParams);

      const bestSellers = bestSellersRes.rows.map((row: any) => ({
        name: row.name,
        brand: row.brand,
        quantity: parseInt(row.quantity) || 0,
        revenue: parseFloat(row.revenue) || 0,
        profit: parseFloat(row.profit) || 0
      }));

      const historyMap: Record<string, { date: string; revenue: number; profit: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000);
        const dStr = d.toISOString().substring(0, 10);
        historyMap[dStr] = { date: dStr, revenue: 0, profit: 0 };
      }

      revenueHistoryRes.rows.forEach((row: any) => {
        const dateStr = row.date;
        historyMap[dateStr] = {
          date: dateStr,
          revenue: parseFloat(row.revenue) || 0,
          profit: parseFloat(row.profit) || 0
        };
      });

      const revenueHistory = Object.values(historyMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

      // Construct per-shop breakdown & employees count
      const allShopsRes = await pool.query('SELECT * FROM warehouses ORDER BY name ASC');
      const shopBreakdown = [];
      for (const w of allShopsRes.rows) {
        const empRes = await pool.query('SELECT COUNT(*) as emp_count FROM users WHERE shop_id = $1', [w.id]);
        const sRes = await pool.query('SELECT COUNT(*) as sc, COALESCE(SUM(quantity * selling_price), 0) as rev, COALESCE(SUM(profit), 0) as prof FROM sales WHERE warehouse_id = $1', [w.id]);
        
        const empCount = parseInt(empRes.rows[0].emp_count) || 0;
        const sCount = parseInt(sRes.rows[0].sc) || 0;
        const sRev = parseFloat(sRes.rows[0].rev) || 0;
        const sProf = parseFloat(sRes.rows[0].prof) || 0;

        shopBreakdown.push({
          id: w.id,
          name: w.name,
          code: w.code,
          location: w.location,
          capacity: w.capacity,
          assignedEmployeeCount: empCount,
          totalSalesCount: sCount,
          totalRevenue: sRev,
          totalProfit: sProf
        });
      }

      const topPerformingShop = shopBreakdown.slice().sort((a, b) => b.totalRevenue - a.totalRevenue)[0] || null;

      return {
        totalStock,
        totalValue,
        lowStockCount,
        lowStockVariants,
        warehouseUtilization,
        recentMovements,
        brandDistribution,
        totalSalesCount,
        dailySalesCount,
        totalRevenue,
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        yearlyRevenue,
        totalProfit,
        dailyProfit,
        weeklyProfit,
        monthlyProfit,
        yearlyProfit,
        bestSellers,
        revenueHistory,
        shopBreakdown,
        topPerformingShop
      };

    } else {
      // In-Memory implementation
      const filteredSales = inMemoryDb.sales.filter((s: any) => !hasShopFilter || targetWarehouseIds.includes(s.warehouseId));
      const filteredMovements = inMemoryDb.movements.filter((mv: any) => !hasShopFilter || targetWarehouseIds.includes(mv.fromWarehouseId) || targetWarehouseIds.includes(mv.toWarehouseId));

      const totalStock = inMemoryDb.variants.reduce((acc: any, v: any) => acc + v.currentStock, 0);
      const totalValue = inMemoryDb.variants.reduce((acc: any, v: any) => acc + (v.currentStock * v.price), 0);
      const lowStockCount = inMemoryDb.variants.filter((v: any) => v.currentStock < settings.threshold).length;

      const lowStockVariants = inMemoryDb.variants
        .filter((v: any) => v.currentStock < settings.threshold)
        .map((v: any) => {
          const product = inMemoryDb.products.find((p: any) => p.id === v.productId);
          const brand = product ? inMemoryDb.brands.find((b: any) => b.id === product.brandId) : null;
          return {
            ...v,
            productName: product?.name,
            productBrand: brand?.name
          };
        })
        .sort((a: any, b: any) => a.currentStock - b.currentStock);

      const warehouseUtilization = inMemoryDb.warehouses
        .filter((wh: any) => !shopId || wh.id === shopId)
        .map((wh: any) => {
          const used = inMemoryDb.movements.reduce((acc: any, mv: any) => {
            if (mv.toWarehouseId === wh.id) return acc + mv.quantity;
            if (mv.fromWarehouseId === wh.id) return acc - mv.quantity;
            return acc;
          }, 0);
          return {
            id: wh.id,
            name: wh.name,
            code: wh.code,
            location: wh.location,
            capacity: wh.capacity,
            used: Math.max(0, used)
          };
        });

      const recentMovements = filteredMovements
        .slice()
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((mv: any) => {
          const variant = inMemoryDb.variants.find((v: any) => v.id === mv.variantId);
          const product = variant ? inMemoryDb.products.find((p: any) => p.id === variant.productId) : null;
          const brand = product ? inMemoryDb.brands.find((b: any) => b.id === product.brandId) : null;
          return {
            ...mv,
            variant: variant ? {
              ...variant,
              productName: product?.name,
              productBrand: brand?.name
            } : undefined
          };
        });

      const brandDistribution = inMemoryDb.brands.map((b: any) => {
        const value = inMemoryDb.products
          .filter((p: any) => p.brandId === b.id)
          .reduce((sum: any, p: any) => {
            const prodVariants = inMemoryDb.variants.filter((v: any) => v.productId === p.id);
            return sum + prodVariants.reduce((s: any, v: any) => s + v.currentStock, 0);
          }, 0);
        return { name: b.name, value };
      });

      const totalSalesCount = filteredSales.length;
      const dailySalesCount = filteredSales.filter((s: any) => nowMs - new Date(s.createdAt).getTime() <= 24 * 3600 * 1000).length;
      const totalRevenue = filteredSales.reduce((sum: any, s: any) => sum + (s.quantity * s.sellingPrice), 0);
      const totalProfit = filteredSales.reduce((sum: any, s: any) => sum + Number(s.profit), 0);
      const nowMs = Date.now();

      const dailyRevenue = filteredSales
        .filter((s: any) => nowMs - new Date(s.createdAt).getTime() <= 24 * 3600 * 1000)
        .reduce((sum: any, s: any) => sum + (s.quantity * s.sellingPrice), 0);
      const dailyProfit = filteredSales
        .filter((s: any) => nowMs - new Date(s.createdAt).getTime() <= 24 * 3600 * 1000)
        .reduce((sum: any, s: any) => sum + Number(s.profit), 0);

      const weeklyRevenue = filteredSales
        .filter((s: any) => nowMs - new Date(s.createdAt).getTime() <= 7 * 24 * 3600 * 1000)
        .reduce((sum: any, s: any) => sum + (s.quantity * s.sellingPrice), 0);
      const weeklyProfit = filteredSales
        .filter((s: any) => nowMs - new Date(s.createdAt).getTime() <= 7 * 24 * 3600 * 1000)
        .reduce((sum: any, s: any) => sum + Number(s.profit), 0);

      const monthlyRevenue = filteredSales
        .filter((s: any) => nowMs - new Date(s.createdAt).getTime() <= 30 * 24 * 3600 * 1000)
        .reduce((sum: any, s: any) => sum + (s.quantity * s.sellingPrice), 0);
      const monthlyProfit = filteredSales
        .filter((s: any) => nowMs - new Date(s.createdAt).getTime() <= 30 * 24 * 3600 * 1000)
        .reduce((sum: any, s: any) => sum + Number(s.profit), 0);

      const yearlyRevenue = filteredSales
        .filter((s: any) => nowMs - new Date(s.createdAt).getTime() <= 365 * 24 * 3600 * 1000)
        .reduce((sum: any, s: any) => sum + (s.quantity * s.sellingPrice), 0);
      const yearlyProfit = filteredSales
        .filter((s: any) => nowMs - new Date(s.createdAt).getTime() <= 365 * 24 * 3600 * 1000)
        .reduce((sum: any, s: any) => sum + Number(s.profit), 0);

      const groups: Record<string, { name: string; brand: string; quantity: number; revenue: number; profit: number }> = {};
      filteredSales.forEach((s: any) => {
        const variant = inMemoryDb.variants.find((v: any) => v.id === s.variantId);
        if (!variant) return;
        const product = inMemoryDb.products.find((p: any) => p.id === variant.productId);
        if (!product) return;
        const brand = product ? inMemoryDb.brands.find((b: any) => b.id === product.brandId) : null;
        
        const key = product.id;
        if (!groups[key]) {
          groups[key] = {
            name: product.name,
            brand: brand ? brand.name : 'Unknown',
            quantity: 0,
            revenue: 0,
            profit: 0
          };
        }
        groups[key].quantity += s.quantity;
        groups[key].revenue += s.quantity * s.sellingPrice;
        groups[key].profit += s.profit;
      });
      const bestSellers = Object.values(groups)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const historyMap: Record<string, { date: string; revenue: number; profit: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000);
        const dStr = d.toISOString().substring(0, 10);
        historyMap[dStr] = { date: dStr, revenue: 0, profit: 0 };
      }

      filteredSales.forEach((s: any) => {
        const dateStr = s.createdAt.substring(0, 10);
        if (!historyMap[dateStr]) {
          historyMap[dateStr] = { date: dateStr, revenue: 0, profit: 0 };
        }
        historyMap[dateStr].revenue += s.quantity * s.sellingPrice;
        historyMap[dateStr].profit += s.profit;
      });
      const revenueHistory = Object.values(historyMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

      const shopBreakdown = inMemoryDb.warehouses.map((wh: any) => {
        const empCount = inMemoryDb.users.filter((u: any) => u.shopId === wh.id).length;
        const whSales = inMemoryDb.sales.filter((s: any) => s.warehouseId === wh.id);
        const sRev = whSales.reduce((acc: any, s: any) => acc + (s.quantity * s.sellingPrice), 0);
        const sProf = whSales.reduce((acc: any, s: any) => acc + Number(s.profit), 0);
        return {
          id: wh.id,
          name: wh.name,
          code: wh.code,
          location: wh.location,
          capacity: wh.capacity,
          assignedEmployeeCount: empCount,
          totalSalesCount: whSales.length,
          totalRevenue: sRev,
          totalProfit: sProf
        };
      });

      const topPerformingShop = shopBreakdown.slice().sort((a, b) => b.totalRevenue - a.totalRevenue)[0] || null;

      return {
        totalStock,
        totalValue,
        lowStockCount,
        lowStockVariants,
        warehouseUtilization,
        recentMovements,
        brandDistribution,
        totalSalesCount,
        dailySalesCount,
        totalRevenue,
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        yearlyRevenue,
        totalProfit,
        dailyProfit,
        weeklyProfit,
        monthlyProfit,
        yearlyProfit,
        bestSellers,
        revenueHistory,
        shopBreakdown,
        topPerformingShop
      };
    }
  },

  async getShopDashboard(shopId?: string) {
    const settings = getNotificationSettings();
    const targetWarehouseIds = await resolveWarehouseIds(shopId);
    const hasShopFilter = targetWarehouseIds.length > 0;

    if (isPostgresConnected && dbInstance) {
      const pool = dbInstance.session.client;
      const salesClause = hasShopFilter ? "WHERE s.warehouse_id = ANY($1)" : "";
      const params = hasShopFilter ? [targetWarehouseIds] : [];

      const invRes = await pool.query(`
        SELECT 
          COALESCE(SUM(v.current_stock), 0) as total_stock,
          COALESCE(SUM(v.current_stock * v.price), 0) as total_value,
          COUNT(DISTINCT p.id) as product_count
        FROM products p
        LEFT JOIN variants v ON v.product_id = p.id
      `);

      const lowStockRes = await pool.query(`
        SELECT v.*, p.name as product_name, b.name as brand_name
        FROM variants v
        LEFT JOIN products p ON v.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE v.current_stock < $1
        ORDER BY v.current_stock ASC
      `, [settings.threshold]);

      const salesRes = await pool.query(`
        SELECT 
          COALESCE(SUM(s.quantity * s.selling_price), 0) as total_revenue,
          COALESCE(SUM(s.quantity * s.cost_price), 0) as total_cost,
          COALESCE(SUM(s.profit), 0) as total_profit,
          COUNT(s.id) as total_sales_count
        FROM sales s
        ${salesClause}
      `, params);

      const empRes = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE 1=1 ${hasShopFilter ? "AND shop_id = ANY($1)" : ""} AND (LOWER(role) LIKE '%sale%' OR LOWER(role) LIKE '%staff%')
      `, params);

      const recentSalesRes = await pool.query(`
        SELECT s.*, v.size, v.color, v.sku, p.name as product_name, b.name as brand_name
        FROM sales s
        LEFT JOIN variants v ON s.variant_id = v.id
        LEFT JOIN products p ON v.product_id = p.id
        LEFT JOIN brands b ON p.brand_id = b.id
        ${salesClause}
        ORDER BY s.created_at DESC
        LIMIT 10
      `, params);

      const totalRevenue = parseFloat(salesRes.rows[0].total_revenue) || 0;
      const totalCost = parseFloat(salesRes.rows[0].total_cost) || 0;
      const totalProfit = parseFloat(salesRes.rows[0].total_profit) || (totalRevenue - totalCost);

      return {
        inventory: {
          totalStock: parseInt(invRes.rows[0].total_stock) || 0,
          totalValue: parseFloat(invRes.rows[0].total_value) || 0,
          productCount: parseInt(invRes.rows[0].product_count) || 0,
          lowStockItems: lowStockRes.rows.map((row: any) => ({
            id: row.id,
            productId: row.product_id,
            size: row.size,
            color: row.color,
            sku: row.sku,
            currentStock: row.current_stock,
            barcode: row.barcode,
            price: parseFloat(row.price),
            productName: row.product_name,
            brandName: row.brand_name
          }))
        },
        sales: {
          totalRevenue,
          totalCost,
          totalSalesCount: parseInt(salesRes.rows[0].total_sales_count) || 0,
          totalProfit
        },
        customerCount: parseInt(salesRes.rows[0].total_sales_count) || 0,
        employeeCount: parseInt(empRes.rows[0].count) || 0,
        recentSales: recentSalesRes.rows.map((s: any) => ({
          id: s.id,
          variantId: s.variant_id,
          warehouseId: s.warehouse_id,
          quantity: s.quantity,
          sellingPrice: parseFloat(s.selling_price),
          costPrice: parseFloat(s.cost_price),
          profit: parseFloat(s.profit),
          createdAt: s.created_at,
          size: s.size,
          color: s.color,
          sku: s.sku,
          productName: s.product_name,
          brandName: s.brand_name
        }))
      };
    } else {
      // In-Memory implementation
      const filteredSales = inMemoryDb.sales.filter((s: any) => !shopId || s.warehouseId === shopId);
      const shopUsers = inMemoryDb.users.filter((u: any) => !shopId || u.shopId === shopId);

      const totalStock = inMemoryDb.variants.reduce((acc: any, v: any) => acc + v.currentStock, 0);
      const totalValue = inMemoryDb.variants.reduce((acc: any, v: any) => acc + (v.currentStock * v.price), 0);
      const lowStockItems = inMemoryDb.variants.filter((v: any) => v.currentStock < settings.threshold);

      const totalRevenue = filteredSales.reduce((acc: any, s: any) => acc + (s.quantity * s.sellingPrice), 0);
      const totalCost = filteredSales.reduce((acc: any, s: any) => acc + (s.quantity * (s.costPrice || s.sellingPrice * 0.6)), 0);
      const totalProfit = filteredSales.reduce((acc: any, s: any) => acc + Number(s.profit || 0), 0);

      const recentSales = filteredSales
        .slice()
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      return {
        inventory: {
          totalStock,
          totalValue,
          productCount: inMemoryDb.products.length,
          lowStockItems
        },
        sales: {
          totalRevenue,
          totalCost,
          totalSalesCount: filteredSales.length,
          totalProfit
        },
        customerCount: filteredSales.length,
        employeeCount: shopUsers.filter((u: any) => (u.role || '').toLowerCase().includes('sale')).length,
        recentSales
      };
    }
  }
};
