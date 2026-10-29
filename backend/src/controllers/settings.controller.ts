import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service.ts';
import { apiResponse } from '../utils/apiResponse.ts';

export const settingsController = {
  getNotificationSettings(req: Request, res: Response) {
    try {
      const settings = settingsService.getNotificationSettings();
      return apiResponse.success(res, settings);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  saveNotificationSettings(req: Request, res: Response) {
    try {
      const updated = settingsService.saveNotificationSettings(req.body);
      return apiResponse.success(res, updated);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  getEmailLogs(req: Request, res: Response) {
    try {
      const logs = settingsService.getEmailLogs();
      return apiResponse.success(res, logs);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async triggerNotificationCheck(req: Request, res: Response) {
    try {
      const result = await settingsService.triggerNotificationCheck();
      return apiResponse.success(res, result);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async testTelegramBot(req: Request, res: Response) {
    try {
      const { token, chatId } = req.body || {};
      const result = await settingsService.testTelegramBot(token, chatId);
      return apiResponse.success(res, result);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async sendDailyReportTelegram(req: Request, res: Response) {
    try {
      const { token, chatId, shopId } = req.body || {};
      const result = await settingsService.sendDailyReportTelegram(token, chatId, shopId);
      return apiResponse.success(res, result);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  getGeneralSettings(req: Request, res: Response) {
    try {
      const settings = settingsService.getGeneralSettings();
      return apiResponse.success(res, settings);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  saveGeneralSettings(req: Request, res: Response) {
    try {
      const { section } = req.params;
      const updated = settingsService.saveGeneralSettings(section, req.body);
      return apiResponse.success(res, updated);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  getBackups(req: Request, res: Response) {
    try {
      const backups = settingsService.listBackups();
      return apiResponse.success(res, backups);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createBackup(req: Request, res: Response) {
    try {
      const result = await settingsService.createBackup();
      return apiResponse.success(res, result);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async restoreBackup(req: Request, res: Response) {
    try {
      const { filename } = req.body;
      if (!filename) {
        return apiResponse.error(res, 'Backup filename is required', 400);
      }
      const result = await settingsService.restoreBackup(filename);
      return apiResponse.success(res, result);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async exportAllData(req: Request, res: Response) {
    try {
      const exportData = await settingsService.exportAllData();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=shoetracker_all_data_export.json');
      return res.send(JSON.stringify(exportData, null, 2));
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async importData(req: Request, res: Response) {
    try {
      const { products } = req.body;
      if (!products || !Array.isArray(products)) {
        return apiResponse.error(res, 'Products array is required', 400);
      }
      const result = await settingsService.importData(products);
      return apiResponse.success(res, result);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  }
};
