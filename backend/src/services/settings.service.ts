import { badRequest } from '../errors/AppError.ts';
import {
  getEmailLogs, getNotificationSettings, saveNotificationSettings, sendDailyReportTelegram, sendLowStockEmailSummary, sendTelegramMessage,
} from '../lib/notifications.ts';
import { getGeneralSettings, saveGeneralSettings, type SettingsData } from '../lib/settingsStore.ts';
import type { AuthUser } from '../types/auth.types.ts';
import { audit } from './audit.service.ts';
import { pool } from '../config/db.ts';
import { cashService } from './cash.service.ts';
import { lowStockVariants } from './notifications.service.ts';
import { reportsService } from './reports.service.ts';
import { resolveShopScope } from './scope.service.ts';

const MASK = '********';
const mask = (v?: string) => (v ? MASK : '');

/** Secrets are write-only through the API: they are masked on every read. */
function publicGeneral(s: SettingsData): SettingsData {
  return {
    ...s,
    notifications: { ...s.notifications, telegramToken: mask(s.notifications.telegramToken) },
    integrations: { ...s.integrations, chapaSecretKey: mask(s.integrations.chapaSecretKey) },
  };
}

const publicNotif = () => {
  const n = getNotificationSettings();
  return { ...n, smtpPass: mask(n.smtpPass), telegramToken: mask(n.telegramToken) };
};

const dropMasked = <T extends Record<string, any>>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== MASK)) as Partial<T>;

export const settingsService = {
  getNotificationSettings: publicNotif,

  async saveNotificationSettings(actor: AuthUser, body: Record<string, any>) {
    saveNotificationSettings(dropMasked(body));
    await audit(pool, 'settings.notifications_updated', { keys: Object.keys(body) }, actor);
    return publicNotif();
  },

  getEmailLogs: () => getEmailLogs().map(({ body: _b, ...rest }) => rest), // bodies hold full HTML; list view needs only metadata

  async triggerNotificationCheck() {
    const settings = getNotificationSettings();
    const result = await sendLowStockEmailSummary(await lowStockVariants(settings.threshold), true);
    return { message: 'Notification trigger executed successfully', log: result.log, sent: result.success };
  },

  async testTelegramBot(token?: string, chatId?: string) {
    const res = await sendTelegramMessage('🔔 <b>SOLEFLOW</b>\n\n✅ Telegram bot connection is active.', token, chatId);
    if (!res.success) throw badRequest(res.error || 'Failed to connect to the Telegram Bot API');
    return { message: 'Telegram test message sent successfully!' };
  },

  async sendDailyReportTelegram(user: AuthUser, token?: string, chatId?: string, shopId?: string) {
    const shop = resolveShopScope(user, shopId);
    const [stats, cash] = await Promise.all([reportsService.getStats(user), cashService.summary(user, shop ?? undefined)]);
    const r = await sendDailyReportTelegram(stats, cash, token, chatId);
    if (!r.success) throw badRequest(r.error || 'Failed to dispatch the Telegram daily report');
    return { message: 'Daily report successfully sent to Telegram!', reportText: r.reportText };
  },

  getGeneralSettings: () => publicGeneral(getGeneralSettings()),

  async saveGeneralSettings(actor: AuthUser, section: keyof SettingsData, body: Record<string, any>) {
    saveGeneralSettings(section, dropMasked(body));
    await audit(pool, 'settings.updated', { section, keys: Object.keys(body) }, actor);
    return publicGeneral(getGeneralSettings());
  },
};

