import { ResultRepository, PointsRepository } from '../repositories/result_points.repository.js';
import { query, withTransaction } from '../database/connection.js';

export class ResultService {
  static async getAll(filters: any) {
    if (filters?.competitionId) {
      return this.getByCompetition(filters.competitionId);
    }
    return ResultRepository.findAll(filters);
  }

  static async getById(id: number) {
    const res = await ResultRepository.findById(id);
    if (!res) {
      throw { statusCode: 404, code: 'RESULT_NOT_FOUND', message: 'Result not found' };
    }
    return res;
  }

  static async update(id: number, data: any) {
    return ResultRepository.update(id, data);
  }

  static async getByCompetition(competitionId: number) {
    const results = await ResultRepository.findByCompetition(competitionId);
    if (results && results.length > 1) {
      const seen = new Set<string>();
      let hasDuplicates = false;
      for (const r of results) {
        const key = `${r.participant_id || ''}_${r.team_id || ''}`;
        if (seen.has(key)) {
          hasDuplicates = true;
          break;
        }
        seen.add(key);
      }
      if (hasDuplicates) {
        return this.generateResults(competitionId);
      }
    }
    return results;
  }

  static async getJudgeScoresByCompetition(competitionId: number) {
    return ResultRepository.getJudgeScoresByCompetition(competitionId);
  }

  static async adminUpdateScores(
    competitionId: number,
    adminUserId: number,
    updates: { score_sheet_id: number; total_marks: number; remarks?: string }[]
  ) {
    await withTransaction(async (conn) => {
      for (const item of updates) {
        await conn.query(
          `
          UPDATE score_sheets 
          SET total_marks = ?, 
              remarks = COALESCE(?, remarks),
              unlocked_by = ?,
              unlocked_at = NOW(),
              status = CASE WHEN status = 'DRAFT' THEN 'SUBMITTED' ELSE status END
          WHERE id = ? AND competition_id = ?
        `,
          [item.total_marks, item.remarks !== undefined ? item.remarks : null, adminUserId, item.score_sheet_id, competitionId]
        );
      }
    });

    // Automatically recalculate competition results using updated marks
    return this.generateResults(competitionId, 'AVERAGE', adminUserId);
  }

  /**
   * Generates results from judges' score sheets for a competition
   * Follows Esperanza Mark & Scoring Structure:
   * 1. Programme participant count (N): Individual = 1, Group = 2, 3, or 4+ members
   * 2. Raw marks determine Grade (A+, A, B, C, NG)
   * 3. N determines Grade Marks (N=1: 6,5,3,1; N=2: 7,6,4,2; N=3: 10,9,6,3; N>=4: 18,15,10,5)
   * 4. Dense ranking determines Position & Position Points (5, 3, 1, 0)
   * 5. Final Programme Score = Grade Marks + Position Points
   */
  static async generateResults(
    competitionId: number,
    calculationMethod: 'AVERAGE' | 'WEIGHTED_AVERAGE' | 'HIGHEST' = 'AVERAGE',
    adminUserId?: number
  ) {
    await withTransaction(async (conn) => {
      // 1. Fetch submitted/locked score sheets grouped by evaluated participant
      const [sheets] = await conn.query<any[]>(`
        SELECT ss.participant_id, 
               p.team_id,
               AVG(ss.total_marks) as avg_marks,
               MAX(ss.total_marks) as max_marks,
               COUNT(ss.id) as judge_count
        FROM score_sheets ss
        JOIN participants p ON p.id = ss.participant_id
        WHERE ss.competition_id = ? AND ss.status IN ('SUBMITTED', 'LOCKED')
        GROUP BY ss.participant_id, p.team_id
      `, [competitionId]);

      if (!sheets || sheets.length === 0) {
        throw {
          statusCode: 400,
          code: 'NO_SUBMITTED_SCORES',
          message: 'Cannot generate results: No submitted score sheets exist for this competition yet.',
        };
      }

      // Check existing results to preserve publication/verification status & publishers
      const [existingResults] = await conn.query<any[]>(
        'SELECT id, status, published_by, published_at, verified_by, verified_at FROM results WHERE competition_id = ?',
        [competitionId]
      );
      const wasPublished = existingResults.some((r) => r.status === 'PUBLISHED');
      const existingPublisher = existingResults.find((r) => r.status === 'PUBLISHED')?.published_by;
      const publisherId = existingPublisher || adminUserId || null;
      const publishedAt = existingResults.find((r) => r.status === 'PUBLISHED')?.published_at || new Date();

      const existingVerifier = existingResults.find((r) => r.verified_by)?.verified_by;
      const verifierId = existingVerifier || adminUserId || null;
      const verifiedAt = existingResults.find((r) => r.verified_at)?.verified_at || new Date();

      // 2. Fetch competition details to determine programme participant scale (N)
      const [compRows] = await conn.query<any[]>(`
        SELECT id, participation_type, max_participants
        FROM competitions
        WHERE id = ?
      `, [competitionId]);

      const comp = compRows && compRows[0];
      const isIndividual = !comp || comp.participation_type === 'INDIVIDUAL';

      // Determine N strictly from the programme definition:
      // - For individual programmes: N = 1
      // - For group programmes: N = max_participants configured on the programme (e.g., 2, 3, 4+) or minimum 2
      let programmeParticipantCount = 1;
      if (!isIndividual) {
        programmeParticipantCount = comp?.max_participants && Number(comp.max_participants) > 1
          ? Number(comp.max_participants)
          : 2;
      }

      // 3. Compute Raw Marks, Grade, and Grade Marks for each evaluated performer
      const computed = sheets.map((s) => {
        let rawMarks = Number(s.avg_marks);
        if (calculationMethod === 'HIGHEST') {
          rawMarks = Number(s.max_marks);
        }
        rawMarks = Math.round(rawMarks * 100) / 100;

        const grade = ResultService.calculateGrade(rawMarks);
        const gradeMarks = ResultService.calculateGradeMarks(grade, programmeParticipantCount);

        return {
          participant_id: s.participant_id,
          team_id: s.team_id,
          raw_marks: rawMarks,
          grade,
          grade_marks: gradeMarks,
          position: null as number | null,
          position_points: 0,
          final_score: 0,
        };
      });

      // 4. Dense Ranking by descending raw_marks (no rank skipping on ties)
      computed.sort((a, b) => b.raw_marks - a.raw_marks);

      let currentRank = 1;
      for (let i = 0; i < computed.length; i++) {
        if (i > 0 && computed[i].raw_marks < computed[i - 1].raw_marks) {
          currentRank++;
        }

        if (currentRank === 1) {
          computed[i].position = 1;
          computed[i].position_points = 5;
        } else if (currentRank === 2) {
          computed[i].position = 2;
          computed[i].position_points = 3;
        } else if (currentRank === 3) {
          computed[i].position = 3;
          computed[i].position_points = 1;
        } else {
          computed[i].position = null;
          computed[i].position_points = 0;
        }

        // Final Programme Score = Grade Mark + Position Points
        computed[i].final_score = Math.round((computed[i].grade_marks + computed[i].position_points) * 100) / 100;
      }

      // 5. Clean up existing team points and all old results for this competition (prevents duplicate rows)
      await conn.query('DELETE FROM team_points WHERE competition_id = ?', [competitionId]);
      await conn.query('DELETE FROM results WHERE competition_id = ?', [competitionId]);

      // 6. Insert fresh single result rows for each participant
      const targetStatus = wasPublished ? 'PUBLISHED' : 'VERIFIED';

      for (let i = 0; i < computed.length; i++) {
        const item = computed[i];
        const points = item.final_score;

        const [insertRes] = await conn.query<any>(`
          INSERT INTO results (
            competition_id, participant_id, team_id,
            raw_marks, grade, grade_marks,
            position, position_points,
            final_score, points_awarded, status,
            verified_by, verified_at, published_by, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          competitionId,
          item.participant_id,
          item.team_id,
          item.raw_marks,
          item.grade,
          item.grade_marks,
          item.position,
          item.position_points,
          item.final_score,
          points,
          targetStatus,
          verifierId,
          verifiedAt,
          wasPublished ? publisherId : null,
          wasPublished ? publishedAt : null,
        ]);

        // If results were previously published, automatically sync updated points into team_points
        if (wasPublished && item.team_id && points > 0) {
          await conn.query(`
            INSERT INTO team_points (team_id, competition_id, result_id, points, is_published)
            VALUES (?, ?, ?, ?, TRUE)
            ON DUPLICATE KEY UPDATE points = VALUES(points), is_published = TRUE
          `, [item.team_id, competitionId, insertRes.insertId, points]);
        }
      }

      // Ensure competition status is CLOSED
      await conn.query('UPDATE competitions SET status = "CLOSED" WHERE id = ?', [competitionId]);

      // Audit log if admin user is present
      if (adminUserId) {
        await conn.query(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
          VALUES (?, ?, 'results', ?, ?)
        `, [
          adminUserId,
          wasPublished ? 'RESULTS_UPDATED_AND_PUBLISHED' : 'RESULTS_GENERATED',
          competitionId,
          JSON.stringify({ calculationMethod, count: computed.length, wasPublished }),
        ]);
      }
    });

    return ResultRepository.findByCompetition(competitionId);
  }

  static calculateGrade(rawMarks: number): 'A+' | 'A' | 'B' | 'C' | 'NG' {
    if (rawMarks >= 90) return 'A+';
    if (rawMarks >= 70) return 'A';
    if (rawMarks >= 60) return 'B';
    if (rawMarks >= 50) return 'C';
    return 'NG';
  }

  static calculateGradeMarks(grade: 'A+' | 'A' | 'B' | 'C' | 'NG', n: number): number {
    if (grade === 'NG') return 0;
    if (n <= 1) {
      switch (grade) {
        case 'A+': return 6;
        case 'A': return 5;
        case 'B': return 3;
        case 'C': return 1;
        default: return 0;
      }
    } else if (n === 2) {
      switch (grade) {
        case 'A+': return 7;
        case 'A': return 6;
        case 'B': return 4;
        case 'C': return 2;
        default: return 0;
      }
    } else if (n === 3) {
      switch (grade) {
        case 'A+': return 10;
        case 'A': return 9;
        case 'B': return 6;
        case 'C': return 3;
        default: return 0;
      }
    } else {
      // n >= 4
      switch (grade) {
        case 'A+': return 18;
        case 'A': return 15;
        case 'B': return 10;
        case 'C': return 5;
        default: return 0;
      }
    }
  }

  static async verify(id: number, adminUserId: number) {
    await this.getById(id);
    await ResultRepository.verifyResult(id, adminUserId);
    return this.getById(id);
  }

  static async publish(id: number, adminUserId: number) {
    const res = await this.getById(id);
    const points = Number(res.points_awarded) > 0 ? Number(res.points_awarded) : (Number(res.final_score) || 0);
    await ResultRepository.publishResult(id, adminUserId, points);
    return this.getById(id);
  }

  static async publishCompetition(competitionId: number, adminUserId: number) {
    const results = await ResultRepository.findByCompetition(competitionId);
    if (!results || results.length === 0) {
      throw { statusCode: 400, code: 'NO_RESULTS_TO_PUBLISH', message: 'No results found to publish for this competition.' };
    }
    for (const r of results) {
      if (r.status !== 'PUBLISHED') {
        const points = Number(r.points_awarded) > 0 ? Number(r.points_awarded) : (Number(r.final_score) || 0);
        await ResultRepository.publishResult(r.id, adminUserId, points);
      }
    }
    return ResultRepository.findByCompetition(competitionId);
  }

  static async unpublish(id: number, adminUserId: number) {
    await this.getById(id);
    await ResultRepository.unpublishResult(id, adminUserId);
    return this.getById(id);
  }

  static async unpublishCompetition(competitionId: number, adminUserId: number) {
    const results = await ResultRepository.findByCompetition(competitionId);
    for (const r of results) {
      if (r.status === 'PUBLISHED') {
        await ResultRepository.unpublishResult(r.id, adminUserId);
      }
    }
    return ResultRepository.findByCompetition(competitionId);
  }

  static async startEvaluation(competitionId: number, adminUserId: number) {
    const comp = await query<any[]>('SELECT id, name FROM competitions WHERE id = ?', [competitionId]);
    if (!comp || comp.length === 0) {
      throw { statusCode: 404, code: 'COMPETITION_NOT_FOUND', message: 'Competition not found' };
    }

    const judges = await query<any[]>('SELECT id FROM judges WHERE status = "ACTIVE" AND judge_type IN ("OFF_STAGE", "ALL")');
    for (const j of judges) {
      await query(`
        INSERT INTO competition_judges (competition_id, judge_id, assigned_by, status)
        VALUES (?, ?, ?, 'ASSIGNED')
        ON DUPLICATE KEY UPDATE status = 'ASSIGNED'
      `, [competitionId, j.id, adminUserId]);
    }

    return { success: true, message: 'Competition sent to judge panel for evaluation' };
  }
}

export class PointsService {
  static async getRules() {
    return PointsRepository.getRules();
  }

  static async createRule(data: any) {
    const id = await PointsRepository.createRule(data);
    const rules = await this.getRules();
    return rules.find((r: any) => r.id === id);
  }

  static async updateRule(id: number, data: any) {
    await PointsRepository.updateRule(id, data);
    const rules = await this.getRules();
    return rules.find((r: any) => r.id === id);
  }

  static async getLeaderboard() {
    return PointsRepository.getLeaderboard();
  }

  static async getAdminTeamBreakdown() {
    return PointsRepository.getAdminTeamBreakdown();
  }

  static async getAdminIndividualLeaderboard() {
    return PointsRepository.getAdminIndividualLeaderboard();
  }

  static async getPointsLog() {
    return PointsRepository.getPointsLog();
  }

  static async recalculatePoints(adminUserId: number) {
    return PointsRepository.recalculatePoints(adminUserId);
  }

  static async publishLeaderboard(adminUserId: number) {
    return PointsRepository.publishLeaderboard(adminUserId);
  }
}
