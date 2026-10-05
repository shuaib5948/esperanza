import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Admin Dashboard
router.get('/admin', authenticate, authorizeRoles('ADMIN'), DashboardController.getAdmin);

// Team Leader Dashboard
router.get('/team', authenticate, authorizeRoles('ADMIN', 'TEAM_LEADER'), DashboardController.getTeam);

// Participant Dashboard
router.get('/participant', authenticate, authorizeRoles('PARTICIPANT'), DashboardController.getParticipant);

// Judge Dashboard
router.get('/judge', authenticate, authorizeRoles('JUDGE'), DashboardController.getJudge);

export default router;
