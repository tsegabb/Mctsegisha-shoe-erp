/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient.ts';

export const settingsService = {
  // Database Connection Status
  async getDbStatus() {
    return apiClient('/api/status');
  },

  async reconnectDb() {
    return apiClient('/api/status/reconnect', {
      method: 'POST'
    });
  },

  // Notification Settings
  async getNotificationSettings() {
    return apiClient('/api/notifications/settings');
  },

  async saveNotificationSettings(payload: any) {
    return apiClient('/api/notifications/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getEmailLogs() {
    return apiClient('/api/notifications/logs');
  },

  async triggerNotificationCheck() {
    return apiClient('/api/notifications/trigger', {
      method: 'POST'
    });
  },

  async testTelegramBot(payload: { token?: string; chatId?: string }) {
    return apiClient('/api/notifications/telegram/test', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async sendDailyReportTelegram(payload?: { token?: string; chatId?: string; shopId?: string }) {
    return apiClient('/api/notifications/telegram/daily-report', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    });
  },

  // General Settings
  async getGeneralSettings() {
    return apiClient('/api/settings/general');
  },

  async saveGeneralSettings(section: string, payload: any) {
    return apiClient(`/api/settings/general/${section}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Backup & Restore
  async getBackups() {
    return apiClient('/api/settings/backups');
  },

  async createBackup() {
    return apiClient('/api/settings/backups/create', {
      method: 'POST'
    });
  },

  async restoreBackup(filename: string) {
    return apiClient('/api/settings/backups/restore', {
      method: 'POST',
      body: JSON.stringify({ filename })
    });
  },

  // Import / Bulk Porting
  async importData(payload: any) {
    return apiClient('/api/settings/import', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
