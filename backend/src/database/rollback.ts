import { pool } from './connection.js';

async function rollback() {
  console.log('🔄 Rolling back database schema...');
  const tables = [
    'schema_migrations',
    'audit_logs',
    'announcements',
    'certificates',
    'team_points',
    'point_rules',
    'results',
    'score_details',
    'score_sheets',
    'competition_judges',
    'judges',
    'submissions',
    'stage_queue',
    'attendance',
    'registrations',
    'schedules',
    'venues',
    'competition_criteria',
    'competition_eligibility',
    'competitions',
    'competition_types',
    'programme_groups',
    'participants',
    'participant_categories',
    'teams',
    'users'
  ];

  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS ${table};`);
      console.log(`Dropped table: ${table}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('✨ All tables dropped successfully.');
  } catch (error) {
    console.error('Error during rollback:', error);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

rollback();
