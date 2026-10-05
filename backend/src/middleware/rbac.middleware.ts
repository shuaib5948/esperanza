import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types/auth.types.js';
import { ApiResponse } from '../utils/response.js';

/**
 * Checks if authenticated user has one of the allowed roles
 */
export function authorizeRoles(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponse.error(res, 'AUTH_UNAUTHORIZED', 'Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        'AUTH_FORBIDDEN',
        `Access denied. Role ${req.user.role} does not have required permissions.`,
        403
      );
    }

    next();
  };
}

/**
 * Ensures Team Leader only queries or accesses data belonging to their own team
 */
export function enforceTeamIsolation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return ApiResponse.error(res, 'AUTH_UNAUTHORIZED', 'Authentication required', 401);
  }

  // Admin has unrestricted access across all teams
  if (req.user.role === 'ADMIN') {
    return next();
  }

  if (req.user.role === 'TEAM_LEADER') {
    const requestedTeamId = req.params.teamId || req.params.id || req.query.teamId;
    if (requestedTeamId && Number(requestedTeamId) !== req.user.teamId) {
      return ApiResponse.error(
        res,
        'TEAM_ACCESS_DENIED',
        'Team leaders are strictly restricted to their own team.',
        403
      );
    }
  }

  next();
}
