/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient.ts';

export const usersService = {
  async getUsers() {
    return apiClient('/api/users');
  },

  async createUser(payload: Record<string, unknown>) {
    return apiClient('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateUser(id: string, payload: Record<string, unknown>) {
    return apiClient(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteUser(id: string) {
    return apiClient(`/api/users/${id}`, {
      method: 'DELETE'
    });
  }
};
