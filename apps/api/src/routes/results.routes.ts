/**
 * DOGFOOD Phase 10: Results + Leaderboard Routes
 *
 * GET    /api/v1/hackathons/:id/results              — leaderboard (public if published)
 * POST   /api/v1/hackathons/:id/results/publish      — publish (ORGANIZER/ADMIN)
 * DELETE /api/v1/hackathons/:id/results/publish      — unpublish (ORGANIZER/ADMIN)
 * GET    /api/v1/hackathons/:id/results/export       — CSV/JSON export (ORGANIZER/ADMIN)
 * GET    /api/v1/hackathons/:id/audit-log            — audit log (ORGANIZER/ADMIN)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireOrganizer } from '../middleware/rbac.middleware';
import { UserRole } from '@dogfood/shared';
import { resultsService } from '../services/results.service';

const router = Router();

// ── get leaderboard / results ──────────────────────────────────────────────
router.get(
  '/hackathons/:hackathonId/results',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hackathonId } = req.params;
      const userRole = req.user!.role;
      const isOrganizer = [UserRole.ORGANIZER, UserRole.ADMIN].includes(userRole as UserRole);

      const results = await resultsService.getResults(hackathonId, isOrganizer);
      res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  },
);

// ── publish results ────────────────────────────────────────────────────────
router.post(
  '/hackathons/:hackathonId/results/publish',
  authenticate,
  requireOrganizer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hackathonId } = req.params;
      const publishedBy = req.user!.id;

      const results = await resultsService.publishResults(hackathonId, publishedBy);
      res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  },
);

// ── unpublish results ──────────────────────────────────────────────────────
router.delete(
  '/hackathons/:hackathonId/results/publish',
  authenticate,
  requireOrganizer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hackathonId } = req.params;
      const unpublishedBy = req.user!.id;

      const result = await resultsService.unpublishResults(hackathonId, unpublishedBy);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── export results ─────────────────────────────────────────────────────────
router.get(
  '/hackathons/:hackathonId/results/export',
  authenticate,
  requireOrganizer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hackathonId } = req.params;
      const format = (req.query.format as string) === 'csv' ? 'csv' : 'json';

      const exported = await resultsService.exportResults(hackathonId, format);

      const filename = `dogfood-results-${hackathonId}.${format}`;
      res.setHeader('Content-Type', exported.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exported.data);
    } catch (err) {
      next(err);
    }
  },
);

// ── audit log ─────────────────────────────────────────────────────────────
router.get(
  '/hackathons/:hackathonId/audit-log',
  authenticate,
  requireOrganizer,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hackathonId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

      const log = await resultsService.getAuditLog(hackathonId, page, limit);
      res.json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
