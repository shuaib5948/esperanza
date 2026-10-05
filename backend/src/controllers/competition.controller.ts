import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { CompetitionService } from '../services/competition.service.js';
import { ApiResponse } from '../utils/response.js';

export class CompetitionController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const filters = {
        programmeGroupId: req.query.programmeGroupId ? parseInt(req.query.programmeGroupId as string, 10) : undefined,
        programmeGroup: (req.query.group || req.query.programmeGroup || req.query.programmeGroupCode) as string,
        competitionTypeId: req.query.typeId ? parseInt(req.query.typeId as string, 10) : undefined,
        status: req.query.status as string,
        search: req.query.search as string,
      };

      const competitions = await CompetitionService.getAll(filters);
      return ApiResponse.success(res, competitions, 'Competitions fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const competition = await CompetitionService.getById(id);
      return ApiResponse.success(res, competition, 'Competition fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const competition = await CompetitionService.create(req.body);
      return ApiResponse.success(res, competition, 'Competition created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await CompetitionService.update(id, req.body);
      return ApiResponse.success(res, updated, 'Competition updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      await CompetitionService.delete(id);
      return ApiResponse.success(res, null, 'Competition deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async publish(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const comp = await CompetitionService.setStatus(id, 'PUBLISHED');
      return ApiResponse.success(res, comp, 'Competition published successfully');
    } catch (error) {
      next(error);
    }
  }

  static async openRegistration(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const comp = await CompetitionService.setStatus(id, 'ACTIVE');
      return ApiResponse.success(res, comp, 'Registration opened');
    } catch (error) {
      next(error);
    }
  }

  static async closeRegistration(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const comp = await CompetitionService.setStatus(id, 'CLOSED');
      return ApiResponse.success(res, comp, 'Registration closed');
    } catch (error) {
      next(error);
    }
  }

  static async lockAllRegistrations(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      await CompetitionService.lockAllRegistrations();
      return ApiResponse.success(res, null, 'All competition registrations locked successfully');
    } catch (error) {
      next(error);
    }
  }

  static async unlockAllRegistrations(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      await CompetitionService.unlockAllRegistrations();
      return ApiResponse.success(res, null, 'All competition registrations unlocked successfully');
    } catch (error) {
      next(error);
    }
  }

  // Eligibility
  static async getEligibility(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const eligibility = await CompetitionService.getEligibility(id);
      return ApiResponse.success(res, eligibility, 'Eligibility fetched');
    } catch (error) {
      next(error);
    }
  }

  static async setEligibility(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await CompetitionService.setEligibility(id, req.body.categoryIds);
      return ApiResponse.success(res, updated, 'Eligibility updated');
    } catch (error) {
      next(error);
    }
  }

  // Criteria
  static async getCriteria(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const criteria = await CompetitionService.getCriteria(id);
      return ApiResponse.success(res, criteria, 'Criteria fetched');
    } catch (error) {
      next(error);
    }
  }

  static async addCriterion(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const criterion = await CompetitionService.addCriterion(id, req.body);
      return ApiResponse.success(res, criterion, 'Criterion added', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateCriterion(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const cid = parseInt(req.params.criterionId, 10);
      const updated = await CompetitionService.updateCriterion(cid, req.body);
      return ApiResponse.success(res, updated, 'Criterion updated');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCriterion(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const cid = parseInt(req.params.criterionId, 10);
      await CompetitionService.deleteCriterion(cid);
      return ApiResponse.success(res, null, 'Criterion deleted');
    } catch (error) {
      next(error);
    }
  }

  static async getParticipants(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const participants = await CompetitionService.getParticipants(id);
      return ApiResponse.success(res, participants, 'Participants fetched');
    } catch (error) {
      next(error);
    }
  }

  static async getTypes(_req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const types = await CompetitionService.getTypes();
      return ApiResponse.success(res, types, 'Competition types fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
