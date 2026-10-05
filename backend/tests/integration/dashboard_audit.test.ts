import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';
import { AuditLogService } from '../../src/services/audit_log.service.js';

describe('Phase 10: Audit Logs & Role Dashboards Integration Tests', () => {
  const app = createApp();
  let adminToken: string;
  let teamLeaderToken: string;
  let participantToken: string;
  let judgeToken: string;

  beforeAll(async () => {
    // 1. Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.adminSeed.email, password: config.adminSeed.password });
    adminToken = adminRes.body.data.accessToken;

    // 2. Team Leader login
    const tlRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'leader.teama@esperanza.local', password: 'Leader@Esperanza2026!' });
    teamLeaderToken = tlRes.body.data.accessToken;

    // 3. Participant login
    const partRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'part1@esperanza.local', password: 'Part@Esperanza2026!' });
    participantToken = partRes.body.data.accessToken;

    // 4. Judge login
    const judgeRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'judge1@esperanza.local', password: 'Judge@Esperanza2026!' });
    judgeToken = judgeRes.body.data.accessToken;

    // Record a sample audit log
    await AuditLogService.record({
      user_id: 1,
      action: 'SYSTEM_HEALTH_CHECK',
      entity_type: 'SYSTEM',
      entity_id: 1,
      new_data: { test: true },
      ip_address: '127.0.0.1',
    });
  });

  // 1. Audit Logs
  it('Admin can list and query audit logs with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(10);
  });

  it('SECURITY: Non-admin users cannot access audit logs', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${teamLeaderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  // 2. Admin Dashboard
  it('Admin dashboard returns comprehensive counts and leaderboard', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.counts.total_competitions).toBe(60);
    expect(res.body.data.counts.total_teams).toBe(2);
    expect(res.body.data.counts.total_participants).toBeGreaterThanOrEqual(4);
    expect(res.body.data.leaderboard).toBeInstanceOf(Array);
    expect(res.body.data.leaderboard.length).toBe(2);
  });

  // 3. Team Leader Dashboard
  it('Team Leader dashboard returns team metrics and standings', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/team')
      .set('Authorization', `Bearer ${teamLeaderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.team.code).toBe('DIRAYA');
    expect(res.body.data.participants_count).toBeGreaterThan(0);
    expect(res.body.data.registrations).toBeDefined();
    expect(typeof res.body.data.total_points).toBe('number');
  });

  // 4. Participant Dashboard
  it('Participant dashboard returns registered events and schedule timeline', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/participant')
      .set('Authorization', `Bearer ${participantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.participant.participant_code).toBe('101');
    expect(res.body.data.registrations).toBeInstanceOf(Array);
  });

  // 5. Judge Dashboard
  it('Judge dashboard returns assignments and evaluation metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/judge')
      .set('Authorization', `Bearer ${judgeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.judge.judge_code).toBe(config.accounts.judgeStage.code || 'STAGE_JUDGE');
    expect(res.body.data.assignments).toBeInstanceOf(Array);
  });
});
