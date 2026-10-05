import { query } from '../connection.js';

async function main() {
  console.log('Starting migration to simplify statuses...');

  // 1. Competitions status was already modified or verify
  const compCols = await query<any[]>("SHOW COLUMNS FROM competitions LIKE 'status'");
  console.log('Current competitions.status:', compCols[0].Type);

  // 2. Temporarily expand registrations.status enum to include all old + new values
  await query("ALTER TABLE registrations MODIFY COLUMN status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'ASSIGNED', 'REMOVED') NOT NULL DEFAULT 'PENDING'");
  console.log('Temporarily expanded registrations.status enum.');

  // 3. Update existing data to new values
  await query("UPDATE registrations SET status = 'ASSIGNED' WHERE status IN ('APPROVED', 'PENDING', 'COMPLETED')");
  await query("UPDATE registrations SET status = 'REMOVED' WHERE status IN ('REJECTED', 'CANCELLED')");
  console.log('Migrated data to ASSIGNED and REMOVED.');

  // 4. Narrow registrations.status enum to only ('ASSIGNED', 'REMOVED')
  await query("ALTER TABLE registrations MODIFY COLUMN status ENUM('ASSIGNED', 'REMOVED') NOT NULL DEFAULT 'ASSIGNED'");
  console.log('Narrowed registrations table status enum to (ASSIGNED, REMOVED).');

  const regCols = await query<any[]>("SHOW COLUMNS FROM registrations LIKE 'status'");
  console.log('Final verified registrations.status:', regCols[0].Type);

  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
