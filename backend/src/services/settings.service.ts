import { isPostgresConnected, dbInstance, inMemoryDb } from '../config/db.ts';
import {
  getNotificationSettings,
  saveNotificationSettings,
  getEmailLogs,
  sendLowStockEmailSummary,
  sendTelegramMessage,
  sendDailyReportTelegram
} from '../../notifications.ts';
import {
  getGeneralSettings,
  saveGeneralSettings,
  triggerBackup,
  listBackups,
  loadBackupContent
} from '../../settings_store.ts';
import { getAllVariantsList } from './inventory.service.ts';
import { reportsService } from './reports.service.ts';
import { cashService } from './cash.service.ts';
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

async function getOrCreateBrandId(brandName: string): Promise<string> {
  if (isPostgresConnected && dbInstance) {
    const client = dbInstance.session.client;
    const res = await client.query('SELECT id FROM brands WHERE LOWER(name) = LOWER($1)', [brandName]);
    if (res.rows.length > 0) {
      return res.rows[0].id;
    }
    const newId = generateId();
    await client.query('INSERT INTO brands (id, name, created_at) VALUES ($1, $2, $3)', [newId, brandName, new Date().toISOString()]);
    return newId;
  } else {
    const brand = inMemoryDb.brands.find((b: any) => b.name.toLowerCase() === brandName.toLowerCase());
    if (brand) {
      return brand.id;
    }
    const newId = generateId();
    inMemoryDb.brands.push({
      id: newId,
      name: brandName,
      createdAt: new Date().toISOString()
    });
    return newId;
  }
}

export const settingsService = {
  // --- NOTIFICATIONS ---
  getNotificationSettings() {
    const settings = getNotificationSettings();
    return {
      ...settings,
      smtpPass: settings.smtpPass ? '********' : ''
    };
  },

  saveNotificationSettings(newSettings: any) {
    if (newSettings.smtpPass === '********') {
      delete newSettings.smtpPass;
    }
    const updated = saveNotificationSettings(newSettings);
    return {
      ...updated,
      smtpPass: updated.smtpPass ? '********' : ''
    };
  },

  getEmailLogs() {
    return getEmailLogs();
  },

  async triggerNotificationCheck() {
    const list = await getAllVariantsList();
    const result = await sendLowStockEmailSummary(list, true);
    return {
      message: 'Notification trigger executed successfully',
      log: result.log,
      sent: result.success
    };
  },

  async testTelegramBot(token?: string, chatId?: string) {
    const testMsg = `
🔔 <b>SOLEFLOW TELEGRAM BOT INTEGRATION</b>

✅ Your Telegram Bot connection is active and fully functional!

You will receive real-time sales alerts, low stock warnings, and daily operational summaries directly in this chat.
`.trim();

    const res = await sendTelegramMessage(testMsg, token, chatId);
    if (!res.success) {
      throw new Error(res.error || 'Failed to connect to Telegram Bot API');
    }
    return {
      message: 'Telegram test message sent successfully!',
      data: res.data
    };
  },

  async sendDailyReportTelegram(token?: string, chatId?: string, shopId?: string) {
    const [stats, cashSummary] = await Promise.all([
      reportsService.getStats(shopId, true),
      cashService.getCashSummary(shopId)
    ]);

    const result = await sendDailyReportTelegram(stats, cashSummary, token, chatId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to dispatch Telegram daily report');
    }
    return {
      message: 'Daily report successfully sent to Telegram!',
      log: result.log,
      reportText: result.reportText
    };
  },

  // --- GENERAL SETTINGS ---
  getGeneralSettings() {
    return getGeneralSettings();
  },

  saveGeneralSettings(section: string, data: any) {
    return saveGeneralSettings(section as any, data);
  },

  // --- BACKUPS & EXPORTS ---
  listBackups() {
    return listBackups();
  },

  async createBackup() {
    const dump: any = {
      isPostgres: isPostgresConnected && !!dbInstance,
      timestamp: new Date().toISOString(),
      data: {}
    };

    if (isPostgresConnected && dbInstance) {
      const client = dbInstance.session.client;
      const tables = ['brands', 'products', 'variants', 'warehouses', 'suppliers', 'movements', 'sales', 'orders', 'order_items'];
      for (const t of tables) {
        const result = await client.query(`SELECT * FROM ${t}`);
        dump.data[t] = result.rows;
      }
    } else {
      dump.data = JSON.parse(JSON.stringify(inMemoryDb));
    }

    return triggerBackup(dump);
  },

  async restoreBackup(filename: string) {
    const dump = loadBackupContent(filename);
    if (!dump || !dump.data) {
      throw new Error('Invalid backup file content');
    }

    if (isPostgresConnected && dbInstance) {
      const client = dbInstance.session.client;
      await client.query('BEGIN');
      try {
        await client.query('TRUNCATE TABLE order_items, orders, sales, movements, variants, products, suppliers, warehouses, brands CASCADE');

        const tablesOrder = ['brands', 'suppliers', 'warehouses', 'products', 'variants', 'sales', 'movements', 'orders', 'order_items'];

        for (const t of tablesOrder) {
          const rows = dump.data[t];
          if (!rows || rows.length === 0) continue;

          for (const row of rows) {
            const keys = Object.keys(row);
            const values = Object.values(row);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const cols = keys.join(', ');
            
            await client.query(`INSERT INTO ${t} (${cols}) VALUES (${placeholders})`, values);
          }
        }
        await client.query('COMMIT');
      } catch (dbErr: any) {
        await client.query('ROLLBACK');
        throw dbErr;
      }
    } else {
      const keys = ['brands', 'products', 'variants', 'warehouses', 'suppliers', 'movements', 'sales', 'orders', 'order_items'];
      for (const k of keys) {
        if (dump.data[k]) {
          (inMemoryDb as any)[k] = JSON.parse(JSON.stringify(dump.data[k]));
        }
      }
    }

    return { message: 'Database successfully restored from backup' };
  },

  async exportAllData() {
    let exportData: any = {};
    if (isPostgresConnected && dbInstance) {
      const client = dbInstance.session.client;
      const tables = ['brands', 'products', 'variants', 'warehouses', 'suppliers', 'movements', 'sales', 'orders', 'order_items'];
      for (const t of tables) {
        const result = await client.query(`SELECT * FROM ${t}`);
        exportData[t] = result.rows;
      }
    } else {
      exportData = JSON.parse(JSON.stringify(inMemoryDb));
    }
    return exportData;
  },

  async importData(products: any[]) {
    if (!products || !Array.isArray(products)) {
      throw new Error('Products array is required');
    }

    for (const item of products) {
      const brandId = await getOrCreateBrandId(item.brandName || 'Generic');
      const productId = generateId();

      const productObj = {
        id: productId,
        name: item.name || 'Imported Shoe',
        description: item.description || '',
        brandId,
        category: item.category || 'Casual',
        gender: item.gender || 'Unisex',
        basePrice: parseFloat(item.basePrice) || 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isPostgresConnected && dbInstance) {
        const client = dbInstance.session.client;
        await client.query(`
          INSERT INTO products (id, name, description, brand_id, category, gender, base_price, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [productObj.id, productObj.name, productObj.description, productObj.brandId, productObj.category, productObj.gender, productObj.basePrice, productObj.createdAt, productObj.updatedAt]);
      } else {
        inMemoryDb.products.push(productObj);
      }

      const vars = item.variants || [{ size: 40, color: 'Black', price: productObj.basePrice, currentStock: 10 }];
      for (const v of vars) {
        const variantId = generateId();
        const sku = v.sku || `${productObj.name.substring(0, 3).toUpperCase()}-${v.size}-${v.color.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const barcode = v.barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`;

        const variantObj = {
          id: variantId,
          productId,
          size: parseInt(v.size) || 40,
          color: v.color || 'Black',
          sku,
          currentStock: parseInt(v.currentStock) || 0,
          barcode,
          price: parseFloat(v.price) || productObj.basePrice,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (isPostgresConnected && dbInstance) {
          const client = dbInstance.session.client;
          await client.query(`
            INSERT INTO variants (id, product_id, size, color, sku, current_stock, barcode, price, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [variantObj.id, variantObj.productId, variantObj.size, variantObj.color, variantObj.sku, variantObj.currentStock, variantObj.barcode, variantObj.price, variantObj.createdAt, variantObj.updatedAt]);
        } else {
          inMemoryDb.variants.push(variantObj);
        }
      }
    }

    return { message: `${products.length} products successfully imported!` };
  }
};
