import { Router } from 'express';
import { AnnouncementController } from '../controllers/announcement.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from '../validators/announcement.validator.js';

const router = Router();

// Public / Authenticated users can list announcements
router.get('/', optionalAuthenticate, AnnouncementController.list);
router.get('/:id', optionalAuthenticate, AnnouncementController.getById);

// Admin-only management
router.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(createAnnouncementSchema),
  AnnouncementController.create
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateAnnouncementSchema),
  AnnouncementController.update
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  AnnouncementController.delete
);

export default router;
