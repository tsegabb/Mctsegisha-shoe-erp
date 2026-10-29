/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient.ts';
import { OrderStatus } from '../types.ts';

export const inventoryService = {
  // Variants (Sizes / Skus / Barcodes)
  async getVariants(warehouseId?: string) {
    const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
    return apiClient(`/api/variants${query}`);
  },

  async createVariant(payload: Record<string, unknown>) {
    return apiClient('/api/variants', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateVariant(id: string, payload: Record<string, unknown>) {
    return apiClient(`/api/variants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteVariant(id: string) {
    return apiClient(`/api/variants/${id}`, {
      method: 'DELETE'
    });
  },

  // Warehouses (Shop Locations)
  async getWarehouses() {
    return apiClient('/api/warehouses');
  },

  async createWarehouse(payload: Record<string, unknown>) {
    return apiClient('/api/warehouses', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateWarehouse(id: string, payload: Record<string, unknown>) {
    return apiClient(`/api/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteWarehouse(id: string) {
    return apiClient(`/api/warehouses/${id}`, {
      method: 'DELETE'
    });
  },

  // Suppliers
  async getSuppliers() {
    return apiClient('/api/suppliers');
  },

  async createSupplier(payload: Record<string, unknown>) {
    return apiClient('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateSupplier(id: string, payload: Record<string, unknown>) {
    return apiClient(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteSupplier(id: string) {
    return apiClient(`/api/suppliers/${id}`, {
      method: 'DELETE'
    });
  },

  // Movements (Stock Movements)
  async getMovements(warehouseId?: string) {
    const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
    return apiClient(`/api/movements${query}`);
  },

  async createMovement(payload: Record<string, unknown>) {
    return apiClient('/api/movements', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Restock Orders (Supplier Purchase Orders)
  async getOrders() {
    return apiClient('/api/orders');
  },

  async createOrder(payload: Record<string, unknown>) {
    return apiClient('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateOrderStatus(id: string, status: OrderStatus) {
    return apiClient(`/api/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }
};
