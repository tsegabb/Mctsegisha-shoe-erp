import { z } from 'zod';

export const createSaleSchema = z.object({
  body: z.object({
    variantId: z.string({ message: 'Variant ID is required' }),
    quantity: z.number({ message: 'Quantity is required' }).int().positive(),
    sellingPrice: z.number({ message: 'Selling price is required' }).positive(),
    costPrice: z.number().positive().optional(),
    warehouseId: z.string().nullable().optional(),
    paymentMethod: z.string().optional()
  })
});

export const processReturnSchema = z.object({
  body: z.object({
    saleId: z.string().optional(),
    totalReturnAmount: z.number().nonnegative().optional().default(0),
    totalReturnQty: z.number().int().positive().optional().default(1),
    reason: z.string().optional(),
    restock: z.boolean().optional().default(true)
  })
});
