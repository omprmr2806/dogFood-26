import { Request, Response, NextFunction } from 'express';
import { judgeService } from '../services/judge.service';

export class JudgeController {
  // List judges for hackathon
  async listJudges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const judges = await judgeService.listJudges(hackathonId);
      res.json({
        success: true,
        data: judges
      });
    } catch (err) {
      next(err);
    }
  }

  // List available system judges for enrollment
  async getAvailableJudges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const available = await judgeService.getAvailableJudges(hackathonId);
      res.json({
        success: true,
        data: available
      });
    } catch (err) {
      next(err);
    }
  }

  // Add judge to hackathon
  async addJudge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const actorId = req.user!.id;
      const judge = await judgeService.addJudge(hackathonId, req.body, actorId, req.ip);
      res.status(201).json({
        success: true,
        data: judge
      });
    } catch (err) {
      next(err);
    }
  }

  // Update judge status
  async updateJudgeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, judgeId } = req.params;
      const actorId = req.user!.id;
      const updated = await judgeService.updateJudgeStatus(id, judgeId, req.body, actorId, req.ip);
      res.json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  // Remove judge from hackathon
  async removeJudge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, judgeId } = req.params;
      const actorId = req.user!.id;
      await judgeService.removeJudge(id, judgeId, actorId, req.ip);
      res.json({
        success: true,
        message: 'Judge successfully removed from hackathon.'
      });
    } catch (err) {
      next(err);
    }
  }

  // Get judging config
  async getJudgingConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const config = await judgeService.getJudgingConfig(hackathonId);
      res.json({
        success: true,
        data: config
      });
    } catch (err) {
      next(err);
    }
  }

  // Update judging config
  async updateJudgingConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const actorId = req.user!.id;
      const updated = await judgeService.updateJudgingConfig(hackathonId, req.body, actorId, req.ip);
      res.json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  // List conflicts
  async listConflicts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const conflicts = await judgeService.listConflicts(hackathonId);
      res.json({
        success: true,
        data: conflicts
      });
    } catch (err) {
      next(err);
    }
  }

  // Declare conflict
  async declareConflict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const actorId = req.user!.id;
      const conflict = await judgeService.declareConflict(hackathonId, req.body, actorId, req.ip);
      res.status(201).json({
        success: true,
        data: conflict
      });
    } catch (err) {
      next(err);
    }
  }

  // Remove conflict
  async removeConflict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, conflictId } = req.params;
      const actorId = req.user!.id;
      await judgeService.removeConflict(id, conflictId, actorId, req.ip);
      res.json({
        success: true,
        message: 'Conflict record removed.'
      });
    } catch (err) {
      next(err);
    }
  }

  // Preview assignments
  async previewAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const actorId = req.user!.id;
      const preview = await judgeService.generateAssignmentPreview(hackathonId, req.body, actorId, req.ip);
      res.json({
        success: true,
        data: preview
      });
    } catch (err) {
      next(err);
    }
  }

  // Finalize assignments
  async finalizeAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const actorId = req.user!.id;
      const result = await judgeService.finalizeAssignments(hackathonId, req.body, actorId, req.ip);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  // List all assignments for organizer
  async listAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const role = req.user!.role;
      const assignments = await judgeService.listAssignmentsForHackathon(hackathonId, role);
      res.json({
        success: true,
        data: assignments
      });
    } catch (err) {
      next(err);
    }
  }

  // Judge: List my assignments
  async getMyAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const userId = req.user!.id;
      const result = await judgeService.getMyJudgeAssignments(hackathonId, userId);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  // Judge: Get specific assigned submission detail
  async getMyAssignmentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, assignmentId } = req.params;
      const userId = req.user!.id;
      const assignment = await judgeService.getMyAssignmentDetail(id, assignmentId, userId);
      res.json({
        success: true,
        data: assignment
      });
    } catch (err) {
      next(err);
    }
  }
}

export const judgeController = new JudgeController();
