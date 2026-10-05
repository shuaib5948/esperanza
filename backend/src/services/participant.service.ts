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
      SELECT r.*, c.name as competition_name, c.competition_code, c.programme_number,
             pg.name as programme_group, ct.name as competition_type,
             s.start_at, s.end_at, v.name as venue_name
      FROM registrations r
      JOIN competitions c ON c.id = r.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      LEFT JOIN schedules s ON s.competition_id = c.id
      LEFT JOIN venues v ON v.id = s.venue_id
      WHERE r.participant_id = ?
      ORDER BY r.registered_at DESC
    `, [participantId]);
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
