import crypto from 'crypto';
import { query, withTransaction } from '../database/connection.js';

export interface CompetitionRow {
  id: number;
  uuid: string;
  competition_code: string;
  programme_number: number;
  name: string;
  programme_group_id: number;
  programme_group_name: string;
  programme_group_code: string;
  group_name?: string;
  group_code?: string;
  competition_type_id: number | null;
  competition_type_name: string | null;
  competition_type?: string | null;
  participation_type: 'INDIVIDUAL' | 'GROUP';
  description: string | null;
  rules: string | null;
  max_participants: number | null;
  max_entries_per_team?: number | null;
  registration_open: Date | null;
  registration_close: Date | null;
  status: string;
  schedule_status?: string | null;
  registered_count?: number;
  results_count?: number;
  score_sheets_count?: number;
  draft_results_count?: number;
  verified_results_count?: number;
  published_results_count?: number;
  submitted_at?: Date | string | null;
  created_at: Date;
  updated_at: Date;
}

export class CompetitionRepository {
  static async findAll(filters: {
    programmeGroupId?: number;
    programmeGroupCode?: string;
    programmeGroup?: string;
    competitionTypeId?: number;
    status?: string;
    search?: string;
  }): Promise<CompetitionRow[]> {
    const where: string[] = [];
    const params: any[] = [];

    if (filters.programmeGroupId) {
      where.push('c.programme_group_id = ?');
      params.push(filters.programmeGroupId);
    }

    const grp = filters.programmeGroup || filters.programmeGroupCode;
    if (grp && grp !== 'ALL') {
      where.push('(pg.code = ? OR UPPER(pg.name) = UPPER(?))');
      params.push(grp, grp);
    }

    if (filters.competitionTypeId) {
      where.push('c.competition_type_id = ?');
      params.push(filters.competitionTypeId);
    }

    if (filters.status) {
      where.push('c.status = ?');
      params.push(filters.status);
    }

    if (filters.search) {
      where.push('(c.name LIKE ? OR c.competition_code LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    return query<CompetitionRow[]>(`
      SELECT c.*,
             pg.name as programme_group_name,
             pg.code as programme_group_code,
             pg.name as group_name,
             pg.code as group_code,
             ct.name as competition_type_name,
             ct.name as competition_type,
             COUNT(DISTINCT r.id) as registered_count,
             MAX(s.status) as schedule_status,
             COUNT(DISTINCT res.id) as results_count,
             COUNT(DISTINCT ss.id) as score_sheets_count,
             COUNT(DISTINCT CASE WHEN res.status = 'DRAFT' THEN res.id END) as draft_results_count,
             COUNT(DISTINCT CASE WHEN res.status = 'VERIFIED' THEN res.id END) as verified_results_count,
             COUNT(DISTINCT CASE WHEN res.status = 'PUBLISHED' THEN res.id END) as published_results_count,
             COALESCE(MAX(ss.submitted_at), MAX(res.created_at), MAX(s.updated_at), c.updated_at) as submitted_at
      FROM competitions c
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      LEFT JOIN schedules s ON s.competition_id = c.id
      LEFT JOIN registrations r ON r.competition_id = c.id AND r.status = 'ASSIGNED'
      LEFT JOIN results res ON res.competition_id = c.id
      LEFT JOIN score_sheets ss ON ss.competition_id = c.id AND ss.status IN ('SUBMITTED', 'LOCKED')
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.programme_number ASC
    `, params);
  }

  static async findById(id: number): Promise<CompetitionRow | null> {
    const rows = await query<CompetitionRow[]>(`
      SELECT c.*,
             pg.name as programme_group_name,
             pg.code as programme_group_code,
             pg.name as group_name,
             pg.code as group_code,
             ct.name as competition_type_name,
             ct.name as competition_type,
             COUNT(DISTINCT r.id) as registered_count,
             MAX(s.status) as schedule_status,
             COUNT(DISTINCT res.id) as results_count,
             COUNT(DISTINCT ss.id) as score_sheets_count,
             COUNT(DISTINCT CASE WHEN res.status = 'DRAFT' THEN res.id END) as draft_results_count,
             COUNT(DISTINCT CASE WHEN res.status = 'VERIFIED' THEN res.id END) as verified_results_count,
             COUNT(DISTINCT CASE WHEN res.status = 'PUBLISHED' THEN res.id END) as published_results_count
      FROM competitions c
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      LEFT JOIN schedules s ON s.competition_id = c.id
      LEFT JOIN registrations r ON r.competition_id = c.id AND r.status = 'ASSIGNED'
      LEFT JOIN results res ON res.competition_id = c.id
      LEFT JOIN score_sheets ss ON ss.competition_id = c.id AND ss.status IN ('SUBMITTED', 'LOCKED')
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);

    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async create(data: any): Promise<number> {
    const [groupRows] = await query<any[]>('SELECT code FROM programme_groups WHERE id = ?', [data.programme_group_id]);
    const groupCode = groupRows && groupRows.length > 0 ? groupRows[0].code : 'GEN';
    const compCode = `ESP-${groupCode}-${String(data.programme_number).padStart(3, '0')}`;
    const compUuid = crypto.randomUUID();

    const maxEntries = data.max_entries_per_team !== undefined ? data.max_entries_per_team : 1;
    const maxPart = data.participation_type === 'INDIVIDUAL' ? 1 : (data.max_participants || 1);

    const result = await query<any>(`
      INSERT INTO competitions (
        uuid, competition_code, programme_number, name, programme_group_id,
        competition_type_id, participation_type, description, rules,
        max_participants, max_entries_per_team, registration_open, registration_close, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
    `, [
      compUuid,
      compCode,
      data.programme_number,
      data.name,
      data.programme_group_id,
      data.competition_type_id || null,
      data.participation_type || 'INDIVIDUAL',
      data.description || null,
      data.rules || null,
      maxPart,
      maxEntries,
      data.registration_open || null,
      data.registration_close || null,
    ]);

    return result.insertId;
  }

  static async update(id: number, data: Partial<any>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.programme_number !== undefined) { fields.push('programme_number = ?'); values.push(data.programme_number); }
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.programme_group_id !== undefined) { fields.push('programme_group_id = ?'); values.push(data.programme_group_id); }
    if (data.competition_type_id !== undefined) { fields.push('competition_type_id = ?'); values.push(data.competition_type_id); }
    if (data.participation_type !== undefined) {
      fields.push('participation_type = ?');
      values.push(data.participation_type);
      if (data.participation_type === 'INDIVIDUAL' && data.max_participants === undefined) {
        fields.push('max_participants = 1');
      }
    }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.rules !== undefined) { fields.push('rules = ?'); values.push(data.rules); }
    if (data.max_participants !== undefined) { fields.push('max_participants = ?'); values.push(data.max_participants); }
    if (data.max_entries_per_team !== undefined) { fields.push('max_entries_per_team = ?'); values.push(data.max_entries_per_team); }
    if (data.registration_open !== undefined) { fields.push('registration_open = ?'); values.push(data.registration_open); }
    if (data.registration_close !== undefined) { fields.push('registration_close = ?'); values.push(data.registration_close); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return;
    values.push(id);
    await query(`UPDATE competitions SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async delete(id: number): Promise<void> {
    await query('DELETE FROM competitions WHERE id = ?', [id]);
  }

  // Eligibility
  static async getEligibility(competitionId: number): Promise<any[]> {
    return query(`
      SELECT ce.*, pc.name as category_name, pc.code as category_code
      FROM competition_eligibility ce
      JOIN participant_categories pc ON pc.id = ce.participant_category_id
      WHERE ce.competition_id = ?
    `, [competitionId]);
  }

  static async setEligibility(competitionId: number, categoryIds: number[]): Promise<void> {
    return withTransaction(async (conn) => {
      await conn.query('DELETE FROM competition_eligibility WHERE competition_id = ?', [competitionId]);
      for (const catId of categoryIds) {
        await conn.query(
          'INSERT INTO competition_eligibility (competition_id, participant_category_id) VALUES (?, ?)',
          [competitionId, catId]
        );
      }
    });
  }

  // Criteria
  static async getCriteria(competitionId: number): Promise<any[]> {
    return query(`
      SELECT * FROM competition_criteria
      WHERE competition_id = ? AND status = 'ACTIVE'
      ORDER BY display_order ASC, id ASC
    `, [competitionId]);
  }

  static async addCriterion(competitionId: number, data: any): Promise<number> {
    const res = await query<any>(`
      INSERT INTO competition_criteria (competition_id, name, description, max_marks, weight, display_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      competitionId,
      data.name,
      data.description || null,
      data.max_marks,
      data.weight || 1.0,
      data.display_order || 1,
    ]);
    return res.insertId;
  }

  static async updateCriterion(criterionId: number, data: any): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.max_marks !== undefined) { fields.push('max_marks = ?'); values.push(data.max_marks); }
    if (data.weight !== undefined) { fields.push('weight = ?'); values.push(data.weight); }
    if (data.display_order !== undefined) { fields.push('display_order = ?'); values.push(data.display_order); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return;
    values.push(criterionId);
    await query(`UPDATE competition_criteria SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async deleteCriterion(criterionId: number): Promise<void> {
    await query('DELETE FROM competition_criteria WHERE id = ?', [criterionId]);
  }
}
