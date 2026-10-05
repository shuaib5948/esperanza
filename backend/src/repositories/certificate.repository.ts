import { query, withTransaction } from '../database/connection.js';
import crypto from 'crypto';

export interface CertificateRecord {
  id: number;
  uuid: string;
  certificate_number: string;
  participant_id: number;
  competition_id: number;
  result_id: number;
  position: number | null;
  certificate_url: string | null;
  verification_code: string;
  issued_at: string;
  status: 'ISSUED' | 'REVOKED';
  participant_name?: string;
  participant_code?: string;
  competition_name?: string;
  programme_number?: number;
  group_name?: string;
  team_name?: string;
}

export class CertificateRepository {
  static async findByVerificationCode(code: string): Promise<CertificateRecord | null> {
    const rows = await query<any[]>(`
      SELECT cert.*,
             u.name as participant_name,
             p.participant_code,
             c.name as competition_name,
             c.programme_number,
             pg.name as group_name,
             t.name as team_name
      FROM certificates cert
      JOIN participants p ON p.id = cert.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN competitions c ON c.id = cert.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      JOIN teams t ON t.id = p.team_id
      WHERE cert.verification_code = ?
      LIMIT 1
    `, [code]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findById(id: number): Promise<CertificateRecord | null> {
    const rows = await query<any[]>(`
      SELECT cert.*,
             u.name as participant_name,
             p.participant_code,
             c.name as competition_name,
             c.programme_number,
             pg.name as group_name,
             t.name as team_name
      FROM certificates cert
      JOIN participants p ON p.id = cert.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN competitions c ON c.id = cert.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      JOIN teams t ON t.id = p.team_id
      WHERE cert.id = ?
      LIMIT 1
    `, [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findAll(filters: { participant_id?: number; competition_id?: number; status?: string }): Promise<CertificateRecord[]> {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];

    if (filters.participant_id) {
      conditions.push('cert.participant_id = ?');
      values.push(filters.participant_id);
    }

    if (filters.competition_id) {
      conditions.push('cert.competition_id = ?');
      values.push(filters.competition_id);
    }

    if (filters.status) {
      conditions.push('cert.status = ?');
      values.push(filters.status);
    }

    return query<CertificateRecord[]>(`
      SELECT cert.*,
             u.name as participant_name,
             p.participant_code,
             c.name as competition_name,
             c.programme_number,
             t.name as team_name
      FROM certificates cert
      JOIN participants p ON p.id = cert.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN competitions c ON c.id = cert.competition_id
      JOIN teams t ON t.id = p.team_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY cert.issued_at DESC
    `, values);
  }

  static async generateCertificatesForPublishedResults(competitionId: number): Promise<CertificateRecord[]> {
    return withTransaction(async (conn) => {
      // Find published results for competition
      const [results] = await conn.query<any[]>(`
        SELECT r.id as result_id, r.participant_id, r.position, c.programme_number
        FROM results r
        JOIN competitions c ON c.id = r.competition_id
        WHERE r.competition_id = ? AND r.status = 'PUBLISHED'
      `, [competitionId]);

      if (!results || results.length === 0) {
        return [];
      }

      for (const res of results) {
        // Unique code: ESP-2026-CERT-[COMP#]-[RES#]-[RANDOM]
        const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
        const certNumber = `ESP-2026-${res.programme_number}-${res.result_id}-${randomHex}`;
        const verifyCode = `V-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const certUuid = crypto.randomUUID();

        await conn.query(`
          INSERT INTO certificates (
            uuid, certificate_number, participant_id, competition_id, result_id, position, verification_code, status, issued_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ISSUED', NOW())
          ON DUPLICATE KEY UPDATE position = VALUES(position), status = 'ISSUED'
        `, [certUuid, certNumber, res.participant_id, competitionId, res.result_id, res.position, verifyCode]);
      }

      const [certs] = await conn.query<any[]>(`
        SELECT cert.*,
               u.name as participant_name,
               p.participant_code,
               c.name as competition_name,
               t.name as team_name
        FROM certificates cert
        JOIN participants p ON p.id = cert.participant_id
        JOIN users u ON u.id = p.user_id
        JOIN competitions c ON c.id = cert.competition_id
        JOIN teams t ON t.id = p.team_id
        WHERE cert.competition_id = ?
        ORDER BY cert.position ASC
      `, [competitionId]);

      return certs;
    });
  }

  static async revoke(id: number): Promise<CertificateRecord | null> {
    await query('UPDATE certificates SET status = "REVOKED" WHERE id = ?', [id]);
    return this.findById(id);
  }
}
