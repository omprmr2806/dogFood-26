import { Request, Response, NextFunction } from 'express';
import { registrationService, RegistrationService } from '../services/registration.service';

export class RegistrationController {
  constructor(private readonly service: RegistrationService = registrationService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registration = await this.service.registerParticipant(
        req.params.id,
        req.user!.id
      );
      res.status(201).json({
        success: true,
        data: { registration },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  getMyRegistration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registration = await this.service.getParticipantRegistration(
        req.params.id,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        data: { registration },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  listRegistrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registrations = await this.service.getHackathonRegistrations(req.params.id);
      res.status(200).json({
        success: true,
        data: { registrations },
        meta: { count: registrations.length, timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registration = await this.service.updateRegistrationStatus(
        req.params.id,
        req.params.registrationId,
        req.body.status,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        data: { registration },
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (err) {
      next(err);
    }
  };
}

export const registrationController = new RegistrationController();
