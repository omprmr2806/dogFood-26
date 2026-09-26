/**
 * DOGFOOD Phase 9: Community Voting Routes
 *
 * POST   /api/v1/hackathons/:hackathonId/votes/:submissionId   — cast vote
 * DELETE /api/v1/hackathons/:hackathonId/votes/:submissionId   — remove vote
 * GET    /api/v1/hackathons/:hackathonId/votes                 — all vote counts
 * GET    /api/v1/hackathons/:hackathonId/votes/:submissionId   — single submission count
 * PUT    /api/v1/hackathons/:hackathonId/voting-config         — configure window (ORGANIZER/ADMIN)
 * GET    /api/v1/hackathons/:hackathonId/voting-config         — get voting config
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizer } from '../middleware/rbac.middleware';
import { UserRole } from '@dogfood/shared';
import { voteRateLimiter } from '../middleware/rateLimiter';
import { voteService } from '../services/vote.service';

const router = Router();

// ── cast vote ──────────────────────────────────────────────────────────────
router.post(
  '/hackathons/:hackathonId/votes/:submissionId',
  authenticate,
  voteRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hackathonId, submissionId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role as UserRole;

      const result = await voteService.castVote(hackathonId, submissionId, userId, userRole);
      const statusCode = result.alreadyVoted ? 200 : 201;
      res.status(statusCode).json({ success: true, data: result.vote });
    } catch (err) {
      next(err);
    }
  },
);

// ── remove vote ────────────────────────────────────────────────────────────
router.delete(
  '/hackathons/:hackathonId/votes/:submissionId',
  authenticate,
  voteRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hackathonId, submissionId } = req.params;
      const userId = req.user!.id;

      const result = await voteService.removeVote(hackathonId, submissionId, userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── all vote counts for hackathon ──────────────────────────────────────────
router.get(
  '/hackathons/:hackathonId/votes',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hackathonId } = req.params;
      const userId = req.user?.id;

      const counts = await voteService.getHackathonVoteCounts(hackathonId, userId);
      res.json({ success: true, data: counts });
    } catch (err) {
      next(err);
    }
  },
);

// ── single submission vote count ───────────────────────────────────────────
router.get(
  '/hackathons/:hackathonId/votes/:submissionId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { submissionId } = req.params;
      const userId = req.user?.id;

      const count = await voteService.getVoteCount(submissionId, userId);
      res.json({ success: true, data: count });
    } catch (err) {
      next(err);
    }
  },
);

// ── configure voting window (ORGANIZER / ADMIN) ────────────────────────────
router.put(
  '/hackathons/:hackathonId/voting-config',
  authenticate,
  requireOrganizer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hackathonId } = req.params;
      const { votingEnabled, votingStart, votingEnd } = req.body;

      const config = await voteService.configureVotingWindow(
        hackathonId,
        votingEnabled,
        votingStart,
        votingEnd,
      );
      res.json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  },
);

// ── get voting config ──────────────────────────────────────────────────────
router.get(
  '/hackathons/:hackathonId/voting-config',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hackathonId } = req.params;
      const config = await voteService.getVotingConfig(hackathonId);
      res.json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
