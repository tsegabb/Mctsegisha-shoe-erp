/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient.ts';

export const productsService = {
  async getProducts() {
    return apiClient('/api/products');
  },

  async createProduct(payload: Record<string, unknown>) {
    return apiClient('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateProduct(id: string, payload: Record<string, unknown>) {
    return apiClient(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteProduct(id: string) {
    return apiClient(`/api/products/${id}`, {
      method: 'DELETE'
    });
  },

  async getBrands() {
    return apiClient('/api/brands');
  },

  async createBrand(payload: Record<string, unknown>) {
    return apiClient('/api/brands', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getMasterCatalog() {
    return apiClient('/api/products/master-catalog');
  },

  async addFromCatalog(payload: Record<string, unknown>) {
    return apiClient('/api/products/add-from-catalog', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getCategories() {
    return apiClient('/api/products/categories');
  },

  async createCategory(payload: { name: string; description?: string }) {
    return apiClient('/api/products/categories', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
