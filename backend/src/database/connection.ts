import mysql from 'mysql2/promise';
import { config } from '../config/index.js';

function isValidDbUri(uri?: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  if (!uri.startsWith('mysql://') && !uri.startsWith('mysqls://')) return false;
  try {
    const parsed = new URL(uri);
    return !!(parsed.hostname && parsed.hostname.length > 0 && parsed.hostname !== ':');
  } catch {
    return false;
  }
}

const rawDbUri = process.env.MYSQL_URL || process.env.DATABASE_URL;
const isUriValid = isValidDbUri(rawDbUri);

export const pool = isUriValid
  ? mysql.createPool({
      uri: rawDbUri,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    })
  : mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

/**
 * Executes a parameterized query using the connection pool
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.query(sql, params);
  return rows as T;
}

/**
 * Executes a callback within a managed database transaction
 */
export async function withTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Health check for the database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
