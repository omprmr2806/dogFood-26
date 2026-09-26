import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { rbacTestRoutes } from './rbac-test.routes';
import { hackathonRoutes } from './hackathon.routes';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(rbacTestRoutes);
router.use(hackathonRoutes);

export const apiRouter = router;
