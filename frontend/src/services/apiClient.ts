/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserSession } from '../types.ts';

/**
 * Helper to get the current authenticated session from LocalStorage
 */
export function getSession(): UserSession | null {
  const saved = localStorage.getItem('shoetracker_session');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (e) {
    return null;
  }
}

/**
 * Custom base fetch client with automatic headers injected
 */
export async function apiClient(url: string, options: RequestInit = {}) {
  const session = getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as Record<string, string>;

  if (session?.user?.id) {
    headers['x-user-id'] = session.user.id;
  }
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle direct file downloads (like export data JSON)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json') && !response.headers.get('content-disposition')?.includes('attachment')) {
      try {
        const data = await response.json();
        return data;
      } catch (jsonErr) {
        return { success: false, error: 'Invalid JSON response from server' };
      }
    }

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    return response;
  } catch (err: any) {
    console.error(`apiClient error on ${url}:`, err);
    return { 
      success: false, 
      error: 'Unable to complete the request. Please check your connection and try again.' 
    };
  }
}
