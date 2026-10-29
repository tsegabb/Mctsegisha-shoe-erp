import { Request, Response } from 'express';
import { inventoryService, MovementType, OrderStatus } from '../services/inventory.service.ts';
import { apiResponse } from '../utils/apiResponse.ts';
import crypto from 'crypto';

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

function isUuid(id: any): boolean {
  if (typeof id !== 'string') return false;
  return id.trim().length > 0;
}

export const inventoryController = {
  // --- VARIANTS ---
  async getVariants(req: Request, res: Response) {
    try {
      let warehouseId = (req.query.warehouseId || req.query.shopId) as string | undefined;
      const user = req.user;
      if (user && user.role !== 'Admin') {
        const userShopId = user.shopId;
        if (!userShopId) {
          return apiResponse.error(res, 'No shop branch assigned to your user account.', 403);
        }
        if (warehouseId && warehouseId !== userShopId) {
          return apiResponse.error(res, 'Access Denied: You are restricted to viewing inventory for your assigned shop location.', 403);
        }
        warehouseId = userShopId;
      }
      const list = await inventoryService.getVariants(warehouseId);
      return apiResponse.success(res, list);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createVariant(req: Request, res: Response) {
    try {
      const { productId, size, color, sku, barcode, price, currentStock } = req.body;
      if (!productId || !size || !color || !sku || price === undefined) {
        return apiResponse.error(res, 'productId, size, color, sku, and price are required', 400);
      }
      if (!isUuid(productId)) {
        return apiResponse.error(res, 'Invalid product ID format.', 400);
      }
      const id = generateId();
      const initialStock = parseInt(currentStock) || 0;
      const variant = await inventoryService.createVariant({
        id,
        productId,
        size,
        color,
        sku,
        barcode,
        price: parseFloat(price),
        currentStock: initialStock
      });
      return apiResponse.success(res, variant, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async updateVariant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { size, color, sku, barcode, price, currentStock } = req.body;
      if (!isUuid(id)) {
        return apiResponse.error(res, 'Invalid variant ID format.', 400);
      }
      const variant = await inventoryService.updateVariant(id, {
        size,
        color,
        sku,
        barcode,
        price: parseFloat(price),
        currentStock: parseInt(currentStock) || 0
      });
      if (!variant) {
        return apiResponse.error(res, 'Variant not found', 404);
      }
      return apiResponse.success(res, variant);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async deleteVariant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isUuid(id)) {
        return apiResponse.error(res, 'Invalid variant ID format.', 400);
      }
      const success = await inventoryService.deleteVariant(id);
      if (!success) {
        return apiResponse.error(res, 'Variant not found', 404);
      }
      return apiResponse.success(res, { message: 'Variant deleted' });
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  // --- WAREHOUSES ---
  async getWarehouses(req: Request, res: Response) {
    try {
      let list = await inventoryService.getWarehouses();
      const user = req.user;
      if (user && user.role !== 'Admin') {
        if (user.shopId) {
          list = list.filter((w: any) => w.id === user.shopId);
        }
      }
      return apiResponse.success(res, list);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createWarehouse(req: Request, res: Response) {
    try {
      const { name, code, location, capacity } = req.body;
      if (!name || !code || capacity === undefined) {
        return apiResponse.error(res, 'Name, code, and capacity are required', 400);
      }
      const id = generateId();
      const warehouse = await inventoryService.createWarehouse({
        id,
        name,
        code,
        location,
        capacity: parseInt(capacity)
      });
      return apiResponse.success(res, warehouse, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async updateWarehouse(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, code, location, capacity } = req.body;
      if (!isUuid(id)) {
        return apiResponse.error(res, 'Invalid warehouse ID format.', 400);
      }
      const warehouse = await inventoryService.updateWarehouse(id, {
        name,
        code,
        location,
        capacity: parseInt(capacity)
      });
      if (!warehouse) {
        return apiResponse.error(res, 'Warehouse not found', 404);
      }
      return apiResponse.success(res, warehouse);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async deleteWarehouse(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isUuid(id)) {
        return apiResponse.error(res, 'Invalid warehouse ID format.', 400);
      }
      const success = await inventoryService.deleteWarehouse(id);
      if (!success) {
        return apiResponse.error(res, 'Warehouse not found', 404);
      }
      return apiResponse.success(res, { message: 'Warehouse deleted' });
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  // --- SUPPLIERS ---
  async getSuppliers(req: Request, res: Response) {
    try {
      const list = await inventoryService.getSuppliers();
      return apiResponse.success(res, list);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createSupplier(req: Request, res: Response) {
    try {
      const { name, contactPerson, email, phone, address } = req.body;
      if (!name) {
        return apiResponse.error(res, 'Name is required', 400);
      }
      const supplierEmail = email && String(email).trim() !== '' ? email : `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'supplier'}@supplier.com`;
      const id = generateId();
      const supplier = await inventoryService.createSupplier({
        id,
        name,
        contactPerson: contactPerson || '',
        email: supplierEmail,
        phone: phone || '',
        address: address || ''
      });
      return apiResponse.success(res, supplier, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async updateSupplier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, contactPerson, email, phone, address } = req.body;
      if (!isUuid(id)) {
        return apiResponse.error(res, 'Invalid supplier ID format.', 400);
      }
      const supplierEmail = email && String(email).trim() !== '' ? email : `${(name || 'supplier').toLowerCase().replace(/[^a-z0-9]/g, '')}@supplier.com`;
      const supplier = await inventoryService.updateSupplier(id, {
        name,
        contactPerson: contactPerson || '',
        email: supplierEmail,
        phone: phone || '',
        address: address || ''
      });
      if (!supplier) {
        return apiResponse.error(res, 'Supplier not found', 404);
      }
      return apiResponse.success(res, supplier);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async deleteSupplier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isUuid(id)) {
        return apiResponse.error(res, 'Invalid supplier ID format.', 400);
      }
      const success = await inventoryService.deleteSupplier(id);
      if (!success) {
        return apiResponse.error(res, 'Supplier not found', 404);
      }
      return apiResponse.success(res, { message: 'Supplier deleted' });
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  // --- MOVEMENTS ---
  async getMovements(req: Request, res: Response) {
    try {
      const warehouseId = (req.query.warehouseId || req.query.shopId) as string | undefined;
      const type = req.query.type as string | undefined;
      const search = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const list = await inventoryService.getMovements({
        warehouseId,
        type,
        search,
        startDate,
        endDate,
        page,
        limit
      });
      return apiResponse.success(res, list);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createMovement(req: Request, res: Response) {
    try {
      const { variantId, fromWarehouseId, toWarehouseId, warehouseId, quantity, type, reason, createdBy } = req.body;
      if (!variantId || !quantity || !type) {
        return apiResponse.error(res, 'variantId, quantity, and type are required', 400);
      }
      
      const effectiveFromWH = fromWarehouseId || warehouseId;
      const cleanFromWH = (effectiveFromWH && isUuid(effectiveFromWH)) ? effectiveFromWH : null;
      const cleanToWH = (toWarehouseId && isUuid(toWarehouseId)) ? toWarehouseId : null;

      const movement = await inventoryService.createMovement({
        variantId,
        fromWarehouseId: cleanFromWH,
        toWarehouseId: cleanToWH,
        quantity: parseInt(quantity),
        type,
        reason: reason || 'Stock adjustment',
        createdBy: createdBy || (req.user?.name || 'Admin')
      });
      if (!movement) {
        return apiResponse.error(res, 'Variant not found', 404);
      }
      return apiResponse.success(res, movement, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  // --- ORDERS ---
  async getOrders(req: Request, res: Response) {
    try {
      const supplierId = req.query.supplierId as string | undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const list = await inventoryService.getOrders({
        supplierId,
        status,
        search,
        startDate,
        endDate,
        page,
        limit
      });
      return apiResponse.success(res, list);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createOrder(req: Request, res: Response) {
    try {
      const { supplierId, orderNumber, items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return apiResponse.error(res, 'A non-empty items array is required', 400);
      }

      const order = await inventoryService.createOrder({
        supplierId: supplierId || '',
        orderNumber,
        items: items.map((it: any) => ({
          variantId: it.variantId || it.id || '',
          quantity: parseInt(it.quantity || it.quantityOrdered || it.qty || 1, 10),
          unitCost: parseFloat(it.unitCost || 0)
        }))
      });
      return apiResponse.success(res, order, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return apiResponse.error(res, 'Status is required', 400);
      }
      if (!isUuid(id)) {
        return apiResponse.error(res, 'Invalid order ID format.', 400);
      }

      const order = await inventoryService.updateOrderStatus(id, status as OrderStatus);
      if (!order) {
        return apiResponse.error(res, 'Order not found', 404);
      }
      return apiResponse.success(res, order);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  }
};
