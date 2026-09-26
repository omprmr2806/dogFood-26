import { Router } from 'express';
import { rbacTestController } from '../controllers/rbac-test.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  requireAdmin,
  requireOrganizer,
  requireJudge,
  requireParticipant
} from '../middleware/rbac.middleware';

const router = Router();

router.get(
  '/rbac/admin-test',
  authenticate,
  requireAdmin,
  rbacTestController.adminTest
);

router.get(
  '/rbac/organizer-test',
  authenticate,
  requireOrganizer,
  rbacTestController.organizerTest
);

router.get(
  '/rbac/judge-test',
  authenticate,
  requireJudge,
  rbacTestController.judgeTest
);

router.get(
  '/rbac/participant-test',
  authenticate,
  requireParticipant,
  rbacTestController.participantTest
);

export const rbacTestRoutes = router;
