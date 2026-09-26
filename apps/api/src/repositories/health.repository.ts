import { checkDatabaseHealth } from '../config/database';

export class HealthRepository {
  async isDatabaseHealthy(): Promise<boolean> {
    return checkDatabaseHealth();
  }
}

export const healthRepository = new HealthRepository();
