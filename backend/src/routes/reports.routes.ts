import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { requireRole } from '../middlewares/roleGuard.middleware.ts';

const router = Router();

// Stats and reporting endpoints (guarded by auth check & Admin/Manager roles)
router.get('/stats', authMiddleware, requireRole(['Admin', 'Manager']), reportsController.getStats);
router.get('/reports/dashboard', authMiddleware, requireRole(['Admin', 'Manager']), reportsController.getDashboard);
router.get('/dashboard', authMiddleware, requireRole(['Admin', 'Manager']), reportsController.getDashboard);

export default router;

