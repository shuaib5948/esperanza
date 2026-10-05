import fs from 'fs';
import path from 'path';
import { pool } from './connection.js';

async function migrate() {
  console.log('🚀 Running database migrations...');
  let migrationsDir = path.resolve(process.cwd(), 'src/database/migrations');
  if (!fs.existsSync(migrationsDir)) {
    migrationsDir = path.resolve(__dirname, 'migrations');
  }
  if (!fs.existsSync(migrationsDir)) {
    migrationsDir = path.resolve(process.cwd(), 'dist/database/migrations');
  }
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  // Ensure migrations registry table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const [rows] = await pool.query<any[]>(
      'SELECT version FROM schema_migrations WHERE version = ?',
      [file]
    );

    if (rows && rows.length > 0) {
      console.log(`⏩ Migration ${file} already applied.`);
      continue;
    }

    console.log(`⏳ Applying migration: ${file}...`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    // Split SQL into individual statements
    const statements = sqlContent
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
      await connection.commit();
      console.log(`✅ Applied migration: ${file}`);
    } catch (err) {
      await connection.rollback();
      console.error(`❌ Migration failed for ${file}:`, err);
      throw err;
    } finally {
      connection.release();
    }
  }

  console.log('✨ All migrations completed successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
