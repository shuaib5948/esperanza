import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { EntryService } from '../services/entry.service.js';
import { ParticipantRepository } from '../repositories/participant.repository.js';
import { CompetitionRepository } from '../repositories/competition.repository.js';
import { ApiResponse } from '../utils/response.js';

export class TeamLeaderController {
  /**
   * GET /api/v1/team-leader/participants
   * Returns list of participants strictly belonging to the authenticated team leader's team
   */
  static async getParticipants(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teamId = req.user?.teamId;
      if (!teamId) {
        return ApiResponse.error(res, 'TEAM_REQUIRED', 'Authenticated user does not have an associated festival team', 400);
      }

      const participants = await ParticipantRepository.findAll({ teamId, status: 'ACTIVE' });
      return ApiResponse.success(res, participants, 'Team roster fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/team-leader/participants/:id
   */
  static async getParticipantById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teamId = req.user?.teamId;
      const participantId = parseInt(req.params.id, 10);
      const participant = await ParticipantRepository.findById(participantId);

      if (!participant) {
        return ApiResponse.error(res, 'PARTICIPANT_NOT_FOUND', 'Participant not found', 404);
      }

      if (teamId && participant.team_id !== teamId && req.user?.role !== 'ADMIN') {
        return ApiResponse.error(res, 'TEAM_ACCESS_DENIED', 'Cannot access details of another team\'s participant', 403);
      }

      return ApiResponse.success(res, participant, 'Participant fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/team-leader/participants/:id/eligible-competitions
   * Returns only competitions that the participant is eligible for based on their category
   */
  static async getEligibleCompetitions(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teamId = req.user?.teamId;
      const participantId = parseInt(req.params.id, 10);
      const participant = await ParticipantRepository.findById(participantId);

      if (!participant) {
        return ApiResponse.error(res, 'PARTICIPANT_NOT_FOUND', 'Participant not found', 404);
      }

      if (teamId && participant.team_id !== teamId && req.user?.role !== 'ADMIN') {
        return ApiResponse.error(res, 'TEAM_ACCESS_DENIED', 'Cannot view competitions for another team\'s participant', 403);
      }

      const allCompetitions = await CompetitionRepository.findAll({ status: 'ACTIVE' });
      const eligible = allCompetitions.filter((c) =>
        EntryService.isCategoryEligibleForGroup(
          c.programme_group_code || c.group_code || '',
          participant.category_code
        )
      );

      return ApiResponse.success(res, eligible, 'Eligible competitions fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/team-leader/competitions/:competitionId/entries
   */
  static async getCompetitionEntries(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teamId = req.user?.teamId;
      if (!teamId && req.user?.role !== 'ADMIN') {
        return ApiResponse.error(res, 'TEAM_REQUIRED', 'Team association required', 400);
      }

      const competitionId = parseInt(req.params.competitionId, 10);
      const targetTeamId = teamId || (req.query.teamId ? parseInt(req.query.teamId as string, 10) : 0);
      const entries = await EntryService.getEntriesByCompetitionAndTeam(competitionId, targetTeamId);
      return ApiResponse.success(res, entries, 'Competition entries fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/team-leader/competitions/:competitionId/entries
   */
  static async createEntry(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teamId = req.user?.teamId;
      if (!teamId && req.user?.role !== 'ADMIN') {
        return ApiResponse.error(res, 'TEAM_REQUIRED', 'Team association required', 400);
      }

      const competitionId = parseInt(req.params.competitionId, 10);
      const participantIds = (req.body.participantIds || (req.body.participantId ? [req.body.participantId] : [])).map((id: any) => parseInt(id, 10));
      let targetTeamId = teamId || req.body.teamId;
      if (!targetTeamId && participantIds.length > 0) {
        const firstParticipant = await ParticipantRepository.findById(participantIds[0]);
        if (firstParticipant) {
          targetTeamId = firstParticipant.team_id;
        }
      }

      const entry = await EntryService.createEntry({
        competitionId,
        teamId: targetTeamId,
        participantIds,
        status: req.body.status,
      });

      return ApiResponse.success(res, entry, 'Competition entry created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/team-leader/entries/:entryId
   */
  static async getEntryById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const entryId = parseInt(req.params.entryId, 10);
      const teamId = req.user?.role === 'ADMIN' ? undefined : req.user?.teamId || undefined;
      const entry = await EntryService.getEntryById(entryId, teamId);
      return ApiResponse.success(res, entry, 'Entry fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/team-leader/entries/:entryId
   */
  static async deleteEntry(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const entryId = parseInt(req.params.entryId, 10);
      const teamId = req.user?.role === 'ADMIN' ? undefined : req.user?.teamId || undefined;
      await EntryService.deleteEntry(entryId, teamId);
      return ApiResponse.success(res, null, 'Entry deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/team-leader/entries/:entryId/participants
   */
  static async addParticipant(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const entryId = parseInt(req.params.entryId, 10);
      const participantId = parseInt(req.body.participantId || req.body.participant_id, 10);
      const teamId = req.user?.role === 'ADMIN' ? undefined : req.user?.teamId || undefined;

      await EntryService.addParticipantToEntry({
        entryId,
        participantId,
        authorizedTeamId: teamId,
      });

      const updatedEntry = await EntryService.getEntryById(entryId, teamId);
      return ApiResponse.success(res, updatedEntry, 'Participant added to entry successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/team-leader/entries/:entryId/participants/:participantId
   */
  static async removeParticipant(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const entryId = parseInt(req.params.entryId, 10);
      const participantId = parseInt(req.params.participantId, 10);
      const teamId = req.user?.role === 'ADMIN' ? undefined : req.user?.teamId || undefined;

      await EntryService.removeParticipantFromEntry({
        entryId,
        participantId,
        authorizedTeamId: teamId,
      });

      return ApiResponse.success(res, null, 'Participant removed from entry successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/team-leader/entries/:entryId/participants/:participantId/attendance
   */
  static async updateAttendance(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const entryId = parseInt(req.params.entryId, 10);
      const participantId = parseInt(req.params.participantId, 10);
      const status = req.body.status || req.body.attendance_status;
      const teamId = req.user?.role === 'ADMIN' ? undefined : req.user?.teamId || undefined;

      await EntryService.updateAttendance({
        entryId,
        participantId,
        status,
        authorizedTeamId: teamId,
      });

      return ApiResponse.success(res, null, 'Attendance updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
