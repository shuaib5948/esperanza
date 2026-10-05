import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';
import { query } from '../../src/database/connection.js';

describe('Official Esperanza Festival Architecture & Validation Rules', () => {
  const app = createApp();
  let adminToken: string;
  let leaderAToken: string;
  let leaderBToken: string;

  let teamAId: number;
  let teamBId: number;

  let j1ParticipantA: any;
  let j2ParticipantA: any;
  let seniorParticipantA: any;
  let seniorParticipantB: any;

  let j1CompId: number;
  let j2CompId: number;
  let juniorCompId: number;
  let seniorCompId: number;
  let generalGroupCompId: number; // e.g. Qawali
  let generalIndCompId: number;

  beforeAll(async () => {
    // 1. Log in admin and leaders
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.accounts.admin.email, password: config.accounts.admin.password });
    adminToken = adminRes.body.data.accessToken;

    const leaderARes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.accounts.teamA.email, password: config.accounts.teamA.password });
    leaderAToken = leaderARes.body.data.accessToken;
    teamAId = leaderARes.body.data.user.teamId;

    const leaderBRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.accounts.teamB.email, password: config.accounts.teamB.password });
    leaderBToken = leaderBRes.body.data.accessToken;
    teamBId = leaderBRes.body.data.user.teamId;

    // 2. Fetch test participants
    const partsA = await request(app)
      .get('/api/v1/team-leader/participants')
      .set('Authorization', `Bearer ${leaderAToken}`);
    
    const pListA = partsA.body.data.participants || partsA.body.data;
    j1ParticipantA = pListA.find((p: any) => p.category_name === 'J1');
    j2ParticipantA = pListA.find((p: any) => p.category_name === 'J2');
    seniorParticipantA = pListA.find((p: any) => p.category_name === 'SENIOR');

    const partsB = await request(app)
      .get('/api/v1/team-leader/participants')
      .set('Authorization', `Bearer ${leaderBToken}`);
    const pListB = partsB.body.data.participants || partsB.body.data;
    seniorParticipantB = pListB.find((p: any) => p.category_name === 'SENIOR');

    // 3. Fetch test competitions
    const compsRes = await request(app).get('/api/v1/competitions');
    const comps = compsRes.body.data;

    j1CompId = comps.find((c: any) => c.programme_group_code === 'J1' && c.participation_type === 'INDIVIDUAL').id;
    j2CompId = comps.find((c: any) => c.programme_group_code === 'J2' && c.participation_type === 'INDIVIDUAL').id;
    seniorCompId = comps.find((c: any) => c.programme_group_code === 'SEN' && c.participation_type === 'INDIVIDUAL').id;
    // Group competition (e.g. Qawali, Programme #52 or GEN group item)
    generalGroupCompId = comps.find((c: any) => (c.programme_group_code === 'GEN' || c.programme_group_code === 'SEN') && c.participation_type === 'GROUP' && c.max_participants === 4)?.id || comps.find((c: any) => c.participation_type === 'GROUP' && c.max_participants === 4)?.id;
    // Individual General item
    generalIndCompId = comps.find((c: any) => c.programme_group_code === 'GEN' && c.participation_type === 'INDIVIDUAL').id;

    // Clean any existing entries for these competitions and ensure ACTIVE status
    await query('DELETE FROM entry_participants');
    await query('DELETE FROM competition_entries');
    await query('UPDATE competitions SET status = "ACTIVE" WHERE id IN (?, ?, ?, ?, ?)', [
      j1CompId, j2CompId, seniorCompId, generalGroupCompId, generalIndCompId
    ]);
  });

  // --- Rule 1 to 4: J1 Eligibility ---
  it('1. J1 participant -> J1 competition = ALLOWED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${j1CompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [j1ParticipantA.id] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('2. J1 participant -> General competition = ALLOWED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${generalIndCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [j1ParticipantA.id] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('3. J1 participant -> J2 competition = REJECTED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${j2CompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [j1ParticipantA.id] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CATEGORY_NOT_ELIGIBLE');
  });

  it('4. J1 participant -> Senior competition = REJECTED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${seniorCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [j1ParticipantA.id] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CATEGORY_NOT_ELIGIBLE');
  });

  // --- Rule 5 to 8: J2 Eligibility ---
  it('5. J2 participant -> J2 competition = ALLOWED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${j2CompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [j2ParticipantA.id] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('6. J2 participant -> General competition = ALLOWED', async () => {
    // Delete previous entry on generalIndCompId
    await query('DELETE FROM competition_entries WHERE competition_id = ? AND team_id = ?', [generalIndCompId, teamAId]);
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${generalIndCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [j2ParticipantA.id] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('7. J2 participant -> J1 competition = REJECTED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${j1CompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [j2ParticipantA.id] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CATEGORY_NOT_ELIGIBLE');
  });

  it('8. J2 participant -> Senior competition = REJECTED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${seniorCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [j2ParticipantA.id] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CATEGORY_NOT_ELIGIBLE');
  });

  // --- Rule 9 to 11: Senior Eligibility ---
  it('9. Senior participant -> Senior competition = ALLOWED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${seniorCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [seniorParticipantA.id] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('10. Senior participant -> General competition = ALLOWED', async () => {
    await query('DELETE FROM competition_entries WHERE competition_id = ? AND team_id = ?', [generalIndCompId, teamAId]);
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${generalIndCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [seniorParticipantA.id] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('11. Senior participant -> J1 competition = REJECTED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${j1CompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [seniorParticipantA.id] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CATEGORY_NOT_ELIGIBLE');
  });

  // --- Rule 12 & 13: Individual Entry Constraints ---
  it('12. Individual entry with 1 participant = ALLOWED', async () => {
    await query('DELETE FROM competition_entries WHERE competition_id = ?', [j1CompId]);
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${j1CompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [j1ParticipantA.id] });
    expect(res.status).toBe(201);
    expect(res.body.data.participants.length).toBe(1);
  });

  it('13. Individual entry with 2 participants = REJECTED', async () => {
    await query('DELETE FROM competition_entries WHERE competition_id = ?', [j1CompId]);
    const j1Parts = (await request(app)
      .get('/api/v1/team-leader/participants')
      .set('Authorization', `Bearer ${leaderAToken}`)).body.data.participants.filter((p: any) => p.category_name === 'J1');

    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${j1CompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [j1Parts[0].id, j1Parts[1].id] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INDIVIDUAL_EXACT_ONE');
  });

  // --- Rule 14 to 16: Group Constraints ---
  it('14. Group entry with valid count (e.g. 4 for Qawali) = ALLOWED', async () => {
    const allSeniorA = (await request(app)
      .get('/api/v1/team-leader/participants')
      .set('Authorization', `Bearer ${leaderAToken}`)).body.data.participants.filter((p: any) => p.category_name === 'SENIOR');
    
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${generalGroupCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: allSeniorA.slice(0, 4).map((p: any) => p.id) });
    expect(res.status).toBe(201);
    expect(res.body.data.participants.length).toBe(4);
  });

  it('15. Group entry exceeding max_participants = REJECTED', async () => {
    await query('DELETE FROM competition_entries WHERE competition_id = ?', [generalGroupCompId]);
    const allSeniorA = (await request(app)
      .get('/api/v1/team-leader/participants')
      .set('Authorization', `Bearer ${leaderAToken}`)).body.data.participants.filter((p: any) => p.category_name === 'SENIOR');
    
    // Qawali max is 4, send 5
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${generalGroupCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: allSeniorA.slice(0, 5).map((p: any) => p.id) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('GROUP_MAX_EXCEEDED');
  });

  it('16. Group entry with less than 2 participants = REJECTED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${generalGroupCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [seniorParticipantA.id] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('GROUP_MIN_NOT_MET');
  });

  // --- Rule 17 & 18: Team Entry Limit ---
  it('17. Team entry limit satisfied = ALLOWED and 18. Exceeded = REJECTED', async () => {
    // Competition #54 is Group Song A which allows max_entries_per_team = 2
    const groupSongComp = (await request(app).get('/api/v1/competitions')).body.data.find((c: any) => c.programme_number === 54);
    await query('DELETE FROM competition_entries WHERE competition_id = ?', [groupSongComp.id]);

    const allSeniorA = (await request(app)
      .get('/api/v1/team-leader/participants')
      .set('Authorization', `Bearer ${leaderAToken}`)).body.data.participants.filter((p: any) => p.category_name === 'SENIOR');

    // Entry 1
    const res1 = await request(app)
      .post(`/api/v1/team-leader/competitions/${groupSongComp.id}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [allSeniorA[0].id, allSeniorA[1].id] });
    expect(res1.status).toBe(201);

    // Entry 2
    const res2 = await request(app)
      .post(`/api/v1/team-leader/competitions/${groupSongComp.id}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [allSeniorA[2].id, allSeniorA[3].id] });
    expect(res2.status).toBe(201);

    // Entry 3 (exceeds max_entries_per_team = 2)
    const res3 = await request(app)
      .post(`/api/v1/team-leader/competitions/${groupSongComp.id}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [allSeniorA[4].id, allSeniorA[5].id] });
    expect(res3.status).toBe(400);
    expect(res3.body.error.code).toBe('MAX_ENTRIES_EXCEEDED');
  });

  // --- Rule 19: Strict Team Isolation ---
  it('19. Team A leader attempting to register Team B participant = REJECTED', async () => {
    await query('DELETE FROM competition_entries WHERE competition_id = ?', [seniorCompId]);
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${seniorCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [seniorParticipantB.id] }); // Team B member!
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TEAM_MISMATCH');
  });

  // --- Rule 20: Duplicate inside same entry ---
  it('20. Duplicate participant inside same entry = REJECTED', async () => {
    const res = await request(app)
      .post(`/api/v1/team-leader/competitions/${generalGroupCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [seniorParticipantA.id, seniorParticipantA.id] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DUPLICATE_PARTICIPANT_IN_ENTRY');
  });

  // --- Rule 21: Duplicate in competing entry ---
  it('21. Participant already in an entry for this competition = REJECTED', async () => {
    const groupSongComp = (await request(app).get('/api/v1/competitions')).body.data.find((c: any) => c.programme_number === 54);
    const allSeniorA = (await request(app)
      .get('/api/v1/team-leader/participants')
      .set('Authorization', `Bearer ${leaderAToken}`)).body.data.participants.filter((p: any) => p.category_name === 'SENIOR');

    // Entry 1 has participant 0 and 1
    // Attempting to add participant 0 to Entry 2
    await query('DELETE FROM competition_entries WHERE competition_id = ?', [groupSongComp.id]);
    await request(app)
      .post(`/api/v1/team-leader/competitions/${groupSongComp.id}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [allSeniorA[0].id, allSeniorA[1].id] });

    const duplicateAttempt = await request(app)
      .post(`/api/v1/team-leader/competitions/${groupSongComp.id}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [allSeniorA[0].id, allSeniorA[2].id] });
    expect(duplicateAttempt.status).toBe(409);
    expect(duplicateAttempt.body.error.code).toBe('PARTICIPANT_ALREADY_IN_COMPETITION');
  });

  // --- Rule 22: Attendance update ---
  it('22. Attendance can be updated for entry participant', async () => {
    await query('DELETE FROM competition_entries WHERE competition_id = ?', [seniorCompId]);
    const entryRes = await request(app)
      .post(`/api/v1/team-leader/competitions/${seniorCompId}/entries`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ participantIds: [seniorParticipantA.id] });
    const entryId = entryRes.body.data.id;

    const attendRes = await request(app)
      .patch(`/api/v1/team-leader/entries/${entryId}/participants/${seniorParticipantA.id}/attendance`)
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ status: 'PRESENT' });
    expect(attendRes.status).toBe(200);

    const checkEntry = await request(app)
      .get(`/api/v1/team-leader/entries/${entryId}`)
      .set('Authorization', `Bearer ${leaderAToken}`);
    expect(checkEntry.body.data.participants[0].attendance_status).toBe('PRESENT');
  });

  // --- Rule 23: Eligible Competitions endpoint ---
  it('23. GET /api/v1/team-leader/participants/:id/eligible-competitions correctly filters by category', async () => {
    // J1 participant
    const resJ1 = await request(app)
      .get(`/api/v1/team-leader/participants/${j1ParticipantA.id}/eligible-competitions`)
      .set('Authorization', `Bearer ${leaderAToken}`);
    expect(resJ1.status).toBe(200);
    const groupsJ1 = Array.from(new Set(resJ1.body.data.map((c: any) => c.programme_group_code)));
    expect(groupsJ1).toContain('J1');
    expect(groupsJ1).toContain('GEN');
    expect(groupsJ1).not.toContain('J2');
    expect(groupsJ1).not.toContain('SEN');

    // Senior participant
    const resSenior = await request(app)
      .get(`/api/v1/team-leader/participants/${seniorParticipantA.id}/eligible-competitions`)
      .set('Authorization', `Bearer ${leaderAToken}`);
    expect(resSenior.status).toBe(200);
    const groupsSenior = Array.from(new Set(resSenior.body.data.map((c: any) => c.programme_group_code)));
    expect(groupsSenior).toContain('SEN');
    expect(groupsSenior).toContain('GEN');
    expect(groupsSenior).not.toContain('J1');
    expect(groupsSenior).not.toContain('J2');
  });

  // --- Rule 24: Admin Competition endpoints ---
  it('24. Admin can query /api/v1/admin/competition-groups and /api/v1/admin/participant-categories', async () => {
    const groupsRes = await request(app)
      .get('/api/v1/admin/competition-groups')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(groupsRes.status).toBe(200);
    expect(groupsRes.body.data.length).toBe(5);

    const catsRes = await request(app)
      .get('/api/v1/admin/participant-categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(catsRes.status).toBe(200);
    expect(catsRes.body.data.length).toBe(3);
  });
});
