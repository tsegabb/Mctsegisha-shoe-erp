import { asyncHandler } from '../utils/asyncHandler.ts';
import { apiResponse } from '../utils/apiResponse.ts';
import { settingsService } from '../services/settings.service.ts';
import { dataTransferService } from '../services/dataTransfer.service.ts';

const ok = apiResponse.success;

export const settingsController = {
  getNotificationSettings: asyncHandler(async (_req, res) => ok(res, settingsService.getNotificationSettings())),
  saveNotificationSettings: asyncHandler(async (req, res) => ok(res, await settingsService.saveNotificationSettings(req.user!, req.valid!.body))),
  getEmailLogs: asyncHandler(async (_req, res) => ok(res, settingsService.getEmailLogs())),
  triggerNotificationCheck: asyncHandler(async (_req, res) => ok(res, await settingsService.triggerNotificationCheck())),
  testTelegramBot: asyncHandler(async (req, res) => ok(res, await settingsService.testTelegramBot(req.valid!.body.token, req.valid!.body.chatId))),
  sendDailyReportTelegram: asyncHandler(async (req, res) =>
    ok(res, await settingsService.sendDailyReportTelegram(req.user!, req.valid!.body.token, req.valid!.body.chatId, req.valid!.body.shopId))),

  getGeneralSettings: asyncHandler(async (_req, res) => ok(res, settingsService.getGeneralSettings())),
  saveGeneralSettings: asyncHandler(async (req, res) => ok(res, await settingsService.saveGeneralSettings(req.user!, req.valid!.params.section, req.valid!.body))),

  getBackups: asyncHandler(async (_req, res) => ok(res, dataTransferService.listBackups())),
  createBackup: asyncHandler(async (req, res) => ok(res, await dataTransferService.createBackup(req.user!))),
  restoreBackup: asyncHandler(async (req, res) => ok(res, await dataTransferService.restore(req.user!, req.valid!.body.filename))),
  exportAll: asyncHandler(async (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=soleflow_export.json');
    res.send(JSON.stringify(await dataTransferService.exportAll(), null, 2));
  }),
  importProducts: asyncHandler(async (req, res) => ok(res, await dataTransferService.importProducts(req.user!, req.valid!.body))),
};
