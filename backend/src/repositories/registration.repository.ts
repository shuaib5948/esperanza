import crypto from 'crypto';
import { query } from '../database/connection.js';

export class RegistrationRepository {
  static async findAll(filters: {
    competitionId?: number;
    participantId?: number;
    teamId?: number;
    status?: string;
  }) {
    const where: string[] = [];
    const params: any[] = [];

    if (filters.competitionId) {
      where.push('r.competition_id = ?');
      params.push(filters.competitionId);
    }

    if (filters.participantId) {
      where.push('r.participant_id = ?');
      params.push(filters.participantId);
    }

    if (filters.teamId) {
      where.push('p.team_id = ?');
      params.push(filters.teamId);
    }

    if (filters.status) {
      where.push('r.status = ?');
      params.push(filters.status);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    return query(`
      SELECT r.*,
             c.name as competition_name,
             c.competition_code,
             c.programme_number,
             pg.name as programme_group,
             ct.name as competition_type,
             p.participant_code,
             p.registration_number,
             u.name as participant_name,
             u.email as participant_email,
             t.id as team_id,
             t.name as team_name,
             t.code as team_code,
             pc.name as category_name
      FROM registrations r
      JOIN competitions c ON c.id = r.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      JOIN participants p ON p.id = r.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      JOIN participant_categories pc ON pc.id = p.category_id
      ${whereClause}
      ORDER BY r.registered_at DESC
    `, params);
  }

  static async findById(id: number) {
    const rows = await query<any[]>(`
      SELECT r.*,
             c.name as competition_name,
             c.competition_code,
             p.team_id,
             p.category_id,
             p.user_id
      FROM registrations r
      JOIN competitions c ON c.id = r.competition_id
      JOIN participants p ON p.id = r.participant_id
      WHERE r.id = ?
    `, [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findByCompetitionAndParticipant(competitionId: number, participantId: number) {
    const rows = await query<any[]>(`
      SELECT * FROM registrations
      WHERE competition_id = ? AND participant_id = ?
    `, [competitionId, participantId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async create(data: {
    competitionId: number;
    participantId: number;
    registeredByUserId: number;
  }) {
    const regUuid = crypto.randomUUID();
    const res = await query<any>(`
      INSERT INTO registrations (uuid, competition_id, participant_id, registered_by, status)
      VALUES (?, ?, ?, ?, 'ASSIGNED')
      ON DUPLICATE KEY UPDATE status = 'ASSIGNED', registered_by = VALUES(registered_by)
    `, [regUuid, data.competitionId, data.participantId, data.registeredByUserId]);

    if (res.insertId) return res.insertId;
    const existing = await this.findByCompetitionAndParticipant(data.competitionId, data.participantId);
    return existing ? existing.id : 0;
  }

  static async updateStatus(id: number, status: string) {
    await query('UPDATE registrations SET status = ? WHERE id = ?', [status, id]);
  }

  static async delete(id: number) {
    await query('DELETE FROM registrations WHERE id = ?', [id]);
  }
}
