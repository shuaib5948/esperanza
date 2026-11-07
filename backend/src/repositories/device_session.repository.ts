import { query } from '../database/connection.js';

export interface DeviceSessionRecord {
  id: number;
  device_id: string;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  device_name: string;
  browser: string | null;
  portal: string;
  current_path: string | null;
  ip_address: string | null;
  status: 'ACTIVE' | 'TERMINATED';
  connection_state: 'ONLINE' | 'IDLE' | 'DISCONNECTED';
  seconds_ago: number;
  last_active_at: string;
  created_at: string;
}

export class DeviceSessionRepository {
  private static schemaInitialized = false;

  static async ensureSchema() {
    if (this.schemaInitialized) return;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS device_sessions (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          device_id VARCHAR(100) NOT NULL UNIQUE,
          user_id BIGINT UNSIGNED NULL,
          device_name VARCHAR(150) NOT NULL,
          browser VARCHAR(100) NULL,
          portal VARCHAR(100) NOT NULL,
          current_path VARCHAR(255) NULL,
          ip_address VARCHAR(50) NULL,
          status ENUM('ACTIVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
          last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_device_status (status),
          INDEX idx_device_last_active (last_active_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      this.schemaInitialized = true;
    } catch (e) {
      console.error('Error ensuring device_sessions schema:', e);
    }
  }

  static async recordHeartbeat(data: {
    deviceId: string;
    userId?: number | null;
    deviceName: string;
    browser?: string;
    portal: string;
    currentPath?: string;
    ipAddress?: string;
  }): Promise<{ terminated: boolean }> {
    await this.ensureSchema();

    // Check if device is already marked as terminated
    const [existing] = await query<any[]>(
      'SELECT status FROM device_sessions WHERE device_id = ?',
      [data.deviceId]
    );

    if (existing && existing.status === 'TERMINATED') {
      return { terminated: true };
    }

    await query(`
      INSERT INTO device_sessions (
        device_id, user_id, device_name, browser, portal, current_path, ip_address, status, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW())
      ON DUPLICATE KEY UPDATE
        user_id = COALESCE(VALUES(user_id), user_id),
        device_name = VALUES(device_name),
        browser = VALUES(browser),
        portal = VALUES(portal),
        current_path = VALUES(current_path),
        ip_address = VALUES(ip_address),
        last_active_at = NOW()
    `, [
      data.deviceId,
      data.userId || null,
      data.deviceName,
      data.browser || null,
      data.portal,
      data.currentPath || null,
      data.ipAddress || null,
    ]);

    return { terminated: false };
  }

  static async getAllDevices(): Promise<DeviceSessionRecord[]> {
    await this.ensureSchema();

    const rows = await query<any[]>(`
      SELECT 
        ds.id,
        ds.device_id,
        ds.user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        ds.device_name,
        ds.browser,
        ds.portal,
        ds.current_path,
        ds.ip_address,
        ds.status,
        TIMESTAMPDIFF(SECOND, ds.last_active_at, NOW()) as seconds_ago,
        ds.last_active_at,
        ds.created_at
      FROM device_sessions ds
      LEFT JOIN users u ON u.id = ds.user_id
      WHERE ds.last_active_at >= NOW() - INTERVAL 1 DAY
      ORDER BY 
        CASE 
          WHEN ds.status = 'TERMINATED' THEN 3
          WHEN TIMESTAMPDIFF(SECOND, ds.last_active_at, NOW()) <= 60 THEN 1
          WHEN TIMESTAMPDIFF(SECOND, ds.last_active_at, NOW()) <= 300 THEN 2
          ELSE 3
        END ASC,
        ds.last_active_at DESC
    `);

    return rows.map((r) => {
      const sec = Number(r.seconds_ago) || 0;
      let connection_state: 'ONLINE' | 'IDLE' | 'DISCONNECTED' = 'DISCONNECTED';
      if (r.status === 'ACTIVE') {
        if (sec <= 60) {
          connection_state = 'ONLINE';
        } else if (sec <= 300) {
          connection_state = 'IDLE';
        }
      }

      return {
        ...r,
        connection_state,
        seconds_ago: sec,
      };
    });
  }

  static async disconnectDevice(deviceId: string, adminUserId: number): Promise<boolean> {
    await this.ensureSchema();

    const res = await query<any>(`
      UPDATE device_sessions
      SET status = 'TERMINATED'
      WHERE device_id = ?
    `, [deviceId]);

    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
      VALUES (?, 'DEVICE_DISCONNECTED', 'device_sessions', NULL, JSON_OBJECT('device_id', ?))
    `, [adminUserId, deviceId]);

    return res.affectedRows > 0;
  }

  static async disconnectAll(adminUserId: number, currentAdminDeviceId?: string): Promise<number> {
    await this.ensureSchema();

    let sql = "UPDATE device_sessions SET status = 'TERMINATED' WHERE status = 'ACTIVE'";
    const params: any[] = [];

    if (currentAdminDeviceId) {
      sql += ' AND device_id != ?';
      params.push(currentAdminDeviceId);
    }

    const res = await query<any>(sql, params);

    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, new_data)
      VALUES (?, 'ALL_DEVICES_DISCONNECTED', 'device_sessions', JSON_OBJECT('count', ?))
    `, [adminUserId, res.affectedRows]);

    return res.affectedRows;
  }
}
