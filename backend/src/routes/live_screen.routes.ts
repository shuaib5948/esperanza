import { Router } from 'express';
import { LiveScreenController } from '../controllers/live_screen.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Public stage-side screen endpoint (No auth required for TV/LED kiosk browser)
router.get('/display', LiveScreenController.getDisplay);
router.get('/state', LiveScreenController.getState);

// Admin-only Live Screen Controller endpoint
router.post('/control', authenticate, authorizeRoles('ADMIN'), LiveScreenController.updateControl);

export default router;
