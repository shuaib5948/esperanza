import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { RegistrationService } from '../services/registration.service.js';
import { ParticipantRepository } from '../repositories/participant.repository.js';
import { ApiResponse } from '../utils/response.js';

export class RegistrationController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const filters: any = {
        competitionId: req.query.competitionId ? parseInt(req.query.competitionId as string, 10) : undefined,
        participantId: req.query.participantId ? parseInt(req.query.participantId as string, 10) : undefined,
        teamId: req.query.teamId ? parseInt(req.query.teamId as string, 10) : undefined,
        status: req.query.status as string,
      };

      if (req.user?.role === 'TEAM_LEADER') {
        filters.teamId = req.user.teamId;
      } else if (req.user?.role === 'PARTICIPANT') {
        filters.participantId = req.user.participantId;
      }

      const registrations = await RegistrationService.getAll(filters);
      return ApiResponse.success(res, registrations, 'Registrations fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const reg = await RegistrationService.getById(id);

      if (req.user?.role === 'TEAM_LEADER' && reg.team_id !== req.user.teamId) {
        return ApiResponse.error(res, 'TEAM_ACCESS_DENIED', 'Cannot access registrations from other teams', 403);
      }

      if (req.user?.role === 'PARTICIPANT' && reg.participant_id !== req.user.participantId) {
        return ApiResponse.error(res, 'AUTH_FORBIDDEN', 'Cannot access other participants registrations', 403);
      }

      return ApiResponse.success(res, reg, 'Registration fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async register(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { competition_id, participant_id } = req.body;
      const user = req.user!;

      // Enforce authorization
      if (user.role === 'PARTICIPANT' && participant_id !== user.participantId) {
        return ApiResponse.error(res, 'AUTH_FORBIDDEN', 'Participants can only register for themselves', 403);
      }

      if (user.role === 'TEAM_LEADER') {
        const part = await ParticipantRepository.findById(participant_id);
        if (!part || part.team_id !== user.teamId) {
          return ApiResponse.error(res, 'TEAM_ACCESS_DENIED', 'Cannot register participants from other teams', 403);
        }
      }

      const isAdmin = user.role === 'ADMIN';
      const registration = await RegistrationService.register(competition_id, participant_id, user.id, isAdmin);
      return ApiResponse.success(res, registration, 'Registration submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await RegistrationService.updateStatus(id, 'ASSIGNED');
      return ApiResponse.success(res, updated, 'Registration assigned');
    } catch (error) {
      next(error);
    }
  }

  static async reject(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await RegistrationService.updateStatus(id, 'REMOVED');
      return ApiResponse.success(res, updated, 'Registration removed');
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await RegistrationService.getById(id);

      if (req.user?.role === 'PARTICIPANT' && existing.participant_id !== req.user.participantId) {
        return ApiResponse.error(res, 'AUTH_FORBIDDEN', 'Cannot cancel other registrations', 403);
      }

      const updated = await RegistrationService.cancel(id);
      return ApiResponse.success(res, updated, 'Registration cancelled');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      await RegistrationService.delete(id);
      return ApiResponse.success(res, null, 'Registration deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async checkConflicts(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { participantId, competitionId } = req.query;
      const conflicts = await RegistrationService.checkConflicts(
        parseInt(participantId as string, 10),
        parseInt(competitionId as string, 10)
      );
      return ApiResponse.success(res, { hasConflict: conflicts.length > 0, conflicts });
    } catch (error) {
      next(error);
    }
  }
}
