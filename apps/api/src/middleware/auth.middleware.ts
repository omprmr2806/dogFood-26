import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../auth/session';
import { sessionRepository } from '../repositories/session.repository';
import { AppError } from './errorHandler';
import { UserRole } from '@dogfood/shared';

export interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export function extractToken(req: Request): string | null {
  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies.dogfood_session) {
    return req.cookies.dogfood_session;
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError('Authentication required. Please sign in.', 401, 'UNAUTHENTICATED');
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      throw new AppError('Invalid or expired session token.', 401, 'INVALID_TOKEN');
    }

    // Verify session has not been revoked on the server
    const activeSession = await sessionRepository.findActiveSession(payload.sessionId);
    if (!activeSession) {
      throw new AppError('Session has expired or was revoked. Please sign in again.', 401, 'SESSION_REVOKED');
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId
    };

    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return next();
    }

    const activeSession = await sessionRepository.findActiveSession(payload.sessionId);
    if (!activeSession) {
      return next();
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId
    };

    next();
  } catch (_err) {
    next();
  }
}
