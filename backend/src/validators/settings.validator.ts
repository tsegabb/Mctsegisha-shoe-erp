import { z } from 'zod';
import { uuid } from './common.validator.ts';

export const SETTINGS_SECTIONS = [
  'businessProfile', 'inventoryRules', 'usersPermissions', 'categoriesAttributes',
  'pricingTax', 'notifications', 'integrations', 'security',
] as const;

export const saveGeneralSettingsSchema = z.object({
  params: z.object({ section: z.enum(SETTINGS_SECTIONS) }),
  body: z.record(z.string(), z.unknown()).refine((b) => Object.keys(b).length <= 60, 'Too many keys'),
});

export const saveNotificationSettingsSchema = z.object({
  body: z.object({
    threshold: z.number().int().min(0).max(100_000).optional(),
    adminEmail: z.string().trim().email().max(254).or(z.literal('')).optional(),
    enableAutoEmail: z.boolean().optional(),
    emailMethod: z.enum(['sandbox', 'smtp']).optional(),
    smtpHost: z.string().trim().max(255).optional(),
    smtpPort: z.number().int().min(1).max(65535).optional(),
    smtpUser: z.string().trim().max(255).optional(),
    smtpPass: z.string().max(255).optional(),
    smtpFrom: z.string().trim().max(255).optional(),
    enableTelegram: z.boolean().optional(),
    telegramToken: z.string().trim().max(255).optional(),
    telegramChatId: z.string().trim().max(64).optional(),
    enableDailyReportTelegram: z.boolean().optional(),
    dailyReportTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  }),
});

export const telegramTestSchema = z.object({
  body: z.object({ token: z.string().trim().max(255).optional(), chatId: z.string().trim().max(64).optional() }).default({}),
});
export const telegramReportSchema = z.object({
  body: z.object({ token: z.string().trim().max(255).optional(), chatId: z.string().trim().max(64).optional(), shopId: uuid.optional() }).default({}),
});

export const restoreBackupSchema = z.object({
  body: z.object({
    filename: z.string().regex(/^backup_[A-Za-z0-9_-]+\.json$/, 'Invalid backup file name'),
    confirm: z.literal('RESTORE', { message: 'Type RESTORE to confirm – this replaces all inventory and sales data' }),
  }),
});

export const importProductsSchema = z.object({
  body: z.object({
    warehouseId: uuid.optional(), // where imported opening stock is placed
    products: z.array(z.object({
      name: z.string().trim().min(1).max(200),
      brandName: z.string().trim().max(100).optional(),
      category: z.string().trim().max(100).optional(),
      gender: z.string().trim().max(20).optional(),
      description: z.string().trim().max(5000).optional(),
      basePrice: z.coerce.number().min(0).max(999_999_999),
      variants: z.array(z.object({
        size: z.coerce.string().trim().min(1).max(20),
        color: z.string().trim().min(1).max(50),
        sku: z.string().trim().max(64).optional(),
        barcode: z.string().trim().max(64).optional(),
        price: z.coerce.number().min(0).max(999_999_999).optional(),
        currentStock: z.coerce.number().int().min(0).max(1_000_000).optional(),
      })).max(200).optional(),
    })).min(1).max(500),
  }).refine((b) => !b.products.some((p) => p.variants?.some((v) => v.currentStock)) || b.warehouseId, { message: 'warehouseId is required when importing stock', path: ['warehouseId'] }),
});
