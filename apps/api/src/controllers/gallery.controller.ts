import { Request, Response, NextFunction } from 'express';
import { submissionService } from '../services/submission.service';

export class GalleryController {
  async getGallery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { hackathonId, search, technology, page, limit } = req.query;

      const result = await submissionService.getGallery({
        hackathonId: hackathonId ? String(hackathonId) : undefined,
        search: search ? String(search) : undefined,
        technology: technology ? String(technology) : undefined,
        page: page ? parseInt(String(page), 10) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined
      });

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const project = await submissionService.getSubmissionById(id);

      res.json({
        success: true,
        data: project
      });
    } catch (err) {
      next(err);
    }
  }
}

export const galleryController = new GalleryController();
