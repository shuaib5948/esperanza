import { Router } from 'express';
import { CertificateController } from '../controllers/certificate.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { generateCertificatesSchema } from '../validators/certificate.validator.js';

const router = Router();

// Public certificate verification endpoint (No Auth Required)
router.get('/verify/:code', CertificateController.verify);

// Authenticated certificate endpoints
router.get('/', authenticate, CertificateController.list);
router.get('/:id', authenticate, CertificateController.getById);

// Admin only: generate & revoke
router.post(
  '/generate',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(generateCertificatesSchema),
  CertificateController.generate
);

router.post(
  '/:id/revoke',
  authenticate,
  authorizeRoles('ADMIN'),
  CertificateController.revoke
);

export default router;
