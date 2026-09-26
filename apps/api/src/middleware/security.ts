import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import { env } from '../config/env';

export const helmetSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (like curl, server-to-server, unit tests)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
    if (allowedOrigins.includes(origin) || env.NODE_ENV === 'test') {
      return callback(null, true);
    }
    
    return callback(new Error(`CORS policy violation: Origin ${origin} not permitted`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

export const corsSecurity = cors(corsOptions);
