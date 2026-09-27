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
  keyFn?: (req: Request) => string;
}) {
  const store = new Map<string, RateLimitRecord>();

  // Periodically sweep expired entries every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
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

    const defaultKey = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = options.keyFn ? options.keyFn(req) : defaultKey;
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
      store.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return next();
    }

    record.count += 1;
    if (record.count > options.maxRequests) {
      return next(
        new AppError(
          options.message || 'Too many requests. Please try again later.',
          429,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    next();
  };
}

// Auth: 10 attempts per 15 minutes (hardened for Phase 11)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) : 10,
  message: 'Too many login or registration attempts. Please wait 15 minutes before trying again.'
});

// Voting: 10 votes per minute per user (anti-abuse)
export const voteRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many voting actions. Please slow down.',
  keyFn: (req) => {
    // Key by authenticated user ID when available, fallback to IP
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    return userId ? `vote:user:${userId}` : `vote:ip:${req.ip || 'unknown'}`;
  }
});

// General API: 300 requests per minute per IP
export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'API rate limit exceeded. Please slow down.'
});
