import { Request, Response } from 'express';
import { reportsService } from '../services/reports.service.ts';
import { apiResponse } from '../utils/apiResponse.ts';

export const reportsController = {
  async getStats(req: Request, res: Response) {
    try {
      let requestedShopId = (req.query.warehouseId || req.query.shopId) as string | undefined;
      const user = req.user;
      
      if (user && user.role !== 'Admin') {
        const userShopId = user.shopId;
        if (!userShopId) {
          return apiResponse.error(res, 'No shop assigned to your user account.', 403);
        }
        if (requestedShopId && requestedShopId !== userShopId) {
          return apiResponse.error(res, 'Access Denied: You are restricted to reports for your assigned shop branch.', 403);
        }
        requestedShopId = userShopId;
        const stats = await reportsService.getStats(requestedShopId, false);
        return apiResponse.success(res, stats);
      }

      const stats = await reportsService.getStats(requestedShopId, true);
      return apiResponse.success(res, stats);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async getDashboard(req: Request, res: Response) {
    try {
      let requestedShopId = (req.query.warehouseId || req.query.shopId || (req as any).scopedShopId) as string | undefined;
      const user = req.user;

      if (user && user.role !== 'Admin') {
        const userShopId = user.shopId;
        if (userShopId) {
          requestedShopId = userShopId;
        }
      }

      const dashboardData = await reportsService.getShopDashboard(requestedShopId);
      return apiResponse.success(res, dashboardData);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  }
};
