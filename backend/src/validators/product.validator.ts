import { z } from 'zod';
import {
  genderField, idParams, money, optionalFilterText, optionalFilterUuid, optionalText, sortOrder, text, uuid,
} from './common.validator.ts';
import { pagingQuery } from '../utils/pagination.ts';

const imageUrls = z.array(z.string().trim().url().max(2048)).max(12);

const productFields = {
  name: text(200),
  description: optionalText(5000),
  brandId: uuid,
  categoryId: uuid.optional(),
  category: z.string().trim().min(1).max(100).optional(), // legacy: category *name*; resolved to category_id
  gender: genderField.optional(),
  basePrice: money,
  costPrice: money.nullable().optional(),
  sku: z.string().trim().min(1).max(64).nullable().optional(),
  imageUrl: z.string().trim().url().max(2048).nullable().optional(),
  imageUrls: imageUrls.optional(),
  isActive: z.boolean().optional(),
};

export const createProductSchema = z.object({
  body: z.object(productFields).refine((b) => b.categoryId || b.category, { message: 'categoryId is required', path: ['categoryId'] }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object(productFields).partial().refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' }),
});

export const listProductsSchema = z.object({
  query: z.object({
    warehouseId: optionalFilterUuid,
    shopId: optionalFilterUuid, // legacy alias – the old UI called warehouses "shops"
    search: z.string().trim().max(100).optional(),
    category: optionalFilterText(100),
    categoryId: optionalFilterUuid,
    brandId: optionalFilterUuid,
    gender: optionalFilterText(20),
    sortBy: z.enum(['name', 'price', 'basePrice', 'category', 'createdAt']).optional(),
    sortOrder,
    ...pagingQuery,
  }),
});

export const createBrandSchema = z.object({
  body: z.object({
    name: text(100),
    logoUrl: z.string().trim().url().max(2048).or(z.literal('')).optional(),
    description: optionalText(1000),
  }),
});

export const createCategorySchema = z.object({
  body: z.object({ name: text(100), description: optionalText(1000) }),
});

export const addFromCatalogSchema = z.object({
  body: z.object({
    name: text(200),
    genericName: optionalText(200),
    form: optionalText(100),
    strength: optionalText(100),
    manufacturer: optionalText(100),
    category: optionalText(100),
    sellingPrice: money.default(0),
    costPrice: money.default(0),
  }),
});

export { idParams };
export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type ListProductsQuery = z.infer<typeof listProductsSchema>['query'];
export type AddFromCatalogInput = z.infer<typeof addFromCatalogSchema>['body'];
