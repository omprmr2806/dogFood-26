import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { rbacTestRoutes } from './rbac-test.routes';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(rbacTestRoutes);

export const apiRouter = router;
