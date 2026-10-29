import { Router } from 'express';
import { productsController } from '../controllers/products.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { requireRole } from '../middlewares/roleGuard.middleware.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { createProductSchema, updateProductSchema, createBrandSchema } from '../validators/product.validator.ts';

const router = Router();

// Master Catalog operations
router.get('/master-catalog', productsController.getMasterCatalog);
router.post('/add-from-catalog', authMiddleware, requireRole(['Admin', 'Manager']), productsController.addFromCatalog);

// List operations (public/all employees)
router.get('/', productsController.getProducts);
router.get('/brands', productsController.getBrands);
router.get('/categories', productsController.getCategories);

// Write operations (guarded by authentication & role checks)
router.post('/', authMiddleware, requireRole(['Admin', 'Manager']), validate(createProductSchema), productsController.createProduct);
router.put('/:id', authMiddleware, requireRole(['Admin', 'Manager']), validate(updateProductSchema), productsController.updateProduct);
router.delete('/:id', authMiddleware, requireRole(['Admin', 'Manager']), productsController.deleteProduct);

router.post('/brands', authMiddleware, requireRole(['Admin', 'Manager']), validate(createBrandSchema), productsController.createBrand);
router.post('/categories', authMiddleware, requireRole(['Admin', 'Manager']), productsController.createCategory);

export default router;

