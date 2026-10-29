import { Request, Response } from 'express';
import { salesService } from '../services/sales.service.ts';
import { apiResponse } from '../utils/apiResponse.ts';

function isUuid(id: any): boolean {
  if (typeof id !== 'string') return false;
  return id.trim().length > 0;
}

export const salesController = {
  async getSales(req: Request, res: Response) {
    try {
      let warehouseId = (req.query.warehouseId || req.query.shopId) as string | undefined;
      const user = req.user;
      if (user && user.role !== 'Admin') {
        const userShopId = user.shopId;
        if (!userShopId) {
          return apiResponse.error(res, 'No shop branch assigned to your user account.', 403);
        }
        if (warehouseId && warehouseId !== userShopId) {
          return apiResponse.error(res, 'Access Denied: You are restricted to your assigned shop branch.', 403);
        }
        warehouseId = userShopId;
      }
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const search = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const paymentMethod = req.query.paymentMethod as string | undefined;
      const status = req.query.status as string | undefined;
      const sortBy = req.query.sortBy as 'created_at' | 'profit' | 'quantity' | 'selling_price' | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

      const list = await salesService.getSales(warehouseId, {
        page,
        limit,
        search,
        startDate,
        endDate,
        paymentMethod,
        status,
        sortBy,
        sortOrder
      });
      return apiResponse.success(res, list);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createSale(req: Request, res: Response) {
    try {
      let { variantId, quantity, sellingPrice, costPrice, warehouseId, paymentMethod } = req.body;
      const qty = parseInt(quantity);
      if (!variantId || isNaN(qty) || qty <= 0 || sellingPrice === undefined) {
        return apiResponse.error(res, 'variantId, positive quantity, and sellingPrice are required', 400);
      }

      const user = req.user;
      if (user && user.role !== 'Admin') {
        const userShopId = user.shopId;
        if (!userShopId) {
          return apiResponse.error(res, 'No shop branch assigned to your user account.', 403);
        }
        if (warehouseId && warehouseId !== userShopId) {
          return apiResponse.error(res, 'Access Denied: You can only process sales for your assigned shop location.', 403);
        }
        warehouseId = userShopId;
      }

      if (!isUuid(variantId)) {
        return apiResponse.error(res, 'Invalid variant ID format.', 400);
      }
      if (warehouseId && !isUuid(warehouseId)) {
        return apiResponse.error(res, 'Invalid shop/warehouse ID format.', 400);
      }

      const result = await salesService.createSale({
        variantId,
        quantity: qty,
        sellingPrice: parseFloat(sellingPrice),
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
        warehouseId,
        paymentMethod
      });

      if (result.error) {
        return apiResponse.error(res, result.error, result.status || 500);
      }

      return apiResponse.success(res, result.data, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async processReturn(req: Request, res: Response) {
    try {
      const { saleId, totalReturnAmount, totalReturnQty, reason, restock } = req.body;
      const result = await salesService.processReturn({
        saleId,
        totalReturnAmount: parseFloat(totalReturnAmount || 0),
        totalReturnQty: parseInt(totalReturnQty || 1, 10),
        reason: reason || 'Customer Return',
        restock: restock !== false
      });
      return apiResponse.success(res, result);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async reconcile(req: Request, res: Response) {
    try {
      let warehouseId = (req.query.warehouseId || req.query.shopId) as string | undefined;
      const user = req.user;
      if (user && user.role !== 'Admin') {
        const userShopId = user.shopId;
        if (userShopId) warehouseId = userShopId;
      }
      const data = await salesService.reconcileTransactions(warehouseId);
      return apiResponse.success(res, data);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  }
};
