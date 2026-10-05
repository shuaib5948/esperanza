import { CompetitionRepository, CompetitionRow } from '../repositories/competition.repository.js';
import { query } from '../database/connection.js';

export class CompetitionService {
  static async getAll(filters: any) {
    return CompetitionRepository.findAll(filters);
  }

  static async getById(id: number) {
    const comp = await CompetitionRepository.findById(id);
    if (!comp) {
      throw { statusCode: 404, code: 'COMPETITION_NOT_FOUND', message: 'Competition not found' };
    }

    const [eligibility, criteria, schedule, judges] = await Promise.all([
      CompetitionRepository.getEligibility(id),
      CompetitionRepository.getCriteria(id),
      query('SELECT s.*, v.name as venue_name FROM schedules s LEFT JOIN venues v ON v.id = s.venue_id WHERE s.competition_id = ?', [id]),
      query('SELECT cj.*, j.judge_code, u.name as judge_name FROM competition_judges cj JOIN judges j ON j.id = cj.judge_id JOIN users u ON u.id = j.user_id WHERE cj.competition_id = ? AND cj.status = "ASSIGNED"', [id]),
    ]);

    return {
      ...comp,
      eligibility,
      criteria,
      schedule: schedule.length > 0 ? schedule[0] : null,
      judges,
    };
  }

  static async create(data: any) {
    const id = await CompetitionRepository.create(data);
    return this.getById(id);
  }

  static async update(id: number, data: any) {
    const existing = await this.getById(id);
    if (existing.status === 'COMPLETED') {
      throw {
        statusCode: 400,
        code: 'COMPETITION_ALREADY_COMPLETED',
        message: 'This programme has already been completed. Editing completed programmes is disabled.',
      };
    }
    await CompetitionRepository.update(id, data);
    return this.getById(id);
  }

  static async delete(id: number) {
    const existing = await this.getById(id);
    if (existing.status === 'COMPLETED') {
      throw {
        statusCode: 400,
        code: 'COMPETITION_ALREADY_COMPLETED',
        message: 'Cannot delete a completed programme.',
      };
    }
    await CompetitionRepository.delete(id);
  }

  static async setStatus(id: number, status: string) {
    const existing = await this.getById(id);
    if (existing.status === 'COMPLETED') {
      throw {
        statusCode: 400,
        code: 'COMPETITION_ALREADY_COMPLETED',
        message: 'This programme has already been completed. Status changes are disabled.',
      };
    }
    await CompetitionRepository.update(id, { status });
    return this.getById(id);
  }

  static async lockAllRegistrations() {
    await query('UPDATE competitions SET status = "CLOSED" WHERE status = "ACTIVE"');
    return { locked: true };
  }

  static async unlockAllRegistrations() {
    await query('UPDATE competitions SET status = "ACTIVE" WHERE status = "CLOSED"');
    return { unlocked: true };
  }

  // Eligibility
  static async getEligibility(id: number) {
    await this.getById(id);
    return CompetitionRepository.getEligibility(id);
  }

  static async setEligibility(id: number, categoryIds: number[]) {
    await this.getById(id);
    await CompetitionRepository.setEligibility(id, categoryIds);
    return CompetitionRepository.getEligibility(id);
  }

  // Criteria
  static async getCriteria(id: number) {
    await this.getById(id);
    return CompetitionRepository.getCriteria(id);
  }

  static async addCriterion(id: number, data: any) {
    await this.getById(id);
    const critId = await CompetitionRepository.addCriterion(id, data);
    return { id: critId, ...data };
  }

  static async updateCriterion(criterionId: number, data: any) {
    await CompetitionRepository.updateCriterion(criterionId, data);
    const [rows] = await query<any[]>('SELECT * FROM competition_criteria WHERE id = ?', [criterionId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async deleteCriterion(criterionId: number) {
    await CompetitionRepository.deleteCriterion(criterionId);
  }

  static async getParticipants(competitionId: number) {
    await this.getById(competitionId);
    return query(`
      SELECT r.id as registration_id, r.status as registration_status, r.registered_at,
             p.id as participant_id, p.participant_code, p.registration_number,
             u.name as participant_name, u.email as participant_email,
             t.id as team_id, t.name as team_name, t.code as team_code,
             pc.name as category_name
      FROM registrations r
      JOIN participants p ON p.id = r.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      JOIN participant_categories pc ON pc.id = p.category_id
      WHERE r.competition_id = ?
      ORDER BY r.id ASC
    `, [competitionId]);
  }

  static async getTypes() {
    return query('SELECT id, name FROM competition_types ORDER BY id ASC');
  }
}

