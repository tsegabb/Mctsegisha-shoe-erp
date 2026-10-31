import { apiClient } from './apiClient.ts';

export interface CashSummary {
  branchName: string;
  currentRegisterCash: number;
  todaysCashSales: number;
  todaysDigitalSales: number;
  todaysTelebirrSales?: number;
  todaysCbeBirrSales?: number;
  todaysOtherDigitalSales?: number;
  historicalCashSales?: number;
  historicalDigitalSales?: number;
  historicalTelebirrSales?: number;
  historicalCbeBirrSales?: number;
  historicalOtherDigitalSales?: number;
  digitalBreakdown?: {
    cash?: { today: number; historical: number };
    telebirr?: { today: number; historical: number };
    cbe_birr?: { today: number; historical: number };
    cbe?: { today: number; historical: number };
    card?: { today: number; historical: number };
    mobile_money?: { today: number; historical: number };
    bank_transfer?: { today: number; historical: number };
    other?: { today: number; historical: number };
    [key: string]: { today: number; historical: number } | undefined;
  };
  openingFloat: number;
  cashDropsTotal: number;
  activities: Array<{
    id: string;
    shopId?: string;
    type: string;
    amount: number;
    method: string;
    note: string;
    userName: string;
    time?: string;
    createdAt: string;
  }>;
}

export const cashService = {
  async getSummary(shopId?: string): Promise<{ success: boolean; data?: CashSummary; message?: string }> {
    const query = shopId ? `?shopId=${encodeURIComponent(shopId)}` : '';
    return apiClient(`/api/cash/summary${query}`);
  },

  async recordCashDrop(data: { amount: number; note?: string; shopId?: string }): Promise<{ success: boolean; data?: CashSummary; message?: string }> {
    return apiClient('/api/cash/drop', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async setOpeningFloat(data: { amount: number; note?: string; shopId?: string }): Promise<{ success: boolean; data?: CashSummary; message?: string }> {
    return apiClient('/api/cash/float', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async recordActivity(data: { type: string; amount: number; method: string; note?: string; shopId?: string }): Promise<{ success: boolean; data?: CashSummary; message?: string }> {
    return apiClient('/api/cash/activity', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
