import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { requireOrganizer } from '../middleware/rbac.middleware';
import { validateRequest } from '../validators';
import {
  createSubmissionSchema,
  updateSubmissionSchema,
  updateSubmissionStatusSchema
} from '../validators/submission.validator';

const router = Router();

// ==========================================
// HACKATHON-SCOPED SUBMISSION ENDPOINTS
// ==========================================

// Create a new draft submission for the participant's team
router.post(
  '/hackathons/:id/submissions',
  authenticate,
  validateRequest(createSubmissionSchema),
  submissionController.create
);

// Get current user's team submission for this hackathon
router.get(
  '/hackathons/:id/my-submission',
  authenticate,
  submissionController.getMySubmission
);

// List submissions in a hackathon (organizer sees all; public/participants see public ones)
router.get(
  '/hackathons/:id/submissions',
  optionalAuthenticate,
  submissionController.list
);

// ==========================================
// DIRECT SUBMISSION ENDPOINTS
// ==========================================

// Get a submission by ID (checks public visibility vs team member / admin permission)
router.get(
  '/submissions/:id',
  optionalAuthenticate,
  submissionController.getById
);

// Update submission draft (team members only, blocked during JUDGING/COMPLETED)
router.patch(
  '/submissions/:id',
  authenticate,
  validateRequest(updateSubmissionSchema),
  submissionController.update
);

// Submit project (finalizes submission, captures version snapshot)
router.post(
  '/submissions/:id/submit',
  authenticate,
  submissionController.submit
);

// Administrative status change (LOCKED, FINALIZED, DISQUALIFIED) - Organizer/Admin only
router.patch(
  '/submissions/:id/status',
  authenticate,
  requireOrganizer,
  validateRequest(updateSubmissionStatusSchema),
  submissionController.updateStatus
);

export default router;
