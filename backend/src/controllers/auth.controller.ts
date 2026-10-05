import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/response.js';

export class AuthController {
  static async login(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refresh(refreshToken);
      return ApiResponse.success(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      if (!req.user) {
        return ApiResponse.error(res, 'AUTH_UNAUTHORIZED', 'Not authenticated', 401);
      }
      const profile = await AuthService.getMe(req.user.id);
      return ApiResponse.success(res, profile, 'Profile fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      if (!req.user) {
        return ApiResponse.error(res, 'AUTH_UNAUTHORIZED', 'Not authenticated', 401);
      }
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user.id, currentPassword, newPassword);
      return ApiResponse.success(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async logout(_req: AuthenticatedRequest, res: Response) {
    return ApiResponse.success(res, null, 'Logged out successfully');
  }
}
