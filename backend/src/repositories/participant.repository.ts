import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../database/connection.js';

export interface ParticipantRow {
  id: number;
  uuid: string;
  user_id: number;
  participant_code: string;
  team_id: number;
  category_id: number;
  registration_number: string | null;
  photo_url: string | null;
  date_of_birth: string | null;
  class_name: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  name: string;
  user_name: string;
  email: string | null;
  team_name: string;
  team_code: string;
  category_name: string;
  category_code: string;
  individual_stage_count?: number;
  individual_offstage_count?: number;
  created_at: Date;
  updated_at: Date;
}

export class ParticipantRepository {
  static async findAll(filters: {
    teamId?: number;
    categoryId?: number;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ participants: ParticipantRow[]; total: number }> {
    const where: string[] = [];
    const params: any[] = [];

    if (filters.teamId) {
      where.push('p.team_id = ?');
      params.push(filters.teamId);
    }

    if (filters.categoryId) {
      where.push('p.category_id = ?');
      params.push(filters.categoryId);
    }

    if (filters.status) {
      where.push('p.status = ?');
      params.push(filters.status);
    }

    if (filters.search) {
      where.push('(u.name LIKE ? OR p.participant_code LIKE ? OR u.email LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRows = await query<any[]>(
      `SELECT COUNT(p.id) as total
       FROM participants p
       JOIN users u ON u.id = p.user_id
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const participants = await query<ParticipantRow[]>(
      `SELECT p.*, 
              u.name, 
              u.name as user_name,
              u.email,
              t.name as team_name,
              t.code as team_code,
              pc.name as category_name,
              pc.code as category_code,
              COUNT(DISTINCT CASE 
                WHEN r.status = 'ASSIGNED' 
                     AND c.participation_type = 'INDIVIDUAL' 
                     AND UPPER(ct.name) = 'STAGE' 
                     AND UPPER(pg.name) NOT IN ('GENERAL', 'GEN')
                THEN r.id 
              END) as individual_stage_count,
              COUNT(DISTINCT CASE 
                WHEN r.status = 'ASSIGNED' 
                     AND c.participation_type = 'INDIVIDUAL' 
                     AND UPPER(ct.name) = 'OFF_STAGE' 
                     AND UPPER(pg.name) NOT IN ('GENERAL', 'GEN')
                THEN r.id 
              END) as individual_offstage_count
       FROM participants p
       JOIN users u ON u.id = p.user_id
       JOIN teams t ON t.id = p.team_id
       JOIN participant_categories pc ON pc.id = p.category_id
       LEFT JOIN registrations r ON r.participant_id = p.id AND r.status = 'ASSIGNED'
       LEFT JOIN competitions c ON c.id = r.competition_id
       LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
       LEFT JOIN programme_groups pg ON pg.id = c.programme_group_id
       ${whereClause}
       GROUP BY p.id
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { participants, total };
  }

  static async findById(id: number): Promise<ParticipantRow | null> {
    const rows = await query<ParticipantRow[]>(
      `SELECT p.*, 
              u.name, 
              u.name as user_name,
              u.email,
              t.name as team_name,
              t.code as team_code,
              pc.name as category_name,
              pc.code as category_code
       FROM participants p
       JOIN users u ON u.id = p.user_id
       JOIN teams t ON t.id = p.team_id
       JOIN participant_categories pc ON pc.id = p.category_id
       WHERE p.id = ?`,
      [id]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findByUserId(userId: number): Promise<ParticipantRow | null> {
    const rows = await query<ParticipantRow[]>(
      `SELECT p.*, 
              u.name, 
              u.name as user_name,
              u.email,
              t.name as team_name,
              t.code as team_code,
              pc.name as category_name,
              pc.code as category_code
       FROM participants p
       JOIN users u ON u.id = p.user_id
       JOIN teams t ON t.id = p.team_id
       JOIN participant_categories pc ON pc.id = p.category_id
       WHERE p.user_id = ?`,
      [userId]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async create(data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    passwordPlain: string;
    teamId: number;
    categoryId: number;
    registrationNumber?: string | null;
    photoUrl?: string | null;
    dateOfBirth?: string | null;
    className?: string | null;
  }): Promise<number> {
    return withTransaction(async (conn) => {
      // 1. Generate unique 3-digit registration number / participant code by category
      let regNumber = (data.registrationNumber || '').trim();
      if (!regNumber) {
        const [catRows] = await conn.query<any[]>('SELECT code, name FROM participant_categories WHERE id = ?', [data.categoryId]);
        const catCode = (catRows[0]?.code || catRows[0]?.name || '').toUpperCase();
        let baseNum = 100;
        if (catCode.includes('J1') || catCode === '1') baseNum = 100;
        else if (catCode.includes('J2') || catCode === '2') baseNum = 200;
        else if (catCode.includes('SEN')) baseNum = 300;
        else baseNum = 300;

        const [existingRows] = await conn.query<any[]>(
          'SELECT registration_number, participant_code FROM participants WHERE category_id = ?',
          [data.categoryId]
        );
        let maxNum = baseNum;
        for (const row of existingRows) {
          const num = parseInt(row.registration_number || row.participant_code?.replace(/\D/g, ''), 10);
          if (!isNaN(num) && num >= baseNum && num < baseNum + 100) {
            if (num > maxNum) maxNum = num;
          }
        }
        regNumber = String(maxNum + 1);
      }

      const participantCode = regNumber;

      // 2. Hash password and insert user (email auto-assigned internally if not provided)
      const userUuid = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(data.passwordPlain, 10);
      const email = data.email || `p${participantCode}@participant.esperanza.local`;

      const [userResult] = await conn.query<any>(
        `INSERT INTO users (uuid, name, email, phone, password_hash, role, status)
         VALUES (?, ?, ?, ?, ?, 'PARTICIPANT', 'ACTIVE')`,
        [userUuid, data.name, email, data.phone || null, passwordHash]
      );
      const userId = userResult.insertId;

      // 3. Insert participant record
      const partUuid = crypto.randomUUID();
      const [partResult] = await conn.query<any>(
        `INSERT INTO participants (
          uuid, user_id, participant_code, team_id, category_id,
          registration_number, photo_url, date_of_birth, class_name, phone, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [
          partUuid,
          userId,
          participantCode,
          data.teamId,
          data.categoryId,
          regNumber,
          data.photoUrl || null,
          data.dateOfBirth || null,
          data.className || null,
          data.phone || null,
        ]
      );

      return partResult.insertId;
    });
  }

  static async update(id: number, data: Partial<any>): Promise<void> {
    return withTransaction(async (conn) => {
      const participant = await this.findById(id);
      if (!participant) return;

      if (data.name) {
        await conn.query('UPDATE users SET name = ? WHERE id = ?', [data.name, participant.user_id]);
      }

      const pFields: string[] = [];
      const pValues: any[] = [];

      if (data.team_id !== undefined) { pFields.push('team_id = ?'); pValues.push(data.team_id); }
      if (data.category_id !== undefined) { pFields.push('category_id = ?'); pValues.push(data.category_id); }
      if (data.phone !== undefined) { pFields.push('phone = ?'); pValues.push(data.phone); }
      if (data.registration_number !== undefined) { pFields.push('registration_number = ?'); pValues.push(data.registration_number); }
      if (data.photo_url !== undefined) { pFields.push('photo_url = ?'); pValues.push(data.photo_url); }
      if (data.date_of_birth !== undefined) { pFields.push('date_of_birth = ?'); pValues.push(data.date_of_birth); }
      if (data.class_name !== undefined) { pFields.push('class_name = ?'); pValues.push(data.class_name); }
      if (data.status !== undefined) { pFields.push('status = ?'); pValues.push(data.status); }

      if (pFields.length > 0) {
        pValues.push(id);
        await conn.query(`UPDATE participants SET ${pFields.join(', ')} WHERE id = ?`, pValues);
      }
    });
  }

  static async delete(id: number): Promise<void> {
    const part = await this.findById(id);
    if (!part) return;
    await query('DELETE FROM users WHERE id = ?', [part.user_id]);
  }
}
