import { query, withTransaction } from '../database/connection.js';

export class ResultRepository {
  static async findAll(filters: { competitionId?: number; status?: string; teamId?: number }) {
    const where: string[] = [];
    const params: any[] = [];

    if (filters.competitionId) {
      where.push('r.competition_id = ?');
      params.push(filters.competitionId);
    }

    if (filters.status) {
      where.push('r.status = ?');
      params.push(filters.status);
    }

    if (filters.teamId) {
      where.push('r.team_id = ?');
      params.push(filters.teamId);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    return query(`
      SELECT r.*,
             c.name as competition_name,
             c.competition_code,
             c.programme_number,
             pg.name as programme_group,
             p.participant_code,
             u.name as participant_name,
             t.name as team_name,
             t.code as team_code,
             v_user.name as verified_by_name,
             pub_user.name as published_by_name
      FROM results r
      JOIN competitions c ON c.id = r.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN participants p ON p.id = r.participant_id
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN teams t ON t.id = r.team_id
      LEFT JOIN users v_user ON v_user.id = r.verified_by
      LEFT JOIN users pub_user ON pub_user.id = r.published_by
      ${whereClause}
      ORDER BY r.competition_id ASC, r.position ASC, r.final_score DESC
    `, params);
  }

  static async findById(id: number) {
    const rows = await query<any[]>(`
      SELECT r.*,
             c.name as competition_name,
             c.competition_code,
             p.participant_code,
             u.name as participant_name,
             t.name as team_name,
             t.code as team_code
      FROM results r
      JOIN competitions c ON c.id = r.competition_id
      LEFT JOIN participants p ON p.id = r.participant_id
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN teams t ON t.id = r.team_id
      WHERE r.id = ?
    `, [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findByCompetition(competitionId: number) {
    return this.findAll({ competitionId });
  }

  static async getJudgeScoresByCompetition(competitionId: number) {
    return query(`
      SELECT ss.id as score_sheet_id,
             ss.participant_id,
             ss.judge_id,
             ss.total_marks,
             ss.status as scoresheet_status,
             ss.remarks,
             ss.submitted_at,
             p.participant_code,
             u.name as participant_name,
             t.name as team_name,
             t.color as team_color,
             j.judge_code,
             ju.name as judge_name
      FROM score_sheets ss
      JOIN participants p ON p.id = ss.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      JOIN judges j ON j.id = ss.judge_id
      JOIN users ju ON ju.id = j.user_id
      WHERE ss.competition_id = ?
      ORDER BY p.id ASC, j.id ASC
    `, [competitionId]);
  }

  static async update(id: number, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.raw_marks !== undefined) { fields.push('raw_marks = ?'); values.push(data.raw_marks); }
    if (data.grade !== undefined) { fields.push('grade = ?'); values.push(data.grade); }
    if (data.grade_marks !== undefined) { fields.push('grade_marks = ?'); values.push(data.grade_marks); }
    if (data.position !== undefined) { fields.push('position = ?'); values.push(data.position); }
    if (data.position_points !== undefined) { fields.push('position_points = ?'); values.push(data.position_points); }
    if (data.final_score !== undefined) { fields.push('final_score = ?'); values.push(data.final_score); }
    if (data.points_awarded !== undefined) { fields.push('points_awarded = ?'); values.push(data.points_awarded); }
    if (data.remarks !== undefined) { fields.push('remarks = ?'); values.push(data.remarks); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return;
    values.push(id);
    await query(`UPDATE results SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async verifyResult(id: number, adminUserId: number) {
    await query(`
      UPDATE results
      SET status = 'VERIFIED', verified_by = ?, verified_at = NOW()
      WHERE id = ?
    `, [adminUserId, id]);
  }

  /**
   * ATOMIC TRANSACTION: Result Publication & Point Allocation
   */
  static async publishResult(id: number, adminUserId: number, pointsToAward: number) {
    return withTransaction(async (conn) => {
      // 1. Fetch and lock result
      const [resRows] = await conn.query<any[]>(
        'SELECT * FROM results WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!resRows || resRows.length === 0) {
        throw { statusCode: 404, code: 'RESULT_NOT_FOUND', message: 'Result not found' };
      }
      const result = resRows[0];

      if (result.status === 'PUBLISHED') {
        throw { statusCode: 400, code: 'RESULT_ALREADY_PUBLISHED', message: 'This result is already published' };
      }

      // 2. Mark as PUBLISHED
      await conn.query(`
        UPDATE results
        SET status = 'PUBLISHED', published_by = ?, published_at = NOW(), points_awarded = ?
        WHERE id = ?
      `, [adminUserId, pointsToAward, id]);

      // 3. Atomically allocate to team_points (preventing duplicates via UNIQUE constraint or upsert)
      if (result.team_id && pointsToAward > 0) {
        await conn.query(`
          INSERT INTO team_points (team_id, competition_id, result_id, points)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE points = VALUES(points)
        `, [result.team_id, result.competition_id, id, pointsToAward]);
      }

      // 4. Update competition status to CLOSED if all results are published
      await conn.query(`
        UPDATE competitions
        SET status = 'CLOSED'
        WHERE id = ?
      `, [result.competition_id]);

      // 5. Audit log
      await conn.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (?, 'RESULT_PUBLISHED', 'results', ?, ?, ?)
      `, [
        adminUserId,
        id,
        JSON.stringify({ status: result.status, points: result.points_awarded }),
        JSON.stringify({ status: 'PUBLISHED', points: pointsToAward, published_by: adminUserId }),
      ]);

      return { success: true, pointsAwarded: pointsToAward };
    });
  }

  static async unpublishResult(id: number, adminUserId: number) {
    return withTransaction(async (conn) => {
      const [resRows] = await conn.query<any[]>('SELECT * FROM results WHERE id = ? FOR UPDATE', [id]);
      if (!resRows || resRows.length === 0) {
        throw { statusCode: 404, code: 'RESULT_NOT_FOUND', message: 'Result not found' };
      }
      const result = resRows[0];

      // Remove team_points
      await conn.query('DELETE FROM team_points WHERE result_id = ?', [id]);

      // Revert result status to DRAFT
      await conn.query(`
        UPDATE results
        SET status = 'DRAFT', published_by = NULL, published_at = NULL, points_awarded = 0
        WHERE id = ?
      `, [id]);

      // Audit log
      await conn.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (?, 'RESULT_UNPUBLISHED', 'results', ?, ?, ?)
      `, [adminUserId, id, JSON.stringify(result), JSON.stringify({ status: 'DRAFT' })]);
    });
  }
}

export class PointsRepository {
  static async getRules() {
    return query('SELECT * FROM point_rules ORDER BY position ASC');
  }

  static async createRule(data: any) {
    const res = await query<any>(`
      INSERT INTO point_rules (name, position, points, participation_points, active)
      VALUES (?, ?, ?, ?, ?)
    `, [data.name, data.position || null, data.points, data.participation_points || 0, data.active ?? true]);
    return res.insertId;
  }

  static async updateRule(id: number, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.position !== undefined) { fields.push('position = ?'); values.push(data.position); }
    if (data.points !== undefined) { fields.push('points = ?'); values.push(data.points); }
    if (data.participation_points !== undefined) { fields.push('participation_points = ?'); values.push(data.participation_points); }
    if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }

    if (fields.length === 0) return;
    values.push(id);
    await query(`UPDATE point_rules SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  /**
   * Aggregates live points for Team Leaderboard
   */
  static async getLeaderboard() {
    return query(`
      SELECT t.id, t.name, t.code, t.color, t.logo_url,
             COALESCE(SUM(tp.points), 0) as total_points,
             COUNT(DISTINCT CASE WHEN r.position = 1 THEN r.id END) as first_places,
             COUNT(DISTINCT CASE WHEN r.position = 2 THEN r.id END) as second_places,
             COUNT(DISTINCT CASE WHEN r.position = 3 THEN r.id END) as third_places,
             COUNT(DISTINCT tp.competition_id) as scored_competitions_count
      FROM teams t
      LEFT JOIN team_points tp ON tp.team_id = t.id
      LEFT JOIN results r ON r.id = tp.result_id AND r.status = 'PUBLISHED'
      GROUP BY t.id
      ORDER BY total_points DESC, first_places DESC, second_places DESC
    `);
  }

  /**
   * Detailed Team Breakdown for Admin Leaderboard
   */
  static async getAdminTeamBreakdown() {
    const teams = await query<any[]>(`
      SELECT t.id, t.name, t.code, t.color, t.logo_url,
             COALESCE(SUM(tp.points), 0) as total_points,
             COUNT(DISTINCT CASE WHEN r.position = 1 THEN r.id END) as first_places,
             COUNT(DISTINCT CASE WHEN r.position = 2 THEN r.id END) as second_places,
             COUNT(DISTINCT CASE WHEN r.position = 3 THEN r.id END) as third_places,
             COUNT(DISTINCT CASE WHEN r.grade = 'A+' THEN r.id END) as a_plus_count,
             COUNT(DISTINCT CASE WHEN r.grade = 'A' THEN r.id END) as a_count,
             COUNT(DISTINCT CASE WHEN r.grade = 'B' THEN r.id END) as b_count,
             COUNT(DISTINCT CASE WHEN r.grade = 'C' THEN r.id END) as c_count,
             COUNT(DISTINCT tp.competition_id) as scored_competitions_count
      FROM teams t
      LEFT JOIN team_points tp ON tp.team_id = t.id
      LEFT JOIN results r ON r.id = tp.result_id AND r.status = 'PUBLISHED'
      GROUP BY t.id
      ORDER BY total_points DESC, first_places DESC, second_places DESC
    `);

    // Group breakdown (points per team per programme_group)
    const groupRows = await query<any[]>(`
      SELECT t.id as team_id, t.name as team_name,
             pg.id as group_id, pg.name as group_name, pg.code as group_code,
             COALESCE(SUM(tp.points), 0) as points
      FROM teams t
      CROSS JOIN programme_groups pg
      LEFT JOIN competitions c ON c.programme_group_id = pg.id
      LEFT JOIN team_points tp ON tp.team_id = t.id AND tp.competition_id = c.id
      GROUP BY t.id, pg.id
      ORDER BY pg.display_order ASC, t.id ASC
    `);

    // Type breakdown (points per team per competition_type)
    const typeRows = await query<any[]>(`
      SELECT t.id as team_id, t.name as team_name,
             ct.id as type_id, ct.name as type_name,
             COALESCE(SUM(tp.points), 0) as points
      FROM teams t
      CROSS JOIN competition_types ct
      LEFT JOIN competitions c ON c.competition_type_id = ct.id
      LEFT JOIN team_points tp ON tp.team_id = t.id AND tp.competition_id = c.id
      GROUP BY t.id, ct.id
      ORDER BY ct.id ASC, t.id ASC
    `);

    return {
      teams,
      groupBreakdown: groupRows,
      typeBreakdown: typeRows,
    };
  }

  /**
   * Detailed Individual Contestant Leaderboard
   */
  static async getAdminIndividualLeaderboard() {
    const participants = await query<any[]>(`
      SELECT 
        p.id as participant_id,
        p.participant_code,
        u.name as participant_name,
        t.id as team_id,
        t.name as team_name,
        t.code as team_code,
        t.color as team_color,
        pc.id as category_id,
        pc.name as category_name,
        pc.code as category_code,
        COALESCE(SUM(CASE WHEN c.participation_type != 'GROUP' THEN r.points_awarded ELSE 0 END), 0) as total_points,
        COUNT(CASE WHEN c.participation_type != 'GROUP' AND r.id IS NOT NULL THEN 1 END) as scored_events_count,
        COUNT(CASE WHEN c.participation_type != 'GROUP' AND r.position = 1 THEN 1 END) as first_places,
        COUNT(CASE WHEN c.participation_type != 'GROUP' AND r.position = 2 THEN 1 END) as second_places,
        COUNT(CASE WHEN c.participation_type != 'GROUP' AND r.position = 3 THEN 1 END) as third_places,
        COUNT(CASE WHEN c.participation_type != 'GROUP' AND r.grade = 'A+' THEN 1 END) as a_plus_count,
        COUNT(CASE WHEN c.participation_type != 'GROUP' AND r.grade = 'A' THEN 1 END) as a_count,
        COUNT(CASE WHEN c.participation_type != 'GROUP' AND r.grade = 'B' THEN 1 END) as b_count,
        COUNT(CASE WHEN c.participation_type != 'GROUP' AND r.grade = 'C' THEN 1 END) as c_count
      FROM participants p
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      JOIN participant_categories pc ON pc.id = p.category_id
      LEFT JOIN results r ON r.participant_id = p.id AND r.status = 'PUBLISHED'
      LEFT JOIN competitions c ON c.id = r.competition_id
      GROUP BY p.id
      ORDER BY total_points DESC, first_places DESC, second_places DESC, third_places DESC, a_plus_count DESC, u.name ASC
    `);

    // Fetch the specific event results per participant
    const results = await query<any[]>(`
      SELECT 
        r.id as result_id,
        r.participant_id,
        r.competition_id,
        c.programme_number,
        c.name as competition_name,
        c.competition_code,
        pg.name as group_name,
        pg.code as group_code,
        ct.name as competition_type,
        r.raw_marks,
        r.grade,
        r.grade_marks,
        r.position,
        r.position_points,
        r.final_score,
        r.points_awarded,
        r.published_at
      FROM results r
      JOIN competitions c ON c.id = r.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      WHERE r.status = 'PUBLISHED'
      ORDER BY r.published_at DESC, c.programme_number ASC
    `);

    const resultsMap = new Map<number, any[]>();
    for (const res of results) {
      if (!resultsMap.has(res.participant_id)) {
        resultsMap.set(res.participant_id, []);
      }
      resultsMap.get(res.participant_id)!.push(res);
    }

    const enriched = participants.map((p) => ({
      ...p,
      events: resultsMap.get(p.participant_id) || [],
    }));

    return enriched;
  }

  /**
   * Chronological Points Log for All Published Results
   */
  static async getPointsLog() {
    return query<any[]>(`
      SELECT 
        tp.id as point_id,
        tp.points,
        tp.created_at,
        c.id as competition_id,
        c.programme_number,
        c.name as competition_name,
        c.competition_code,
        pg.name as group_name,
        pg.code as group_code,
        ct.name as competition_type,
        t.id as team_id,
        t.name as team_name,
        t.code as team_code,
        t.color as team_color,
        p.id as participant_id,
        p.participant_code,
        u.name as participant_name,
        r.grade,
        r.grade_marks,
        r.position,
        r.position_points,
        r.raw_marks,
        r.published_at
      FROM team_points tp
      JOIN competitions c ON c.id = tp.competition_id
      JOIN teams t ON t.id = tp.team_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      LEFT JOIN results r ON r.id = tp.result_id
      LEFT JOIN participants p ON p.id = r.participant_id
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY tp.created_at DESC, c.programme_number ASC
    `);
  }

  /**
   * Recalculates and re-syncs all team points from published results
   */
  static async recalculatePoints(adminUserId: number) {
    await query('DELETE FROM team_points');
    await query(`
      INSERT INTO team_points (team_id, competition_id, result_id, points)
      SELECT team_id, competition_id, id, points_awarded
      FROM results
      WHERE status = 'PUBLISHED' AND team_id IS NOT NULL AND points_awarded > 0
    `);
    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, new_data)
      VALUES (?, 'POINTS_RECALCULATED', 'team_points', JSON_OBJECT('triggered_at', NOW()))
    `, [adminUserId]);

    return { success: true, message: 'All team and individual points recalculated and synchronized successfully.' };
  }
}
