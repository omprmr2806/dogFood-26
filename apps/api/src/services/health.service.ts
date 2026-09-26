import { healthRepository, HealthRepository } from '../repositories/health.repository';
import { HealthCheckResponse } from '@dogfood/shared';

export class HealthService {
  constructor(private readonly repo: HealthRepository = healthRepository) {}

  async getHealthStatus(): Promise<HealthCheckResponse> {
    const isDbConnected = await this.repo.isDatabaseHealthy();

    return {
      status: isDbConnected ? 'ok' : 'degraded',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        database: isDbConnected ? 'healthy' : 'disconnected'
      }
    };
  }
}

export const healthService = new HealthService();
