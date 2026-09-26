import { Request, Response, NextFunction } from 'express';
import { healthService, HealthService } from '../services/health.service';

export class HealthController {
  constructor(private readonly service: HealthService = healthService) {}

  getHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await this.service.getHealthStatus();
      const statusCode = health.status === 'error' ? 503 : 200;
      res.status(statusCode).json(health);
    } catch (err) {
      next(err);
    }
  };
}

export const healthController = new HealthController();
