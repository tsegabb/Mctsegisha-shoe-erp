import { Router } from 'express';
import authRouter from './auth.routes.ts';
import usersRouter from './users.routes.ts';
import productsRouter from './products.routes.ts';
import inventoryRouter from './inventory.routes.ts';
import salesRouter from './sales.routes.ts';
import cashRouter from './cash.routes.ts';
import reportsRouter from './reports.routes.ts';
import settingsRouter from './settings.routes.ts';

import { productsController } from '../controllers/products.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { createBrandSchema } from '../validators/product.validator.ts';
import { isPostgresConnected, dbError, initializeDatabase } from '../config/db.ts';
import { env } from '../config/env.ts';

const apiRouter = Router();

// 0. Base status and reconnection checks
apiRouter.get('/status', (req, res) => {
  const dbUrl = env.DATABASE_URL || '';
  const maskedUrl = dbUrl ? dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'NOT_FOUND';
  res.json({
    success: true,
    postgresConnected: isPostgresConnected,
    dbError: dbError,
    mode: isPostgresConnected ? 'PostgreSQL (Supabase)' : 'Local Memory Demo Mode',
    configDocUrl: 'https://supabase.com',
    dbUrl: maskedUrl
  });
});

apiRouter.post('/status/reconnect', async (req, res) => {
  await initializeDatabase();
  res.json({
    success: true,
    postgresConnected: isPostgresConnected,
    dbError: dbError,
    mode: isPostgresConnected ? 'PostgreSQL (Supabase)' : 'Local Memory Demo Mode'
  });
});

// 1. Authentication Routes (/api/auth/login, /api/auth/me)
apiRouter.use('/auth', authRouter);

// 2. User & Team Management (/api/users)
apiRouter.use('/users', usersRouter);

// 3. Reports & Analytical Stats (/api/stats)
apiRouter.use(reportsRouter);

// 4. Products & Brands & Categories (/api/products, /api/brands, /api/categories)
apiRouter.use('/products', productsRouter);
apiRouter.get('/brands', productsController.getBrands);
apiRouter.post('/brands', authMiddleware, validate(createBrandSchema), productsController.createBrand);
apiRouter.get('/categories', productsController.getCategories);
apiRouter.post('/categories', authMiddleware, productsController.createCategory);

// 5. Inventory: Variants, Warehouses, Suppliers, Movements, Purchase Orders
apiRouter.use(inventoryRouter);

// 6. POS Sales transactions (/api/sales) & Cash Management (/api/cash)
apiRouter.use('/sales', salesRouter);
apiRouter.use('/cash', cashRouter);

// 7. System settings, Email notifications, Backups, Import & Export
apiRouter.use(settingsRouter);

export default apiRouter;
