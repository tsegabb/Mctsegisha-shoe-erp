import { z } from 'zod';
import {
  isoDate, money, optionalFilterUuid, paymentMethodField, positiveMoney, qty, snakeEnum, sortOrder, uuid,
} from './common.validator.ts';
import { pagingQuery } from '../utils/pagination.ts';
import { PAYMENT_ALIASES, PAYMENT_METHODS, SALE_STATUSES } from '../constants/domain.ts';

const saleItem = z.object({
  variantId: uuid,
  quantity: qty,
  sellingPrice: positiveMoney,
  costPrice: money.optional(), // honoured for managers only; ignored for cashiers
});

/** Accepts the legacy single-line body { variantId, quantity, sellingPrice, ... } as well as { items: [...] }. */
const legacyToItems = (raw: unknown) => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'variantId' in raw && !('items' in raw)) {
    const { variantId, quantity, sellingPrice, costPrice, ...rest } = raw as Record<string, unknown>;
    return { ...rest, items: [{ variantId, quantity, sellingPrice, costPrice }] };
  }
  return raw;
};

export const createSaleSchema = z.object({
  body: z.preprocess(
    legacyToItems,
    z.object({
      items: z
        .array(saleItem)
        .min(1, 'At least one item is required')
        .max(100)
        .refine((items) => new Set(items.map((i) => i.variantId)).size === items.length, 'Duplicate variants – merge the lines'),
      warehouseId: uuid.nullable().optional(),
      paymentMethod: paymentMethodField.default('cash'),
    }),
  ),
});

/** Accepts legacy names totalReturnQty / totalReturnAmount. */
const legacyReturn = (raw: unknown) => {
  if (raw && typeof raw === 'object') {
    const r = { ...(raw as Record<string, unknown>) };
    if (r.quantity === undefined && r.totalReturnQty !== undefined) r.quantity = r.totalReturnQty;
    if (r.refundAmount === undefined && r.totalReturnAmount !== undefined && Number(r.totalReturnAmount) > 0) r.refundAmount = r.totalReturnAmount;
    return r;
  }
  return raw;
};

export const processReturnSchema = z.object({
  body: z.preprocess(
    legacyReturn,
    z.object({
      saleId: uuid,
      quantity: qty.default(1),
      refundAmount: positiveMoney.optional(), // managers only; defaults to quantity × selling price
      reason: z.string().trim().max(300).default('Customer return'),
      restock: z.boolean().default(true),
      warehouseId: uuid.optional(),
    }),
  ),
});

export const listSalesSchema = z.object({
  query: z.object({
    warehouseId: optionalFilterUuid,
    shopId: optionalFilterUuid,
    search: z.string().trim().max(100).optional(),
    paymentMethod: z.preprocess((v) => (typeof v === 'string' && (v === '' || v.toLowerCase() === 'all') ? undefined : v), paymentMethodField.optional()),
    status: z.preprocess((v) => (typeof v === 'string' && (v === '' || v.toLowerCase() === 'all') ? undefined : v), snakeEnum(SALE_STATUSES).optional()),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    sortBy: z.enum(['created_at', 'profit', 'quantity', 'selling_price']).optional(),
    sortOrder,
    ...pagingQuery,
  }),
});

export const reconcileSchema = z.object({ query: z.object({ warehouseId: optionalFilterUuid, shopId: optionalFilterUuid }) });

export type CreateSaleInput = z.infer<typeof createSaleSchema>['body'];
export type ProcessReturnInput = z.infer<typeof processReturnSchema>['body'];
export type ListSalesQuery = z.infer<typeof listSalesSchema>['query'];
