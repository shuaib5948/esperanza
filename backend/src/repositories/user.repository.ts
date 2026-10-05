import { query } from '../database/connection.js';

export interface UserRow {
  id: number;
  uuid: string;
  name: string;
  email: string | null;
  phone: string | null;
  password_hash: string;
  role: 'ADMIN' | 'TEAM_LEADER' | 'PARTICIPANT' | 'JUDGE';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: Date;
  updated_at: Date;
  team_id?: number | null;
  participant_id?: number | null;
  judge_id?: number | null;
}

export class UserRepository {
  static async findByEmail(identifier: string): Promise<UserRow | null> {
    const trimmed = identifier.trim();
    const rows = await query<UserRow[]>(
      `SELECT u.*, 
              t.id as team_id,
              p.id as participant_id,
              j.id as judge_id
       FROM users u
       LEFT JOIN teams t ON t.leader_user_id = u.id
       LEFT JOIN participants p ON p.user_id = u.id
       LEFT JOIN judges j ON j.user_id = u.id
       WHERE u.email = ?
          OR LOWER(u.email) = LOWER(?)
          OR u.email = CONCAT(?, '@esperanza.local')
          OR LOWER(u.email) = CONCAT(LOWER(?), '@esperanza.local')
       LIMIT 1`,
      [trimmed, trimmed, trimmed, trimmed]
    );

    if (!rows || rows.length === 0) return null;
    const user = rows[0];

    // If user is a participant, their team_id comes from the participants table
    if (user.role === 'PARTICIPANT' && user.participant_id) {
      const partRows = await query<any[]>(
        'SELECT team_id FROM participants WHERE id = ?',
        [user.participant_id]
      );
      if (partRows.length > 0) {
        user.team_id = partRows[0].team_id;
      }
    }

    return user;
  }

  static async findById(id: number): Promise<UserRow | null> {
    const rows = await query<UserRow[]>(
      `SELECT u.*, 
              t.id as team_id,
              p.id as participant_id,
              j.id as judge_id
       FROM users u
       LEFT JOIN teams t ON t.leader_user_id = u.id
       LEFT JOIN participants p ON p.user_id = u.id
       LEFT JOIN judges j ON j.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) return null;
    const user = rows[0];

    if (user.role === 'PARTICIPANT' && user.participant_id) {
      const partRows = await query<any[]>(
        'SELECT team_id FROM participants WHERE id = ?',
        [user.participant_id]
      );
      if (partRows.length > 0) {
        user.team_id = partRows[0].team_id;
      }
    }

    return user;
  }

  static async updatePassword(id: number, passwordHash: string): Promise<void> {
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  }
}
