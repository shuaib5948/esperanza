import crypto from 'crypto';
import { EntryRepository, CompetitionEntryRow } from '../repositories/entry.repository.js';
import { CompetitionRepository } from '../repositories/competition.repository.js';
import { ParticipantRepository } from '../repositories/participant.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';

export class EntryService {
  /**
   * Helper: Check if a category is eligible for a competition group
   */
  static isCategoryEligibleForGroup(groupCode: string, categoryCode: string): boolean {
    const grp = groupCode.toUpperCase();
    const cat = categoryCode.toUpperCase();

    if (grp === 'GEN' || grp === 'GENERAL') {
      return ['J1', 'J2', 'SEN', 'SENIOR'].includes(cat);
    }
    if (grp === 'JUN' || grp === 'JUNIOR') {
      return ['J1', 'J2'].includes(cat);
    }
    if (grp === 'SEN' || grp === 'SENIOR') {
      return ['SEN', 'SENIOR'].includes(cat);
    }
    if (grp === 'J1') {
      return cat === 'J1';
    }
    if (grp === 'J2') {
      return cat === 'J2';
    }
    return false;
  }

  static async getEntriesByCompetitionAndTeam(competitionId: number, teamId: number): Promise<CompetitionEntryRow[]> {
    return EntryRepository.findByCompetitionAndTeam(competitionId, teamId);
  }

  static async getEntryById(entryId: number, authorizedTeamId?: number): Promise<CompetitionEntryRow> {
    const entry = await EntryRepository.findById(entryId);
    if (!entry) {
      throw { statusCode: 404, code: 'ENTRY_NOT_FOUND', message: 'Competition entry not found' };
    }
    if (authorizedTeamId && entry.team_id !== authorizedTeamId) {
      throw {
        statusCode: 403,
        code: 'TEAM_ACCESS_DENIED',
        message: 'You are not authorized to view or manage entries for another team',
      };
    }
    return entry;
  }

  /**
   * Creates a competition entry with complete server-side validation
   */
  static async createEntry(params: {
    competitionId: number;
    teamId: number;
    participantIds: number[];
    status?: 'DRAFT' | 'CONFIRMED';
  }): Promise<CompetitionEntryRow> {
    const { competitionId, teamId, participantIds, status = 'CONFIRMED' } = params;

    // 1. Competition exists
    const competition = await CompetitionRepository.findById(competitionId);
    if (!competition) {
      throw { statusCode: 404, code: 'COMPETITION_NOT_FOUND', message: 'Competition not found' };
    }

    // 2. Competition is active
    if (competition.status !== 'ACTIVE') {
      throw {
        statusCode: 400,
        code: 'COMPETITION_NOT_ACTIVE',
        message: `Competition is currently ${competition.status.toLowerCase()}`,
      };
    }

    // 3. Team exists
    const team = await TeamRepository.findById(teamId);
    if (!team) {
      throw { statusCode: 404, code: 'TEAM_NOT_FOUND', message: 'Festival team not found' };
    }

    // 4. Team entry limit (null or 0 means unlimited entries for that item)
    const existingEntriesCount = await EntryRepository.countActiveTeamEntries(competitionId, teamId);
    const maxEntriesAllowed = competition.max_entries_per_team;
    if (maxEntriesAllowed !== null && maxEntriesAllowed !== undefined && maxEntriesAllowed > 0) {
      if (existingEntriesCount >= maxEntriesAllowed) {
        throw {
          statusCode: 400,
          code: 'MAX_ENTRIES_EXCEEDED',
          message: `Maximum ${maxEntriesAllowed} ${maxEntriesAllowed === 1 ? 'entry' : 'entries'} allowed for this team in this competition`,
        };
      }
    }

    // 5. Participant duplicate check inside the payload
    const uniqueParticipantIds = Array.from(new Set(participantIds));
    if (uniqueParticipantIds.length !== participantIds.length) {
      throw {
        statusCode: 400,
        code: 'DUPLICATE_PARTICIPANT_IN_ENTRY',
        message: 'A participant cannot be added twice inside the same entry',
      };
    }

    // 5b. Validate each participant (existence, active, team, category eligibility, duplicate)
    for (const pId of participantIds) {
      const participant = await ParticipantRepository.findById(pId);
      if (!participant) {
        throw { statusCode: 404, code: 'PARTICIPANT_NOT_FOUND', message: `Participant ID ${pId} not found` };
      }

      if (participant.status !== 'ACTIVE') {
        throw {
          statusCode: 400,
          code: 'PARTICIPANT_INACTIVE',
          message: `Participant "${participant.name}" is inactive`,
        };
      }

      // Check team membership
      if (participant.team_id !== teamId) {
        throw {
          statusCode: 403,
          code: 'TEAM_MISMATCH',
          message: `Participant "${participant.name}" does not belong to team ${team.name}`,
        };
      }

      // Check category eligibility
      const isEligible = this.isCategoryEligibleForGroup(
        competition.programme_group_code,
        participant.category_code
      );
      if (!isEligible) {
        throw {
          statusCode: 400,
          code: 'CATEGORY_NOT_ELIGIBLE',
          message: `Category "${participant.category_name}" is not eligible for ${competition.programme_group_name} competition`,
        };
      }

      // Check if participant is already registered in another active entry for this competition
      const isAlreadyInCompetition = await EntryRepository.isParticipantInCompetition(competitionId, pId);
      if (isAlreadyInCompetition) {
        throw {
          statusCode: 409,
          code: 'PARTICIPANT_ALREADY_IN_COMPETITION',
          message: `Participant "${participant.name}" already belongs to another entry for this competition`,
        };
      }
    }

    // 6. Participation constraints: Individual vs Group
    const isIndividual = competition.participation_type === 'INDIVIDUAL';
    const maxParticipants = isIndividual ? 1 : (competition.max_participants || 10);

    if (isIndividual) {
      if (participantIds.length !== 1) {
        throw {
          statusCode: 400,
          code: 'INDIVIDUAL_EXACT_ONE',
          message: 'Individual competitions can contain only one participant',
        };
      }
    } else {
      if (participantIds.length < 2) {
        throw {
          statusCode: 400,
          code: 'GROUP_MIN_NOT_MET',
          message: 'Group competitions require at least 2 participants',
        };
      }
      if (participantIds.length > maxParticipants) {
        throw {
          statusCode: 400,
          code: 'GROUP_MAX_EXCEEDED',
          message: `Maximum ${maxParticipants} participants allowed for this group competition`,
        };
      }
    }

    // 8. Generate unique entry code
    const entrySeq = String(existingEntriesCount + 1).padStart(2, '0');
    const compCodeClean = (competition.competition_code || `COMP-${competition.programme_number}`).replace(/\s+/g, '-').toUpperCase();
    const teamCodeClean = (team.code || `TEAM-${team.id}`).toUpperCase();
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const entryCode = `${compCodeClean}-${teamCodeClean}-${entrySeq}-${randomSuffix}`;

    return EntryRepository.createEntryWithParticipants({
      competitionId,
      teamId,
      entryCode,
      participantIds,
      status,
    });
  }

  static async addParticipantToEntry(params: {
    entryId: number;
    participantId: number;
    authorizedTeamId?: number;
  }): Promise<void> {
    const { entryId, participantId, authorizedTeamId } = params;

    const entry = await EntryRepository.findById(entryId);
    if (!entry) {
      throw { statusCode: 404, code: 'ENTRY_NOT_FOUND', message: 'Entry not found' };
    }

    if (authorizedTeamId && entry.team_id !== authorizedTeamId) {
      throw {
        statusCode: 403,
        code: 'TEAM_ACCESS_DENIED',
        message: 'Cannot modify another team\'s entry',
      };
    }

    const competition = await CompetitionRepository.findById(entry.competition_id);
    if (!competition) {
      throw { statusCode: 404, code: 'COMPETITION_NOT_FOUND', message: 'Competition not found' };
    }

    const isIndividual = competition.participation_type === 'INDIVIDUAL';
    const currentCount = entry.participant_count || (entry.participants?.length || 0);
    const maxParticipants = isIndividual ? 1 : (competition.max_participants || 10);

    if (currentCount >= maxParticipants) {
      throw {
        statusCode: 400,
        code: 'ENTRY_CAPACITY_EXCEEDED',
        message: isIndividual
          ? 'Individual competitions can contain only one participant'
          : `Maximum ${maxParticipants} participants allowed for this entry`,
      };
    }

    const participant = await ParticipantRepository.findById(participantId);
    if (!participant) {
      throw { statusCode: 404, code: 'PARTICIPANT_NOT_FOUND', message: 'Participant not found' };
    }

    if (participant.team_id !== entry.team_id) {
      throw {
        statusCode: 403,
        code: 'TEAM_MISMATCH',
        message: 'Cannot add a participant from another team',
      };
    }

    const isEligible = this.isCategoryEligibleForGroup(
      competition.programme_group_code,
      participant.category_code
    );
    if (!isEligible) {
      throw {
        statusCode: 400,
        code: 'CATEGORY_NOT_ELIGIBLE',
        message: `Category "${participant.category_name}" is not eligible for this competition`,
      };
    }

    // Check duplicate in same competition
    const isAlreadyInComp = await EntryRepository.isParticipantInCompetition(entry.competition_id, participantId);
    if (isAlreadyInComp) {
      throw {
        statusCode: 409,
        code: 'PARTICIPANT_ALREADY_IN_COMPETITION',
        message: 'Participant already belongs to an entry for this competition',
      };
    }

    await EntryRepository.addParticipantToEntry(entryId, participantId);
  }

  static async removeParticipantFromEntry(params: {
    entryId: number;
    participantId: number;
    authorizedTeamId?: number;
  }): Promise<void> {
    const { entryId, participantId, authorizedTeamId } = params;

    const entry = await EntryRepository.findById(entryId);
    if (!entry) {
      throw { statusCode: 404, code: 'ENTRY_NOT_FOUND', message: 'Entry not found' };
    }

    if (authorizedTeamId && entry.team_id !== authorizedTeamId) {
      throw {
        statusCode: 403,
        code: 'TEAM_ACCESS_DENIED',
        message: 'Cannot modify another team\'s entry',
      };
    }

    await EntryRepository.removeParticipantFromEntry(entryId, participantId);
  }

  static async deleteEntry(entryId: number, authorizedTeamId?: number): Promise<void> {
    const entry = await EntryRepository.findById(entryId);
    if (!entry) {
      throw { statusCode: 404, code: 'ENTRY_NOT_FOUND', message: 'Entry not found' };
    }

    if (authorizedTeamId && entry.team_id !== authorizedTeamId) {
      throw {
        statusCode: 403,
        code: 'TEAM_ACCESS_DENIED',
        message: 'Cannot delete another team\'s entry',
      };
    }

    await EntryRepository.deleteEntry(entryId);
  }

  static async updateAttendance(params: {
    entryId: number;
    participantId: number;
    status: 'PENDING' | 'PRESENT' | 'ABSENT' | 'EXCUSED';
    authorizedTeamId?: number;
  }): Promise<void> {
    const { entryId, participantId, status, authorizedTeamId } = params;

    const entry = await EntryRepository.findById(entryId);
    if (!entry) {
      throw { statusCode: 404, code: 'ENTRY_NOT_FOUND', message: 'Entry not found' };
    }

    if (authorizedTeamId && entry.team_id !== authorizedTeamId) {
      throw {
        statusCode: 403,
        code: 'TEAM_ACCESS_DENIED',
        message: 'Cannot update attendance for another team',
      };
    }

    await EntryRepository.updateParticipantAttendance(entryId, participantId, status);
  }
}
