import { Router } from 'express';
import { inventoryController as c } from '../controllers/inventory.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { requireRole } from '../middlewares/roleGuard.middleware.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { MANAGEMENT_ROLES, STOCK_ROLES } from '../constants/domain.ts';
import { idParams } from '../validators/common.validator.ts';
import * as v from '../validators/inventory.validator.ts';

const manage = requireRole(...MANAGEMENT_ROLES);
const stock = requireRole(...STOCK_ROLES);

const router = Router();
// Explicit prefixes: unknown paths fall through to a clean 404 instead of a misleading 401.
router.use(['/variants', '/warehouses', '/suppliers', '/movements', '/orders'], authMiddleware);

router.get('/variants', validate(v.listVariantsSchema), c.getVariants);
router.post('/variants', manage, validate(v.createVariantSchema), c.createVariant);
router.put('/variants/:id', manage, validate(v.updateVariantSchema), c.updateVariant);
router.delete('/variants/:id', manage, validate(idParams), c.deleteVariant);

router.get('/warehouses', c.getWarehouses);
router.post('/warehouses', manage, validate(v.createWarehouseSchema), c.createWarehouse);
router.put('/warehouses/:id', manage, validate(v.updateWarehouseSchema), c.updateWarehouse);
router.delete('/warehouses/:id', manage, validate(idParams), c.deleteWarehouse);

router.get('/suppliers', c.getSuppliers);
router.post('/suppliers', manage, validate(v.createSupplierSchema), c.createSupplier);
router.put('/suppliers/:id', manage, validate(v.updateSupplierSchema), c.updateSupplier);
router.delete('/suppliers/:id', manage, validate(idParams), c.deleteSupplier);

router.get('/movements', validate(v.listMovementsSchema), c.getMovements);
router.post('/movements', stock, validate(v.createMovementSchema), c.createMovement);

router.get('/orders', manage, validate(v.listOrdersSchema), c.getOrders);
router.post('/orders', manage, validate(v.createOrderSchema), c.createOrder);
router.put('/orders/:id/status', stock, validate(v.updateOrderStatusSchema), c.updateOrderStatus);

export default router;
