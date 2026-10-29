import { z } from 'zod';

export const createWarehouseSchema = z.object({
  body: z.object({
    name: z.string({ message: 'Warehouse name is required' }).min(1),
    code: z.string({ message: 'Warehouse code is required' }).min(1),
    location: z.string().optional(),
    capacity: z.number({ message: 'Capacity is required' }).int().positive()
  })
});

export const createVariantSchema = z.object({
  body: z.object({
    productId: z.string({ message: 'Product ID is required' }),
    size: z.string({ message: 'Size is required' }),
    color: z.string({ message: 'Color is required' }),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    price: z.number({ message: 'Price is required' }).positive(),
    currentStock: z.number().int().nonnegative().optional().default(0)
  })
});

export const createMovementSchema = z.object({
  body: z.object({
    variantId: z.string({ message: 'Variant ID is required' }),
    fromWarehouseId: z.string().nullable().optional(),
    toWarehouseId: z.string().nullable().optional(),
    warehouseId: z.string().nullable().optional(),
    quantity: z.number({ message: 'Quantity is required' }).int().positive(),
    type: z.string({ message: 'Movement type is required' }),
    reason: z.string().optional()
  })
});

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string({ message: 'Supplier name is required' }).min(1),
    contactPerson: z.string().optional(),
    email: z.string({ message: 'Email is required' }).email(),
    phone: z.string().optional(),
    address: z.string().optional()
  })
});

export const createOrderSchema = z.object({
  body: z.object({
    supplierId: z.string({ message: 'Supplier ID is required' }),
    orderNumber: z.string().optional(),
    items: z.array(z.object({
      variantId: z.string(),
      quantity: z.number().int().positive(),
      unitCost: z.number().nonnegative()
    })).min(1, 'Order must contain at least one item')
  })
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'shipped', 'received', 'cancelled'], {
      message: 'Status must be one of: pending, shipped, received, cancelled'
    })
  })
});
