import { asyncHandler } from '../utils/asyncHandler.ts';
import { apiResponse } from '../utils/apiResponse.ts';
import { productsService } from '../services/products.service.ts';
import { catalogService } from '../services/catalog.service.ts';

export const productsController = {
  list: asyncHandler(async (req, res) => apiResponse.success(res, await productsService.list(req.user!, req.valid!.query))),
  create: asyncHandler(async (req, res) => apiResponse.success(res, await productsService.create(req.user!, req.valid!.body), 201)),
  update: asyncHandler(async (req, res) => apiResponse.success(res, await productsService.update(req.user!, req.valid!.params.id, req.valid!.body))),
  remove: asyncHandler(async (req, res) => {
    await productsService.remove(req.user!, req.valid!.params.id);
    apiResponse.success(res, { message: 'Product deleted' });
  }),
  masterCatalog: asyncHandler(async (_req, res) => apiResponse.success(res, productsService.getMasterCatalog())),
  addFromCatalog: asyncHandler(async (req, res) => apiResponse.success(res, await productsService.addFromCatalog(req.user!, req.valid!.body), 201)),

  brands: asyncHandler(async (_req, res) => apiResponse.success(res, await catalogService.getBrands())),
  createBrand: asyncHandler(async (req, res) => apiResponse.success(res, await catalogService.createBrand(req.valid!.body), 201)),
  categories: asyncHandler(async (_req, res) => apiResponse.success(res, await catalogService.getCategories())),
  createCategory: asyncHandler(async (req, res) => apiResponse.success(res, await catalogService.createCategory(req.valid!.body), 201)),
};
