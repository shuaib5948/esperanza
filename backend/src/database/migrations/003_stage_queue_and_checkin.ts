import { query } from '../connection.js';

async function main() {
  console.log('Starting migration for stage queue & check-in features...');

  // 1. Modify schedules.status to include CHECK_IN
  await query(`
    ALTER TABLE schedules 
    MODIFY COLUMN status ENUM('SCHEDULED', 'CHECK_IN', 'LIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED'
  `);
  console.log('✅ schedules.status enum updated to include CHECK_IN.');

  // 2. Add code_letter to stage_queue if not exists
  const codeLetterCol = await query<any[]>("SHOW COLUMNS FROM stage_queue LIKE 'code_letter'");
  if (codeLetterCol.length === 0) {
    await query("ALTER TABLE stage_queue ADD COLUMN code_letter VARCHAR(10) NULL AFTER participant_id");
    console.log('✅ Added code_letter column to stage_queue.');
  } else {
    console.log('⏩ code_letter column already exists in stage_queue.');
  }

  // 3. Add check_in_status to stage_queue if not exists
  const checkInCol = await query<any[]>("SHOW COLUMNS FROM stage_queue LIKE 'check_in_status'");
  if (checkInCol.length === 0) {
    await query("ALTER TABLE stage_queue ADD COLUMN check_in_status ENUM('PENDING', 'REPORTED', 'ABSENT') NOT NULL DEFAULT 'PENDING' AFTER stage_status");
    console.log('✅ Added check_in_status column to stage_queue.');
  } else {
    console.log('⏩ check_in_status column already exists in stage_queue.');
  }

  // 4. Add call_count to stage_queue if not exists
  const callCountCol = await query<any[]>("SHOW COLUMNS FROM stage_queue LIKE 'call_count'");
  if (callCountCol.length === 0) {
    await query("ALTER TABLE stage_queue ADD COLUMN call_count INT NOT NULL DEFAULT 0 AFTER check_in_status");
    console.log('✅ Added call_count column to stage_queue.');
  } else {
    console.log('⏩ call_count column already exists in stage_queue.');
  }

  console.log('✨ Migration completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
