import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';

describe('Phase 5: Registration & Schedule Conflict Integration Tests', () => {
  const app = createApp();
  let adminToken: string;
  let leaderAToken: string;
  let participant1Id: number;
  let comp1Id: number;
  let comp2Id: number;
  let venueId: number;

  beforeAll(async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: config.adminSeed.email, password: config.adminSeed.password });
    adminToken = adminRes.body.data.accessToken;

    // Leader A login
    const leaderRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'leader.teama@esperanza.local', password: 'Leader@Esperanza2026!' });
    leaderAToken = leaderRes.body.data.accessToken;

    // Get a seeded participant (ZIYAN from Team Diraya)
    const partRes = await request(app)
      .get('/api/v1/participants?search=ZIYAN')
      .set('Authorization', `Bearer ${adminToken}`);
    participant1Id = partRes.body.data.participants[0].id;

    // Get 2 competitions
    const compRes = await request(app).get('/api/v1/competitions?limit=2');
    comp1Id = compRes.body.data[0].id;
    comp2Id = compRes.body.data[1].id;

    // Create a test venue with unique code
    const uniqueVenueCode = `CONF_${Date.now()}`;
    const venueRes = await request(app)
      .post('/api/v1/venues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Conference Hall Alpha',
        code: uniqueVenueCode,
        capacity: 100,
      });
    venueId = venueRes.body.data.id;
    // Clean up any existing test registrations for comp1Id and reset status to ACTIVE
    const { query } = await import('../../src/database/connection.js');
    await query('UPDATE competitions SET status = "ACTIVE" WHERE id IN (?, ?)', [comp1Id, comp2Id]);
    await query('DELETE FROM registrations WHERE competition_id = ?', [comp1Id]);
    await query('DELETE FROM schedules WHERE competition_id IN (?, ?)', [comp1Id, comp2Id]);

    // Ensure comp2Id has at least 1 assigned registration for conflict tests
    const p2Res = await request(app).get('/api/v1/participants?search=ABU THAHIR').set('Authorization', `Bearer ${adminToken}`);
    const participant2Id = p2Res.body?.data?.participants?.[0]?.id;
    const userRows = await query<any[]>('SELECT id FROM users WHERE email = ?', [config.adminSeed.email]);
    const adminUserId = userRows[0]?.id || 1;
    if (participant2Id) {
      await query(`
        INSERT INTO registrations (uuid, competition_id, participant_id, registered_by, status)
        VALUES (UUID(), ?, ?, ?, 'ASSIGNED')
        ON DUPLICATE KEY UPDATE status = 'ASSIGNED'
      `, [comp2Id, participant2Id, adminUserId]);
    }
  });

  it('PARTICIPANT GUARD: Rejects scheduling when an event has 0 assigned participants', async () => {
    const schedRes = await request(app)
      .post('/api/v1/schedules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        competition_id: comp1Id,
        venue_id: venueId,
        start_at: '2026-10-15T10:00:00.000Z',
        end_at: '2026-10-15T12:00:00.000Z',
      });

    expect(schedRes.status).toBe(400);
    expect(schedRes.body.error.code).toBe('NO_PARTICIPANTS_ASSIGNED');
  });

  it('Team Leader can register their team participant', async () => {
    const regRes = await request(app)
      .post('/api/v1/registrations')
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({
        competition_id: comp1Id,
        participant_id: participant1Id,
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.status).toBe('ASSIGNED');
  });

  it('DUPLICATE GUARD: Rejects duplicate registration for the same participant and competition', async () => {
    const regRes = await request(app)
      .post('/api/v1/registrations')
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({
        competition_id: comp1Id,
        participant_id: participant1Id,
      });

    expect(regRes.status).toBe(409);
    expect(regRes.body.error.code).toBe('ALREADY_REGISTERED');
  });

  it('CONFLICT DETECTION: Rejects overlapping schedules for the same venue', async () => {
    // Schedule competition 1 from 10:00 to 12:00 (now has participant1Id assigned!)
    const sched1 = await request(app)
      .post('/api/v1/schedules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        competition_id: comp1Id,
        venue_id: venueId,
        start_at: '2026-10-15T10:00:00.000Z',
        end_at: '2026-10-15T12:00:00.000Z',
      });
    expect(sched1.status).toBe(201);

    // Attempt to schedule competition 2 in same venue from 11:00 to 13:00 (overlaps!)
    const sched2 = await request(app)
      .post('/api/v1/schedules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        competition_id: comp2Id,
        venue_id: venueId,
        start_at: '2026-10-15T11:00:00.000Z',
        end_at: '2026-10-15T13:00:00.000Z',
      });

    expect(sched2.status).toBe(409);
    expect(sched2.body.error.code).toBe('VENUE_SCHEDULE_CONFLICT');

    // Clean up test schedule for comp1Id so it doesn't conflict with subsequent registration tests
    const { query } = await import('../../src/database/connection.js');
    await query('DELETE FROM schedules WHERE venue_id = ?', [venueId]);
  });

  it('STAGE LIMIT: Allows max 2 participants per team for stage items and rejects the 3rd', async () => {
    // Find Stage competition #5 (Elocution Mal)
    const comp5Res = await request(app).get('/api/v1/competitions?search=Elocution Mal');
    const comp5 = comp5Res.body.data.find((c: any) => c.programme_number === 5);

    // Find 3 J1 participants from Team Diraya
    const p1Res = await request(app).get('/api/v1/participants?search=ZIYAN').set('Authorization', `Bearer ${adminToken}`);
    const p2Res = await request(app).get('/api/v1/participants?search=ABU THAHIR').set('Authorization', `Bearer ${adminToken}`);
    const p3Res = await request(app).get('/api/v1/participants?search=ISRAR').set('Authorization', `Bearer ${adminToken}`);

    const p1Id = p1Res.body.data.participants[0].id;
    const p2Id = p2Res.body.data.participants[0].id;
    const p3Id = p3Res.body.data.participants[0].id;

    // Clean any prior registrations and schedules for comp5 and ensure it is ACTIVE
    const { query } = await import('../../src/database/connection.js');
    await query('DELETE FROM registrations WHERE competition_id = ?', [comp5.id]);
    await query('DELETE FROM schedules WHERE competition_id = ?', [comp5.id]);
    await query("UPDATE competitions SET status = 'ACTIVE' WHERE id = ?", [comp5.id]);

    // 1st participant from Team Diraya -> Success (1/2)
    const reg1 = await request(app)
      .post('/api/v1/registrations')
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ competition_id: comp5.id, participant_id: p1Id });
    expect(reg1.status).toBe(201);

    // 2nd participant from Team Diraya -> Success (2/2)
    const reg2 = await request(app)
      .post('/api/v1/registrations')
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ competition_id: comp5.id, participant_id: p2Id });
    expect(reg2.status).toBe(201);

    // 3rd participant from Team Diraya -> Rejection (exceeds 2 limit for stage items)
    const reg3 = await request(app)
      .post('/api/v1/registrations')
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ competition_id: comp5.id, participant_id: p3Id });
    expect(reg3.status).toBe(400);
    expect(reg3.body.error.code).toBe('STAGE_TEAM_LIMIT_EXCEEDED');
  });

  it('OFF-STAGE UNLIMITED: Allows multiples participants per team for off-stage items', async () => {
    // Comp 1 (Story writing) is OFF_STAGE
    const { query } = await import('../../src/database/connection.js');
    await query('DELETE FROM registrations WHERE competition_id = ?', [comp1Id]);
    await query("UPDATE competitions SET status = 'ACTIVE' WHERE id = ?", [comp1Id]);

    const p2Res = await request(app).get('/api/v1/participants?search=ABU THAHIR').set('Authorization', `Bearer ${adminToken}`);
    const p3Res = await request(app).get('/api/v1/participants?search=ISRAR').set('Authorization', `Bearer ${adminToken}`);

    const p2Id = p2Res.body.data.participants[0].id;
    const p3Id = p3Res.body.data.participants[0].id;

    // 2nd and 3rd participant from Team Diraya for comp 1 both succeed
    const reg2 = await request(app)
      .post('/api/v1/registrations')
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ competition_id: comp1Id, participant_id: p2Id });
    expect(reg2.status).toBe(201);

    const reg3 = await request(app)
      .post('/api/v1/registrations')
      .set('Authorization', `Bearer ${leaderAToken}`)
      .send({ competition_id: comp1Id, participant_id: p3Id });
    expect(reg3.status).toBe(201);
  });
});
