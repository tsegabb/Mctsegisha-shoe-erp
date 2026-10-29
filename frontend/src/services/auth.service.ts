/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiClient } from './apiClient.ts';

export const authService = {
  async login(payload: { email?: string; password?: string; username?: string }) {
    return apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
