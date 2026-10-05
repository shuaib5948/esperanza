import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';
import { query } from '../../src/database/connection.js';

describe('Phase 8: Stage Queue, Attendance & Submissions Integration Tests', () => {
  const app = createApp();
  let adminToken: string;
  let teamLeaderToken: string;
  let participantToken: string;
  let compId: number;
  let participantId: number;
  let regId: number;
  let queueId: number;

  beforeAll(async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.adminSeed.email, password: config.adminSeed.password });
    adminToken = adminRes.body.data.accessToken;

    // Team Leader login
    const tlRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'leader.teama@esperanza.local', password: 'Leader@Esperanza2026!' });
    teamLeaderToken = tlRes.body.data.accessToken;

    // Participant login
    const partRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'part1@esperanza.local', password: 'Part@Esperanza2026!' });
    participantToken = partRes.body.data.accessToken;

    // Direct DB lookup for competition #7
    const compRows = await query<any[]>('SELECT id FROM competitions WHERE programme_number = 7 LIMIT 1');
    compId = compRows[0].id;

    // Direct DB lookup for participant 1
    const partRows = await query<any[]>(`
      SELECT p.id, p.team_id 
      FROM participants p 
      JOIN users u ON u.id = p.user_id 
      WHERE u.name = 'ZIYAN' 
      LIMIT 1
    `);
    participantId = partRows[0].id;

    // Clean up any existing stage queue, submissions, score sheets, and reset schedule for compId
    await query('DELETE FROM submissions WHERE competition_id = ?', [compId]);
    await query('DELETE FROM stage_queue WHERE competition_id = ?', [compId]);
    await query('DELETE FROM registrations WHERE competition_id = ?', [compId]);
    await query('DELETE FROM score_sheets WHERE competition_id = ?', [compId]);
    await query("UPDATE schedules SET status = 'SCHEDULED' WHERE competition_id = ?", [compId]);

    // Register participant for comp7 and approve
    await query(`
      INSERT INTO registrations (uuid, competition_id, participant_id, registered_by, status)
      VALUES (UUID(), ?, ?, 1, 'ASSIGNED')
      ON DUPLICATE KEY UPDATE status = 'ASSIGNED'
    `, [compId, participantId]);

    const regRows = await query<any[]>(
      'SELECT id FROM registrations WHERE competition_id = ? AND participant_id = ? LIMIT 1',
      [compId, participantId]
    );
    regId = regRows[0].id;
  });

  it('Admin can initialize stage queue for a competition', async () => {
    const res = await request(app)
      .post(`/api/v1/stage/${compId}/init`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
    queueId = res.body.data[0].id;
  });

  it('Can get stage queue for a competition', async () => {
    const res = await request(app)
      .get(`/api/v1/stage/${compId}/queue`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some((q: any) => q.participant_id === participantId)).toBe(true);
  });

  it('Admin can transition participant through stage statuses', async () => {
    // WAITING -> CALLED
    const callRes = await request(app)
      .patch(`/api/v1/stage/${queueId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CALLED' });

    expect(callRes.status).toBe(200);
    expect(callRes.body.data.stage_status).toBe('CALLED');

    // CALLED -> ON_STAGE
    const stageRes = await request(app)
      .patch(`/api/v1/stage/${queueId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ON_STAGE' });

    expect(stageRes.status).toBe(200);
    expect(stageRes.body.data.stage_status).toBe('ON_STAGE');

    // ON_STAGE -> COMPLETED
    const compRes = await request(app)
      .patch(`/api/v1/stage/${queueId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED' });

    expect(compRes.status).toBe(200);
    expect(compRes.body.data.stage_status).toBe('COMPLETED');
  });

  it('Can query attendance records for a competition', async () => {
    const res = await request(app)
      .get(`/api/v1/attendance/competitions/${compId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('Admin can mark individual attendance as PRESENT', async () => {
    const res = await request(app)
      .patch(`/api/v1/attendance/${regId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PRESENT', notes: 'Arrived on time' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PRESENT');
  });

  it('Admin can perform bulk attendance updates', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        attendance: [
          { registration_id: regId, status: 'PRESENT', notes: 'Verified in bulk' }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Participant can submit off-stage competition work', async () => {
    const res = await request(app)
      .post(`/api/v1/submissions/${compId}`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        participant_id: participantId,
        file_url: 'https://storage.esperanza.edu/submissions/comp7_essay.pdf',
        file_name: 'comp7_essay.pdf',
        file_type: 'PDF',
        notes: 'Final English Essay Submission'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.file_url).toContain('comp7_essay.pdf');
  });

  it('Authorized users can list submissions for a competition', async () => {
    const res = await request(app)
      .get(`/api/v1/submissions/${compId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].file_name).toBe('comp7_essay.pdf');
  });

  it('Admin can append a late performer mid-event with the next sequential code letter', async () => {
    // Look up second participant
    const secondPartRows = await query<any[]>(`
      SELECT id FROM participants WHERE id != ? LIMIT 1
    `, [participantId]);
    const latePartId = secondPartRows[0].id;

    const res = await request(app)
      .post(`/api/v1/stage/${compId}/append-late`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ participant_id: latePartId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code_letter).toBeDefined();
    expect(res.body.data.check_in_status).toBe('REPORTED');
    expect(res.body.data.stage_status).toBe('WAITING');
  });
});
