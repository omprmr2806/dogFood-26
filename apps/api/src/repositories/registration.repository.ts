import { dbPool, checkDatabaseHealth } from '../config/database';
import { RegistrationStatus } from '@dogfood/shared';
import { userRepository } from './user.repository';
import crypto from 'crypto';

export interface RegistrationEntity {
  id: string;
  hackathon_id: string;
  user_id: string;
  status: RegistrationStatus;
  registered_at: string;
  updated_at: string;
}

export interface RegistrationWithUserEntity extends RegistrationEntity {
  user_email: string;
  user_full_name: string;
}

export class RegistrationRepository {
  private inMemoryRegistrations: Map<string, RegistrationEntity> = new Map();

  constructor() {
    this.seedInMemoryDefaults();
  }

  private seedInMemoryDefaults() {
    const demos: RegistrationEntity[] = [
      {
        id: '20000000-0000-0000-0000-000000000001',
        hackathon_id: '10000000-0000-0000-0000-000000000002', // dogfood-alpha-2026
        user_id: '00000000-0000-0000-0000-000000000004',      // participant
        status: RegistrationStatus.ACCEPTED,
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        hackathon_id: '10000000-0000-0000-0000-000000000003', // cloud-systems-2026
        user_id: '00000000-0000-0000-0000-000000000004',      // participant
        status: RegistrationStatus.ACCEPTED,
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const d of demos) {
      this.inMemoryRegistrations.set(d.id, d);
    }
  }

  async create(data: {
    hackathonId: string;
    userId: string;
    status?: RegistrationStatus;
  }): Promise<RegistrationEntity> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<RegistrationEntity>(
        `INSERT INTO registrations (hackathon_id, user_id, status)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.hackathonId, data.userId, data.status || RegistrationStatus.ACCEPTED]
      );
      return res.rows[0];
    }

    const newReg: RegistrationEntity = {
      id: crypto.randomUUID(),
      hackathon_id: data.hackathonId,
      user_id: data.userId,
      status: data.status || RegistrationStatus.ACCEPTED,
      registered_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.inMemoryRegistrations.set(newReg.id, newReg);
    return newReg;
  }

  async findByUserAndHackathon(userId: string, hackathonId: string): Promise<RegistrationEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<RegistrationEntity>(
        'SELECT * FROM registrations WHERE user_id = $1 AND hackathon_id = $2',
        [userId, hackathonId]
      );
      return res.rows[0] || null;
    }

    for (const reg of this.inMemoryRegistrations.values()) {
      if (reg.user_id === userId && reg.hackathon_id === hackathonId) {
        return reg;
      }
    }
    return null;
  }

  async findById(id: string): Promise<RegistrationEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<RegistrationEntity>(
        'SELECT * FROM registrations WHERE id = $1',
        [id]
      );
      return res.rows[0] || null;
    }
    return this.inMemoryRegistrations.get(id) || null;
  }

  async findByHackathonId(hackathonId: string): Promise<RegistrationWithUserEntity[]> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<RegistrationWithUserEntity>(
        `SELECT r.*, u.email as user_email, u.full_name as user_full_name
         FROM registrations r
         JOIN users u ON r.user_id = u.id
         WHERE r.hackathon_id = $1
         ORDER BY r.registered_at DESC`,
        [hackathonId]
      );
      return res.rows;
    }

    const list: RegistrationWithUserEntity[] = [];
    for (const reg of this.inMemoryRegistrations.values()) {
      if (reg.hackathon_id === hackathonId) {
        const u = await userRepository.findById(reg.user_id);
        list.push({
          ...reg,
          user_email: u ? u.email : 'participant@dogfood.local',
          user_full_name: u ? u.full_name : 'Hackathon Participant'
        });
      }
    }
    return list;
  }

  async countByHackathonId(hackathonId: string): Promise<number> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM registrations WHERE hackathon_id = $1',
        [hackathonId]
      );
      return parseInt(res.rows[0]?.count || '0', 10);
    }

    let count = 0;
    for (const reg of this.inMemoryRegistrations.values()) {
      if (reg.hackathon_id === hackathonId) count++;
    }
    return count;
  }

  async updateStatus(id: string, status: RegistrationStatus): Promise<RegistrationEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<RegistrationEntity>(
        'UPDATE registrations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      return res.rows[0] || null;
    }

    const existing = this.inMemoryRegistrations.get(id);
    if (!existing) return null;

    existing.status = status;
    existing.updated_at = new Date().toISOString();
    return existing;
  }
}

export const registrationRepository = new RegistrationRepository();
