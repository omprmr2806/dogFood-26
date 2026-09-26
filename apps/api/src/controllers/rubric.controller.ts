import { Request, Response, NextFunction } from 'express';
import { rubricService } from '../services/rubric.service';

export class RubricController {
  // Get active rubric for hackathon
  async getActiveRubric(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const rubric = await rubricService.getActiveRubric(hackathonId);
      res.json({
        success: true,
        data: rubric
      });
    } catch (err) {
      next(err);
    }
  }

  // Create rubric
  async createRubric(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const actor = req.user!;
      const rubric = await rubricService.createRubric(actor.id, actor.role, hackathonId, req.body);
      res.status(201).json({
        success: true,
        data: rubric
      });
    } catch (err) {
      next(err);
    }
  }

  // Update rubric
  async updateRubric(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rubricId = req.params.id;
      const actor = req.user!;
      const rubric = await rubricService.updateRubric(actor.id, actor.role, rubricId, req.body);
      res.json({
        success: true,
        data: rubric
      });
    } catch (err) {
      next(err);
    }
  }

  // Get evaluation console for assignment
  async getEvaluationForAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignmentId = req.params.assignmentId;
      const actor = req.user!;
      const result = await rubricService.getEvaluationForAssignment(actor, assignmentId);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  // Save evaluation draft
  async saveEvaluationDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignmentId = req.params.assignmentId;
      const actor = req.user!;
      const evaluation = await rubricService.saveEvaluationDraft(actor, assignmentId, req.body);
      res.json({
        success: true,
        data: evaluation
      });
    } catch (err) {
      next(err);
    }
  }

  // Submit evaluation final
  async submitEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignmentId = req.params.assignmentId;
      const actor = req.user!;
      const evaluation = await rubricService.submitEvaluation(actor, assignmentId, req.body);
      res.json({
        success: true,
        data: evaluation
      });
    } catch (err) {
      next(err);
    }
  }

  // Unlock evaluation (organizer)
  async unlockEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignmentId = req.params.assignmentId;
      const actor = req.user!;
      const evaluation = await rubricService.unlockEvaluation(actor, assignmentId);
      res.json({
        success: true,
        data: evaluation
      });
    } catch (err) {
      next(err);
    }
  }

  // Organizer judging monitor
  async getJudgingMonitor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const actor = req.user!;
      const monitor = await rubricService.getOrganizerJudgingMonitor(actor, hackathonId);
      res.json({
        success: true,
        data: monitor
      });
    } catch (err) {
      next(err);
    }
  }
}

export const rubricController = new RubricController();
