import { JudgeRepository } from '../repositories/judging.repository.js';
import { CompetitionRepository } from '../repositories/competition.repository.js';

export class JudgingService {
  static async getAllJudges() {
    return JudgeRepository.findAll();
  }

  static async getJudgeById(id: number) {
    const judge = await JudgeRepository.findById(id);
    if (!judge) {
      throw { statusCode: 404, code: 'JUDGE_NOT_FOUND', message: 'Judge not found' };
    }
    return judge;
  }

  static async createJudge(data: any) {
    const id = await JudgeRepository.create(data);
    return this.getJudgeById(id);
  }

  static async assignJudge(competitionId: number, judgeId: number, adminUserId: number) {
    await this.getJudgeById(judgeId);
    await JudgeRepository.assignToCompetition(competitionId, judgeId, adminUserId);
  }

  static async removeJudge(competitionId: number, judgeId: number) {
    await JudgeRepository.removeFromCompetition(competitionId, judgeId);
  }

  static async getAssignedJudgesForCompetition(competitionId: number) {
    return JudgeRepository.getAssignedJudgesForCompetition(competitionId);
  }

  static async getAssignedCompetitions(judgeId: number) {
    return JudgeRepository.getAssignedCompetitions(judgeId);
  }

  static async getParticipantsForJudge(competitionId: number, judgeId: number) {
    // 1. Authorization: Is judge assigned to this competition?
    const isAssigned = await JudgeRepository.isJudgeAssigned(competitionId, judgeId);
    if (!isAssigned) {
      throw {
        statusCode: 403,
        code: 'JUDGE_NOT_ASSIGNED',
        message: 'You are not assigned to evaluate this competition.',
      };
    }

    return JudgeRepository.getAssignedParticipantsForCompetition(competitionId, judgeId);
  }

  static async getScoreSheet(competitionId: number, participantId: number, judgeId: number) {
    const isAssigned = await JudgeRepository.isJudgeAssigned(competitionId, judgeId);
    if (!isAssigned) {
      throw {
        statusCode: 403,
        code: 'JUDGE_NOT_ASSIGNED',
        message: 'You are not assigned to evaluate this competition.',
      };
    }

    return JudgeRepository.getScoreSheet(competitionId, participantId, judgeId);
  }

  static async getFullScoreSheet(competitionId: number, judgeId: number) {
    const isAssigned = await JudgeRepository.isJudgeAssigned(competitionId, judgeId);
    if (!isAssigned) {
      throw {
        statusCode: 403,
        code: 'JUDGE_NOT_ASSIGNED',
        message: 'You are not assigned to evaluate this competition.',
      };
    }

    const competition = await CompetitionRepository.findById(competitionId);
    const criteria = await CompetitionRepository.getCriteria(competitionId);
    const participants = await JudgeRepository.getAssignedParticipantsForCompetition(competitionId, judgeId);

    for (const p of participants) {
      const sheet = await JudgeRepository.getScoreSheet(competitionId, p.participant_id, judgeId);
      p.sheet_id = sheet.sheet?.id || null;
      p.status = sheet.sheet?.status || 'NOT_STARTED';
      p.total_marks = sheet.sheet?.total_marks !== null && sheet.sheet?.total_marks !== undefined ? Number(sheet.sheet.total_marks) : null;
      p.remarks = sheet.sheet?.remarks || '';
      p.scores = sheet.criteria.map((c: any) => ({
        criterion_id: c.id,
        marks: c.scored_marks !== null && c.scored_marks !== undefined ? Number(c.scored_marks) : null,
        remarks: c.remarks || '',
      }));
    }

    return {
      competition,
      criteria,
      participants,
    };
  }

  static async saveScores(
    competitionId: number,
    participantId: number,
    judgeId: number,
    data: {
      marks?: number;
      remarks?: string | null;
      scores?: { criterion_id?: number; marks: number; remarks?: string | null }[];
    } | { criterion_id: number; marks: number; remarks?: string | null }[],
    isDraft: boolean
  ) {
    // 1. Verify judge assignment
    const isAssigned = await JudgeRepository.isJudgeAssigned(competitionId, judgeId);
    if (!isAssigned) {
      throw {
        statusCode: 403,
        code: 'JUDGE_NOT_ASSIGNED',
        message: 'You are not assigned to evaluate this competition.',
      };
    }

    // Normalize data
    let marks: number | undefined;
    let remarks: string | null | undefined;
    let scores: { criterion_id?: number; marks: number; remarks?: string | null }[] | undefined;

    if (Array.isArray(data)) {
      scores = data;
    } else {
      marks = data.marks;
      remarks = data.remarks;
      scores = data.scores;
    }

    // Direct 100-mark validation
    if (marks !== undefined && marks !== null) {
      if (marks < 0 || marks > 100) {
        throw {
          statusCode: 400,
          code: 'SCORE_OUT_OF_RANGE',
          message: `Marks must be between 0 and 100. Provided: ${marks}`,
        };
      }
    } else if (scores && scores.length > 0) {
      // Validate all criterion marks against competition_criteria max_marks
      const criteria = await CompetitionRepository.getCriteria(competitionId);
      const criteriaMap = new Map<number, any>(criteria.map((c: any) => [c.id, c]));

      for (const score of scores) {
        if (score.criterion_id) {
          const crit = criteriaMap.get(score.criterion_id);
          if (!crit) {
            throw {
              statusCode: 400,
              code: 'INVALID_CRITERION',
              message: `Criterion ID ${score.criterion_id} does not belong to this competition.`,
            };
          }

          if (score.marks < 0 || score.marks > Number(crit.max_marks)) {
            throw {
              statusCode: 400,
              code: 'SCORE_OUT_OF_RANGE',
              message: `Marks for "${crit.name}" must be between 0 and ${crit.max_marks}. Provided: ${score.marks}`,
            };
          }
        }
      }
    }

    const sheetId = await JudgeRepository.saveScores(competitionId, participantId, judgeId, { marks, remarks, scores }, isDraft);
    return { sheetId, status: isDraft ? 'DRAFT' : 'SUBMITTED' };
  }

  static async saveBulkScores(
    competitionId: number,
    judgeId: number,
    items: {
      participant_id: number;
      marks?: number;
      remarks?: string | null;
      scores?: { criterion_id?: number; marks: number; remarks?: string | null }[];
    }[],
    isDraft: boolean
  ) {
    const isAssigned = await JudgeRepository.isJudgeAssigned(competitionId, judgeId);
    if (!isAssigned) {
      throw {
        statusCode: 403,
        code: 'JUDGE_NOT_ASSIGNED',
        message: 'You are not assigned to evaluate this competition.',
      };
    }

    const criteria = await CompetitionRepository.getCriteria(competitionId);
    const criteriaMap = new Map<number, any>(criteria.map((c: any) => [c.id, c]));

    for (const item of items) {
      if (item.marks !== undefined && item.marks !== null) {
        if (item.marks < 0 || item.marks > 100) {
          throw {
            statusCode: 400,
            code: 'SCORE_OUT_OF_RANGE',
            message: `Marks must be between 0 and 100 for participant ID ${item.participant_id}. Provided: ${item.marks}`,
          };
        }
      } else if (item.scores) {
        for (const score of item.scores) {
          if (score.criterion_id) {
            const crit = criteriaMap.get(score.criterion_id);
            if (crit && (score.marks < 0 || score.marks > Number(crit.max_marks))) {
              throw {
                statusCode: 400,
                code: 'SCORE_OUT_OF_RANGE',
                message: `Marks for "${crit.name}" must be between 0 and ${crit.max_marks}. Provided: ${score.marks}`,
              };
            }
          }
        }
      }
    }

    return JudgeRepository.saveBulkScores(competitionId, judgeId, items, isDraft);
  }

  static async submitScoreSheet(sheetId: number, judgeId: number) {
    await JudgeRepository.submitAndLockScoreSheet(sheetId, judgeId);
    return { success: true, message: 'Score sheet successfully locked and submitted.' };
  }

  static async unlockScoreSheet(sheetId: number, adminUserId: number, reason: string) {
    await JudgeRepository.unlockScoreSheet(sheetId, adminUserId, reason);
    return { success: true, message: 'Score sheet unlocked for editing.' };
  }
}
