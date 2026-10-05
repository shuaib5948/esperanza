import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { ParticipantService } from '../services/participant.service.js';
import { ApiResponse } from '../utils/response.js';

export class ParticipantController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const filters: any = {
        teamId: req.query.teamId ? parseInt(req.query.teamId as string, 10) : undefined,
        categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined,
        search: req.query.search as string,
        status: req.query.status as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      };

      // Strict RBAC: Team Leaders are restricted to their team
      if (req.user?.role === 'TEAM_LEADER') {
        filters.teamId = req.user.teamId || -1;
      }

      const result = await ParticipantService.getAll(filters);
      return ApiResponse.success(res, result, 'Participants fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const participant = await ParticipantService.getById(id);

      // Security check for Team Leader & Participant
      if (req.user?.role === 'TEAM_LEADER' && participant.team_id !== req.user.teamId) {
        return ApiResponse.error(res, 'TEAM_ACCESS_DENIED', 'Cannot access participants from other teams', 403);
      }

      if (req.user?.role === 'PARTICIPANT' && participant.id !== req.user.participantId) {
        return ApiResponse.error(res, 'AUTH_FORBIDDEN', 'Cannot access other participants', 403);
      }

      return ApiResponse.success(res, participant, 'Participant fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      // If Team Leader is registering, force team_id to their own team
      if (req.user?.role === 'TEAM_LEADER') {
        req.body.team_id = req.user.teamId;
      }

      const participant = await ParticipantService.create({
        ...req.body,
        passwordPlain: req.body.password || 'Esperanza@2026',
        teamId: req.body.team_id,
        categoryId: req.body.category_id,
        registrationNumber: req.body.registration_number,
        photoUrl: req.body.photo_url,
        dateOfBirth: req.body.date_of_birth,
        className: req.body.class_name,
      });

      return ApiResponse.success(res, participant, 'Participant registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await ParticipantService.getById(id);

      if (req.user?.role === 'TEAM_LEADER' && existing.team_id !== req.user.teamId) {
        return ApiResponse.error(res, 'TEAM_ACCESS_DENIED', 'Cannot edit participants from other teams', 403);
      }

      if (req.user?.role === 'PARTICIPANT' && existing.id !== req.user.participantId) {
        return ApiResponse.error(res, 'AUTH_FORBIDDEN', 'Cannot edit other participants', 403);
      }

      const updated = await ParticipantService.update(id, req.body);
      return ApiResponse.success(res, updated, 'Participant updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      await ParticipantService.delete(id);
      return ApiResponse.success(res, null, 'Participant deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getRegistrations(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const participant = await ParticipantService.getById(id);

      if (req.user?.role === 'TEAM_LEADER' && participant.team_id !== req.user.teamId) {
        return ApiResponse.error(res, 'TEAM_ACCESS_DENIED', 'Cannot view registrations from other teams', 403);
      }

      if (req.user?.role === 'PARTICIPANT' && participant.id !== req.user.participantId) {
        return ApiResponse.error(res, 'AUTH_FORBIDDEN', 'Cannot view registrations of other participants', 403);
      }

      const regs = await ParticipantService.getRegistrations(id);
      return ApiResponse.success(res, regs, 'Registrations fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getResults(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const results = await ParticipantService.getResults(id);
      return ApiResponse.success(res, results, 'Participant results fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCertificates(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const certs = await ParticipantService.getCertificates(id);
      return ApiResponse.success(res, certs, 'Participant certificates fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
