import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { rbacTestRoutes } from './rbac-test.routes';
import { hackathonRoutes } from './hackathon.routes';
import { teamRoutes } from './team.routes';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(rbacTestRoutes);
router.use(hackathonRoutes);
router.use(teamRoutes);

export const apiRouter = router;
