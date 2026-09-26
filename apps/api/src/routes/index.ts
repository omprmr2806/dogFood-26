import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { rbacTestRoutes } from './rbac-test.routes';
import { hackathonRoutes } from './hackathon.routes';
import { teamRoutes } from './team.routes';
import submissionRoutes from './submission.routes';
import galleryRoutes from './gallery.routes';
import judgeRoutes from './judge.routes';
import rubricRoutes from './rubric.routes';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(rbacTestRoutes);
router.use(hackathonRoutes);
router.use(teamRoutes);
router.use(submissionRoutes);
router.use(galleryRoutes);
router.use(judgeRoutes);
router.use(rubricRoutes);

export const apiRouter = router;
