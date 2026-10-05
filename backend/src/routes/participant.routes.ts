import { Router } from 'express';
import { ParticipantController } from '../controllers/participant.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { createParticipantSchema, updateParticipantSchema } from '../validators/participant.validator.js';

const router = Router();

router.get('/', authenticate, ParticipantController.getAll);
router.get('/:id', authenticate, ParticipantController.getById);
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN', 'TEAM_LEADER'),
  validateRequest(createParticipantSchema),
  ParticipantController.create
);
router.patch(
  '/:id',
  authenticate,
  validateRequest(updateParticipantSchema),
  ParticipantController.update
);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), ParticipantController.delete);
router.get('/:id/registrations', authenticate, ParticipantController.getRegistrations);
router.get('/:id/results', authenticate, ParticipantController.getResults);
router.get('/:id/certificates', authenticate, ParticipantController.getCertificates);

export default router;
