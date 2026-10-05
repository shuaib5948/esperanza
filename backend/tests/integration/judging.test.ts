import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';

describe('Phase 6: Judging & Scoring Engine Integration Tests', () => {
  const app = createApp();
  let adminToken: string;
  let judge1Token: string;
  let comp5Id: number;
  let comp1Id: number;
  let participant1Id: number;
  let criterion1Id: number;
  let criterion1MaxMarks: number;

  beforeAll(async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.adminSeed.email, password: config.adminSeed.password });
    adminToken = adminRes.body.data.accessToken;

    // Judge 1 login
    const judgeRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'judge1@esperanza.local', password: 'Judge@Esperanza2026!' });
    judge1Token = judgeRes.body.data.accessToken;

    // Find competition #5 (assigned to Judge 1 in seeder)
    const comp5Res = await request(app).get('/api/v1/competitions?search=Elocution Mal');
    const comp5 = comp5Res.body.data.find((c: any) => c.programme_number === 5);
    comp5Id = comp5.id;

    // Find competition #1 (not assigned to Judge 1)
    const comp1Res = await request(app).get('/api/v1/competitions?search=Story writing');
    const comp1 = comp1Res.body.data.find((c: any) => c.programme_number === 1);
    comp1Id = comp1.id;

    // Find participant 1
    const partRes = await request(app)
      .get('/api/v1/participants?search=ZIYAN')
      .set('Authorization', `Bearer ${adminToken}`);
    participant1Id = partRes.body.data.participants[0].id;

    // Register participant for comp5 if not already
    await request(app)
      .post('/api/v1/registrations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ competition_id: comp5Id, participant_id: participant1Id });

    // Fetch criteria for comp5
    const critRes = await request(app).get(`/api/v1/competitions/${comp5Id}/criteria`);
    criterion1Id = critRes.body.data[0].id;
    criterion1MaxMarks = Number(critRes.body.data[0].max_marks);

    // Clean up any existing score sheets for comp5Id & participant1Id for clean test run
    const { query } = await import('../../src/database/connection.js');
    await query('DELETE FROM score_sheets WHERE competition_id = ? AND participant_id = ?', [comp5Id, participant1Id]);
    await query('DELETE FROM competition_judges WHERE competition_id = ?', [comp1Id]);
  });

  it('Judge can fetch their assigned competitions', async () => {
    const res = await request(app)
      .get('/api/v1/judge/competitions')
      .set('Authorization', `Bearer ${judge1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((c: any) => c.id === comp5Id)).toBe(true);
  });

  it('SECURITY: Judge cannot access participants or submit scores for unassigned competition', async () => {
    const res = await request(app)
      .get(`/api/v1/judge/competitions/${comp1Id}/participants`)
      .set('Authorization', `Bearer ${judge1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('JUDGE_NOT_ASSIGNED');
  });

  it('SCORE VALIDATION: Rejects score exceeding criterion maximum marks', async () => {
    const res = await request(app)
      .post(`/api/v1/judge/competitions/${comp5Id}/scores`)
      .set('Authorization', `Bearer ${judge1Token}`)
      .send({
        participant_id: participant1Id,
        scores: [
          {
            criterion_id: criterion1Id,
            marks: criterion1MaxMarks + 10, // exceeds max!
            remarks: 'Above max marks attempt',
          },
        ],
        is_draft: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SCORE_OUT_OF_RANGE');
  });

  it('Judge can save score draft within valid limits and then submit/lock', async () => {
    // 1. Save Draft
    const draftRes = await request(app)
      .post(`/api/v1/judge/competitions/${comp5Id}/scores`)
      .set('Authorization', `Bearer ${judge1Token}`)
      .send({
        participant_id: participant1Id,
        scores: [
          {
            criterion_id: criterion1Id,
            marks: criterion1MaxMarks - 5,
            remarks: 'Strong presentation and fluency',
          },
        ],
        is_draft: true,
      });

    expect(draftRes.status).toBe(200);
    const sheetId = draftRes.body.data.sheetId;

    // 2. Submit & Lock
    const submitRes = await request(app)
      .post(`/api/v1/judge/scores/${sheetId}/submit`)
      .set('Authorization', `Bearer ${judge1Token}`);

    expect(submitRes.status).toBe(200);

    // 3. Attempting to edit a locked sheet is blocked
    const editRes = await request(app)
      .post(`/api/v1/judge/competitions/${comp5Id}/scores`)
      .set('Authorization', `Bearer ${judge1Token}`)
      .send({
        participant_id: participant1Id,
        scores: [
          {
            criterion_id: criterion1Id,
            marks: criterion1MaxMarks - 2,
          },
        ],
        is_draft: false,
      });

    expect(editRes.status).toBe(403);
    expect(editRes.body.error.code).toBe('SCORE_LOCKED');
  });

  it('DIRECT 100-MARK SCORING: Rejects direct marks exceeding 100', async () => {
    // Unlock sheet or use another participant/clear
    const { query } = await import('../../src/database/connection.js');
    await query('DELETE FROM score_sheets WHERE competition_id = ? AND participant_id = ?', [comp5Id, participant1Id]);

    const res = await request(app)
      .post(`/api/v1/judge/competitions/${comp5Id}/scores`)
      .set('Authorization', `Bearer ${judge1Token}`)
      .send({
        participant_id: participant1Id,
        marks: 105, // Exceeds 100!
        remarks: 'Too high',
        is_draft: true,
      });

    expect(res.status).toBe(422);
  });

  it('DIRECT 100-MARK SCORING: Saves direct mark (e.g. 88.5) with remarks and saves bulk direct marks', async () => {
    // 1. Direct Individual Save
    const res = await request(app)
      .post(`/api/v1/judge/competitions/${comp5Id}/scores`)
      .set('Authorization', `Bearer ${judge1Token}`)
      .send({
        participant_id: participant1Id,
        marks: 88.5,
        remarks: 'Direct evaluation - outstanding delivery',
        is_draft: true,
      });

    expect(res.status).toBe(200);

    // 2. Direct Bulk Save
    const bulkRes = await request(app)
      .post(`/api/v1/judge/competitions/${comp5Id}/bulk-scores`)
      .set('Authorization', `Bearer ${judge1Token}`)
      .send({
        items: [
          {
            participant_id: participant1Id,
            marks: 92.0,
            remarks: 'Calibrated score',
          },
        ],
        is_draft: true,
      });

    expect(bulkRes.status).toBe(200);
    expect(bulkRes.body.data.success).toBe(true);

    // 3. Verify retrieved score sheet contains 92.0
    const checkRes = await request(app)
      .get(`/api/v1/judge/competitions/${comp5Id}/scoresheet`)
      .set('Authorization', `Bearer ${judge1Token}`);

    expect(checkRes.status).toBe(200);
    const pData = checkRes.body.data.participants.find((p: any) => p.participant_id === participant1Id);
    expect(Number(pData.total_marks)).toBe(92);
    expect(pData.remarks).toBe('Calibrated score');
  });
});

