import { AuditLogRepository } from '../repositories/audit_log.repository.js';

export class AuditLogService {
  static async record(data: {
    user_id?: number | null;
    action: string;
    entity_type: string;
    entity_id?: number | null;
    old_data?: any;
    new_data?: any;
    ip_address?: string | null;
    user_agent?: string | null;
  }) {
    try {
      await AuditLogRepository.create(data);
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  static async list(filters: {
    user_id?: number;
    action?: string;
    entity_type?: string;
    entity_id?: number;
    page: number;
    limit: number;
  }) {
    const { logs, total } = await AuditLogRepository.findFiltered(filters);
    return {
      data: logs,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }
}
