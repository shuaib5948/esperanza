import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { JudgingService } from '../services/judging.service.js';
import { ApiResponse } from '../utils/response.js';

export class JudgeController {
  static async getAllJudges(_req: any, res: Response, next: any) {
    try {
      const judges = await JudgingService.getAllJudges();
      return ApiResponse.success(res, judges, 'Judges fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getJudgeById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const judge = await JudgingService.getJudgeById(id);
      return ApiResponse.success(res, judge, 'Judge fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createJudge(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const judge = await JudgingService.createJudge(req.body);
      return ApiResponse.success(res, judge, 'Judge profile created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async assignJudge(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const competitionId = parseInt(req.params.id, 10);
      const { judge_id } = req.body;
      await JudgingService.assignJudge(competitionId, judge_id, req.user!.id);
      return ApiResponse.success(res, null, 'Judge assigned to competition successfully');
    } catch (error) {
      next(error);
    }
  }

  static async removeJudge(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const competitionId = parseInt(req.params.id, 10);
      const judgeId = parseInt(req.params.judgeId, 10);
      await JudgingService.removeJudge(competitionId, judgeId);
      return ApiResponse.success(res, null, 'Judge assignment removed');
    } catch (error) {
      next(error);
    }
  }

  static async getCompetitionJudges(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const competitionId = parseInt(req.params.id, 10);
      const judges = await JudgingService.getAssignedJudgesForCompetition(competitionId);
      return ApiResponse.success(res, judges, 'Competition judges fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  // Judge Portal APIs (/api/v1/judge/*)
  static async getMyCompetitions(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const judgeId = req.user?.judgeId;
      if (!judgeId) {
        return ApiResponse.error(res, 'JUDGE_NOT_FOUND', 'Logged in user is not registered as a judge', 403);
      }

      const competitions = await JudgingService.getAssignedCompetitions(judgeId);
      return ApiResponse.success(res, competitions, 'Assigned competitions fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getParticipantsForCompetition(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const judgeId = req.user?.judgeId;
      if (!judgeId) {
        return ApiResponse.error(res, 'JUDGE_NOT_FOUND', 'Logged in user is not registered as a judge', 403);
      }

      const compId = parseInt(req.params.id, 10);
      const participants = await JudgingService.getParticipantsForJudge(compId, judgeId);
      return ApiResponse.success(res, participants, 'Participants fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getScoreSheet(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const judgeId = req.user?.judgeId;
      if (!judgeId) {
        return ApiResponse.error(res, 'JUDGE_NOT_FOUND', 'Logged in user is not registered as a judge', 403);
      }

      const compId = parseInt(req.params.id, 10);
      const partId = parseInt(req.params.participantId, 10);
      const sheet = await JudgingService.getScoreSheet(compId, partId, judgeId);
      return ApiResponse.success(res, sheet, 'Score sheet fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getFullScoreSheet(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const judgeId = req.user?.judgeId;
      if (!judgeId) {
        return ApiResponse.error(res, 'JUDGE_NOT_FOUND', 'Logged in user is not registered as a judge', 403);
      }

      const compId = parseInt(req.params.id, 10);
      const data = await JudgingService.getFullScoreSheet(compId, judgeId);
      return ApiResponse.success(res, data, 'Full score sheet fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async saveScores(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const judgeId = req.user?.judgeId;
      if (!judgeId) {
        return ApiResponse.error(res, 'JUDGE_NOT_FOUND', 'Logged in user is not registered as a judge', 403);
      }

      const compId = parseInt(req.params.id, 10);
      const { participant_id, marks, remarks, scores, is_draft } = req.body;
      const result = await JudgingService.saveScores(compId, participant_id, judgeId, { marks, remarks, scores }, is_draft);
      return ApiResponse.success(res, result, is_draft ? 'Score draft saved' : 'Scores submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async saveBulkScores(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const judgeId = req.user?.judgeId;
      if (!judgeId) {
        return ApiResponse.error(res, 'JUDGE_NOT_FOUND', 'Logged in user is not registered as a judge', 403);
      }

      const compId = parseInt(req.params.id, 10);
      const { items, is_draft } = req.body;
      const result = await JudgingService.saveBulkScores(compId, judgeId, items, is_draft);
      return ApiResponse.success(res, result, is_draft ? 'All draft scores saved' : 'All scores officially locked');
    } catch (error) {
      next(error);
    }
  }

  static async submitScoreSheet(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const judgeId = req.user?.judgeId;
      if (!judgeId) {
        return ApiResponse.error(res, 'JUDGE_NOT_FOUND', 'Logged in user is not registered as a judge', 403);
      }

      const sheetId = parseInt(req.params.sheetId, 10);
      const result = await JudgingService.submitScoreSheet(sheetId, judgeId);
      return ApiResponse.success(res, result, 'Score sheet locked and submitted');
    } catch (error) {
      next(error);
    }
  }

  static async unlockScoreSheet(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const sheetId = parseInt(req.params.sheetId, 10);
      const { reason } = req.body;
      const result = await JudgingService.unlockScoreSheet(sheetId, req.user!.id, reason);
      return ApiResponse.success(res, result, 'Score sheet unlocked successfully');
    } catch (error) {
      next(error);
    }
  }
}
