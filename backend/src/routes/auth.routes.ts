import { Router } from 'express';
import { authController } from '../controllers/auth.controller.ts';

const router = Router();

router.post('/login', authController.login);
router.get('/me', authController.me);

export default router;
