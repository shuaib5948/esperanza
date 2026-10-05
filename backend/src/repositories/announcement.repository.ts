import { query } from '../database/connection.js';

export interface AnnouncementRecord {
  id: number;
  title: string;
  content: string;
  target_role: string | null;
  target_team_id: number | null;
  published_at: string | null;
  created_by: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
  creator_name?: string;
  target_team_name?: string;
}

export class AnnouncementRepository {
  static async create(data: {
    title: string;
    content: string;
    target_role?: string | null;
    target_team_id?: number | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    created_by: number;
  }): Promise<AnnouncementRecord> {
    const publishedAt = data.status === 'PUBLISHED' ? new Date() : null;
    const result = await query<any>(`
      INSERT INTO announcements (title, content, target_role, target_team_id, published_at, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      data.title,
      data.content,
      data.target_role || null,
      data.target_team_id || null,
      publishedAt,
      data.created_by,
      data.status,
    ]);

    const created = await this.findById(result.insertId);
    return created!;
  }

  static async findById(id: number): Promise<AnnouncementRecord | null> {
    const rows = await query<any[]>(`
      SELECT a.*,
             u.name as creator_name,
             t.name as target_team_name
      FROM announcements a
      JOIN users u ON u.id = a.created_by
      LEFT JOIN teams t ON t.id = a.target_team_id
      WHERE a.id = ?
      LIMIT 1
    `, [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findAllForUser(role?: string, teamId?: number | null): Promise<AnnouncementRecord[]> {
    const conditions: string[] = ["a.status = 'PUBLISHED'"];
    const values: any[] = [];

    // Public visitors: only show announcements without specific role or team restrictions
    if (!role) {
      conditions.push('a.target_role IS NULL AND a.target_team_id IS NULL');
    } else if (role !== 'ADMIN') {
      // Role filtering: show if target_role IS NULL or matches user's role
      conditions.push('(a.target_role IS NULL OR a.target_role = ?)');
      values.push(role);

      // Team filtering: show if target_team_id IS NULL or matches user's team
      if (teamId) {
        conditions.push('(a.target_team_id IS NULL OR a.target_team_id = ?)');
        values.push(teamId);
      } else {
        conditions.push('a.target_team_id IS NULL');
      }
    }

    return query<AnnouncementRecord[]>(`
      SELECT a.*,
             u.name as creator_name,
             t.name as target_team_name
      FROM announcements a
      JOIN users u ON u.id = a.created_by
      LEFT JOIN teams t ON t.id = a.target_team_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.created_at DESC
    `, values);
  }

  static async findAllAdmin(): Promise<AnnouncementRecord[]> {
    return query<AnnouncementRecord[]>(`
      SELECT a.*,
             u.name as creator_name,
             t.name as target_team_name
      FROM announcements a
      JOIN users u ON u.id = a.created_by
      LEFT JOIN teams t ON t.id = a.target_team_id
      ORDER BY a.created_at DESC
    `);
  }

  static async update(id: number, data: Partial<AnnouncementRecord>): Promise<AnnouncementRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
    if (data.target_role !== undefined) { fields.push('target_role = ?'); values.push(data.target_role); }
    if (data.target_team_id !== undefined) { fields.push('target_team_id = ?'); values.push(data.target_team_id); }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
      if (data.status === 'PUBLISHED') {
        fields.push('published_at = COALESCE(published_at, NOW())');
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await query(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id: number): Promise<boolean> {
    const result = await query<any>('DELETE FROM announcements WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
