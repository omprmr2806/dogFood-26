import { Request, Response, NextFunction } from 'express';
import { hackathonService, HackathonService } from '../services/hackathon.service';

export class HackathonController {
  constructor(private readonly service: HackathonService = hackathonService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hackathon = await this.service.createHackathon(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        data: { hackathon },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hackathons = await this.service.getHackathons(req.user?.role);
      res.status(200).json({
        success: true,
        data: { hackathons },
        meta: { count: hackathons.length, timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  getByIdOrSlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hackathon = await this.service.getHackathonByIdOrSlug(req.params.id, req.user?.role);
      res.status(200).json({
        success: true,
        data: { hackathon },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hackathon = await this.service.updateHackathon(req.params.id, req.body, req.user!.id);
      res.status(200).json({
        success: true,
        data: { hackathon },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  transition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { targetStatus, reason } = req.body;
      const hackathon = await this.service.transitionStatus(
        req.params.id,
        targetStatus,
        reason,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        data: { hackathon },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };
}

export const hackathonController = new HackathonController();
