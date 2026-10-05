import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Reports are accessible by ADMIN
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/export/participants', ReportController.exportParticipants);
router.get('/export/registrations', ReportController.exportRegistrations);
router.get('/export/scores', ReportController.exportScores);
router.get('/export/leaderboard', ReportController.exportLeaderboard);

export default router;
