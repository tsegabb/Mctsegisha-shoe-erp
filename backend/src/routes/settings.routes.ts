import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { requireRole } from '../middlewares/roleGuard.middleware.ts';

const router = Router();

// General authentication protection for settings
router.use(authMiddleware);

// --- NOTIFICATION SETTINGS ---
router.get('/notifications/settings', settingsController.getNotificationSettings);
router.post('/notifications/settings', requireRole(['Admin', 'Manager']), settingsController.saveNotificationSettings);
router.get('/notifications/logs', requireRole(['Admin', 'Manager']), settingsController.getEmailLogs);
router.post('/notifications/trigger', requireRole(['Admin', 'Manager']), settingsController.triggerNotificationCheck);
router.post('/notifications/telegram/test', requireRole(['Admin', 'Manager']), settingsController.testTelegramBot);
router.post('/notifications/telegram/daily-report', requireRole(['Admin', 'Manager']), settingsController.sendDailyReportTelegram);

// --- GENERAL APPLICATION SETTINGS & ACTIONS ---
router.get('/settings/general', settingsController.getGeneralSettings);
router.post('/settings/general/:section', requireRole(['Admin', 'Manager']), settingsController.saveGeneralSettings);

// --- BACKUP & RESTORE ---
router.get('/settings/backups', requireRole(['Admin', 'Manager']), settingsController.getBackups);
router.post('/settings/backups/create', requireRole(['Admin']), settingsController.createBackup);
router.post('/settings/backups/restore', requireRole(['Admin']), settingsController.restoreBackup);

// --- BULK PORTING ---
router.get('/settings/export', requireRole(['Admin', 'Manager']), settingsController.exportAllData);
router.post('/settings/import', requireRole(['Admin']), settingsController.importData);

export default router;
