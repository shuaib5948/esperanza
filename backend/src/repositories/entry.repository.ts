import crypto from 'crypto';
import { query, withTransaction } from '../database/connection.js';

export interface CompetitionEntryRow {
  id: number;
  uuid: string;
  competition_id: number;
  competition_name: string;
  competition_code: string;
  programme_number: number;
  programme_group: string;
  participation_type: 'INDIVIDUAL' | 'GROUP';
  max_participants: number;
  max_entries_per_team: number;
  team_id: number;
  team_name: string;
  team_code: string;
  entry_code: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CHECK_IN' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  participant_count: number;
  created_at: Date;
  updated_at: Date;
  participants?: EntryParticipantRow[];
}

export interface EntryParticipantRow {
  id: number;
  entry_id: number;
  participant_id: number;
  participant_name: string;
  participant_code: string;
  category_id: number;
  category_name: string;
  category_code: string;
  team_id: number;
  team_name: string;
  attendance_status: 'PENDING' | 'PRESENT' | 'ABSENT' | 'EXCUSED';
  created_at: Date;
  updated_at: Date;
}

export class EntryRepository {
  static async findById(id: number): Promise<CompetitionEntryRow | null> {
    const rows = await query<any[]>(`
      SELECT ce.*,
             c.name as competition_name,
             c.competition_code,
             c.programme_number,
             pg.name as programme_group,
             c.participation_type,
             c.max_participants,
             c.max_entries_per_team,
             t.name as team_name,
             t.code as team_code,
             COUNT(ep.id) as participant_count
      FROM competition_entries ce
      JOIN competitions c ON c.id = ce.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      JOIN teams t ON t.id = ce.team_id
      LEFT JOIN entry_participants ep ON ep.entry_id = ce.id
      WHERE ce.id = ?
      GROUP BY ce.id
    `, [id]);

    if (!rows || rows.length === 0) return null;
    const entry = rows[0] as CompetitionEntryRow;
    entry.participants = await this.getEntryParticipants(entry.id);
    return entry;
  }

  static async findByCode(entryCode: string): Promise<CompetitionEntryRow | null> {
    const rows = await query<any[]>(`
      SELECT ce.*,
             c.name as competition_name,
             c.competition_code,
             c.programme_number,
             pg.name as programme_group,
             c.participation_type,
             c.max_participants,
             c.max_entries_per_team,
             t.name as team_name,
             t.code as team_code,
             COUNT(ep.id) as participant_count
      FROM competition_entries ce
      JOIN competitions c ON c.id = ce.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      JOIN teams t ON t.id = ce.team_id
      LEFT JOIN entry_participants ep ON ep.entry_id = ce.id
      WHERE ce.entry_code = ?
      GROUP BY ce.id
    `, [entryCode]);

    if (!rows || rows.length === 0) return null;
    const entry = rows[0] as CompetitionEntryRow;
    entry.participants = await this.getEntryParticipants(entry.id);
    return entry;
  }

  static async findByCompetitionAndTeam(competitionId: number, teamId: number): Promise<CompetitionEntryRow[]> {
    const rows = await query<any[]>(`
      SELECT ce.*,
             c.name as competition_name,
             c.competition_code,
             c.programme_number,
             pg.name as programme_group,
             c.participation_type,
             c.max_participants,
             c.max_entries_per_team,
             t.name as team_name,
             t.code as team_code,
             COUNT(ep.id) as participant_count
      FROM competition_entries ce
      JOIN competitions c ON c.id = ce.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      JOIN teams t ON t.id = ce.team_id
      LEFT JOIN entry_participants ep ON ep.entry_id = ce.id
      WHERE ce.competition_id = ? AND ce.team_id = ? AND ce.status != 'CANCELLED'
      GROUP BY ce.id
      ORDER BY ce.created_at ASC
    `, [competitionId, teamId]);

    for (const r of rows) {
      r.participants = await this.getEntryParticipants(r.id);
    }

    return rows as CompetitionEntryRow[];
  }

  static async getEntryParticipants(entryId: number): Promise<EntryParticipantRow[]> {
    return query<EntryParticipantRow[]>(`
      SELECT ep.id,
             ep.entry_id,
             ep.participant_id,
             u.name as participant_name,
             p.participant_code,
             p.category_id,
             pc.name as category_name,
             pc.code as category_code,
             p.team_id,
             t.name as team_name,
             ep.attendance_status,
             ep.created_at,
             ep.updated_at
      FROM entry_participants ep
      JOIN participants p ON p.id = ep.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN participant_categories pc ON pc.id = p.category_id
      JOIN teams t ON t.id = p.team_id
      WHERE ep.entry_id = ?
      ORDER BY ep.id ASC
    `, [entryId]);
  }

  static async countActiveTeamEntries(competitionId: number, teamId: number): Promise<number> {
    const rows = await query<any[]>(`
      SELECT COUNT(*) as count
      FROM competition_entries
      WHERE competition_id = ? AND team_id = ? AND status != 'CANCELLED'
    `, [competitionId, teamId]);
    return Number(rows[0]?.count || 0);
  }

  static async isParticipantInCompetition(competitionId: number, participantId: number, excludeEntryId?: number): Promise<boolean> {
    const params: any[] = [competitionId, participantId];
    let extra = '';
    if (excludeEntryId) {
      extra = ' AND ce.id != ?';
      params.push(excludeEntryId);
    }
    const rows = await query<any[]>(`
      SELECT COUNT(*) as count
      FROM entry_participants ep
      JOIN competition_entries ce ON ce.id = ep.entry_id
      WHERE ce.competition_id = ? AND ep.participant_id = ? AND ce.status != 'CANCELLED'${extra}
    `, params);
    return Number(rows[0]?.count || 0) > 0;
  }

  static async createEntryWithParticipants(data: {
    competitionId: number;
    teamId: number;
    entryCode: string;
    participantIds: number[];
    status?: 'DRAFT' | 'CONFIRMED';
  }): Promise<CompetitionEntryRow> {
    return withTransaction(async (conn) => {
      const uuid = crypto.randomUUID();
      const status = data.status || 'CONFIRMED';

      const [entryResult] = await conn.query<any>(`
        INSERT INTO competition_entries (uuid, competition_id, team_id, entry_code, status)
        VALUES (?, ?, ?, ?, ?)
      `, [uuid, data.competitionId, data.teamId, data.entryCode, status]);

      const entryId = entryResult.insertId;

      for (const pId of data.participantIds) {
        await conn.query(`
          INSERT INTO entry_participants (entry_id, participant_id, attendance_status)
          VALUES (?, ?, 'PENDING')
        `, [entryId, pId]);
      }

      // Also create legacy registrations for backward compatibility with existing tables
      for (const pId of data.participantIds) {
        const [existing] = await conn.query<any[]>(
          'SELECT id FROM registrations WHERE competition_id = ? AND participant_id = ?',
          [data.competitionId, pId]
        );
        if (existing.length === 0) {
          const regUuid = crypto.randomUUID();
          await conn.query(`
            INSERT INTO registrations (uuid, competition_id, participant_id, status, registered_by)
            VALUES (?, ?, ?, 'ASSIGNED', 1)
          `, [regUuid, data.competitionId, pId]);
        } else {
          await conn.query(`
            UPDATE registrations SET status = 'ASSIGNED' WHERE id = ?
          `, [existing[0].id]);
        }
      }

      const [rows] = await conn.query<any[]>(`
        SELECT ce.*,
               c.name as competition_name,
               c.competition_code,
               c.programme_number,
               pg.name as programme_group,
               c.participation_type,
               c.max_participants,
               c.max_entries_per_team,
               t.name as team_name,
               t.code as team_code,
               COUNT(ep.id) as participant_count
        FROM competition_entries ce
        JOIN competitions c ON c.id = ce.competition_id
        JOIN programme_groups pg ON pg.id = c.programme_group_id
        JOIN teams t ON t.id = ce.team_id
        LEFT JOIN entry_participants ep ON ep.entry_id = ce.id
        WHERE ce.id = ?
        GROUP BY ce.id
      `, [entryId]);

      const entry = rows[0] as CompetitionEntryRow;
      const [parts] = await conn.query<any[]>(`
        SELECT ep.id,
               ep.entry_id,
               ep.participant_id,
               u.name as participant_name,
               p.participant_code,
               p.category_id,
               pc.name as category_name,
               pc.code as category_code,
               p.team_id,
               t.name as team_name,
               ep.attendance_status,
               ep.created_at,
               ep.updated_at
        FROM entry_participants ep
        JOIN participants p ON p.id = ep.participant_id
        JOIN users u ON u.id = p.user_id
        JOIN participant_categories pc ON pc.id = p.category_id
        JOIN teams t ON t.id = p.team_id
        WHERE ep.entry_id = ?
        ORDER BY ep.id ASC
      `, [entryId]);
      entry.participants = parts;
      return entry;
    });
  }

  static async addParticipantToEntry(entryId: number, participantId: number): Promise<void> {
    await withTransaction(async (conn) => {
      await conn.query(`
        INSERT INTO entry_participants (entry_id, participant_id, attendance_status)
        VALUES (?, ?, 'PENDING')
      `, [entryId, participantId]);

      // Backward compatibility with registrations
      const [entry] = await conn.query<any[]>('SELECT competition_id FROM competition_entries WHERE id = ?', [entryId]);
      if (entry && entry.length > 0) {
        const compId = entry[0].competition_id;
        const [existing] = await conn.query<any[]>(
          'SELECT id FROM registrations WHERE competition_id = ? AND participant_id = ?',
          [compId, participantId]
        );
        if (existing.length === 0) {
          await conn.query(`
            INSERT INTO registrations (uuid, competition_id, participant_id, status, registered_by)
            VALUES (?, ?, ?, 'ASSIGNED', 1)
          `, [crypto.randomUUID(), compId, participantId]);
        } else {
          await conn.query(`
            UPDATE registrations SET status = 'ASSIGNED' WHERE id = ?
          `, [existing[0].id]);
        }
      }
    });
  }

  static async removeParticipantFromEntry(entryId: number, participantId: number): Promise<void> {
    await withTransaction(async (conn) => {
      await conn.query(`
        DELETE FROM entry_participants WHERE entry_id = ? AND participant_id = ?
      `, [entryId, participantId]);

      // Also update legacy registration status
      const [entry] = await conn.query<any[]>('SELECT competition_id FROM competition_entries WHERE id = ?', [entryId]);
      if (entry && entry.length > 0) {
        await conn.query(`
          UPDATE registrations SET status = 'REMOVED' WHERE competition_id = ? AND participant_id = ?
        `, [entry[0].competition_id, participantId]);
      }
    });
  }

  static async updateEntryStatus(entryId: number, status: string): Promise<void> {
    await query(`
      UPDATE competition_entries SET status = ? WHERE id = ?
    `, [status, entryId]);
  }

  static async deleteEntry(entryId: number): Promise<void> {
    await withTransaction(async (conn) => {
      const [entry] = await conn.query<any[]>('SELECT competition_id FROM competition_entries WHERE id = ?', [entryId]);
      if (entry && entry.length > 0) {
        const [parts] = await conn.query<any[]>('SELECT participant_id FROM entry_participants WHERE entry_id = ?', [entryId]);
        for (const p of parts) {
          await conn.query(`
            UPDATE registrations SET status = 'REMOVED' WHERE competition_id = ? AND participant_id = ?
          `, [entry[0].competition_id, p.participant_id]);
        }
      }
      await conn.query('DELETE FROM competition_entries WHERE id = ?', [entryId]);
    });
  }

  static async updateParticipantAttendance(entryId: number, participantId: number, status: string): Promise<void> {
    await query(`
      UPDATE entry_participants SET attendance_status = ? WHERE entry_id = ? AND participant_id = ?
    `, [status, entryId, participantId]);
  }
}
