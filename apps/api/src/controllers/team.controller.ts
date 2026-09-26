import { Request, Response, NextFunction } from 'express';
import { teamService, TeamService } from '../services/team.service';

export class TeamController {
  constructor(private readonly service: TeamService = teamService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const team = await this.service.createTeam(
        req.params.id,
        req.body.name,
        req.user!.id
      );
      res.status(201).json({
        success: true,
        data: { team },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const teams = await this.service.getTeamsByHackathon(req.params.id);
      res.status(200).json({
        success: true,
        data: { teams },
        meta: { count: teams.length, timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const team = await this.service.getTeamById(
        req.params.id,
        req.params.teamId,
        req.user
      );
      res.status(200).json({
        success: true,
        data: { team },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  getMyTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const team = await this.service.getMyTeam(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        data: { team },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const team = await this.service.updateTeamName(
        req.params.id,
        req.params.teamId,
        req.body.name,
        req.user!
      );
      res.status(200).json({
        success: true,
        data: { team },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  disband = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.disbandTeam(
        req.params.id,
        req.params.teamId,
        req.user!
      );
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  join = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const team = await this.service.joinTeam(
        req.params.id,
        req.params.teamId,
        req.body.inviteCode,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        data: { team },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.removeMember(
        req.params.id,
        req.params.teamId,
        req.params.userId,
        req.user!
      );
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  leave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.leaveTeam(
        req.params.id,
        req.params.teamId,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  regenerateInviteCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.regenerateInviteCode(
        req.params.id,
        req.params.teamId,
        req.user!
      );
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };
}

export const teamController = new TeamController();
