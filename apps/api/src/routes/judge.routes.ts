import { Router } from 'express';
import { judgeController } from '../controllers/judge.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizer, requireJudge } from '../middleware/rbac.middleware';
import { validateRequest } from '../validators';
import {
  addJudgeSchema,
  updateJudgeStatusSchema,
  updateJudgingConfigSchema,
  declareConflictSchema,
  generateAssignmentsSchema,
  finalizeAssignmentsSchema
} from '../validators/judge.validator';

const router = Router();

// ==========================================
// ORGANIZER: JUDGE POOL & ROSTER
// ==========================================

// List judges for a hackathon
router.get(
  '/hackathons/:id/judges',
  authenticate,
  requireOrganizer,
  judgeController.listJudges
);

// List available judge-role users in system
router.get(
  '/hackathons/:id/judges/available',
  authenticate,
  requireOrganizer,
  judgeController.getAvailableJudges
);

// Add judge to hackathon
router.post(
  '/hackathons/:id/judges',
  authenticate,
  requireOrganizer,
  validateRequest(addJudgeSchema),
  judgeController.addJudge
);

// Update judge status (activate/deactivate)
router.patch(
  '/hackathons/:id/judges/:judgeId',
  authenticate,
  requireOrganizer,
  validateRequest(updateJudgeStatusSchema),
  judgeController.updateJudgeStatus
);

// Remove judge from hackathon (before finalization)
router.delete(
  '/hackathons/:id/judges/:judgeId',
  authenticate,
  requireOrganizer,
  judgeController.removeJudge
);

// ==========================================
// ORGANIZER: JUDGING CONFIGURATION
// ==========================================

// Get judging config
router.get(
  '/hackathons/:id/judging/config',
  authenticate,
  requireOrganizer,
  judgeController.getJudgingConfig
);

// Update judging config
router.patch(
  '/hackathons/:id/judging/config',
  authenticate,
  requireOrganizer,
  validateRequest(updateJudgingConfigSchema),
  judgeController.updateJudgingConfig
);

// ==========================================
// ORGANIZER: CONFLICTS OF INTEREST
// ==========================================

// List recorded conflicts
router.get(
  '/hackathons/:id/judging/conflicts',
  authenticate,
  requireOrganizer,
  judgeController.listConflicts
);

// Record conflict of interest
router.post(
  '/hackathons/:id/judging/conflicts',
  authenticate,
  requireOrganizer,
  validateRequest(declareConflictSchema),
  judgeController.declareConflict
);

// Remove conflict of interest record
router.delete(
  '/hackathons/:id/judging/conflicts/:conflictId',
  authenticate,
  requireOrganizer,
  judgeController.removeConflict
);

// ==========================================
// ORGANIZER: ASSIGNMENT ENGINE
// ==========================================

// Generate assignment preview
router.post(
  '/hackathons/:id/judging/assignments/preview',
  authenticate,
  requireOrganizer,
  validateRequest(generateAssignmentsSchema),
  judgeController.previewAssignments
);

// Finalize assignments (atomic transaction)
router.post(
  '/hackathons/:id/judging/assignments/finalize',
  authenticate,
  requireOrganizer,
  validateRequest(finalizeAssignmentsSchema),
  judgeController.finalizeAssignments
);

// Inspect all assignments (organizer/admin)
router.get(
  '/hackathons/:id/judging/assignments',
  authenticate,
  requireOrganizer,
  judgeController.listAssignments
);

// ==========================================
// JUDGE PORTAL ENDPOINTS
// ==========================================

// Judge: Get my assigned projects queue
router.get(
  '/hackathons/:id/judge/my-assignments',
  authenticate,
  requireJudge,
  judgeController.getMyAssignments
);

// Judge: Inspect specific assigned project
router.get(
  '/hackathons/:id/judge/assignments/:assignmentId',
  authenticate,
  requireJudge,
  judgeController.getMyAssignmentDetail
);

export default router;
