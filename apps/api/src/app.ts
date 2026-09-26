import express, { Application } from 'express';
import { env } from './config/env';
import { helmetSecurity, corsSecurity } from './middleware/security';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';

export function createApp(): Application {
  const app = express();

  // Trust proxy for secure headers behind Docker/reverse proxies
  app.set('trust proxy', 1);

  // Security headers & CORS
  app.use(helmetSecurity);
  app.use(corsSecurity);

  // Request size limit & JSON parser
  app.use(express.json({ limit: env.BODY_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.BODY_SIZE_LIMIT }));

  // Request logging
  app.use(requestLogger);

  // Mount API Router
  app.use(env.API_PREFIX, apiRouter);

  // Fallback 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
