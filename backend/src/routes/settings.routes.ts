import { Router, type RequestHandler } from 'express';
import { settingsController as c } from '../controllers/settings.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { requireExactRole, requireRole } from '../middlewares/roleGuard.middleware.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { MANAGEMENT_ROLES } from '../constants/domain.ts';
import { forbidden } from '../errors/AppError.ts';
import {
  importProductsSchema, restoreBackupSchema, saveGeneralSettingsSchema, saveNotificationSettingsSchema, telegramReportSchema, telegramTestSchema,
} from '../validators/settings.validator.ts';

const manage = requireRole(...MANAGEMENT_ROLES);
const adminOnly = requireRole();
const SENSITIVE_SECTIONS = new Set(['security', 'usersPermissions', 'integrations']);
const sectionGuard: RequestHandler = (req, _res, next) => {
  if (SENSITIVE_SECTIONS.has(req.valid!.params.section) && !['owner', 'admin'].includes(req.user!.role)) return next(forbidden('Only an owner or admin can change this section'));
  next();
};

const router = Router();
router.use(['/notifications', '/settings'], authMiddleware);

router.get('/notifications/settings', manage, c.getNotificationSettings);
router.post('/notifications/settings', manage, validate(saveNotificationSettingsSchema), c.saveNotificationSettings);
router.get('/notifications/logs', manage, c.getEmailLogs);
router.post('/notifications/trigger', manage, c.triggerNotificationCheck);
router.post('/notifications/telegram/test', manage, validate(telegramTestSchema), c.testTelegramBot);
router.post('/notifications/telegram/daily-report', manage, validate(telegramReportSchema), c.sendDailyReportTelegram);

router.get('/settings/general', c.getGeneralSettings);
router.post('/settings/general/:section', manage, validate(saveGeneralSettingsSchema), sectionGuard, c.saveGeneralSettings);

router.get('/settings/backups', manage, c.getBackups);
router.post('/settings/backups/create', adminOnly, c.createBackup);
router.post('/settings/backups/restore', requireExactRole('owner'), validate(restoreBackupSchema), c.restoreBackup);

router.get('/settings/export', adminOnly, c.exportAll);
router.post('/settings/import', adminOnly, validate(importProductsSchema), c.importProducts);

export default router;
