import { Request, Response } from 'express';
import { productsService } from '../services/products.service.ts';
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

export const productsController = {
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await productsService.getCategories();
      return apiResponse.success(res, categories);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createCategory(req: Request, res: Response) {
    try {
      const { name, description } = req.body;
      if (!name || !name.trim()) {
        return apiResponse.error(res, 'Category name is required', 400);
      }
      const id = generateId();
      const category = await productsService.createCategory({
        id,
        name: name.trim(),
        description: description ? description.trim() : ''
      });
      return apiResponse.success(res, category, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async getBrands(req: Request, res: Response) {
    try {
      const brands = await productsService.getBrands();
      return apiResponse.success(res, brands);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createBrand(req: Request, res: Response) {
    try {
      const { name, logoUrl, description } = req.body;
      if (!name) {
        return apiResponse.error(res, 'Brand name is required', 400);
      }
      const id = generateId();
      const brand = await productsService.createBrand({ id, name, logoUrl, description });
      return apiResponse.success(res, brand, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async getProducts(req: Request, res: Response) {
    try {
      let warehouseId = (req.query.warehouseId || req.query.shopId) as string | undefined;
      const user = req.user;
      if (user && user.role !== 'Admin') {
        const userShopId = user.shopId;
        if (!userShopId) {
          return apiResponse.error(res, 'No shop assigned to your user account.', 403);
        }
        if (warehouseId && warehouseId !== userShopId) {
          return apiResponse.error(res, 'Access Denied: You are restricted to your assigned shop branch.', 403);
        }
        warehouseId = userShopId;
      }

      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      const brandId = req.query.brandId as string | undefined;
      const gender = req.query.gender as string | undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const products = await productsService.getProducts({
        warehouseId,
        search,
        category,
        brandId,
        gender,
        sortBy,
        sortOrder,
        page,
        limit
      });
      return apiResponse.success(res, products);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async createProduct(req: Request, res: Response) {
    try {
      const { name, description, brandId, category, gender, basePrice, warehouseIds } = req.body;
      if (!name || !brandId || basePrice === undefined) {
        return apiResponse.error(res, 'Name, brandId, and basePrice are required', 400);
      }
      if (!isUuid(brandId)) {
        return apiResponse.error(res, 'Invalid brand ID format.', 400);
      }
      const id = generateId();
      const product = await productsService.createProduct({
        id,
        name,
        description,
        brandId,
        category,
        gender,
        basePrice: parseFloat(basePrice),
        warehouseIds: warehouseIds || []
      });
      return apiResponse.success(res, product, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, brandId, category, gender, basePrice, warehouseIds } = req.body;
      
      if (!isUuid(id)) {
        return apiResponse.error(res, 'Invalid product ID format.', 400);
      }
      if (brandId && !isUuid(brandId)) {
        return apiResponse.error(res, 'Invalid brand ID format.', 400);
      }
      
      const product = await productsService.updateProduct(id, {
        name,
        description,
        brandId,
        category,
        gender,
        basePrice: basePrice !== undefined ? parseFloat(basePrice) : undefined,
        warehouseIds: warehouseIds
      });
      
      if (!product) {
        return apiResponse.error(res, 'Product not found', 404);
      }
      return apiResponse.success(res, product);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isUuid(id)) {
        return apiResponse.error(res, 'Invalid product ID format.', 400);
      }
      const success = await productsService.deleteProduct(id);
      if (!success) {
        return apiResponse.error(res, 'Product not found', 404);
      }
      return apiResponse.success(res, { message: 'Product deleted' });
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async getMasterCatalog(req: Request, res: Response) {
    try {
      const items = await productsService.getMasterCatalog();
      return apiResponse.success(res, items);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  },

  async addFromCatalog(req: Request, res: Response) {
    try {
      const { 
        name, 
        genericName, 
        form, 
        strength, 
        manufacturer, 
        category, 
        sellingPrice, 
        costPrice, 
        reorderLevel, 
        units 
      } = req.body;

      if (!name) {
        return apiResponse.error(res, 'Product name is required', 400);
      }

      const result = await productsService.addFromCatalog({
        name,
        genericName,
        form,
        strength,
        manufacturer,
        category,
        sellingPrice: parseFloat(sellingPrice) || 0,
        costPrice: parseFloat(costPrice) || 0,
        reorderLevel: parseInt(reorderLevel) || 10,
        units: units || []
      });

      return apiResponse.success(res, result, 201);
    } catch (err: any) {
      return apiResponse.error(res, err.message);
    }
  }
};
