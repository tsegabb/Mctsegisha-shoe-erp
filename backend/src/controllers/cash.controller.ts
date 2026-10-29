import { Request, Response } from 'express';
import { cashService } from '../services/cash.service.ts';

export const cashController = {
  async getSummary(req: Request, res: Response) {
    try {
      const shopId = (req.query.shopId as string) || (req.query.warehouseId as string);
      const summary = await cashService.getCashSummary(shopId);
      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error('Error in getSummary:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch cash summary' });
    }
  },

  async recordCashDrop(req: Request, res: Response) {
    try {
      const { amount, note, shopId, userName } = req.body;
      const user = (req as any).user;
      const effectiveUser = userName || (user ? user.name : 'Store Manager');
      const updatedSummary = await cashService.recordCashDrop({
        amount: parseFloat(amount),
        note,
        shopId,
        userName: effectiveUser
      });
      res.json({
        success: true,
        message: 'Cash drop processed successfully',
        data: updatedSummary
      });
    } catch (error: any) {
      console.error('Error in recordCashDrop:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to process cash drop' });
    }
  },

  async setOpeningFloat(req: Request, res: Response) {
    try {
      const { amount, note, shopId, userName } = req.body;
      const user = (req as any).user;
      const effectiveUser = userName || (user ? user.name : 'Head Cashier');
      const updatedSummary = await cashService.setOpeningFloat({
        amount: parseFloat(amount),
        note,
        shopId,
        userName: effectiveUser
      });
      res.json({
        success: true,
        message: 'Opening register float updated successfully',
        data: updatedSummary
      });
    } catch (error: any) {
      console.error('Error in setOpeningFloat:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to update opening float' });
    }
  },

  async recordActivity(req: Request, res: Response) {
    try {
      const { type, amount, method, note, shopId, userName } = req.body;
      const user = (req as any).user;
      const effectiveUser = userName || (user ? user.name : 'Staff');
      const updatedSummary = await cashService.recordActivity({
        type,
        amount: parseFloat(amount),
        method,
        note,
        shopId,
        userName: effectiveUser
      });
      res.json({
        success: true,
        message: 'Cash activity recorded successfully',
        data: updatedSummary
      });
    } catch (error: any) {
      console.error('Error in recordActivity:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to record cash activity' });
    }
  }
};
