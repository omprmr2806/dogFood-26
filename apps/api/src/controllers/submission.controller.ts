import { Request, Response, NextFunction } from 'express';
import { submissionService } from '../services/submission.service';

export class SubmissionController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const userId = req.user!.id;
      const submission = await submissionService.createSubmission(
        userId,
        hackathonId,
        req.body,
        req.ip
      );

      res.status(201).json({
        success: true,
        data: submission
      });
    } catch (err) {
      next(err);
    }
  }

  async getMySubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const userId = req.user!.id;
      const submission = await submissionService.getMySubmission(userId, hackathonId);

      res.json({
        success: true,
        data: submission
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hackathonId = req.params.id;
      const user = req.user ? { id: req.user.id, role: req.user.role } : undefined;
      const submissions = await submissionService.getHackathonSubmissions(hackathonId, user);

      res.json({
        success: true,
        data: submissions
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user ? { id: req.user.id, role: req.user.role } : undefined;
      const submission = await submissionService.getSubmissionById(id, user);

      res.json({
        success: true,
        data: submission
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const updated = await submissionService.updateSubmission(
        id,
        userId,
        userRole,
        req.body,
        req.ip
      );

      res.json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const submitted = await submissionService.submitSubmission(
        id,
        userId,
        userRole,
        req.ip
      );

      res.json({
        success: true,
        data: submitted
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminUserId = req.user!.id;
      const { status } = req.body;
      const updated = await submissionService.updateSubmissionStatus(
        id,
        status,
        adminUserId,
        req.ip
      );

      res.json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
}

export const submissionController = new SubmissionController();
