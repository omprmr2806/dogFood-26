import { describe, it, expect, vi } from 'vitest';
import { HealthService } from '../src/services/health.service';
import { HealthRepository } from '../src/repositories/health.repository';

describe('Database Connectivity & Health Check', () => {
  it('should report healthy when database check succeeds', async () => {
    const mockRepo: HealthRepository = {
      isDatabaseHealthy: vi.fn().mockResolvedValue(true)
    };

    const service = new HealthService(mockRepo);
    const health = await service.getHealthStatus();

    expect(health.status).toBe('ok');
    expect(health.services.database).toBe('healthy');
  });

  it('should report degraded when database is disconnected', async () => {
    const mockRepo: HealthRepository = {
      isDatabaseHealthy: vi.fn().mockResolvedValue(false)
    };

    const service = new HealthService(mockRepo);
    const health = await service.getHealthStatus();

    expect(health.status).toBe('degraded');
    expect(health.services.database).toBe('disconnected');
  });
});
