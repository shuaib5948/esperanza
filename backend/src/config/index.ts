import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306', 10),
    name: process.env.DB_NAME || process.env.MYSQLDATABASE || 'esperanza',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'wefiadmin',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'esperanza_jwt_super_secret_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'esperanza_jwt_refresh_secret_key_2026',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  accounts: {
    admin: {
      username: process.env.ADMIN_USERNAME || 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@esperanza.local',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      name: process.env.ADMIN_NAME || 'Festival Administrator',
    },
    teamA: {
      username: process.env.TEAM_A_USERNAME || 'diraya',
      email: process.env.TEAM_A_EMAIL || 'diraya@esperanza.local',
      password: process.env.TEAM_A_PASSWORD || 'diraya123',
      name: process.env.TEAM_A_NAME || 'House Diraya Leader',
    },
    teamB: {
      username: process.env.TEAM_B_USERNAME || 'rivaya',
      email: process.env.TEAM_B_EMAIL || 'rivaya@esperanza.local',
      password: process.env.TEAM_B_PASSWORD || 'rivaya123',
      name: process.env.TEAM_B_NAME || 'House Rivaya Leader',
    },
    judgeStage: {
      username: process.env.JUDGE_STAGE_USERNAME || 'judge1',
      email: process.env.JUDGE_STAGE_EMAIL || 'judge1@esperanza.local',
      password: process.env.JUDGE_STAGE_PASSWORD || 'judge123',
      name: process.env.JUDGE_STAGE_NAME || 'Dr. Faisal Rahman (Stage Judge)',
      code: process.env.JUDGE_STAGE_CODE || 'STAGE_JUDGE',
      type: 'STAGE',
      qual: 'Senior Stage & Arts Evaluator',
    },
    judgeOffstage: {
      username: process.env.JUDGE_OFFSTAGE_USERNAME || 'offjudge',
      email: process.env.JUDGE_OFFSTAGE_EMAIL || 'offjudge@esperanza.local',
      password: process.env.JUDGE_OFFSTAGE_PASSWORD || 'offjudge123',
      name: process.env.JUDGE_OFFSTAGE_NAME || 'Prof. K. Raghavan (Off-Stage Judge)',
      code: process.env.JUDGE_OFFSTAGE_CODE || 'OFFSTAGE_JUDGE',
      type: 'OFF_STAGE',
      qual: 'Chief Submissions & Literature Evaluator',
    },
  },
  adminSeed: {
    name: process.env.ADMIN_NAME || 'Festival Administrator',
    email: process.env.ADMIN_EMAIL || 'admin@esperanza.local',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
};
