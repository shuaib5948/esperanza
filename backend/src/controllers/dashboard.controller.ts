import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { DashboardService } from '../services/dashboard.service.js';
import { ApiResponse } from '../utils/response.js';

export class DashboardController {
  static async getAdmin(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const stats = await DashboardService.getAdminDashboard();
      return ApiResponse.success(res, stats, 'Admin dashboard fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTeam(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teamId = req.query.team_id ? parseInt(req.query.team_id as string, 10) : (req.user?.teamId ?? undefined);
      const stats = await DashboardService.getTeamDashboard(req.user!.id, teamId);
      return ApiResponse.success(res, stats, 'Team dashboard fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getParticipant(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const stats = await DashboardService.getParticipantDashboard(req.user!.id);
      return ApiResponse.success(res, stats, 'Participant dashboard fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getJudge(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const stats = await DashboardService.getJudgeDashboard(req.user!.id);
      return ApiResponse.success(res, stats, 'Judge dashboard fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
