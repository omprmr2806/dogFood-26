import { createApp } from './app';
import { env } from './config/env';
import { checkDatabaseHealth } from './config/database';

const app = createApp();

const server = app.listen(env.PORT, async () => {
  console.log(`[DOGFOOD-API] Server started successfully on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`[DOGFOOD-API] Base API route: http://localhost:${env.PORT}${env.API_PREFIX}`);
  
  const isDbHealthy = await checkDatabaseHealth();
  console.log(`[DOGFOOD-API] Database health status: ${isDbHealthy ? 'CONNECTED' : 'DISCONNECTED'}`);
});

// Graceful shutdown handling
function handleGracefulShutdown(signal: string) {
  console.log(`[DOGFOOD-API] Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('[DOGFOOD-API] HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
