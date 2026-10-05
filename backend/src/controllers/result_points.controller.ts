import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { ResultService, PointsService } from '../services/result_points.service.js';
import { ApiResponse } from '../utils/response.js';

export class ResultController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const filters = {
        competitionId: req.query.competitionId ? parseInt(req.query.competitionId as string, 10) : undefined,
        teamId: req.query.teamId ? parseInt(req.query.teamId as string, 10) : undefined,
        status: req.query.status as string,
      };

      // Non-admins can only see published results
      if (!req.user || req.user.role !== 'ADMIN') {
        filters.status = 'PUBLISHED';
      }

      const results = await ResultService.getAll(filters);
      return ApiResponse.success(res, results, 'Results fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await ResultService.getById(id);

      if ((!req.user || req.user.role !== 'ADMIN') && result.status !== 'PUBLISHED') {
        return ApiResponse.error(res, 'RESULT_NOT_PUBLISHED', 'Result is not published yet', 403);
      }

      return ApiResponse.success(res, result, 'Result fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getByCompetition(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const results = await ResultService.getByCompetition(compId);
      return ApiResponse.success(res, results, 'Competition results fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCompetitionJudgeScores(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const scores = await ResultService.getJudgeScoresByCompetition(compId);
      return ApiResponse.success(res, scores, 'Competition judge scores fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async generate(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const method = req.body.calculation_method || 'AVERAGE';
      const results = await ResultService.generateResults(compId, method);
      return ApiResponse.success(res, results, 'Results generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async verify(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const verified = await ResultService.verify(id, req.user!.id);
      return ApiResponse.success(res, verified, 'Result verified successfully');
    } catch (error) {
      next(error);
    }
  }

  static async publish(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const published = await ResultService.publish(id, req.user!.id);
      return ApiResponse.success(res, published, 'Result published and team points allocated');
    } catch (error) {
      next(error);
    }
  }

  static async publishCompetition(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const results = await ResultService.publishCompetition(compId, req.user!.id);
      return ApiResponse.success(res, results, 'All competition results published and points allocated to leaderboard');
    } catch (error) {
      next(error);
    }
  }

  static async unpublish(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const unpublished = await ResultService.unpublish(id, req.user!.id);
      return ApiResponse.success(res, unpublished, 'Result unpublished and team points rolled back');
    } catch (error) {
      next(error);
    }
  }

  static async unpublishCompetition(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const results = await ResultService.unpublishCompetition(compId, req.user!.id);
      return ApiResponse.success(res, results, 'All competition results unpublished and points rolled back');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await ResultService.update(id, req.body);
      return ApiResponse.success(res, updated, 'Result updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async evaluate(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const result = await ResultService.startEvaluation(compId, req.user!.id);
      return ApiResponse.success(res, result, 'Competition sent to judges for evaluation');
    } catch (error) {
      next(error);
    }
  }
}

export class PointsController {
  static async getRules(_req: any, res: Response, next: any) {
    try {
      const rules = await PointsService.getRules();
      return ApiResponse.success(res, rules, 'Point rules fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createRule(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const rule = await PointsService.createRule(req.body);
      return ApiResponse.success(res, rule, 'Point rule created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateRule(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await PointsService.updateRule(id, req.body);
      return ApiResponse.success(res, updated, 'Point rule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getLeaderboard(_req: any, res: Response, next: any) {
    try {
      const leaderboard = await PointsService.getLeaderboard();
      return ApiResponse.success(res, leaderboard, 'Live Leaderboard fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTeamBreakdown(_req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const breakdown = await PointsService.getAdminTeamBreakdown();
      return ApiResponse.success(res, breakdown, 'Admin Team Breakdown fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getIndividualLeaderboard(_req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const individual = await PointsService.getAdminIndividualLeaderboard();
      return ApiResponse.success(res, individual, 'Admin Individual Leaderboard fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPointsLog(_req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const log = await PointsService.getPointsLog();
      return ApiResponse.success(res, log, 'Points log fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async recalculatePoints(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const result = await PointsService.recalculatePoints(req.user!.id);
      return ApiResponse.success(res, result, 'Points synchronized and recalculated successfully');
    } catch (error) {
      next(error);
    }
  }
}
