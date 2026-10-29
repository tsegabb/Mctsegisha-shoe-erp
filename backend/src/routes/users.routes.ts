import { Router } from 'express';
import { authController } from '../controllers/auth.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { requireRole } from '../middlewares/roleGuard.middleware.ts';

const router = Router();

// Apply auth protection & Admin role check to all user routes
router.use(authMiddleware);
router.use(requireRole(['Admin']));

router.get('/', authController.listUsers);
router.post('/', authController.createUser);
router.put('/:id', authController.updateUser);
router.delete('/:id', authController.deleteUser);

export default router;
