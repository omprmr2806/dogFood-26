import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://dogfood_user:dogfood_password@localhost:5432/dogfood_db';

export async function runMigrations() {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log('[MIGRATIONS] Checking schema_migrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('[MIGRATIONS] No migrations directory found.');
      return;
    }

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    for (const file of files) {
      const res = await client.query('SELECT 1 FROM schema_migrations WHERE migration_name = $1', [file]);
      if (res.rowCount === 0) {
        console.log(`[MIGRATIONS] Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
          await client.query('COMMIT');
          console.log(`[MIGRATIONS] Successfully applied: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`[MIGRATIONS] Failed to apply ${file}:`, err);
          throw err;
        }
      } else {
        console.log(`[MIGRATIONS] Skipping already applied: ${file}`);
      }
    }

    console.log('[MIGRATIONS] All migrations are up to date.');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations().catch((err) => {
    console.error('[MIGRATIONS] Error during migration execution:', err);
    process.exit(1);
  });
}
