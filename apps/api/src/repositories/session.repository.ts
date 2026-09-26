import { dbPool, checkDatabaseHealth } from '../config/database';

export interface SessionEntity {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  created_at: string;
  revoked_at?: string | null;
}

export class SessionRepository {
  private inMemorySessions: Map<string, SessionEntity> = new Map();

  async createSession(data: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      await dbPool.query(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [data.id, data.userId, data.tokenHash, data.expiresAt, data.ipAddress || null, data.userAgent || null]
      );
      return;
    }

    this.inMemorySessions.set(data.id, {
      id: data.id,
      user_id: data.userId,
      token_hash: data.tokenHash,
      expires_at: data.expiresAt,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      created_at: new Date().toISOString(),
      revoked_at: null
    });
  }

  async findActiveSession(id: string): Promise<SessionEntity | null> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      const res = await dbPool.query<SessionEntity>(
        `SELECT id, user_id, token_hash, ip_address, user_agent, expires_at, created_at, revoked_at
         FROM sessions
         WHERE id = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
        [id]
      );
      return res.rows[0] || null;
    }

    const session = this.inMemorySessions.get(id);
    if (!session) return null;
    if (session.revoked_at) return null;
    if (new Date(session.expires_at).getTime() <= Date.now()) return null;
    return session;
  }

  async revokeSession(id: string): Promise<void> {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      await dbPool.query(
        'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
      return;
    }

    const session = this.inMemorySessions.get(id);
    if (session) {
      session.revoked_at = new Date().toISOString();
    }
  }
}

export const sessionRepository = new SessionRepository();
