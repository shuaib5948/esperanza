import { query } from '../database/connection.js';

export interface TeamRow {
  id: number;
  uuid: string;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  logo_url: string | null;
  leader_user_id: number | null;
  leader_name?: string | null;
  leader_email?: string | null;
  member_count?: number;
  total_points?: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
  updated_at: Date;
}

export class TeamRepository {
  static async findAll(): Promise<TeamRow[]> {
    return query<TeamRow[]>(`
      SELECT t.*, 
             u.name as leader_name, 
             u.email as leader_email,
             COUNT(DISTINCT p.id) as member_count,
             COALESCE(SUM(tp.points), 0) as total_points
      FROM teams t
      LEFT JOIN users u ON u.id = t.leader_user_id
      LEFT JOIN participants p ON p.team_id = t.id AND p.status = 'ACTIVE'
      LEFT JOIN team_points tp ON tp.team_id = t.id
      GROUP BY t.id
      ORDER BY total_points DESC, t.id ASC
    `);
  }

  static async findById(id: number): Promise<TeamRow | null> {
    const rows = await query<TeamRow[]>(`
      SELECT t.*, 
             u.name as leader_name, 
             u.email as leader_email,
             COUNT(DISTINCT p.id) as member_count,
             COALESCE(SUM(tp.points), 0) as total_points
      FROM teams t
      LEFT JOIN users u ON u.id = t.leader_user_id
      LEFT JOIN participants p ON p.team_id = t.id AND p.status = 'ACTIVE'
      LEFT JOIN team_points tp ON tp.team_id = t.id
      WHERE t.id = ?
      GROUP BY t.id
    `, [id]);

    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findByLeaderUserId(userId: number): Promise<TeamRow | null> {
    const rows = await query<TeamRow[]>('SELECT * FROM teams WHERE leader_user_id = ? LIMIT 1', [userId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async update(id: number, data: Partial<TeamRow>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
    if (data.logo_url !== undefined) { fields.push('logo_url = ?'); values.push(data.logo_url); }
    if (data.leader_user_id !== undefined) { fields.push('leader_user_id = ?'); values.push(data.leader_user_id); }

    if (fields.length === 0) return;
    values.push(id);
    await query(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async getMembers(teamId: number): Promise<any[]> {
    return query(`
      SELECT p.*, u.name, u.email, pc.name as category_name
      FROM participants p
      JOIN users u ON u.id = p.user_id
      JOIN participant_categories pc ON pc.id = p.category_id
      WHERE p.team_id = ?
      ORDER BY p.id ASC
    `, [teamId]);
  }

  static async getPointsBreakdown(teamId: number): Promise<any[]> {
    return query(`
      SELECT tp.*, c.name as competition_code, c.name as competition_name, r.position
      FROM team_points tp
      JOIN competitions c ON c.id = tp.competition_id
      LEFT JOIN results r ON r.id = tp.result_id
      WHERE tp.team_id = ?
      ORDER BY tp.created_at DESC
    `, [teamId]);
  }
}
