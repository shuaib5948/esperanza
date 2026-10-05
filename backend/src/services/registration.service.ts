import { RegistrationRepository } from '../repositories/registration.repository.js';
import { ParticipantRepository } from '../repositories/participant.repository.js';
import { CompetitionRepository } from '../repositories/competition.repository.js';
import { ScheduleRepository } from '../repositories/venue_schedule.repository.js';
import { query } from '../database/connection.js';

export class RegistrationService {
  static async getAll(filters: any) {
    return RegistrationRepository.findAll(filters);
  }

  static async getById(id: number) {
    const reg = await RegistrationRepository.findById(id);
    if (!reg) {
      throw { statusCode: 404, code: 'REGISTRATION_NOT_FOUND', message: 'Registration not found' };
    }
    return reg;
  }

  /**
   * Registers a participant for a competition with rigorous server-side validation
   */
  static async register(competitionId: number, participantId: number, registeredByUserId: number, isAdminOverride = false) {
    // 1. Participant exists
    const participant = await ParticipantRepository.findById(participantId);
    if (!participant) {
      throw { statusCode: 404, code: 'PARTICIPANT_NOT_FOUND', message: 'Participant not found' };
    }

    // 2. Participant is active
    if (participant.status !== 'ACTIVE') {
      throw { statusCode: 400, code: 'PARTICIPANT_INACTIVE', message: 'Participant account is inactive' };
    }

    // 3. Competition exists
    const competition = await CompetitionRepository.findById(competitionId);
    if (!competition) {
      throw { statusCode: 404, code: 'COMPETITION_NOT_FOUND', message: 'Competition not found' };
    }

    // 4. Registration is open (unless admin override)
    if (!isAdminOverride && competition.status !== 'ACTIVE') {
      throw { statusCode: 400, code: 'REGISTRATION_CLOSED', message: `Registration is currently ${competition.status.toLowerCase()}` };
    }

    // 5. Category eligibility check
    const eligibility = await CompetitionRepository.getEligibility(competitionId);
    const eligibleCategoryIds = eligibility.map((e: any) => e.participant_category_id);
    if (eligibleCategoryIds.length > 0 && !eligibleCategoryIds.includes(participant.category_id)) {
      throw {
        statusCode: 400,
        code: 'CATEGORY_NOT_ELIGIBLE',
        message: `Participant category "${participant.category_name}" is not eligible for this competition`,
      };
    }

    // 6. Duplicate registration check
    const existing = await RegistrationRepository.findByCompetitionAndParticipant(competitionId, participantId);
    if (existing && existing.status === 'ASSIGNED') {
      throw { statusCode: 409, code: 'ALREADY_REGISTERED', message: 'Participant is already assigned to this competition' };
    }

    // 6b. Stage item team limit: Max 2 participants per team for STAGE items (off-stage has no limit)
    const isStageItem = (competition.competition_type_name || competition.competition_type || '').toUpperCase() === 'STAGE';
    if (isStageItem && !isAdminOverride) {
      const teamCountRows = await query<any[]>(
        `SELECT COUNT(*) as count 
         FROM registrations r
         JOIN participants p ON p.id = r.participant_id
         WHERE r.competition_id = ? AND p.team_id = ? AND r.status = 'ASSIGNED' AND r.participant_id != ?`,
        [competitionId, participant.team_id, participantId]
      );
      const currentTeamAssignedCount = Number(teamCountRows[0]?.count || 0);
      if (currentTeamAssignedCount >= 2) {
        throw {
          statusCode: 400,
          code: 'STAGE_TEAM_LIMIT_EXCEEDED',
          message: 'For stage items, a maximum of 2 participants per team can be assigned.',
        };
      }
    }



    // 8. Timetable Schedule conflict check
    const conflicts = await ScheduleRepository.checkParticipantScheduleConflict(participantId, competitionId);
    if (conflicts.length > 0) {
      throw {
        statusCode: 409,
        code: 'SCHEDULE_CONFLICT',
        message: `Schedule conflict: Participant has another competition ("${conflicts[0].competition_name}") scheduled at the same time.`,
        details: conflicts[0],
      };
    }

    // Passed all checks!
    const regId = await RegistrationRepository.create({
      competitionId,
      participantId,
      registeredByUserId,
    });

    // Auto-create initial Attendance record
    await query(
      'INSERT INTO attendance (registration_id, status) VALUES (?, "ABSENT") ON DUPLICATE KEY UPDATE status = VALUES(status)',
      [regId]
    );

    return this.getById(regId);
  }

  static async updateStatus(id: number, status: string) {
    await this.getById(id);
    await RegistrationRepository.updateStatus(id, status);
    return this.getById(id);
  }

  static async cancel(id: number) {
    await this.getById(id);
    await RegistrationRepository.updateStatus(id, 'REMOVED');
    return this.getById(id);
  }

  static async delete(id: number) {
    await this.getById(id);
    await RegistrationRepository.delete(id);
  }

  static async checkConflicts(participantId: number, competitionId: number) {
    return ScheduleRepository.checkParticipantScheduleConflict(participantId, competitionId);
  }
}
