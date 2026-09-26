import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const ipMap = new Map<string, RateLimitRecord>();

  // Periodically sweep expired entries every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipMap.entries()) {
      if (now > record.resetTime) {
        ipMap.delete(ip);
      }
    }
  }, 120000);

  // Unref timer so it does not block Node process exit in tests
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, _res: Response, next: NextFunction): void => {
    // Skip in test environment unless explicitly testing rate limits
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const record = ipMap.get(ip);

    if (!record || now > record.resetTime) {
      ipMap.set(ip, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return next();
    }

    record.count += 1;
    if (record.count > options.maxRequests) {
      return next(
        new AppError(
          options.message || 'Too many authentication attempts. Please try again later.',
          429,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,     // 10 requests per minute
  message: 'Too many login or registration attempts. Please wait a minute before trying again.'
});
