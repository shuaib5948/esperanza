import { query } from '../database/connection.js';

export interface AuditLogRecord {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

export class AuditLogRepository {
  static async create(data: {
    user_id?: number | null;
    action: string;
    entity_type: string;
    entity_id?: number | null;
    old_data?: any;
    new_data?: any;
    ip_address?: string | null;
    user_agent?: string | null;
  }): Promise<void> {
    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.user_id || null,
      data.action,
      data.entity_type,
      data.entity_id || null,
      data.old_data ? JSON.stringify(data.old_data) : null,
      data.new_data ? JSON.stringify(data.new_data) : null,
      data.ip_address || null,
      data.user_agent || null,
    ]);
  }

  static async findFiltered(filters: {
    user_id?: number;
    action?: string;
    entity_type?: string;
    entity_id?: number;
    page: number;
    limit: number;
  }): Promise<{ logs: AuditLogRecord[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];

    if (filters.user_id) {
      conditions.push('al.user_id = ?');
      values.push(filters.user_id);
    }
    if (filters.action) {
      conditions.push('al.action LIKE ?');
      values.push(`%${filters.action}%`);
    }
    if (filters.entity_type) {
      conditions.push('al.entity_type = ?');
      values.push(filters.entity_type);
    }
    if (filters.entity_id) {
      conditions.push('al.entity_id = ?');
      values.push(filters.entity_id);
    }

    const whereClause = conditions.join(' AND ');

    const countRows = await query<any[]>(`
      SELECT COUNT(*) as total FROM audit_logs al WHERE ${whereClause}
    `, values);
    const total = countRows[0].total;

    const offset = (filters.page - 1) * filters.limit;
    const logs = await query<AuditLogRecord[]>(`
      SELECT al.*,
             u.name as user_name,
             u.email as user_email,
             u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [...values, filters.limit, offset]);

    return { logs, total };
  }
}
