import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserPayload } from '../types/auth.types.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { ApiResponse } from '../utils/response.js';

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, 'AUTH_UNAUTHORIZED', 'Missing or invalid Authorization header', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return ApiResponse.error(res, 'AUTH_UNAUTHORIZED', 'Invalid or expired access token', 401);
  }
}

export function optionalAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
  } catch (error) {
    // Silently continue without user context for optional auth
  }
  next();
}
