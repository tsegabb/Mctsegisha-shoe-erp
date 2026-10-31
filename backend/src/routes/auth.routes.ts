import { Router } from 'express';
import { authController } from '../controllers/auth.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { loginLimiter } from '../middlewares/rateLimit.middleware.ts';
import { requireRole } from '../middlewares/roleGuard.middleware.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { changePasswordSchema, createUserSchema, loginSchema, resetPasswordSchema, updateUserSchema } from '../validators/auth.validator.ts';
import { idParams } from '../validators/common.validator.ts';

export const authRouter = Router();
authRouter.post('/login', loginLimiter, validate(loginSchema), authController.login);
authRouter.get('/me', authMiddleware, authController.me);
authRouter.post('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword);

export const usersRouter = Router();
usersRouter.use(authMiddleware, requireRole()); // owner / admin only
usersRouter.get('/', authController.listUsers);
usersRouter.post('/', validate(createUserSchema), authController.createUser);
usersRouter.put('/:id', validate(updateUserSchema), authController.updateUser);
usersRouter.post('/:id/reset-password', validate(resetPasswordSchema), authController.resetPassword);
usersRouter.delete('/:id', validate(idParams), authController.deleteUser);
