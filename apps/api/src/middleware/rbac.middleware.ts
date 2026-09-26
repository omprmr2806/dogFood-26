import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@dogfood/shared';
import { AppError } from './errorHandler';

/**
 * RBAC Role Guard Middleware
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Must be preceded by authenticate middleware.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required prior to authorization check.', 401, 'UNAUTHENTICATED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: requires one of roles [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireOrganizer = requireRole(UserRole.ADMIN, UserRole.ORGANIZER);
export const requireJudge = requireRole(UserRole.ADMIN, UserRole.JUDGE);
export const requireParticipant = requireRole(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.JUDGE, UserRole.PARTICIPANT);
