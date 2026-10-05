import { StageAttendanceRepository } from '../repositories/stage_attendance.repository.js';
import { CompetitionRepository } from '../repositories/competition.repository.js';

export class StageAttendanceService {
  // Stage Queue
  static async getStageQueue(competitionId: number) {
    const comp = await CompetitionRepository.findById(competitionId);
    if (!comp) {
      throw { statusCode: 404, code: 'COMPETITION_NOT_FOUND', message: 'Competition not found' };
    }
    return StageAttendanceRepository.getStageQueue(competitionId);
  }

  static async initStageQueue(competitionId: number) {
    await this.getStageQueue(competitionId);
    return StageAttendanceRepository.initStageQueue(competitionId);
  }

  static async updateStageStatus(queueId: number, status: string) {
    const updated = await StageAttendanceRepository.updateStageStatus(queueId, status);
    if (!updated) {
      throw { statusCode: 404, code: 'QUEUE_ITEM_NOT_FOUND', message: 'Queue item not found' };
    }
    return updated;
  }

  static async updateCheckInStatus(queueId: number, status: string) {
    const updated = await StageAttendanceRepository.updateCheckInStatus(queueId, status);
    if (!updated) {
      throw { statusCode: 404, code: 'QUEUE_ITEM_NOT_FOUND', message: 'Queue item not found' };
    }
    return updated;
  }

  static async callParticipant(queueId: number) {
    const updated = await StageAttendanceRepository.callParticipant(queueId);
    if (!updated) {
      throw { statusCode: 404, code: 'QUEUE_ITEM_NOT_FOUND', message: 'Queue item not found' };
    }
    return updated;
  }

  static async notifyTeamLeader(queueId: number, adminUserId: number) {
    return StageAttendanceRepository.notifyTeamLeader(queueId, adminUserId);
  }

  static async assignLots(competitionId: number, lots: { queue_id: number; code_letter: string; queue_order: number }[]) {
    if (!lots || lots.length === 0) {
      throw {
        statusCode: 400,
        code: 'NO_PRESENT_PARTICIPANTS',
        message: 'Cannot assign lots: At least one participant must be marked present.',
      };
    }
    await this.getStageQueue(competitionId);
    return StageAttendanceRepository.assignLots(competitionId, lots);
  }

  static async appendLatePerformer(competitionId: number, participantId: number) {
    if (!participantId) {
      throw {
        statusCode: 400,
        code: 'PARTICIPANT_REQUIRED',
        message: 'Participant ID is required to append as late performer.',
      };
    }
    await this.getStageQueue(competitionId);
    return StageAttendanceRepository.appendLatePerformer(competitionId, participantId);
  }

  // Attendance
  static async getAttendance(competitionId: number) {
    const comp = await CompetitionRepository.findById(competitionId);
    if (!comp) {
      throw { statusCode: 404, code: 'COMPETITION_NOT_FOUND', message: 'Competition not found' };
    }
    return StageAttendanceRepository.getAttendance(competitionId);
  }

  static async updateAttendance(attendanceId: number, status: string, notes?: string | null, userId?: number) {
    const updated = await StageAttendanceRepository.updateAttendance(attendanceId, status, notes, userId);
    if (!updated) {
      throw { statusCode: 404, code: 'ATTENDANCE_NOT_FOUND', message: 'Attendance record not found' };
    }
    return updated;
  }

  static async bulkAttendance(records: { registration_id: number; status: string; notes?: string | null }[], userId?: number) {
    for (const r of records) {
      await StageAttendanceRepository.updateAttendance(r.registration_id, r.status, r.notes, userId);
    }
    return { success: true, count: records.length };
  }

  // Submissions
  static async getSubmissions(competitionId: number) {
    return StageAttendanceRepository.getSubmissions(competitionId);
  }

  static async createSubmission(competitionId: number, data: any) {
    return StageAttendanceRepository.createSubmission({ ...data, competition_id: competitionId });
  }
}
