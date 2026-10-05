import { Router } from 'express';
import { AuditLogController } from '../controllers/audit_log.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Only ADMIN can view audit logs
router.get('/', authenticate, authorizeRoles('ADMIN'), AuditLogController.list);

export default router;
