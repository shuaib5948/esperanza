import { query } from '../database/connection.js';

export class ReportRepository {
  static async getParticipantsReport() {
    return query(`
      SELECT p.id,
             p.participant_code,
             u.name as participant_name,
             u.email,
             t.name as team_name,
             t.code as team_code,
             cat.name as category_name,
             p.registration_number,
             p.status
      FROM participants p
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      LEFT JOIN participant_categories cat ON cat.id = p.category_id
      ORDER BY t.name ASC, p.participant_code ASC
    `);
  }

  static async getRegistrationsReport() {
    return query(`
      SELECT r.id,
             r.uuid,
             c.programme_number,
             c.name as competition_name,
             pg.name as group_name,
             ct.name as competition_type,
             p.participant_code,
             u.name as participant_name,
             t.name as team_name,
             r.status,
             r.registered_at
      FROM registrations r
      JOIN competitions c ON c.id = r.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      JOIN competition_types ct ON ct.id = c.competition_type_id
      JOIN participants p ON p.id = r.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      ORDER BY c.programme_number ASC, r.id ASC
    `);
  }

  static async getScoresReport() {
    return query(`
      SELECT c.programme_number,
             c.name as competition_name,
             p.participant_code,
             u.name as participant_name,
             t.name as team_name,
             j.judge_code,
             ju.name as judge_name,
             ss.total_marks,
             ss.status as scoresheet_status,
             crit.name as criterion_name,
             crit.max_marks,
             sd.marks as criterion_marks,
             sd.remarks
      FROM score_sheets ss
      JOIN competitions c ON c.id = ss.competition_id
      JOIN participants p ON p.id = ss.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      JOIN judges j ON j.id = ss.judge_id
      JOIN users ju ON ju.id = j.user_id
      LEFT JOIN score_details sd ON sd.score_sheet_id = ss.id
      LEFT JOIN competition_criteria crit ON crit.id = sd.criterion_id
      ORDER BY c.programme_number ASC, p.id ASC, j.id ASC
    `);
  }

  static async getLeaderboardReport() {
    return query(`
      SELECT t.name as team_name,
             t.code as team_code,
             COALESCE(SUM(tp.points), 0) as total_points,
             COUNT(DISTINCT tp.competition_id) as competitions_placed
      FROM teams t
      LEFT JOIN team_points tp ON tp.team_id = t.id
      GROUP BY t.id, t.name, t.code
      ORDER BY total_points DESC, t.name ASC
    `);
  }
}
