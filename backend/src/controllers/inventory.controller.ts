import { asyncHandler } from '../utils/asyncHandler.ts';
import { apiResponse } from '../utils/apiResponse.ts';
import { suppliersService, variantsService, warehousesService } from '../services/inventory.service.ts';
import { stockService } from '../services/stock.service.ts';
import { ordersService } from '../services/orders.service.ts';

const ok = apiResponse.success;

export const inventoryController = {
  getVariants: asyncHandler(async (req, res) => ok(res, await variantsService.list(req.user!, req.valid!.query))),
  createVariant: asyncHandler(async (req, res) => ok(res, await variantsService.create(req.user!, req.valid!.body), 201)),
  updateVariant: asyncHandler(async (req, res) => ok(res, await variantsService.update(req.user!, req.valid!.params.id, req.valid!.body))),
  deleteVariant: asyncHandler(async (req, res) => { await variantsService.remove(req.user!, req.valid!.params.id); ok(res, { message: 'Variant deleted' }); }),

  getWarehouses: asyncHandler(async (req, res) => ok(res, await warehousesService.list(req.user!))),
  createWarehouse: asyncHandler(async (req, res) => ok(res, await warehousesService.create(req.user!, req.valid!.body), 201)),
  updateWarehouse: asyncHandler(async (req, res) => ok(res, await warehousesService.update(req.user!, req.valid!.params.id, req.valid!.body))),
  deleteWarehouse: asyncHandler(async (req, res) => { await warehousesService.remove(req.user!, req.valid!.params.id); ok(res, { message: 'Warehouse deleted' }); }),

  getSuppliers: asyncHandler(async (_req, res) => ok(res, await suppliersService.list())),
  createSupplier: asyncHandler(async (req, res) => ok(res, await suppliersService.create(req.user!, req.valid!.body), 201)),
  updateSupplier: asyncHandler(async (req, res) => ok(res, await suppliersService.update(req.user!, req.valid!.params.id, req.valid!.body))),
  deleteSupplier: asyncHandler(async (req, res) => { await suppliersService.remove(req.user!, req.valid!.params.id); ok(res, { message: 'Supplier deleted' }); }),

  getMovements: asyncHandler(async (req, res) => ok(res, await stockService.list(req.user!, req.valid!.query))),
  createMovement: asyncHandler(async (req, res) => ok(res, await stockService.createMovement(req.user!, req.valid!.body), 201)),

  getOrders: asyncHandler(async (req, res) => ok(res, await ordersService.list(req.valid!.query))),
  createOrder: asyncHandler(async (req, res) => ok(res, await ordersService.create(req.user!, req.valid!.body), 201)),
  updateOrderStatus: asyncHandler(async (req, res) =>
    ok(res, await ordersService.updateStatus(req.user!, req.valid!.params.id, req.valid!.body.status, req.valid!.body.warehouseId))),
};
