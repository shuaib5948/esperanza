import { Router } from 'express';
import { RegistrationController } from '../controllers/registration.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { createRegistrationSchema } from '../validators/registration.validator.js';

const router = Router();

router.get('/', authenticate, RegistrationController.getAll);
router.get('/conflicts', authenticate, RegistrationController.checkConflicts);
router.get('/:id', authenticate, RegistrationController.getById);

router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'TEAM_LEADER', 'PARTICIPANT'),
  validateRequest(createRegistrationSchema),
  RegistrationController.register
);

router.post('/:id/approve', authenticate, authorizeRoles('ADMIN'), RegistrationController.approve);
router.post('/:id/reject', authenticate, authorizeRoles('ADMIN'), RegistrationController.reject);
router.post('/:id/cancel', authenticate, RegistrationController.cancel);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), RegistrationController.delete);

export default router;
