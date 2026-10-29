/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient.ts';

export const reportsService = {
  async getStats(shopId?: string) {
    return apiClient(`/api/stats${shopId ? `?shopId=${shopId}` : ''}`);
  },
  async getDashboard(shopId?: string) {
    return apiClient(`/api/reports/dashboard${shopId ? `?shopId=${shopId}` : ''}`);
  }
};
