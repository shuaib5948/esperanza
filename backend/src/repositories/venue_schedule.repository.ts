import { query } from '../database/connection.js';
import { toSqlDatetime } from '../utils/date.js';

export class VenueRepository {
  static async findAll() {
    return query('SELECT * FROM venues ORDER BY id ASC');
  }

  static async findById(id: number) {
    const rows = await query<any[]>('SELECT * FROM venues WHERE id = ?', [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async create(data: any) {
    const res = await query<any>(
      'INSERT INTO venues (name, code, location, capacity) VALUES (?, ?, ?, ?)',
      [data.name, data.code, data.location || null, data.capacity || null]
    );
    return res.insertId;
  }

  static async update(id: number, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
    if (data.location !== undefined) { fields.push('location = ?'); values.push(data.location); }
    if (data.capacity !== undefined) { fields.push('capacity = ?'); values.push(data.capacity); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return;
    values.push(id);
    await query(`UPDATE venues SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async delete(id: number) {
    await query('DELETE FROM venues WHERE id = ?', [id]);
  }
}

export class ScheduleRepository {
  static async findAll() {
    return query(`
      SELECT s.*, 
             c.name as competition_name, 
             c.competition_code,
             c.programme_number,
             pg.name as programme_group,
             v.name as venue_name,
             v.code as venue_code,
             (
               SELECT COUNT(*) 
               FROM score_sheets ss 
               WHERE ss.competition_id = s.competition_id 
                 AND ss.status IN ('SUBMITTED', 'LOCKED')
             ) as submitted_scores_count,
             (
               SELECT COUNT(*) 
               FROM stage_queue sq 
               WHERE sq.competition_id = s.competition_id 
                 AND sq.stage_status != 'ABSENT'
             ) as total_performers_count,
             (
               SELECT COUNT(*) 
               FROM results res 
               WHERE res.competition_id = s.competition_id 
                 AND res.status = 'PUBLISHED'
             ) as published_results_count
      FROM schedules s
      JOIN competitions c ON c.id = s.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN venues v ON v.id = s.venue_id
      ORDER BY s.start_at ASC
    `);
  }

  static async findById(id: number) {
    const rows = await query<any[]>(`
      SELECT s.*, 
             c.name as competition_name, 
             c.competition_code,
             c.programme_number,
             v.name as venue_name,
             (
               SELECT COUNT(*) 
               FROM score_sheets ss 
               WHERE ss.competition_id = s.competition_id 
                 AND ss.status IN ('SUBMITTED', 'LOCKED')
             ) as submitted_scores_count,
             (
               SELECT COUNT(*) 
               FROM stage_queue sq 
               WHERE sq.competition_id = s.competition_id 
                 AND sq.stage_status != 'ABSENT'
             ) as total_performers_count,
             (
               SELECT COUNT(*) 
               FROM results res 
               WHERE res.competition_id = s.competition_id 
                 AND res.status = 'PUBLISHED'
             ) as published_results_count
      FROM schedules s
      JOIN competitions c ON c.id = s.competition_id
      LEFT JOIN venues v ON v.id = s.venue_id
      WHERE s.id = ?
    `, [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findByCompetitionId(competitionId: number) {
    const rows = await query<any[]>(`
      SELECT s.*, 
             v.name as venue_name,
             (
               SELECT COUNT(*) 
               FROM score_sheets ss 
               WHERE ss.competition_id = s.competition_id 
                 AND ss.status IN ('SUBMITTED', 'LOCKED')
             ) as submitted_scores_count,
             (
               SELECT COUNT(*) 
               FROM stage_queue sq 
               WHERE sq.competition_id = s.competition_id 
                 AND sq.stage_status != 'ABSENT'
             ) as total_performers_count,
             (
               SELECT COUNT(*) 
               FROM results res 
               WHERE res.competition_id = s.competition_id 
                 AND res.status = 'PUBLISHED'
             ) as published_results_count
      FROM schedules s
      LEFT JOIN venues v ON v.id = s.venue_id
      WHERE s.competition_id = ?
    `, [competitionId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async create(data: any) {
    const res = await query<any>(`
      INSERT INTO schedules (competition_id, venue_id, start_at, end_at, stage_order, status)
      VALUES (?, ?, ?, ?, ?, 'SCHEDULED')
    `, [
      data.competition_id,
      data.venue_id || null,
      toSqlDatetime(data.start_at),
      toSqlDatetime(data.end_at),
      data.stage_order || null,
    ]);
    return res.insertId;
  }

  static async update(id: number, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.venue_id !== undefined) { fields.push('venue_id = ?'); values.push(data.venue_id); }
    if (data.start_at !== undefined) { fields.push('start_at = ?'); values.push(toSqlDatetime(data.start_at)); }
    if (data.end_at !== undefined) { fields.push('end_at = ?'); values.push(toSqlDatetime(data.end_at)); }
    if (data.stage_order !== undefined) { fields.push('stage_order = ?'); values.push(data.stage_order); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return;
    values.push(id);
    await query(`UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async delete(id: number) {
    await query('DELETE FROM schedules WHERE id = ?', [id]);
  }

  /**
   * Conflict Detection: Venue Timetable Overlap
   */
  static async checkVenueConflict(venueId: number, startAt: string, endAt: string, excludeScheduleId?: number) {
    const formattedStart = toSqlDatetime(startAt);
    const formattedEnd = toSqlDatetime(endAt);
    const excludeClause = excludeScheduleId ? 'AND s.id != ?' : '';
    const params = excludeScheduleId
      ? [venueId, formattedEnd, formattedStart, excludeScheduleId]
      : [venueId, formattedEnd, formattedStart];

    const rows = await query<any[]>(`
      SELECT s.*, c.name as competition_name
      FROM schedules s
      JOIN competitions c ON c.id = s.competition_id
      WHERE s.venue_id = ?
        AND s.status != 'CANCELLED'
        AND s.start_at < ?
        AND s.end_at > ?
        ${excludeClause}
    `, params);

    return rows;
  }

  /**
   * Conflict Detection: Participant Double Booking Overlap
   */
  static async checkParticipantScheduleConflict(participantId: number, competitionId: number) {
    // Get schedule of target competition
    const targetSched = await this.findByCompetitionId(competitionId);
    if (!targetSched) return []; // not scheduled yet, no clash

    // Check if participant is registered for any other competition with an overlapping schedule
    return query<any[]>(`
      SELECT s.*, c.name as competition_name
      FROM registrations r
      JOIN competitions c ON c.id = r.competition_id
      JOIN schedules s ON s.competition_id = c.id
      WHERE r.participant_id = ?
        AND r.status = 'ASSIGNED'
        AND c.id != ?
        AND s.status != 'CANCELLED'
        AND s.start_at < ?
        AND s.end_at > ?
    `, [participantId, competitionId, targetSched.end_at, targetSched.start_at]);
  }
}
