import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { AuditLogService } from '../services/audit_log.service.js';
import { ApiResponse } from '../utils/response.js';

export class AuditLogController {
  static async list(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { user_id, action, entity_type, entity_id, page, limit } = req.query as any;
      const result = await AuditLogService.list({
        user_id: user_id ? parseInt(user_id, 10) : undefined,
        action: action ? String(action) : undefined,
        entity_type: entity_type ? String(entity_type) : undefined,
        entity_id: entity_id ? parseInt(entity_id, 10) : undefined,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      return ApiResponse.paginated(
        res,
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Audit logs retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}
