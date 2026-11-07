import { Router } from 'express';
import { DeviceSessionController } from '../controllers/device_session.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Heartbeat endpoint (open to all devices, records logged-in user if token present)
router.post('/heartbeat', optionalAuthenticate, DeviceSessionController.heartbeat);

// Admin-only: View connected devices and manage disconnects
router.get('/', authenticate, authorizeRoles('ADMIN'), DeviceSessionController.list);
router.post('/:deviceId/disconnect', authenticate, authorizeRoles('ADMIN'), DeviceSessionController.disconnect);
router.post('/disconnect-all', authenticate, authorizeRoles('ADMIN'), DeviceSessionController.disconnectAll);

export default router;
