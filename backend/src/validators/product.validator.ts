import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string({ message: 'Product name is required' }).min(1),
    brandId: z.string().nullable().optional(),
    category: z.string().optional().default('Casual'),
    gender: z.string().optional().default('Unisex'),
    basePrice: z.number({ message: 'Base price is required' }).positive(),
    description: z.string().optional(),
    warehouseIds: z.array(z.string()).optional()
  })
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    brandId: z.string().nullable().optional(),
    category: z.string().optional(),
    gender: z.string().optional(),
    basePrice: z.number().positive().optional(),
    description: z.string().optional(),
    warehouseIds: z.array(z.string()).optional()
  })
});

export const createBrandSchema = z.object({
  body: z.object({
    name: z.string({ message: 'Brand name is required' }).min(1),
    logoUrl: z.string().url().or(z.literal('')).optional(),
    description: z.string().optional()
  })
});
