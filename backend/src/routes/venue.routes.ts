import { Router } from 'express';
import { VenueController } from '../controllers/schedule.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { createVenueSchema, updateVenueSchema } from '../validators/schedule.validator.js';

const router = Router();

router.get('/', VenueController.getAll);
router.get('/:id', VenueController.getById);
router.get('/:id/schedule', VenueController.getSchedule);

router.post('/', authenticate, authorizeRoles('ADMIN'), validateRequest(createVenueSchema), VenueController.create);
router.patch('/:id', authenticate, authorizeRoles('ADMIN'), validateRequest(updateVenueSchema), VenueController.update);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), VenueController.delete);

export default router;
