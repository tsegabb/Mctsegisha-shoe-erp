import { Router } from 'express';
import { cashController, reportsController, salesController } from '../controllers/sales.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { requireRole } from '../middlewares/roleGuard.middleware.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { MANAGEMENT_ROLES, POS_ROLES } from '../constants/domain.ts';
import { cashActivitySchema, cashDropSchema, cashSummarySchema, openingFloatSchema } from '../validators/cash.validator.ts';
import { createSaleSchema, listSalesSchema, processReturnSchema, reconcileSchema } from '../validators/sale.validator.ts';
import { z } from 'zod';
import { optionalFilterUuid } from '../validators/common.validator.ts';

const pos = requireRole(...POS_ROLES);
const manage = requireRole(...MANAGEMENT_ROLES);

export const salesRouter = Router();
salesRouter.use(authMiddleware, pos);
salesRouter.get('/', validate(listSalesSchema), salesController.list);
salesRouter.get('/reconcile', manage, validate(reconcileSchema), salesController.reconcile);
salesRouter.post('/', validate(createSaleSchema), salesController.create);
salesRouter.post('/return', manage, validate(processReturnSchema), salesController.processReturn);

export const cashRouter = Router();
cashRouter.use(authMiddleware, pos);
cashRouter.get('/summary', validate(cashSummarySchema), cashController.summary);
cashRouter.post('/drop', validate(cashDropSchema), cashController.drop);
cashRouter.post('/float', validate(openingFloatSchema), cashController.float);
cashRouter.post('/activity', validate(cashActivitySchema), cashController.activity);

const dashQuery = z.object({ query: z.object({ warehouseId: optionalFilterUuid, shopId: optionalFilterUuid }) });
export const reportsRouter = Router();
reportsRouter.get('/stats', authMiddleware, manage, validate(dashQuery), reportsController.stats);
reportsRouter.get('/dashboard', authMiddleware, manage, validate(dashQuery), reportsController.dashboard);
reportsRouter.get('/reports/dashboard', authMiddleware, manage, validate(dashQuery), reportsController.dashboard);
