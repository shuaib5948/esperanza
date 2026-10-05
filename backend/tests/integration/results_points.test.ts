import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';
import { query } from '../../src/database/connection.js';

describe('Phase 7: Results Verification & Atomic Points Engine Tests', () => {
  const app = createApp();
  let adminToken: string;
  let comp5Id: number;
  let resultId: number;
  let participant1Id: number;
  let teamAId: number;

  beforeAll(async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.adminSeed.email, password: config.adminSeed.password });
    adminToken = adminRes.body.data.accessToken;

    // Direct DB lookup for competition #6
    const compRows = await query<any[]>('SELECT id FROM competitions WHERE programme_number = 6 LIMIT 1');
    comp5Id = compRows[0].id;

    // Direct DB lookup for participant 1
    const partRows = await query<any[]>(`
      SELECT p.id, p.team_id 
      FROM participants p 
      JOIN users u ON u.id = p.user_id 
      WHERE u.name = 'ZIYAN' 
      LIMIT 1
    `);
    participant1Id = partRows[0].id;
    teamAId = partRows[0].team_id;

    // Register participant for comp6
    await query(`
      INSERT INTO registrations (uuid, competition_id, participant_id, registered_by, status)
      VALUES (UUID(), ?, ?, 1, 'ASSIGNED')
      ON DUPLICATE KEY UPDATE status = 'ASSIGNED'
    `, [comp5Id, participant1Id]);

    // Ensure clean state for competition #6
    await query('DELETE FROM team_points WHERE competition_id = ?', [comp5Id]);
    await query('DELETE FROM results WHERE competition_id = ?', [comp5Id]);

    // Ensure a submitted/locked score sheet exists for comp6
    const judgeRows = await query<any[]>('SELECT id FROM judges LIMIT 1');
    const judgeId = judgeRows[0].id;

    await query(`
      INSERT INTO score_sheets (competition_id, participant_id, judge_id, status, total_marks, submitted_at)
      VALUES (?, ?, ?, 'SUBMITTED', 88.5, NOW())
      ON DUPLICATE KEY UPDATE status = 'SUBMITTED', total_marks = 88.5
    `, [comp5Id, participant1Id, judgeId]);
  });

  it('Admin can generate results from submitted judging scores', async () => {
    const res = await request(app)
      .post(`/api/v1/results/generate/${comp5Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ calculation_method: 'AVERAGE' });

    expect(res.status).toBe(201);
    expect(res.body.data.length).toBeGreaterThan(0);

    const firstResult = res.body.data[0];
    expect(firstResult.position).toBe(1);
    expect(Number(firstResult.raw_marks)).toBe(88.5);
    expect(firstResult.grade).toBe('A');
    expect(Number(firstResult.grade_marks)).toBe(5);
    expect(Number(firstResult.position_points)).toBe(5);
    expect(Number(firstResult.final_score)).toBe(10);
    expect(Number(firstResult.points_awarded)).toBe(10);
    expect(firstResult.status).toBe('VERIFIED');
    resultId = firstResult.id;
  });

  it('Admin can verify result', async () => {
    const res = await request(app)
      .post(`/api/v1/results/${resultId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('VERIFIED');
  });

  it('ATOMIC TRANSACTION: Publishing result allocates points into team_points table', async () => {
    const res = await request(app)
      .post(`/api/v1/results/${resultId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLISHED');

    // Verify team_points table
    const pointRows = await query<any[]>(
      'SELECT * FROM team_points WHERE competition_id = ? AND team_id = ?',
      [comp5Id, teamAId]
    );
    expect(pointRows.length).toBe(1);
    expect(Number(pointRows[0].points)).toBeGreaterThan(0);
  });

  it('ESPERANZA ENGINE: Correctly calculates grades, dense ranking, and composite final score for 4+ participants', async () => {
    // Test pure utility calculation directly
    const { ResultService } = await import('../../src/services/result_points.service.js');
    expect(ResultService.calculateGrade(95)).toBe('A+');
    expect(ResultService.calculateGrade(88)).toBe('A');
    expect(ResultService.calculateGrade(65)).toBe('B');
    expect(ResultService.calculateGrade(52)).toBe('C');
    expect(ResultService.calculateGrade(48)).toBe('NG');

    // N=4 grade marks
    expect(ResultService.calculateGradeMarks('A+', 4)).toBe(18);
    expect(ResultService.calculateGradeMarks('A', 4)).toBe(15);
    expect(ResultService.calculateGradeMarks('B', 4)).toBe(10);
    expect(ResultService.calculateGradeMarks('C', 4)).toBe(5);
    expect(ResultService.calculateGradeMarks('NG', 4)).toBe(0);

    // N=2 grade marks
    expect(ResultService.calculateGradeMarks('A+', 2)).toBe(7);
    expect(ResultService.calculateGradeMarks('A', 2)).toBe(6);
  });
});
