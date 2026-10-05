import { createApp } from './app.js';
import { config } from './config/index.js';
import { checkDatabaseHealth } from './database/connection.js';

async function bootstrap() {
  const app = createApp();

  console.log(`[Database Info] Target host: ${process.env.MYSQL_URL ? 'via MYSQL_URL' : `${config.db.host}:${config.db.port} (db: ${config.db.name})`}`);
  const isDbHealthy = await checkDatabaseHealth();
  if (!isDbHealthy) {
    console.error(`❌ Failed to connect to MySQL database at ${config.db.host}:${config.db.port}`);
  } else {
    console.log('✅ Connected to MySQL 8 database successfully.');
  }

  app.listen(config.port, () => {
    console.log(`
============================================================
           ESPERANZA 2026–27 FESTIVAL MANAGEMENT
                     API SERVER RUNNING
============================================================
  Port:        ${config.port}
  Environment: ${config.nodeEnv}
  Health:      http://localhost:${config.port}/api/health
  Auth API:    http://localhost:${config.port}/api/v1/auth/login
============================================================
    `);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
