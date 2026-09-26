import { Router } from 'express';
import { rubricController } from '../controllers/rubric.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizer, requireJudge } from '../middleware/rbac.middleware';
import { validateRequest } from '../validators';
import {
  createRubricSchema,
  updateRubricSchema,
  saveEvaluationDraftSchema,
  submitEvaluationSchema
} from '../validators/rubric.validator';

const router = Router();

// ==========================================
// RUBRICS: CONFIGURATION (ORGANIZER)
// ==========================================

// Get active rubric for a hackathon (authenticated users)
router.get(
  '/hackathons/:id/rubric',
  authenticate,
  rubricController.getActiveRubric
);

// Create rubric for hackathon (organizer/admin)
router.post(
  '/hackathons/:id/rubric',
  authenticate,
  requireOrganizer,
  validateRequest(createRubricSchema),
  rubricController.createRubric
);

// Update rubric (organizer/admin)
router.put(
  '/rubrics/:id',
  authenticate,
  requireOrganizer,
  validateRequest(updateRubricSchema),
  rubricController.updateRubric
);

// ==========================================
// JUDGE: EVALUATION CONSOLE & SCORING
// ==========================================

// Get evaluation console data for an assignment (judge/organizer)
router.get(
  '/assignments/:assignmentId/evaluation',
  authenticate,
  rubricController.getEvaluationForAssignment
);

// Save evaluation draft (assigned judge)
router.post(
  '/assignments/:assignmentId/evaluation/draft',
  authenticate,
  requireJudge,
  validateRequest(saveEvaluationDraftSchema),
  rubricController.saveEvaluationDraft
);

// Submit evaluation final (assigned judge)
router.post(
  '/assignments/:assignmentId/evaluation/submit',
  authenticate,
  requireJudge,
  validateRequest(submitEvaluationSchema),
  rubricController.submitEvaluation
);

// Unlock evaluation (organizer/admin)
router.post(
  '/assignments/:assignmentId/evaluation/unlock',
  authenticate,
  requireOrganizer,
  rubricController.unlockEvaluation
);

// ==========================================
// ORGANIZER: JUDGING MONITOR
// ==========================================

// Get judging progress monitor for hackathon (organizer/admin)
router.get(
  '/hackathons/:id/judging-monitor',
  authenticate,
  requireOrganizer,
  rubricController.getJudgingMonitor
);

export default router;
