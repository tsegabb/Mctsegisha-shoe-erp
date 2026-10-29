import { Router } from 'express';
import { salesController } from '../controllers/sales.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { requireRole } from '../middlewares/roleGuard.middleware.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { createSaleSchema, processReturnSchema } from '../validators/sale.validator.ts';

const router = Router();

// Apply auth check to all sales routes
router.use(authMiddleware);

router.get('/', salesController.getSales);
router.get('/reconcile', requireRole(['Admin', 'Manager']), salesController.reconcile);
router.post('/', validate(createSaleSchema), salesController.createSale);
router.post('/return', requireRole(['Admin', 'Manager']), validate(processReturnSchema), salesController.processReturn);

export default router;

