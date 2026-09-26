import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local workspace if present
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Database Configuration
  DATABASE_URL: z.string().default('postgres://dogfood_user:dogfood_password@localhost:5432/dogfood_db'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('dogfood_db'),
  DB_USER: z.string().default('dogfood_user'),
  DB_PASSWORD: z.string().default('dogfood_password'),
  
  // Security & Limits
  JWT_SECRET: z.string().min(16).default('dogfood_local_dev_secret_key_minimum_32_characters_long'),
  BODY_SIZE_LIMIT: z.string().default('100kb')
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.format();
    console.error('CRITICAL: Environment validation failed:');
    console.error(JSON.stringify(errorDetails, null, 2));
    throw new Error('Environment configuration validation failure');
  }
  return result.data;
}

export const env = loadEnv();
