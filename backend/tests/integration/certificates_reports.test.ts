import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';
import { query } from '../../src/database/connection.js';

describe('Phase 9: Certificates, Announcements & Reports Integration Tests', () => {
  const app = createApp();
  let adminToken: string;
  let participantToken: string;
  let comp6Id: number;
  let certId: number;
  let verificationCode: string;
  let announcementId: number;

  beforeAll(async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.adminSeed.email, password: config.adminSeed.password });
    adminToken = adminRes.body.data.accessToken;

    // Participant login
    const partRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'part1@esperanza.local', password: 'Part@Esperanza2026!' });
    participantToken = partRes.body.data.accessToken;

    // Direct DB lookup for competition #8
    const compRows = await query<any[]>('SELECT id FROM competitions WHERE programme_number = 8 LIMIT 1');
    comp6Id = compRows[0].id;

    // Ensure published result exists for comp8
    const partRows = await query<any[]>(`
      SELECT p.id, p.team_id 
      FROM participants p 
      JOIN users u ON u.id = p.user_id 
      WHERE u.name = 'ZIYAN' 
      LIMIT 1
    `);
    const participantId = partRows[0].id;
    const teamId = partRows[0].team_id;

    // Insert or update published result for comp8
    await query(`
      INSERT INTO results (competition_id, participant_id, team_id, position, final_score, status)
      VALUES (?, ?, ?, 1, 95.0, 'PUBLISHED')
      ON DUPLICATE KEY UPDATE status = 'PUBLISHED', position = 1, final_score = 95.0
    `, [comp6Id, participantId, teamId]);

    // Clean certificates for comp8
    await query('DELETE FROM certificates WHERE competition_id = ?', [comp6Id]);
  });

  // 1. Certificates
  it('Admin can generate certificates for a competition with published results', async () => {
    const res = await request(app)
      .post('/api/v1/certificates/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ competition_id: comp6Id });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const firstCert = res.body.data[0];
    certId = firstCert.id;
    verificationCode = firstCert.verification_code;
    expect(firstCert.status).toBe('ISSUED');
  });

  it('PUBLIC VERIFICATION: Anyone can verify certificate by code without auth token', async () => {
    const res = await request(app)
      .get(`/api/v1/certificates/verify/${verificationCode}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_valid).toBe(true);
    expect(res.body.data.status).toBe('ISSUED');
    expect(res.body.data.participant.name).toBe('ZIYAN');
    expect(res.body.data.competition.programme_number).toBe(8);
  });

  it('Admin can revoke a certificate and verification reflects REVOKED status', async () => {
    const revokeRes = await request(app)
      .post(`/api/v1/certificates/${certId}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.status).toBe('REVOKED');

    // Public verify now returns invalid
    const verifyRes = await request(app)
      .get(`/api/v1/certificates/verify/${verificationCode}`);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.is_valid).toBe(false);
    expect(verifyRes.body.data.status).toBe('REVOKED');
  });

  // 2. Announcements
  it('Admin can create a published announcement targeted to participants', async () => {
    const res = await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Reporting Time Change for Off-Stage Events',
        content: 'All participants must report 30 minutes before schedule.',
        target_role: 'PARTICIPANT',
        status: 'PUBLISHED',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Reporting Time Change for Off-Stage Events');
    announcementId = res.body.data.id;
  });

  it('Participant can view targeted announcements', async () => {
    const res = await request(app)
      .get('/api/v1/announcements')
      .set('Authorization', `Bearer ${participantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const found = res.body.data.some((a: any) => a.id === announcementId);
    expect(found).toBe(true);
  });

  // 3. Reports & CSV Exports
  it('Admin can export participants roster as CSV', async () => {
    const res = await request(app)
      .get('/api/v1/reports/export/participants')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('participant_name');
    expect(res.text).toContain('team_name');
  });

  it('Admin can export competition registrations as CSV', async () => {
    const res = await request(app)
      .get('/api/v1/reports/export/registrations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('competition_name');
  });

  it('Admin can export leaderboard standings as CSV', async () => {
    const res = await request(app)
      .get('/api/v1/reports/export/leaderboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('team_name');
    expect(res.text).toContain('total_points');
  });
});
