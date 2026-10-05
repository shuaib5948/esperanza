import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';

describe('Phase 4: 60 Official Competitions & Eligibility Tests', () => {
  const app = createApp();
  let adminToken: string;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.adminSeed.email, password: config.adminSeed.password });
    adminToken = adminRes.body.data.accessToken;
  });

  it('GET /api/v1/competitions returns all 60 official seeded competitions', async () => {
    const res = await request(app).get('/api/v1/competitions');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(60);
  });

  it('Filter by programmeGroup=J1 returns exactly 7 competitions', async () => {
    const res = await request(app).get('/api/v1/competitions?programmeGroup=J1');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(7);
  });

  it('Filter by programmeGroup=GEN returns exactly 15 competitions', async () => {
    const res = await request(app).get('/api/v1/competitions?programmeGroup=GEN');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(15);
  });

  it('Verifies "Story writing" exists as distinct records in J1, J2, and Senior', async () => {
    const res = await request(app).get('/api/v1/competitions?search=Story writing');
    expect(res.status).toBe(200);
    const storyWritingComps = res.body.data;
    expect(storyWritingComps.length).toBeGreaterThanOrEqual(3);

    const progNumbers = storyWritingComps.map((c: any) => c.programme_number);
    expect(progNumbers).toContain(1);  // J1
    expect(progNumbers).toContain(8);  // J2
    expect(progNumbers).toContain(32); // SENIOR
  });

  it('Admin can add criteria to competition and read it back', async () => {
    // Get competition #1
    const compRes = await request(app).get('/api/v1/competitions?programmeGroup=J1');
    const compId = compRes.body.data[0].id;

    const createCritRes = await request(app)
      .post(`/api/v1/competitions/${compId}/criteria`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Originality & Plot Flow',
        max_marks: 40,
        weight: 1.0,
      });

    expect(createCritRes.status).toBe(201);
    expect(createCritRes.body.data.name).toBe('Originality & Plot Flow');

    const getCritRes = await request(app).get(`/api/v1/competitions/${compId}/criteria`);
    expect(getCritRes.status).toBe(200);
    expect(getCritRes.body.data.some((c: any) => c.name === 'Originality & Plot Flow')).toBe(true);
  });
});
