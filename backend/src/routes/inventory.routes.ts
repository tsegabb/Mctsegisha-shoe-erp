import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { requireRole } from '../middlewares/roleGuard.middleware.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { 
  createWarehouseSchema, 
  createVariantSchema, 
  createMovementSchema,
  createSupplierSchema,
  createOrderSchema,
  updateOrderStatusSchema
} from '../validators/inventory.validator.ts';

const router = Router();

// Apply authentication to all inventory operations
router.use(authMiddleware);

// --- VARIANTS ---
router.get('/variants', inventoryController.getVariants);
router.post('/variants', requireRole(['Admin', 'Manager']), validate(createVariantSchema), inventoryController.createVariant);
router.put('/variants/:id', requireRole(['Admin', 'Manager']), validate(createVariantSchema), inventoryController.updateVariant);
router.delete('/variants/:id', requireRole(['Admin', 'Manager']), inventoryController.deleteVariant);

// --- WAREHOUSES ---
router.get('/warehouses', inventoryController.getWarehouses);
router.post('/warehouses', requireRole(['Admin', 'Manager']), validate(createWarehouseSchema), inventoryController.createWarehouse);
router.put('/warehouses/:id', requireRole(['Admin', 'Manager']), validate(createWarehouseSchema), inventoryController.updateWarehouse);
router.delete('/warehouses/:id', requireRole(['Admin', 'Manager']), inventoryController.deleteWarehouse);

// --- SUPPLIERS ---
router.get('/suppliers', inventoryController.getSuppliers);
router.post('/suppliers', requireRole(['Admin', 'Manager']), validate(createSupplierSchema), inventoryController.createSupplier);
router.put('/suppliers/:id', requireRole(['Admin', 'Manager']), validate(createSupplierSchema), inventoryController.updateSupplier);
router.delete('/suppliers/:id', requireRole(['Admin', 'Manager']), inventoryController.deleteSupplier);

// --- MOVEMENTS ---
router.get('/movements', inventoryController.getMovements);
router.post('/movements', requireRole(['Admin', 'Manager']), validate(createMovementSchema), inventoryController.createMovement);

// --- ORDERS ---
router.get('/orders', inventoryController.getOrders);
router.post('/orders', requireRole(['Admin', 'Manager']), validate(createOrderSchema), inventoryController.createOrder);
router.put('/orders/:id/status', requireRole(['Admin', 'Manager']), validate(updateOrderStatusSchema), inventoryController.updateOrderStatus);

export default router;

