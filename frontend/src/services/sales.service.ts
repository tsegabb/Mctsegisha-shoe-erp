/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient.ts';

export const salesService = {
  async getSales(warehouseId?: string) {
    const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
    return apiClient(`/api/sales${query}`);
  },

  async reconcile(warehouseId?: string) {
    const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
    return apiClient(`/api/sales/reconcile${query}`);
  },

  async recordSale(payload: Record<string, unknown>) {
    return apiClient('/api/sales', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async processReturn(payload: Record<string, unknown>) {
    return apiClient('/api/sales/return', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
