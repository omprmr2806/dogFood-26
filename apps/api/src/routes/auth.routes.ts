import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../validators';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post(
  '/auth/register',
  authRateLimiter,
  validateRequest(registerSchema),
  authController.register
);

router.post(
  '/auth/login',
  authRateLimiter,
  validateRequest(loginSchema),
  authController.login
);

router.post(
  '/auth/logout',
  authenticate,
  authController.logout
);

router.get(
  '/auth/me',
  authenticate,
  authController.getMe
);

export const authRoutes = router;
