import { Pool, PoolConfig } from 'pg';
import { env } from './env';

const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const dbPool = new Pool(poolConfig);

// Handle background errors on idle clients
dbPool.on('error', (err) => {
  console.error('[DB-POOL] Unexpected idle client error:', err.message);
});

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await dbPool.connect();
    try {
      const res = await client.query('SELECT 1 as healthy');
      return res.rows[0]?.healthy === 1;
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[DB-HEALTH] Database connectivity check failed:', message);
    return false;
  }
}
