import { z } from 'zod';
import {
  isoDate, money, movementTypeField, optionalFilterText, optionalFilterUuid, optionalText, phoneField, positiveMoney, qty, snakeEnum,
  sortOrder, text, uuid,
} from './common.validator.ts';
import { pagingQuery } from '../utils/pagination.ts';
import { MOVEMENT_DIRECTION, ORDER_STATUSES, type MovementType } from '../constants/domain.ts';

// ---------- variants ----------
const variantFields = {
  size: text(20),
  color: text(50),
  sku: z.string().trim().min(1).max(64).optional(),
  barcode: z.string().trim().min(1).max(64).nullable().optional(),
  price: money,
  isActive: z.boolean().optional(),
};

export const createVariantSchema = z.object({
  body: z
    .object({
      productId: uuid,
      ...variantFields,
      // Optional opening stock. Stock lives in warehouse_stock, so it needs a warehouse.
      currentStock: z.number().int().min(0).max(1_000_000).optional(),
      warehouseId: uuid.optional(),
    })
    .refine((b) => !b.currentStock || b.warehouseId, { message: 'warehouseId is required when currentStock > 0', path: ['warehouseId'] }),
});

export const updateVariantSchema = z.object({
  params: z.object({ id: uuid }),
  body: z
    .object({ ...variantFields, currentStock: z.any().optional() })
    .partial()
    .refine((b) => b.currentStock === undefined, {
      message: 'Stock cannot be edited on a variant. Record a stock movement (POST /api/movements) instead',
      path: ['currentStock'],
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' }),
});

export const listVariantsSchema = z.object({
  query: z.object({
    warehouseId: optionalFilterUuid,
    shopId: optionalFilterUuid,
    productId: optionalFilterUuid,
    search: z.string().trim().max(100).optional(),
    includeInactive: z.enum(['true', 'false']).optional(),
  }),
});

// ---------- warehouses ----------
const warehouseFields = {
  name: text(100),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{0,29}$/, 'Code may contain letters, digits, "-" and "_"'),
  location: z.string().trim().max(255).default(''),
  capacity: z.number().int().min(0).max(100_000_000),
  shopId: uuid.nullable().optional(),
  isActive: z.boolean().optional(),
};
export const createWarehouseSchema = z.object({ body: z.object(warehouseFields) });
export const updateWarehouseSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object(warehouseFields).partial().refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' }),
});

// ---------- suppliers ----------
const supplierFields = {
  name: text(150),
  contactPerson: z.string().trim().max(150).default(''),
  email: z.string().trim().toLowerCase().email().max(254).or(z.literal('')).default(''),
  phone: phoneField.or(z.literal('')).default(''),
  address: z.string().trim().max(500).default(''),
  isActive: z.boolean().optional(),
};
export const createSupplierSchema = z.object({ body: z.object(supplierFields) });
export const updateSupplierSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({ ...supplierFields, name: text(150).optional(), contactPerson: supplierFields.contactPerson.optional(), email: supplierFields.email.optional(), phone: supplierFields.phone.optional(), address: supplierFields.address.optional() })
    .refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' }),
});

// ---------- movements ----------
export const createMovementSchema = z.object({
  body: z
    .object({
      variantId: uuid,
      type: movementTypeField,
      quantity: z.number().int().min(-1_000_000).max(1_000_000),
      fromWarehouseId: uuid.nullable().optional(),
      toWarehouseId: uuid.nullable().optional(),
      warehouseId: uuid.nullable().optional(), // convenience for single-warehouse movements
      reason: z.string().trim().max(500).optional(),
    })
    .superRefine((b, ctx) => {
      const dir = MOVEMENT_DIRECTION[b.type as MovementType];
      const from = b.fromWarehouseId ?? (dir === 'out' ? b.warehouseId : null);
      const to = b.toWarehouseId ?? (dir === 'in' ? b.warehouseId : null);
      if (b.quantity === 0) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Quantity cannot be zero' });
      if (dir !== 'signed' && b.quantity < 0) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Quantity must be positive (direction is implied by type)' });
      if (dir === 'in' && !to) ctx.addIssue({ code: 'custom', path: ['toWarehouseId'], message: 'toWarehouseId is required for this movement type' });
      if (dir === 'out' && !from) ctx.addIssue({ code: 'custom', path: ['fromWarehouseId'], message: 'fromWarehouseId is required for this movement type' });
      if (dir === 'transfer') {
        if (!from || !to) ctx.addIssue({ code: 'custom', path: ['toWarehouseId'], message: 'Transfers need fromWarehouseId and toWarehouseId' });
        else if (from === to) ctx.addIssue({ code: 'custom', path: ['toWarehouseId'], message: 'Source and destination must differ' });
      }
      if (dir === 'signed' && !(b.warehouseId ?? b.toWarehouseId ?? b.fromWarehouseId)) {
        ctx.addIssue({ code: 'custom', path: ['warehouseId'], message: 'warehouseId is required for adjustments' });
      }
    }),
});

export const listMovementsSchema = z.object({
  query: z.object({
    warehouseId: optionalFilterUuid,
    shopId: optionalFilterUuid,
    variantId: optionalFilterUuid,
    type: z.preprocess((v) => (typeof v === 'string' && (v === '' || v.toLowerCase() === 'all') ? undefined : v), movementTypeField.optional()),
    search: z.string().trim().max(100).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    ...pagingQuery,
  }),
});

// ---------- purchase orders ----------
export const createOrderSchema = z.object({
  body: z.object({
    supplierId: uuid,
    orderNumber: z.string().trim().regex(/^[A-Za-z0-9._-]{3,40}$/, 'Order number may contain letters, digits and . _ -').optional(),
    items: z
      .array(z.object({ variantId: uuid, quantity: qty, unitCost: money }))
      .min(1, 'Order must contain at least one item')
      .max(200)
      .refine((items) => new Set(items.map((i) => i.variantId)).size === items.length, 'Duplicate variants in one order – merge the lines'),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    status: snakeEnum(ORDER_STATUSES),
    warehouseId: uuid.optional(), // destination warehouse when the order is received
  }),
});

export const listOrdersSchema = z.object({
  query: z.object({
    supplierId: optionalFilterUuid,
    status: z.preprocess((v) => (typeof v === 'string' && (v === '' || v.toLowerCase() === 'all') ? undefined : v), snakeEnum(ORDER_STATUSES).optional()),
    search: z.string().trim().max(100).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    ...pagingQuery,
  }),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>['body'];
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>['body'];
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>['body'];
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>['body'];
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>['body'];
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>['body'];
export type CreateMovementInput = z.infer<typeof createMovementSchema>['body'];
export type ListMovementsQuery = z.infer<typeof listMovementsSchema>['query'];
export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];
export type ListOrdersQuery = z.infer<typeof listOrdersSchema>['query'];
