import { Router } from 'express';
import { productsController as c } from '../controllers/products.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { requireRole } from '../middlewares/roleGuard.middleware.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { MANAGEMENT_ROLES } from '../constants/domain.ts';
import {
  addFromCatalogSchema, createBrandSchema, createCategorySchema, createProductSchema, listProductsSchema, updateProductSchema,
} from '../validators/product.validator.ts';
import { idParams } from '../validators/common.validator.ts';

const manage = requireRole(...MANAGEMENT_ROLES);

export const brandsRouter = Router();
brandsRouter.use(authMiddleware);
brandsRouter.get('/', c.brands);
brandsRouter.post('/', manage, validate(createBrandSchema), c.createBrand);

export const categoriesRouter = Router();
categoriesRouter.use(authMiddleware);
categoriesRouter.get('/', c.categories);
categoriesRouter.post('/', manage, validate(createCategorySchema), c.createCategory);

const router = Router();
router.use(authMiddleware);
router.get('/master-catalog', c.masterCatalog);
router.post('/add-from-catalog', manage, validate(addFromCatalogSchema), c.addFromCatalog);
router.use('/brands', brandsRouter); // legacy aliases
router.use('/categories', categoriesRouter);
router.get('/', validate(listProductsSchema), c.list);
router.post('/', manage, validate(createProductSchema), c.create);
router.put('/:id', manage, validate(updateProductSchema), c.update);
router.delete('/:id', manage, validate(idParams), c.remove);
export default router;
