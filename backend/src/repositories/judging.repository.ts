import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../database/connection.js';

export class JudgeRepository {
  static async findAll() {
    return query(`
      SELECT j.*, u.name, u.email, u.phone,
             COUNT(DISTINCT cj.competition_id) as assigned_competitions_count
      FROM judges j
      JOIN users u ON u.id = j.user_id
      LEFT JOIN competition_judges cj ON cj.judge_id = j.id AND cj.status = 'ASSIGNED'
      GROUP BY j.id
      ORDER BY j.id ASC
    `);
  }

  static async findById(id: number) {
    const rows = await query<any[]>(`
      SELECT j.*, u.name, u.email, u.phone
      FROM judges j
      JOIN users u ON u.id = j.user_id
      WHERE j.id = ?
    `, [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findByUserId(userId: number) {
    const rows = await query<any[]>(`
      SELECT j.*, u.name, u.email
      FROM judges j
      JOIN users u ON u.id = j.user_id
      WHERE j.user_id = ?
    `, [userId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async create(data: any): Promise<number> {
    return withTransaction(async (conn) => {
      const userUuid = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(data.password || 'Judge@Esperanza2026!', 10);

      const [userResult] = await conn.query<any>(`
        INSERT INTO users (uuid, name, email, phone, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?, 'JUDGE', 'ACTIVE')
      `, [userUuid, data.name, data.email, data.phone || null, passwordHash]);

      const userId = userResult.insertId;

      const [judgeResult] = await conn.query<any>(`
        INSERT INTO judges (user_id, judge_code, judge_type, qualification, status)
        VALUES (?, ?, ?, ?, 'ACTIVE')
      `, [userId, data.judge_code, data.judge_type || 'ALL', data.qualification || null]);

      return judgeResult.insertId;
    });
  }

  static async assignToCompetition(competitionId: number, judgeId: number, assignedByUserId: number) {
    await query(`
      INSERT INTO competition_judges (competition_id, judge_id, assigned_by, status)
      VALUES (?, ?, ?, 'ASSIGNED')
      ON DUPLICATE KEY UPDATE status = 'ASSIGNED', assigned_by = VALUES(assigned_by)
    `, [competitionId, judgeId, assignedByUserId]);
  }

  static async removeFromCompetition(competitionId: number, judgeId: number) {
    await query(`
      UPDATE competition_judges SET status = 'REMOVED'
      WHERE competition_id = ? AND judge_id = ?
    `, [competitionId, judgeId]);
  }

  static async getAssignedJudgesForCompetition(competitionId: number) {
    return query<any[]>(`
      SELECT j.id as judge_id, j.judge_code, j.qualification,
             u.name, u.email, u.phone, cj.assigned_at
      FROM competition_judges cj
      JOIN judges j ON j.id = cj.judge_id
      JOIN users u ON u.id = j.user_id
      WHERE cj.competition_id = ? AND cj.status = 'ASSIGNED'
      ORDER BY j.id ASC
    `, [competitionId]);
  }

  static async isJudgeAssigned(competitionId: number, judgeId: number): Promise<boolean> {
    const rows = await query<any[]>(`
      SELECT id FROM competition_judges
      WHERE competition_id = ? AND judge_id = ? AND status = 'ASSIGNED'
    `, [competitionId, judgeId]);
    return rows && rows.length > 0;
  }

  static async getAssignedCompetitions(judgeId: number) {
    return query(`
      SELECT c.*, 
             pg.name as programme_group,
             ct.name as competition_type,
             MIN(s.start_at) as start_at, 
             MAX(s.end_at) as end_at, 
             MAX(v.name) as venue_name,
             MAX(s.status) as schedule_status,
             COUNT(DISTINCT r.id) as participant_count,
             COUNT(DISTINCT CASE WHEN ss.status = 'SUBMITTED' OR ss.status = 'LOCKED' THEN ss.id END) as evaluated_count
      FROM competitions c
      JOIN competition_judges cj ON cj.competition_id = c.id AND cj.judge_id = ? AND cj.status = 'ASSIGNED'
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      LEFT JOIN schedules s ON s.competition_id = c.id
      LEFT JOIN venues v ON v.id = s.venue_id
      LEFT JOIN registrations r ON r.competition_id = c.id AND r.status = 'ASSIGNED'
      LEFT JOIN score_sheets ss ON ss.competition_id = c.id AND ss.judge_id = ?
      GROUP BY c.id, pg.name, ct.name
      ORDER BY 
        CASE WHEN MAX(s.status) = 'LIVE' THEN 1 
             WHEN MAX(s.status) = 'CHECK_IN' THEN 2 
             WHEN MAX(s.status) = 'SCHEDULED' THEN 3 
             ELSE 4 END ASC,
        c.programme_number ASC
    `, [judgeId, judgeId]);
  }

  static async getAssignedParticipantsForCompetition(competitionId: number, judgeId: number) {
    // If backstage check-in has occurred, only present participants (REPORTED and not ABSENT) are fetched
    const queueRows = await query<any[]>(`
      SELECT COUNT(*) as count 
      FROM stage_queue 
      WHERE competition_id = ? AND (check_in_status = 'REPORTED' OR code_letter IS NOT NULL)
    `, [competitionId]);

    const hasCheckInLots = queueRows && queueRows[0] && queueRows[0].count > 0;

    if (hasCheckInLots) {
      return query(`
        SELECT p.id as participant_id, p.participant_code, p.registration_number,
               u.name as participant_name,
               t.name as team_name, t.code as team_code,
               sq.id as queue_id,
               sq.code_letter,
               COALESCE(sq.queue_order, 999) as queue_order,
               sq.check_in_status,
               sq.stage_status,
               ss.id as score_sheet_id,
               COALESCE(ss.status, 'NOT_STARTED') as status,
               COALESCE(ss.status, 'NOT_STARTED') as scoring_status,
               ss.total_marks,
               ss.remarks
        FROM stage_queue sq
        JOIN participants p ON p.id = sq.participant_id
        JOIN users u ON u.id = p.user_id
        JOIN teams t ON t.id = p.team_id
        LEFT JOIN registrations r ON r.competition_id = sq.competition_id AND r.participant_id = p.id
        LEFT JOIN score_sheets ss ON ss.competition_id = sq.competition_id 
                                  AND ss.participant_id = p.id 
                                  AND ss.judge_id = ?
        WHERE sq.competition_id = ?
          AND sq.check_in_status = 'REPORTED'
          AND sq.stage_status != 'ABSENT'
          AND (r.status IS NULL OR r.status = 'ASSIGNED')
        ORDER BY sq.queue_order ASC, sq.code_letter ASC, p.id ASC
      `, [judgeId, competitionId]);
    }

    return query(`
      SELECT p.id as participant_id, p.participant_code, p.registration_number,
             u.name as participant_name,
             t.name as team_name, t.code as team_code,
             sq.id as queue_id,
             sq.code_letter,
             COALESCE(sq.queue_order, 999) as queue_order,
             sq.check_in_status,
             sq.stage_status,
             ss.id as score_sheet_id,
             COALESCE(ss.status, 'NOT_STARTED') as status,
             COALESCE(ss.status, 'NOT_STARTED') as scoring_status,
             ss.total_marks,
             ss.remarks
      FROM registrations r
      JOIN participants p ON p.id = r.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      LEFT JOIN stage_queue sq ON sq.competition_id = r.competition_id AND sq.participant_id = p.id
      LEFT JOIN score_sheets ss ON ss.competition_id = r.competition_id 
                                AND ss.participant_id = p.id 
                                AND ss.judge_id = ?
      WHERE r.competition_id = ? AND r.status = 'ASSIGNED'
        AND (sq.check_in_status IS NULL OR sq.check_in_status != 'ABSENT')
        AND (sq.stage_status IS NULL OR sq.stage_status != 'ABSENT')
      ORDER BY COALESCE(sq.queue_order, 999) ASC, sq.code_letter ASC, p.id ASC
    `, [judgeId, competitionId]);
  }

  static async getScoreSheet(competitionId: number, participantId: number, judgeId: number) {
    const sheetRows = await query<any[]>(`
      SELECT * FROM score_sheets
      WHERE competition_id = ? AND participant_id = ? AND judge_id = ?
    `, [competitionId, participantId, judgeId]);

    const sheet = sheetRows && sheetRows.length > 0 ? sheetRows[0] : null;

    // Get criteria with existing score details if sheet exists
    const criteria = await query<any[]>(`
      SELECT cc.*, sd.marks as scored_marks, sd.remarks
      FROM competition_criteria cc
      LEFT JOIN score_details sd ON sd.criterion_id = cc.id 
                                AND sd.score_sheet_id = ?
      WHERE cc.competition_id = ? AND cc.status = 'ACTIVE'
      ORDER BY cc.display_order ASC
    `, [sheet ? sheet.id : null, competitionId]);

    return {
      sheet,
      criteria,
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
    return withTransaction(async (conn) => {
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

      const totalMarks = marks !== undefined && marks !== null
        ? Number(marks)
        : (scores?.reduce((sum, s) => sum + Number(s.marks || 0), 0) ?? 0);
      const finalRemarks = remarks || (scores && scores[0]?.remarks) || null;

      // 1. Check or create score sheet
      let [existingSheets] = await conn.query<any[]>(`
        SELECT * FROM score_sheets
        WHERE competition_id = ? AND participant_id = ? AND judge_id = ?
      `, [competitionId, participantId, judgeId]);

      let sheetId: number;
      const sheetStatus = isDraft ? 'DRAFT' : 'SUBMITTED';

      if (existingSheets && existingSheets.length > 0) {
        sheetId = existingSheets[0].id;
        // Verify not locked
        if (existingSheets[0].status === 'LOCKED' || existingSheets[0].status === 'SUBMITTED') {
          throw {
            statusCode: 403,
            code: 'SCORE_LOCKED',
            message: 'This score sheet has already been submitted and is locked from modification.',
          };
        }

        await conn.query(`
          UPDATE score_sheets
          SET status = ?, total_marks = ?, remarks = ?, submitted_at = ?
          WHERE id = ?
        `, [sheetStatus, totalMarks, finalRemarks, isDraft ? null : new Date(), sheetId]);
      } else {
        const [sheetResult] = await conn.query<any>(`
          INSERT INTO score_sheets (competition_id, participant_id, judge_id, status, total_marks, remarks, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [competitionId, participantId, judgeId, sheetStatus, totalMarks, finalRemarks, isDraft ? null : new Date()]);
        sheetId = sheetResult.insertId;
      }

      // 2. Save individual criterion scores if provided
      if (scores && scores.length > 0) {
        for (const s of scores) {
          if (s.criterion_id) {
            await conn.query(`
              INSERT INTO score_details (score_sheet_id, criterion_id, marks, remarks)
              VALUES (?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE marks = VALUES(marks), remarks = VALUES(remarks)
            `, [sheetId, s.criterion_id, s.marks, s.remarks || null]);
          }
        }
      }

      return sheetId;
    });
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
    return withTransaction(async (conn) => {
      const sheetIds: number[] = [];
      const sheetStatus = isDraft ? 'DRAFT' : 'LOCKED';

      for (const item of items) {
        const [existingSheets] = await conn.query<any[]>(`
          SELECT * FROM score_sheets
          WHERE competition_id = ? AND participant_id = ? AND judge_id = ?
        `, [competitionId, item.participant_id, judgeId]);

        let sheetId: number;
        const totalMarks = item.marks !== undefined && item.marks !== null
          ? Number(item.marks)
          : (item.scores?.reduce((sum, s) => sum + Number(s.marks || 0), 0) ?? 0);
        const finalRemarks = item.remarks || (item.scores && item.scores[0]?.remarks) || null;

        if (existingSheets && existingSheets.length > 0) {
          sheetId = existingSheets[0].id;
          await conn.query(`
            UPDATE score_sheets
            SET status = ?, total_marks = ?, remarks = ?, submitted_at = COALESCE(submitted_at, NOW()), locked_at = ?
            WHERE id = ?
          `, [sheetStatus, totalMarks, finalRemarks, isDraft ? null : new Date(), sheetId]);
        } else {
          const [sheetResult] = await conn.query<any>(`
            INSERT INTO score_sheets (competition_id, participant_id, judge_id, status, total_marks, remarks, submitted_at, locked_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
          `, [competitionId, item.participant_id, judgeId, sheetStatus, totalMarks, finalRemarks, isDraft ? null : new Date()]);
          sheetId = sheetResult.insertId;
        }

        sheetIds.push(sheetId);

        if (item.scores && item.scores.length > 0) {
          for (const s of item.scores) {
            if (s.criterion_id) {
              await conn.query(`
                INSERT INTO score_details (score_sheet_id, criterion_id, marks, remarks)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE marks = VALUES(marks), remarks = VALUES(remarks)
              `, [sheetId, s.criterion_id, s.marks, s.remarks || null]);
            }
          }
        }
      }

      return { success: true, count: sheetIds.length, sheetIds };
    });
  }

  static async submitAndLockScoreSheet(sheetId: number, judgeId: number) {
    const sheets = await query<any[]>('SELECT * FROM score_sheets WHERE id = ?', [sheetId]);
    if (!sheets || sheets.length === 0) {
      throw { statusCode: 404, code: 'SCORE_SHEET_NOT_FOUND', message: 'Score sheet not found' };
    }

    const sheet = sheets[0];
    if (sheet.judge_id !== judgeId) {
      throw { statusCode: 403, code: 'AUTH_FORBIDDEN', message: 'Cannot submit scores of another judge' };
    }

    await query(`
      UPDATE score_sheets
      SET status = 'LOCKED', submitted_at = COALESCE(submitted_at, NOW()), locked_at = NOW()
      WHERE id = ?
    `, [sheetId]);
  }

  static async unlockScoreSheet(sheetId: number, adminUserId: number, reason: string) {
    return withTransaction(async (conn) => {
      const [sheets] = await conn.query<any[]>('SELECT * FROM score_sheets WHERE id = ?', [sheetId]);
      if (!sheets || sheets.length === 0) {
        throw { statusCode: 404, code: 'SCORE_SHEET_NOT_FOUND', message: 'Score sheet not found' };
      }

      const sheet = sheets[0];
      await conn.query(`
        UPDATE score_sheets
        SET status = 'DRAFT', locked_at = NULL, unlocked_by = ?, unlocked_at = NOW()
        WHERE id = ?
      `, [adminUserId, sheetId]);

      // Record audit log
      await conn.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (?, 'UNLOCK_SCORE_SHEET', 'score_sheets', ?, ?, ?)
      `, [
        adminUserId,
        sheetId,
        JSON.stringify({ status: sheet.status, locked_at: sheet.locked_at }),
        JSON.stringify({ status: 'DRAFT', unlocked_by: adminUserId, reason }),
      ]);
    });
  }
}
