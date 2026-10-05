import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from './connection.js';
import { config } from '../config/index.js';

async function seed() {
  console.log('🌱 Seeding database for Esperanza 2026–27...');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    console.log('🧹 Purging runtime transactional data and non-seed records...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query('TRUNCATE TABLE score_details;');
    await conn.query('TRUNCATE TABLE score_sheets;');
    await conn.query('TRUNCATE TABLE submissions;');
    await conn.query('TRUNCATE TABLE stage_queue;');
    await conn.query('TRUNCATE TABLE results;');
    await conn.query('TRUNCATE TABLE team_points;');
    await conn.query('TRUNCATE TABLE certificates;');
    await conn.query('TRUNCATE TABLE attendance;');
    await conn.query('TRUNCATE TABLE entry_participants;');
    await conn.query('TRUNCATE TABLE competition_entries;');
    await conn.query('TRUNCATE TABLE registrations;');
    await conn.query('TRUNCATE TABLE schedules;');
    await conn.query('TRUNCATE TABLE competition_judges;');
    await conn.query('TRUNCATE TABLE competition_eligibility;');
    await conn.query('TRUNCATE TABLE competition_criteria;');
    await conn.query('TRUNCATE TABLE audit_logs;');
    await conn.query('TRUNCATE TABLE announcements;');
    await conn.query('TRUNCATE TABLE point_rules;');

    // Clean non-seed records
    await conn.query('DELETE FROM venues WHERE code NOT IN ("MAIN_STAGE", "SEMINAR_HALL", "OAT", "HALL_A");');
    await conn.query('DELETE FROM competitions WHERE programme_number > 60;');
    await conn.query("UPDATE competitions SET status = 'ACTIVE';");
    await conn.query('DELETE FROM teams WHERE code NOT IN ("DIRAYA", "RIVAYA");');
    await conn.query('DELETE FROM participant_categories WHERE code NOT IN ("J1", "J2", "SEN");');
    await conn.query('DELETE FROM programme_groups WHERE code NOT IN ("J1", "J2", "JUN", "SEN", "GEN");');
    await conn.query('DELETE FROM competition_types WHERE name NOT IN ("STAGE", "OFF_STAGE");');
    await conn.query('DELETE FROM point_rules WHERE position NOT IN (1, 2, 3);');
    await conn.query('DELETE FROM judges WHERE judge_code NOT IN (?, ?);', [
      config.accounts.judgeStage.code,
      config.accounts.judgeOffstage.code,
    ]);
    await conn.query('DELETE FROM participants WHERE participant_code NOT IN (?)', [
      [
        '101', '102', '103', '104', '105', '106',
        '201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212',
        '301', '302', '303', '304', '305', '306', '307', '308', '309', '310', '311',
      ],
    ]);
    const officialEmails = [
      config.accounts.admin.email,
      config.accounts.teamA.email,
      config.accounts.teamB.email,
      config.accounts.judgeStage.email,
      config.accounts.judgeOffstage.email,
      'part1@esperanza.local', 'abuthahir@esperanza.local', 'israr@esperanza.local',
      'farhan@esperanza.local', 'jinan@esperanza.local', 'sahal@esperanza.local',
      'yaseen.j@esperanza.local', 'thameem@esperanza.local', 'mishab@esperanza.local',
      'rilan@esperanza.local', 'sufiyan@esperanza.local', 'thoufeeq@esperanza.local',
      'muzammil@esperanza.local', 'adnan@esperanza.local', 'bilal@esperanza.local',
      'fahad@esperanza.local', 'ali@esperanza.local', 'salman@esperanza.local',
      'aslam@esperanza.local', 'yaseen.s@esperanza.local', 'shuhaib@esperanza.local',
      'qasim@esperanza.local', 'safwan@esperanza.local', 'raees@esperanza.local',
      'sajid@esperanza.local', 'jifri@esperanza.local', 'saneer@esperanza.local',
      'nishad@esperanza.local', 'nafih@esperanza.local',
    ];
    await conn.query('DELETE FROM users WHERE email NOT IN (?)', [officialEmails]);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

    // 1. Programme Groups (5 official groups)
    console.log('Inserting programme groups...');
    const programmeGroups = [
      { name: 'J1', code: 'J1', display_order: 1 },
      { name: 'J2', code: 'J2', display_order: 2 },
      { name: 'JUNIOR', code: 'JUN', display_order: 3 },
      { name: 'SENIOR', code: 'SEN', display_order: 4 },
      { name: 'GENERAL', code: 'GEN', display_order: 5 },
    ];

    const groupMap = new Map<string, number>();
    for (const group of programmeGroups) {
      await conn.query(
        `INSERT INTO programme_groups (name, code, display_order)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);`,
        [group.name, group.code, group.display_order]
      );
      const [rows] = await conn.query<any[]>(
        'SELECT id FROM programme_groups WHERE code = ?',
        [group.code]
      );
      groupMap.set(group.code, rows[0].id);
    }

    // 2. Competition Types (2 official types: STAGE and OFF_STAGE)
    console.log('Inserting competition types...');
    await conn.query(`DELETE FROM competition_types WHERE name = 'GENERAL'`);
    const competitionTypes = ['STAGE', 'OFF_STAGE'];
    const typeMap = new Map<string, number>();
    for (const type of competitionTypes) {
      await conn.query(
        `INSERT INTO competition_types (name) VALUES (?)
         ON DUPLICATE KEY UPDATE name = VALUES(name);`,
        [type]
      );
      const [rows] = await conn.query<any[]>(
        'SELECT id FROM competition_types WHERE name = ?',
        [type]
      );
      typeMap.set(type, rows[0].id);
    }

    // 3. Participant Categories (3 official festival divisions)
    console.log('Inserting 3 official participant categories...');
    const categories = [
      { name: 'J1', code: 'J1', description: 'J1 Division (Classes 1-4)' },
      { name: 'J2', code: 'J2', description: 'J2 Division (Classes 5-7)' },
      { name: 'SENIOR', code: 'SEN', description: 'Senior Division (Classes 8-12)' },
    ];

    const categoryIds: number[] = [];
    for (const cat of categories) {
      await conn.query(
        `INSERT INTO participant_categories (name, code, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description);`,
        [cat.name, cat.code, cat.description]
      );
      const [rows] = await conn.query<any[]>(
        'SELECT id FROM participant_categories WHERE code = ?',
        [cat.code]
      );
      categoryIds.push(rows[0].id);
    }

    // 4. Default Point Rules
    console.log('Inserting point rules...');
    const pointRules = [
      { name: 'First Place', position: 1, points: 10.0, participation_points: 1.0 },
      { name: 'Second Place', position: 2, points: 7.0, participation_points: 1.0 },
      { name: 'Third Place', position: 3, points: 5.0, participation_points: 1.0 },
    ];
    for (const pr of pointRules) {
      await conn.query(
        `INSERT INTO point_rules (name, position, points, participation_points)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE points = VALUES(points);`,
        [pr.name, pr.position, pr.points, pr.participation_points]
      );
    }

    // 5. Default Users: Admin, Team Leaders, Judges, Participants
    console.log('Creating system users...');
    const adminPassHash = await bcrypt.hash(config.accounts.admin.password, 10);
    const leaderAPassHash = await bcrypt.hash(config.accounts.teamA.password, 10);
    const leaderBPassHash = await bcrypt.hash(config.accounts.teamB.password, 10);
    const judgeStagePassHash = await bcrypt.hash(config.accounts.judgeStage.password, 10);
    const judgeOffstagePassHash = await bcrypt.hash(config.accounts.judgeOffstage.password, 10);
    const partPassHash = await bcrypt.hash('Part@Esperanza2026!', 10);

    // Admin
    await conn.query(
      `INSERT INTO users (uuid, name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE')
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), status = 'ACTIVE';`,
      [crypto.randomUUID(), config.accounts.admin.name, config.accounts.admin.email, adminPassHash]
    );

    // Team Leader A (Diraya)
    await conn.query(
      `INSERT INTO users (uuid, name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'TEAM_LEADER', 'ACTIVE')
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), status = 'ACTIVE';`,
      [crypto.randomUUID(), config.accounts.teamA.name, config.accounts.teamA.email, leaderAPassHash]
    );
    const [leaderARows] = await conn.query<any[]>('SELECT id FROM users WHERE email = ?', [
      config.accounts.teamA.email,
    ]);
    const leaderAId = leaderARows[0].id;

    // Team Leader B (Rivaya)
    await conn.query(
      `INSERT INTO users (uuid, name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'TEAM_LEADER', 'ACTIVE')
       ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), status = 'ACTIVE';`,
      [crypto.randomUUID(), config.accounts.teamB.name, config.accounts.teamB.email, leaderBPassHash]
    );
    const [leaderBRows] = await conn.query<any[]>('SELECT id FROM users WHERE email = ?', [
      config.accounts.teamB.email,
    ]);
    const leaderBId = leaderBRows[0].id;

    // 6. Exactly Two Official Teams (Team Diraya & Team Rivaya)
    console.log('Inserting 2 official teams (Team Diraya & Team Rivaya)...');
    await conn.query(
      `INSERT INTO teams (uuid, name, code, description, color, leader_user_id)
       VALUES (?, 'Team Diraya', 'DIRAYA', 'Official House Diraya', '#3b82f6', ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), leader_user_id = VALUES(leader_user_id);`,
      [crypto.randomUUID(), leaderAId]
    );
    const [teamARows] = await conn.query<any[]>('SELECT id FROM teams WHERE code = ?', ['DIRAYA']);
    const teamAId = teamARows[0].id;

    await conn.query(
      `INSERT INTO teams (uuid, name, code, description, color, leader_user_id)
       VALUES (?, 'Team Rivaya', 'RIVAYA', 'Official House Rivaya', '#ef4444', ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), leader_user_id = VALUES(leader_user_id);`,
      [crypto.randomUUID(), leaderBId]
    );
    const [teamBRows] = await conn.query<any[]>('SELECT id FROM teams WHERE code = ?', ['RIVAYA']);
    const teamBId = teamBRows[0].id;

    // 7. Official Judges (Exactly 2 Judges: 1 Stage Judge, 1 Off-Stage Judge)
    console.log('Inserting 2 official judges (1 Stage Judge, 1 Off-Stage Judge)...');
    const judgesData = [
      { ...config.accounts.judgeStage, hash: judgeStagePassHash },
      { ...config.accounts.judgeOffstage, hash: judgeOffstagePassHash },
    ];

    const judgeIds: number[] = [];
    for (const j of judgesData) {
      await conn.query(
        `INSERT INTO users (uuid, name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'JUDGE', 'ACTIVE')
         ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), status = 'ACTIVE';`,
        [crypto.randomUUID(), j.name, j.email, j.hash]
      );
      const [uRows] = await conn.query<any[]>('SELECT id FROM users WHERE email = ?', [j.email]);
      const userId = uRows[0].id;

      await conn.query(
        `INSERT INTO judges (user_id, judge_code, judge_type, qualification, status)
         VALUES (?, ?, ?, ?, 'ACTIVE')
         ON DUPLICATE KEY UPDATE judge_type = VALUES(judge_type), qualification = VALUES(qualification), status = 'ACTIVE';`,
        [userId, j.code, j.type || 'ALL', j.qual]
      );
      const [jRows] = await conn.query<any[]>('SELECT id FROM judges WHERE judge_code = ?', [j.code]);
      judgeIds.push(jRows[0].id);
    }

    // 8. Official Participants (29 official participants across J1, J2, Senior)
    console.log('Inserting 29 official participants...');
    const participantsList = [
      // === J1 Division (Classes 1-4) -> 100 series ===
      { name: 'ABU THAHIR', teamId: teamBId, catId: categoryIds[0], code: '101', email: 'abuthahir@esperanza.local' },
      { name: 'FARHAN', teamId: teamAId, catId: categoryIds[0], code: '102', email: 'farhan@esperanza.local' },
      { name: 'ISRAR', teamId: teamBId, catId: categoryIds[0], code: '103', email: 'israr@esperanza.local' },
      { name: 'JINAN', teamId: teamAId, catId: categoryIds[0], code: '104', email: 'jinan@esperanza.local' },
      { name: 'MISHAB', teamId: teamBId, catId: categoryIds[0], code: '105', email: 'mishab@esperanza.local' },
      { name: 'SAHAL', teamId: teamAId, catId: categoryIds[0], code: '106', email: 'sahal@esperanza.local' },
      { name: 'ZIYAN', teamId: teamBId, catId: categoryIds[0], code: '107', email: 'ziyan@esperanza.local' },

      // === J2 Division (Classes 5-7) -> 200 series ===
      { name: 'ADNAN', teamId: teamBId, catId: categoryIds[1], code: '201', email: 'adnan@esperanza.local' },
      { name: 'ALI', teamId: teamAId, catId: categoryIds[1], code: '202', email: 'ali@esperanza.local' },
      { name: 'BILAL', teamId: teamBId, catId: categoryIds[1], code: '203', email: 'bilal@esperanza.local' },
      { name: 'FAHAD', teamId: teamAId, catId: categoryIds[1], code: '204', email: 'fahad@esperanza.local' },
      { name: 'MUZAMMIL', teamId: teamBId, catId: categoryIds[1], code: '205', email: 'muzammil@esperanza.local' },
      { name: 'RILAN', teamId: teamAId, catId: categoryIds[1], code: '206', email: 'rilan@esperanza.local' },
      { name: 'SALMAN', teamId: teamAId, catId: categoryIds[1], code: '207', email: 'salman@esperanza.local' },
      { name: 'SUFIYAN', teamId: teamAId, catId: categoryIds[1], code: '208', email: 'sufiyan@esperanza.local' },
      { name: 'THAMEEM', teamId: teamBId, catId: categoryIds[1], code: '209', email: 'thameem@esperanza.local' },
      { name: 'THOUFEEQ', teamId: teamAId, catId: categoryIds[1], code: '210', email: 'thoufeeq@esperanza.local' },
      { name: 'YASEEN (J)', teamId: teamBId, catId: categoryIds[1], code: '211', email: 'yaseen.j@esperanza.local' },

      // === Senior Division (Classes 8-12) -> 300 series ===
      { name: 'ASLAM', teamId: teamBId, catId: categoryIds[2], code: '301', email: 'aslam@esperanza.local' },
      { name: 'JIFRI', teamId: teamAId, catId: categoryIds[2], code: '302', email: 'jifri@esperanza.local' },
      { name: 'NAFIH', teamId: teamAId, catId: categoryIds[2], code: '303', email: 'nafih@esperanza.local' },
      { name: 'NISHAD', teamId: teamAId, catId: categoryIds[2], code: '304', email: 'nishad@esperanza.local' },
      { name: 'QASIM', teamId: teamBId, catId: categoryIds[2], code: '305', email: 'qasim@esperanza.local' },
      { name: 'RAEES', teamId: teamBId, catId: categoryIds[2], code: '306', email: 'raees@esperanza.local' },
      { name: 'SAFWAN', teamId: teamBId, catId: categoryIds[2], code: '307', email: 'safwan@esperanza.local' },
      { name: 'SAJID', teamId: teamAId, catId: categoryIds[2], code: '308', email: 'sajid@esperanza.local' },
      { name: 'SANEER', teamId: teamAId, catId: categoryIds[2], code: '309', email: 'saneer@esperanza.local' },
      { name: 'SHUHAIB', teamId: teamBId, catId: categoryIds[2], code: '310', email: 'shuhaib@esperanza.local' },
      { name: 'YASEEN (S)', teamId: teamBId, catId: categoryIds[2], code: '311', email: 'yaseen.s@esperanza.local' },
    ];

    // Remove any previous participants not in this list
    await conn.query("DELETE FROM participants WHERE participant_code NOT IN (?)", [participantsList.map(p => p.code)]);

    for (const p of participantsList) {
      await conn.query(
        `INSERT INTO users (uuid, name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'PARTICIPANT', 'ACTIVE')
         ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash);`,
        [crypto.randomUUID(), p.name, p.email, partPassHash]
      );
      const [uRows] = await conn.query<any[]>('SELECT id FROM users WHERE email = ?', [p.email]);
      const userId = uRows[0].id;

      await conn.query(
        `INSERT INTO participants (uuid, user_id, participant_code, registration_number, team_id, category_id, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
         ON DUPLICATE KEY UPDATE participant_code = VALUES(participant_code), registration_number = VALUES(registration_number), team_id = VALUES(team_id), category_id = VALUES(category_id);`,
        [crypto.randomUUID(), userId, p.code, p.code, p.teamId, p.catId]
      );
    }

    // 9. Venues
    console.log('Inserting festival venues...');
    const venues = [
      { name: 'Main Auditorium (Stage 1)', code: 'MAIN_STAGE', location: 'Block A, Ground Floor', capacity: 500 },
      { name: 'Seminar Hall (Stage 2)', code: 'SEMINAR_HALL', location: 'Block B, 2nd Floor', capacity: 200 },
      { name: 'Open Air Theatre', code: 'OAT', location: 'Campus Courtyard', capacity: 800 },
      { name: 'Exam Hall A (Off-Stage)', code: 'HALL_A', location: 'Block C, 1st Floor', capacity: 150 },
    ];

    for (const v of venues) {
      await conn.query(
        `INSERT INTO venues (name, code, location, capacity)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE capacity = VALUES(capacity);`,
        [v.name, v.code, v.location, v.capacity]
      );
    }

    // 10. The 60 Official Competitions (Official codes and exact names)
    console.log('Inserting 60 official competition records...');
    const competitionsList = [
      // J1: 1 - 7
      { progNum: 1, code: 'J1-01', name: 'Story writing', groupCode: 'J1', defaultType: 'OFF_STAGE' },
      { progNum: 2, code: 'J1-02', name: 'Poem making', groupCode: 'J1', defaultType: 'OFF_STAGE' },
      { progNum: 3, code: 'J1-03', name: 'Language game', groupCode: 'J1', defaultType: 'OFF_STAGE' },
      { progNum: 4, code: 'J1-04', name: 'Book test', groupCode: 'J1', defaultType: 'OFF_STAGE' },
      { progNum: 5, code: 'J1-05', name: 'Elocution Mal', groupCode: 'J1', defaultType: 'STAGE' },
      { progNum: 6, code: 'J1-06', name: 'Elocution Eng', groupCode: 'J1', defaultType: 'STAGE' },
      { progNum: 7, code: 'J1-07', name: 'Story telling', groupCode: 'J1', defaultType: 'STAGE' },

      // J2: 8 - 12
      { progNum: 8, code: 'J2-01', name: 'Story writing', groupCode: 'J2', defaultType: 'OFF_STAGE' },
      { progNum: 9, code: 'J2-02', name: 'Poem making', groupCode: 'J2', defaultType: 'OFF_STAGE' },
      { progNum: 10, code: 'J2-03', name: 'Language game', groupCode: 'J2', defaultType: 'OFF_STAGE' },
      { progNum: 11, code: 'J2-04', name: 'Elocution Mal', groupCode: 'J2', defaultType: 'STAGE' },
      { progNum: 12, code: 'J2-05', name: 'Elocution Eng', groupCode: 'J2', defaultType: 'STAGE' },

      // JUNIOR: 13 - 30
      { progNum: 13, code: 'JUNIOR-01', name: 'Quiz', groupCode: 'JUN', defaultType: 'STAGE' },
      { progNum: 14, code: 'JUNIOR-02', name: 'Essay Mal', groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 15, code: 'JUNIOR-03', name: 'Essay Eng', groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 16, code: 'JUNIOR-04', name: 'Essay Arb', groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 17, code: 'JUNIOR-05', name: 'Swarf contest', groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 18, code: 'JUNIOR-06', name: 'Mech art', groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 19, code: 'JUNIOR-07', name: 'Digital painting', groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 20, code: 'JUNIOR-08', name: 'Pencil drawing', groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 21, code: 'JUNIOR-09', name: 'Poster designing', groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 22, code: 'JUNIOR-10', name: 'Guess the flag', groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 23, code: 'JUNIOR-11', name: "Rubik's cube", groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 24, code: 'JUNIOR-12', name: 'Shoot out', groupCode: 'JUN', defaultType: 'OFF_STAGE' },
      { progNum: 25, code: 'JUNIOR-13', name: 'Mappilapatt', groupCode: 'JUN', defaultType: 'STAGE' },
      { progNum: 26, code: 'JUNIOR-14', name: 'Madh Song', groupCode: 'JUN', defaultType: 'STAGE' },
      { progNum: 27, code: 'JUNIOR-15', name: "Qira'th", groupCode: 'JUN', defaultType: 'STAGE' },
      { progNum: 28, code: 'JUNIOR-16', name: 'Discurso Arabic', groupCode: 'JUN', defaultType: 'STAGE' },
      { progNum: 29, code: 'JUNIOR-17', name: 'Debate', groupCode: 'JUN', defaultType: 'STAGE' },
      { progNum: 30, code: 'JUNIOR-18', name: 'Live reporting', groupCode: 'JUN', defaultType: 'STAGE' },

      // SENIOR: 31 - 45
      { progNum: 31, code: 'SENIOR-01', name: 'Essay Mal', groupCode: 'SEN', defaultType: 'OFF_STAGE' },
      { progNum: 32, code: 'SENIOR-02', name: 'Story writing', groupCode: 'SEN', defaultType: 'OFF_STAGE' },
      { progNum: 33, code: 'SENIOR-03', name: 'Poem making', groupCode: 'SEN', defaultType: 'OFF_STAGE' },
      { progNum: 34, code: 'SENIOR-04', name: 'Quiz', groupCode: 'SEN', defaultType: 'STAGE' },
      { progNum: 35, code: 'SENIOR-05', name: 'Alfiyya contest', groupCode: 'SEN', defaultType: 'OFF_STAGE' },
      { progNum: 36, code: 'SENIOR-06', name: 'AI poem making', groupCode: 'SEN', defaultType: 'OFF_STAGE' },
      { progNum: 37, code: 'SENIOR-07', name: 'Master plan', groupCode: 'SEN', defaultType: 'OFF_STAGE' },
      { progNum: 38, code: 'SENIOR-08', name: 'Kitabic research', groupCode: 'SEN', defaultType: 'OFF_STAGE' },
      { progNum: 39, code: 'SENIOR-09', name: 'Word game arabic', groupCode: 'SEN', defaultType: 'OFF_STAGE' },
      { progNum: 40, code: 'SENIOR-10', name: 'Madh song', groupCode: 'SEN', defaultType: 'STAGE' },
      { progNum: 41, code: 'SENIOR-11', name: 'Elocution Mal', groupCode: 'SEN', defaultType: 'STAGE' },
      { progNum: 42, code: 'SENIOR-12', name: 'Elocution Eng', groupCode: 'SEN', defaultType: 'STAGE' },
      { progNum: 43, code: 'SENIOR-13', name: "Qira'th", groupCode: 'SEN', defaultType: 'STAGE' },
      { progNum: 44, code: 'SENIOR-14', name: 'Ideal talk', groupCode: 'SEN', defaultType: 'STAGE' },
      { progNum: 45, code: 'SENIOR-15', name: 'Global Dars', groupCode: 'SEN', defaultType: 'STAGE' },

      // GENERAL: 46 - 60
      { progNum: 46, code: 'GENERAL-01', name: 'DTP', groupCode: 'GEN', defaultType: 'OFF_STAGE' },
      { progNum: 47, code: 'GENERAL-02', name: 'Magazine', groupCode: 'GEN', defaultType: 'OFF_STAGE' },
      { progNum: 48, code: 'GENERAL-03', name: 'Foreign talk', groupCode: 'GEN', defaultType: 'STAGE' },
      { progNum: 49, code: 'GENERAL-04', name: 'Podcast', groupCode: 'GEN', defaultType: 'OFF_STAGE' },
      { progNum: 50, code: 'GENERAL-05', name: "Musha'ara", groupCode: 'GEN', defaultType: 'STAGE' },
      { progNum: 51, code: 'GENERAL-06', name: 'Samvadam', groupCode: 'GEN', defaultType: 'STAGE' },
      { progNum: 52, code: 'GENERAL-07', name: 'Qawali', groupCode: 'GEN', defaultType: 'STAGE' },
      { progNum: 53, code: 'GENERAL-08', name: 'Qaseeda', groupCode: 'GEN', defaultType: 'STAGE' },
      { progNum: 54, code: 'GENERAL-09', name: 'Group song - A', groupCode: 'GEN', defaultType: 'STAGE' },
      { progNum: 55, code: 'GENERAL-10', name: 'Group song - B', groupCode: 'GEN', defaultType: 'STAGE' },
      { progNum: 56, code: 'GENERAL-11', name: 'Campus song', groupCode: 'GEN', defaultType: 'STAGE' },
      { progNum: 57, code: 'GENERAL-12', name: 'Extember talk', groupCode: 'GEN', defaultType: 'STAGE' },
      { progNum: 58, code: 'GENERAL-13', name: 'Sreshta malayalam', groupCode: 'GEN', defaultType: 'OFF_STAGE' },
      { progNum: 59, code: 'GENERAL-14', name: "Va'al", groupCode: 'GEN', defaultType: 'STAGE' },
      { progNum: 60, code: 'GENERAL-15', name: 'Relay (4*100)', groupCode: 'GEN', defaultType: 'STAGE' },
    ];

    for (const c of competitionsList) {
      const groupId = groupMap.get(c.groupCode)!;
      const typeId = typeMap.get(c.defaultType)!;

      // Default entries and participant counts per competition type
      let partType: 'INDIVIDUAL' | 'GROUP' = 'INDIVIDUAL';
      let maxPart: number | null = 1;
      let maxEntries: number | null = c.defaultType === 'STAGE' ? 2 : null;

      if ([13, 29, 30, 34].includes(c.progNum)) {
        // Quiz, Debate, Live reporting
        partType = 'GROUP';
        maxPart = 2;
        maxEntries = 1;
      } else if (c.progNum === 51) {
        // Samvadam
        partType = 'GROUP';
        maxPart = 3;
        maxEntries = 1;
      } else if ([50, 52, 53, 60].includes(c.progNum)) {
        // Musha'ara, Qawali, Qaseeda, Relay
        partType = 'GROUP';
        maxPart = 4;
        maxEntries = 1;
      } else if ([47, 49, 56].includes(c.progNum)) {
        // Magazine, Podcast, Campus song
        partType = 'GROUP';
        maxPart = 5;
        maxEntries = 1;
      } else if ([54, 55].includes(c.progNum)) {
        // Group song - A, Group song - B
        partType = 'GROUP';
        maxPart = 6;
        maxEntries = 2; // Up to 2 entries per team
      }

      const [existingRows] = await conn.query<any[]>(
        'SELECT id FROM competitions WHERE programme_number = ?',
        [c.progNum]
      );

      let compId: number;
      if (existingRows.length > 0) {
        compId = existingRows[0].id;
        await conn.query(
          `UPDATE competitions SET
            competition_code = ?,
            name = ?,
            programme_group_id = ?,
            competition_type_id = ?,
            participation_type = ?,
            max_participants = ?,
            max_entries_per_team = ?,
            status = 'ACTIVE'
          WHERE id = ?`,
          [c.code, c.name, groupId, typeId, partType, maxPart, maxEntries, compId]
        );
      } else {
        const [insertRes] = await conn.query<any>(
          `INSERT INTO competitions (
            uuid, competition_code, programme_number, name, programme_group_id,
            competition_type_id, participation_type, max_participants, max_entries_per_team, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
          [crypto.randomUUID(), c.code, c.progNum, c.name, groupId, typeId, partType, maxPart, maxEntries]
        );
        compId = insertRes.insertId;
      }

      // Seed standard demo criteria for each competition
      await conn.query(
        `INSERT INTO competition_criteria (competition_id, name, max_marks, weight, display_order)
         VALUES
          (?, 'Creativity & Content', 30.0, 1.0, 1),
          (?, 'Technique & Skill', 35.0, 1.0, 2),
          (?, 'Presentation & Impact', 35.0, 1.0, 3)
         ON DUPLICATE KEY UPDATE max_marks = VALUES(max_marks);`,
        [compId, compId, compId]
      );

      // Seed category eligibility based on competition programme group
      const eligibleCatCodes: string[] = [];
      if (c.groupCode === 'GEN') {
        eligibleCatCodes.push('J1', 'J2', 'SEN');
      } else if (c.groupCode === 'JUN') {
        eligibleCatCodes.push('J1', 'J2');
      } else if (c.groupCode === 'SEN') {
        eligibleCatCodes.push('SEN');
      } else {
        eligibleCatCodes.push(c.groupCode); // 'J1' or 'J2'
      }

      for (const catCode of eligibleCatCodes) {
        const [catRows] = await conn.query<any[]>(
          'SELECT id FROM participant_categories WHERE code = ?',
          [catCode]
        );
        if (catRows.length > 0) {
          await conn.query(
            `INSERT INTO competition_eligibility (competition_id, participant_category_id)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE competition_id = VALUES(competition_id);`,
            [compId, catRows[0].id]
          );
        }
      }
    }

    // Assign Judges to competition #5 (Elocution Mal) and #27 (Qira'th) for demo judging
    const [comp5] = await conn.query<any[]>('SELECT id FROM competitions WHERE programme_number = 5');
    if (comp5.length > 0 && judgeIds.length > 0) {
      const [adminUser] = await conn.query<any[]>('SELECT id FROM users WHERE role = "ADMIN" LIMIT 1');
      await conn.query(
        `INSERT INTO competition_judges (competition_id, judge_id, assigned_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE status = 'ASSIGNED'`,
        [comp5[0].id, judgeIds[0], adminUser[0].id]
      );
    }

    await conn.commit();
    console.log('✨ Database successfully seeded with 60 official competitions and initial records!');
  } catch (error) {
    await conn.rollback();
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
