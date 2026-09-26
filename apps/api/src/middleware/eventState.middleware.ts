import { Request, Response, NextFunction } from 'express';
import { HackathonStatus } from '@dogfood/shared';
import { hackathonRepository } from '../repositories/hackathon.repository';
import { AppError } from './errorHandler';

/**
 * Event State Guard Middleware
 * Validates that the event referenced by :id (UUID or slug) exists and is currently in one of the allowed lifecycle states.
 */
export function requireEventState(...allowedStates: HackathonStatus[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = req.params.id || req.params.hackathonId;
      if (!eventId) {
        return next(new AppError('Hackathon identifier parameter missing', 400, 'BAD_REQUEST'));
      }

      const hackathon = await hackathonRepository.findByIdOrSlug(eventId);
      if (!hackathon) {
        return next(new AppError('Hackathon not found', 404, 'HACKATHON_NOT_FOUND'));
      }

      if (!allowedStates.includes(hackathon.status)) {
        return next(
          new AppError(
            `Operation rejected: Hackathon "${hackathon.name}" is in state [${hackathon.status}]. Expected state: [${allowedStates.join(', ')}].`,
            400,
            'INVALID_EVENT_STATE',
            { currentStatus: hackathon.status, allowedStates }
          )
        );
      }

      // Attach resolved hackathon to request for downstream handlers to avoid redundant DB queries
      (req as unknown as { hackathon: typeof hackathon }).hackathon = hackathon;
      next();
    } catch (err) {
      next(err);
    }
  };
}
