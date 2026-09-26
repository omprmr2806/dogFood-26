import { Router } from 'express';
import { teamController } from '../controllers/team.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { requireParticipant } from '../middleware/rbac.middleware';
import { validateRequest } from '../validators';
import {
  createTeamSchema,
  updateTeamSchema,
  joinTeamSchema
} from '../validators/team.validator';

const router = Router();

// ==========================================
// TEAM ENDPOINTS
// ==========================================

// Create a new team in a hackathon (creator becomes leader)
router.post(
  '/hackathons/:id/teams',
  authenticate,
  requireParticipant,
  validateRequest(createTeamSchema),
  teamController.create
);

// List teams in a hackathon (Public summary, hides invite codes)
router.get(
  '/hackathons/:id/teams',
  optionalAuthenticate,
  teamController.list
);

// Get current user's team in this hackathon
router.get(
  '/hackathons/:id/my-team',
  authenticate,
  requireParticipant,
  teamController.getMyTeam
);

// Get single team details (full details with invite code if member/organizer; sanitized if non-member)
router.get(
  '/hackathons/:id/teams/:teamId',
  optionalAuthenticate,
  teamController.getById
);

// Update team details (name) - Leader or Organizer/Admin only
router.patch(
  '/hackathons/:id/teams/:teamId',
  authenticate,
  requireParticipant,
  validateRequest(updateTeamSchema),
  teamController.update
);

// Disband a team - Leader or Organizer/Admin only
router.delete(
  '/hackathons/:id/teams/:teamId',
  authenticate,
  requireParticipant,
  teamController.disband
);

// Join a team via invite code
router.post(
  '/hackathons/:id/teams/:teamId/join',
  authenticate,
  requireParticipant,
  validateRequest(joinTeamSchema),
  teamController.join
);

// Leave a team
router.post(
  '/hackathons/:id/teams/:teamId/leave',
  authenticate,
  requireParticipant,
  teamController.leave
);

// Remove a member (Leader removes member, or member removes self, or Organizer/Admin)
router.delete(
  '/hackathons/:id/teams/:teamId/members/:userId',
  authenticate,
  requireParticipant,
  teamController.removeMember
);

// Regenerate team invite code - Leader or Organizer/Admin only
router.post(
  '/hackathons/:id/teams/:teamId/invite-code/regenerate',
  authenticate,
  requireParticipant,
  teamController.regenerateInviteCode
);

export const teamRoutes = router;
