import { Router } from 'express';
import { hackathonController } from '../controllers/hackathon.controller';
import { registrationController } from '../controllers/registration.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { requireOrganizer, requireParticipant } from '../middleware/rbac.middleware';
import { requireEventState } from '../middleware/eventState.middleware';
import { validateRequest } from '../validators';
import {
  createHackathonSchema,
  updateHackathonSchema,
  transitionHackathonSchema,
  updateRegistrationStatusSchema
} from '../validators/hackathon.validator';
import { HackathonStatus } from '@dogfood/shared';

const router = Router();

// ==========================================
// HACKATHON EVENT ENDPOINTS
// ==========================================

// List hackathons (Public with optional auth to show drafts to organizers)
router.get(
  '/hackathons',
  optionalAuthenticate,
  hackathonController.list
);

// Create hackathon (Organizer or Admin only)
router.post(
  '/hackathons',
  authenticate,
  requireOrganizer,
  validateRequest(createHackathonSchema),
  hackathonController.create
);

// Get single hackathon by ID or slug (Public with optional auth)
router.get(
  '/hackathons/:id',
  optionalAuthenticate,
  hackathonController.getByIdOrSlug
);

// Update hackathon details (Organizer or Admin only)
router.patch(
  '/hackathons/:id',
  authenticate,
  requireOrganizer,
  validateRequest(updateHackathonSchema),
  hackathonController.update
);

// Transition hackathon lifecycle state (Organizer or Admin only)
router.post(
  '/hackathons/:id/transitions',
  authenticate,
  requireOrganizer,
  validateRequest(transitionHackathonSchema),
  hackathonController.transition
);

// ==========================================
// REGISTRATION ENDPOINTS
// ==========================================

// Participant registers for event (must be authenticated, event must be OPEN)
router.post(
  '/hackathons/:id/registrations',
  authenticate,
  requireParticipant,
  requireEventState(HackathonStatus.OPEN),
  registrationController.register
);

// Participant gets own registration status
router.get(
  '/hackathons/:id/registration',
  authenticate,
  requireParticipant,
  registrationController.getMyRegistration
);

// Organizer/Admin views all registrations for the hackathon
router.get(
  '/hackathons/:id/registrations',
  authenticate,
  requireOrganizer,
  registrationController.listRegistrations
);

// Organizer/Admin updates registration status (Approve / Reject / Check-in)
router.patch(
  '/hackathons/:id/registrations/:registrationId',
  authenticate,
  requireOrganizer,
  validateRequest(updateRegistrationStatusSchema),
  registrationController.updateStatus
);

export const hackathonRoutes = router;
