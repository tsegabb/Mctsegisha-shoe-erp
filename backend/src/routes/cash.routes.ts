import { Router } from 'express';
import { cashController } from '../controllers/cash.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { cashDropSchema, openingFloatSchema, cashActivitySchema } from '../validators/cash.validator.ts';

const router = Router();

router.use(authMiddleware);

router.get('/summary', cashController.getSummary);
router.post('/drop', validate(cashDropSchema), cashController.recordCashDrop);
router.post('/float', validate(openingFloatSchema), cashController.setOpeningFloat);
router.post('/activity', validate(cashActivitySchema), cashController.recordActivity);

export default router;
