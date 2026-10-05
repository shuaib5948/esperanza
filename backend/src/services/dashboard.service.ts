import { DashboardRepository } from '../repositories/dashboard.repository.js';
import { ParticipantRepository } from '../repositories/participant.repository.js';
import { JudgeRepository } from '../repositories/judging.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';

export class DashboardService {
  static async getAdminDashboard() {
    return DashboardRepository.getAdminStats();
  }

  static async getTeamDashboard(userId: number, requestedTeamId?: number) {
    let teamId = requestedTeamId;
    if (!teamId) {
      const team = await TeamRepository.findByLeaderUserId(userId);
      if (!team) {
        throw { statusCode: 404, code: 'TEAM_NOT_FOUND', message: 'No team found associated with this user.' };
      }
      teamId = team.id;
    }
    const stats = await DashboardRepository.getTeamStats(teamId!);
    if (!stats) {
      throw { statusCode: 404, code: 'TEAM_NOT_FOUND', message: 'Team not found.' };
    }
    return stats;
  }

  static async getParticipantDashboard(userId: number) {
    const participant = await ParticipantRepository.findByUserId(userId);
    if (!participant) {
      throw { statusCode: 404, code: 'PARTICIPANT_NOT_FOUND', message: 'No participant profile found for this user.' };
    }
    return DashboardRepository.getParticipantStats(participant.id);
  }

  static async getJudgeDashboard(userId: number) {
    const judge = await JudgeRepository.findByUserId(userId);
    if (!judge) {
      throw { statusCode: 404, code: 'JUDGE_NOT_FOUND', message: 'No judge profile found for this user.' };
    }
    return DashboardRepository.getJudgeStats(judge.id);
  }
}
