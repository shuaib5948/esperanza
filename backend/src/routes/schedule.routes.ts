import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { createScheduleSchema, updateScheduleSchema } from '../validators/schedule.validator.js';

const router = Router();

router.get('/', ScheduleController.getAll);
router.get('/conflicts', authenticate, ScheduleController.checkConflicts);
router.get('/:id', ScheduleController.getById);

router.post('/', authenticate, authorizeRoles('ADMIN'), validateRequest(createScheduleSchema), ScheduleController.create);
router.patch('/:id', authenticate, authorizeRoles('ADMIN'), validateRequest(updateScheduleSchema), ScheduleController.update);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), ScheduleController.delete);

export default router;
