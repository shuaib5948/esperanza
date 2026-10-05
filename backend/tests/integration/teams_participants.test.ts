import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';

describe('Phase 3: Teams & Participants Integration Tests', () => {
  const app = createApp();
  let adminToken: string;
  let leaderAToken: string;
  let leaderBToken: string;
  let teamAId: number;
  let teamBId: number;

  beforeAll(async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.adminSeed.email, password: config.adminSeed.password });
    adminToken = adminRes.body.data.accessToken;

    // Team Leader A login
    const leaderARes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'leader.teama@esperanza.local', password: 'Leader@Esperanza2026!' });
    leaderAToken = leaderARes.body.data.accessToken;
    teamAId = leaderARes.body.data.user.teamId;

    // Team Leader B login
    const leaderBRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'leader.teamb@esperanza.local', password: 'Leader@Esperanza2026!' });
    leaderBToken = leaderBRes.body.data.accessToken;
    teamBId = leaderBRes.body.data.user.teamId;
  });

  it('GET /api/v1/teams returns exactly 2 seeded teams', async () => {
    const res = await request(app)
      .get('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.map((t: any) => t.code)).toContain('DIRAYA');
    expect(res.body.data.map((t: any) => t.code)).toContain('RIVAYA');
  });

  it('GET /api/v1/participant-categories returns 3 official participant categories', async () => {
    const res = await request(app)
      .get('/api/v1/participant-categories')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
    expect(res.body.data.map((c: any) => c.name)).toEqual(
      expect.arrayContaining(['J1', 'J2', 'SENIOR'])
    );
  });

  it('GET /api/v1/programme-groups returns 5 official competition groups', async () => {
    const res = await request(app)
      .get('/api/v1/programme-groups')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);
    expect(res.body.data.map((g: any) => g.code)).toEqual(
      expect.arrayContaining(['J1', 'J2', 'JUN', 'SEN', 'GEN'])
    );
  });

  it('SECURITY: Team Leader A CAN access their own team members', async () => {
    const res = await request(app)
      .get(`/api/v1/teams/${teamAId}/members`)
      .set('Authorization', `Bearer ${leaderAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('SECURITY: Team Leader A CANNOT access Team B members (Strict Isolation)', async () => {
    const res = await request(app)
      .get(`/api/v1/teams/${teamBId}/members`)
      .set('Authorization', `Bearer ${leaderAToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TEAM_ACCESS_DENIED');
  });

  it('Admin can update team description', async () => {
    const res = await request(app)
      .patch(`/api/v1/teams/${teamAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Official Team Diraya description' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Official Team Diraya description');
  });
});
