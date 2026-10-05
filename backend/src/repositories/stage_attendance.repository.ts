import crypto from 'crypto';
import { query, withTransaction } from '../database/connection.js';

export class StageAttendanceRepository {
  // --- Stage Queue ---
  static async getStageQueue(competitionId: number) {
    return query(`
      SELECT sq.*,
             p.participant_code,
             u.name as participant_name,
             t.id as team_id,
             t.name as team_name,
             t.color as team_color,
             COALESCE(MAX(ss.status), 'NOT_STARTED') as scoring_status,
             COUNT(DISTINCT CASE WHEN ss.status IN ('SUBMITTED', 'LOCKED') THEN ss.id END) as judges_submitted_count
      FROM stage_queue sq
      JOIN participants p ON p.id = sq.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      LEFT JOIN score_sheets ss ON ss.competition_id = sq.competition_id AND ss.participant_id = sq.participant_id
      WHERE sq.competition_id = ?
      GROUP BY sq.id, p.participant_code, u.name, t.id, t.name, t.color
      ORDER BY sq.queue_order ASC, sq.code_letter ASC, p.id ASC
    `, [competitionId]);
  }

  static async initStageQueue(competitionId: number) {
    return withTransaction(async (conn) => {
      // Find approved registrations
      const [regs] = await conn.query<any[]>(`
        SELECT participant_id FROM registrations
        WHERE competition_id = ? AND status = 'ASSIGNED'
        ORDER BY id ASC
      `, [competitionId]);

      if (!regs || regs.length === 0) return [];

      let order = 1;
      for (const r of regs) {
        await conn.query(`
          INSERT INTO stage_queue (competition_id, participant_id, queue_order, stage_status)
          VALUES (?, ?, ?, 'WAITING')
          ON DUPLICATE KEY UPDATE queue_order = VALUES(queue_order)
        `, [competitionId, r.participant_id, order++]);
      }

      const [updated] = await conn.query<any[]>(
        'SELECT * FROM stage_queue WHERE competition_id = ? ORDER BY queue_order ASC',
        [competitionId]
      );
      return updated;
    });
  }

  static async updateStageStatus(queueId: number, status: string) {
    const now = new Date();
    let startedAt: Date | null = null;
    let endedAt: Date | null = null;
    let calledAt: Date | null = null;

    if (status === 'CALLED') calledAt = now;
    if (status === 'ON_STAGE') startedAt = now;
    if (status === 'COMPLETED' || status === 'ABSENT') endedAt = now;

    const fields: string[] = ['stage_status = ?'];
    const values: any[] = [status];

    if (calledAt) { fields.push('called_at = ?'); values.push(calledAt); }
    if (startedAt) { fields.push('stage_started_at = ?'); values.push(startedAt); }
    if (endedAt) { fields.push('stage_ended_at = ?'); values.push(endedAt); }

    values.push(queueId);
    await query(`UPDATE stage_queue SET ${fields.join(', ')} WHERE id = ?`, values);
    const rows = await query<any[]>('SELECT * FROM stage_queue WHERE id = ?', [queueId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async updateCheckInStatus(queueId: number, checkInStatus: string) {
    await query('UPDATE stage_queue SET check_in_status = ? WHERE id = ?', [checkInStatus, queueId]);
    const rows = await query<any[]>('SELECT * FROM stage_queue WHERE id = ?', [queueId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async callParticipant(queueId: number) {
    await query('UPDATE stage_queue SET call_count = call_count + 1, called_at = NOW() WHERE id = ?', [queueId]);
    const rows = await query<any[]>('SELECT * FROM stage_queue WHERE id = ?', [queueId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async notifyTeamLeader(queueId: number, adminUserId: number) {
    const rows = await query<any[]>(`
      SELECT sq.*, p.participant_code, u.name as participant_name, p.team_id, t.name as team_name, c.name as competition_name, c.programme_number
      FROM stage_queue sq
      JOIN participants p ON p.id = sq.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      JOIN competitions c ON c.id = sq.competition_id
      WHERE sq.id = ?
    `, [queueId]);

    if (!rows || rows.length === 0) {
      throw { statusCode: 404, code: 'QUEUE_ITEM_NOT_FOUND', message: 'Queue item not found' };
    }

    const item = rows[0];
    const uuid = crypto.randomUUID();
    const title = `URGENT CALL: ${item.participant_name} (${item.participant_code}) Not Reported`;
    const content = `Participant ${item.participant_name} (${item.participant_code}) from ${item.team_name} has not reported backstage for #${item.programme_number} ${item.competition_name}. Please send the contestant to the stage area immediately.`;

    await query(`
      INSERT INTO announcements (uuid, title, content, target_role, target_team_id, published_at, created_by, status)
      VALUES (?, ?, ?, 'TEAM_LEADER', ?, NOW(), ?, 'PUBLISHED')
    `, [uuid, title, content, item.team_id, adminUserId]);

    return {
      success: true,
      message: `Notification dispatched to ${item.team_name} leader`,
      target_team_id: item.team_id,
    };
  }

  static async assignLots(competitionId: number, lots: { queue_id: number; code_letter: string; queue_order: number }[]) {
    return withTransaction(async (conn) => {
      for (const lot of lots) {
        await conn.query(
          'UPDATE stage_queue SET code_letter = ?, queue_order = ? WHERE id = ? AND competition_id = ?',
          [lot.code_letter, lot.queue_order, lot.queue_id, competitionId]
        );
      }
      const [rows] = await conn.query<any[]>(
        'SELECT * FROM stage_queue WHERE competition_id = ? ORDER BY queue_order ASC',
        [competitionId]
      );
      return rows;
    });
  }

  static async appendLatePerformer(competitionId: number, participantId: number) {
    return withTransaction(async (conn) => {
      // 1. Guard against completed/cancelled schedule
      const [scheds] = await conn.query<any[]>(
        'SELECT * FROM schedules WHERE competition_id = ?',
        [competitionId]
      );
      const sched = scheds && scheds.length > 0 ? scheds[0] : null;
      if (sched && (sched.status === 'COMPLETED' || sched.status === 'CANCELLED')) {
        throw {
          statusCode: 400,
          code: 'PROGRAMME_ALREADY_FINISHED',
          message: 'Cannot add late performer: Programme is already completed or cancelled.',
        };
      }

      // 2. Guard against official submitted marks
      const [submittedScores] = await conn.query<any[]>(
        "SELECT COUNT(*) as count FROM score_sheets WHERE competition_id = ? AND status IN ('SUBMITTED', 'LOCKED')",
        [competitionId]
      );
      if (Number(submittedScores?.[0]?.count || 0) > 0) {
        throw {
          statusCode: 400,
          code: 'OFFICIAL_MARKS_SUBMITTED',
          message: 'Cannot add late performer: Official marks have already been submitted by the judge.',
        };
      }

      // 3. Find existing code letters and queue orders
      const [existingItems] = await conn.query<any[]>(
        'SELECT code_letter, queue_order FROM stage_queue WHERE competition_id = ?',
        [competitionId]
      );

      // Determine next code letter
      let maxLetterCode = 64; // before 'A' (65)
      let maxOrder = 0;

      for (const item of existingItems || []) {
        if (item.code_letter) {
          const charCode = item.code_letter.trim().toUpperCase().charCodeAt(0);
          if (charCode > maxLetterCode) {
            maxLetterCode = charCode;
          }
        }
        if (item.queue_order && item.queue_order > maxOrder) {
          maxOrder = item.queue_order;
        }
      }

      const nextLetter = String.fromCharCode(maxLetterCode + 1);
      const nextOrder = maxOrder + 1;

      // 4. Update or Insert stage_queue record
      const [existingQueue] = await conn.query<any[]>(
        'SELECT id FROM stage_queue WHERE competition_id = ? AND participant_id = ?',
        [competitionId, participantId]
      );

      let queueId: number;
      if (existingQueue && existingQueue.length > 0) {
        queueId = existingQueue[0].id;
        await conn.query(
          `UPDATE stage_queue 
           SET code_letter = ?, queue_order = ?, check_in_status = 'REPORTED', stage_status = 'WAITING' 
           WHERE id = ?`,
          [nextLetter, nextOrder, queueId]
        );
      } else {
        const [insertRes] = await conn.query<any>(
          `INSERT INTO stage_queue (competition_id, participant_id, code_letter, queue_order, check_in_status, stage_status)
           VALUES (?, ?, ?, ?, 'REPORTED', 'WAITING')`,
          [competitionId, participantId, nextLetter, nextOrder]
        );
        queueId = insertRes.insertId;
      }

      const [updatedRows] = await conn.query<any[]>(
        `SELECT sq.*, p.participant_code, u.name as participant_name, t.name as team_name
         FROM stage_queue sq
         JOIN participants p ON p.id = sq.participant_id
         JOIN users u ON u.id = p.user_id
         JOIN teams t ON t.id = p.team_id
         WHERE sq.id = ?`,
        [queueId]
      );

      return updatedRows && updatedRows.length > 0 ? updatedRows[0] : null;
    });
  }

  // --- Attendance ---
  static async getAttendance(competitionId: number) {
    return query(`
      SELECT COALESCE(a.id, 0) as id,
             r.id as registration_id,
             COALESCE(a.status, 'ABSENT') as status,
             a.checked_in_at,
             a.notes,
             r.participant_id,
             p.participant_code,
             u.name as participant_name,
             t.name as team_name
      FROM registrations r
      LEFT JOIN attendance a ON a.registration_id = r.id
      JOIN participants p ON p.id = r.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      WHERE r.competition_id = ? AND r.status = 'ASSIGNED'
      ORDER BY r.id ASC
    `, [competitionId]);
  }

  static async updateAttendance(registrationId: number, status: string, notes?: string | null, userId?: number) {
    await query(`
      INSERT INTO attendance (registration_id, status, notes, checked_in_at, checked_in_by)
      VALUES (?, ?, ?, NOW(), ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), checked_in_at = NOW(), checked_in_by = VALUES(checked_in_by)
    `, [registrationId, status, notes || null, userId || null]);
    const rows = await query<any[]>('SELECT * FROM attendance WHERE registration_id = ?', [registrationId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  // --- Submissions ---
  static async getSubmissions(competitionId: number) {
    return query(`
      SELECT s.*,
             p.participant_code,
             u.name as participant_name,
             t.name as team_name
      FROM submissions s
      JOIN participants p ON p.id = s.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      WHERE s.competition_id = ?
      ORDER BY s.submitted_at DESC
    `, [competitionId]);
  }

  static async createSubmission(data: any) {
    await query(`
      INSERT INTO submissions (competition_id, participant_id, file_url, file_name, file_type, file_size, status)
      VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED')
      ON DUPLICATE KEY UPDATE file_url = VALUES(file_url), file_name = VALUES(file_name), submitted_at = NOW()
    `, [data.competition_id, data.participant_id, data.file_url, data.file_name, data.file_type || null, data.file_size || null]);
    const rows = await query<any[]>(
      'SELECT * FROM submissions WHERE competition_id = ? AND participant_id = ?',
      [data.competition_id, data.participant_id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }
}
