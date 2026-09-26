import { dbPool, checkDatabaseHealth } from '../config/database';

export interface AuditLogEntity {
  id?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export class AuditRepository {
  async logAuditEvent(data: AuditLogEntity): Promise<void> {
    try {
      const isDbConnected = await checkDatabaseHealth();
      if (isDbConnected) {
        await dbPool.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            data.userId || null,
            data.action,
            data.entityType,
            data.entityId || null,
            data.metadata ? JSON.stringify(data.metadata) : null,
            data.ipAddress || null,
          ]
        );
      }
    } catch (err) {
      console.error('[AUDIT-LOG] Failed to write audit event:', err);
    }
  }
}

export const auditRepository = new AuditRepository();
