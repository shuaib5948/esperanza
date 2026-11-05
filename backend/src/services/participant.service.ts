import { ParticipantRepository } from '../repositories/participant.repository.js';
import { query } from '../database/connection.js';

export class ParticipantService {
  static async getAll(filters: any) {
    return ParticipantRepository.findAll(filters);
  }

  static async getById(id: number) {
    const part = await ParticipantRepository.findById(id);
    if (!part) {
      throw { statusCode: 404, code: 'PARTICIPANT_NOT_FOUND', message: 'Participant not found' };
    }
    return part;
  }

  static async getByUserId(userId: number) {
    const part = await ParticipantRepository.findByUserId(userId);
    if (!part) {
      throw { statusCode: 404, code: 'PARTICIPANT_NOT_FOUND', message: 'Participant record not found' };
    }
    return part;
  }

  static async create(data: any) {
    const id = await ParticipantRepository.create(data);
    return this.getById(id);
  }

  static async update(id: number, data: any) {
    await this.getById(id);
    await ParticipantRepository.update(id, data);
    return this.getById(id);
  }

  static async delete(id: number) {
    await this.getById(id);
    await ParticipantRepository.delete(id);
  }

  static async getRegistrations(participantId: number) {
    await this.getById(participantId);
    return query(`
      SELECT 
        COALESCE(r.id, ep.id) as id,
        c.id as competition_id,
        c.name as competition_name,
        c.competition_code,
        c.programme_number,
        COALESCE(c.participation_type, 'INDIVIDUAL') as participation_type,
        c.status as competition_status,
        pg.name as programme_group,
        COALESCE(ct.name, 'STAGE') as competition_type,
        ce.entry_code,
        COALESCE(r.status, ce.status, 'ASSIGNED') as status,
        s.status as schedule_status,
        s.start_at,
        s.end_at,
        v.name as venue_name,
        sq.stage_status,
        sq.check_in_status,
        sq.queue_order,
        res.position,
        res.status as result_status
      FROM entry_participants ep
      JOIN competition_entries ce ON ce.id = ep.entry_id AND ce.status != 'CANCELLED'
      JOIN competitions c ON c.id = ce.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      LEFT JOIN registrations r ON r.competition_id = c.id AND r.participant_id = ep.participant_id
      LEFT JOIN schedules s ON s.competition_id = c.id
      LEFT JOIN venues v ON v.id = s.venue_id
      LEFT JOIN stage_queue sq ON sq.competition_id = c.id AND sq.participant_id = ep.participant_id
      LEFT JOIN results res ON res.competition_id = c.id AND (res.participant_id = ep.participant_id OR (c.participation_type IN ('GROUP', 'TEAM') AND res.team_id = ce.team_id))
      WHERE ep.participant_id = ?
      
      UNION
      
      SELECT 
        r.id as id,
        c.id as competition_id,
        c.name as competition_name,
        c.competition_code,
        c.programme_number,
        COALESCE(c.participation_type, 'INDIVIDUAL') as participation_type,
        c.status as competition_status,
        pg.name as programme_group,
        COALESCE(ct.name, 'STAGE') as competition_type,
        NULL as entry_code,
        r.status as status,
        s.status as schedule_status,
        s.start_at,
        s.end_at,
        v.name as venue_name,
        sq.stage_status,
        sq.check_in_status,
        sq.queue_order,
        res.position,
        res.status as result_status
      FROM registrations r
      JOIN competitions c ON c.id = r.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      LEFT JOIN schedules s ON s.competition_id = c.id
      LEFT JOIN venues v ON v.id = s.venue_id
      LEFT JOIN stage_queue sq ON sq.competition_id = c.id AND sq.participant_id = r.participant_id
      LEFT JOIN results res ON res.competition_id = c.id AND res.participant_id = r.participant_id
      WHERE r.participant_id = ? AND r.status != 'CANCELLED'
        AND c.id NOT IN (
          SELECT ce2.competition_id 
          FROM entry_participants ep2 
          JOIN competition_entries ce2 ON ce2.id = ep2.entry_id 
          WHERE ep2.participant_id = ? AND ce2.status != 'CANCELLED'
        )
      ORDER BY programme_number ASC, competition_name ASC
    `, [participantId, participantId, participantId]);
  }

  static async getResults(participantId: number) {
    await this.getById(participantId);
    return query(`
      SELECT res.*, c.name as competition_name, c.competition_code,
             pg.name as programme_group
      FROM results res
      JOIN competitions c ON c.id = res.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      WHERE res.participant_id = ? AND res.status = 'PUBLISHED'
      ORDER BY res.published_at DESC
    `, [participantId]);
  }

  static async getCertificates(participantId: number) {
    await this.getById(participantId);
    return query(`
      SELECT cert.*, c.name as competition_name, c.competition_code, res.position
      FROM certificates cert
      JOIN competitions c ON c.id = cert.competition_id
      JOIN results res ON res.id = cert.result_id
      WHERE cert.participant_id = ? AND cert.status = 'ISSUED'
      ORDER BY cert.issued_at DESC
    `, [participantId]);
  }
}
