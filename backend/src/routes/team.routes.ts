import { Router } from 'express';
import { TeamController } from '../controllers/team.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles, enforceTeamIsolation } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { updateTeamSchema } from '../validators/team.validator.js';

const router = Router();

// Public / Authenticated Leaderboard
router.get('/leaderboard', TeamController.getLeaderboard);

// Team endpoints
router.get('/', authenticate, TeamController.getAll);
router.get('/:id', authenticate, enforceTeamIsolation, TeamController.getById);
router.patch('/:id', authenticate, authorizeRoles('ADMIN'), validateRequest(updateTeamSchema), TeamController.update);
router.get('/:id/members', authenticate, enforceTeamIsolation, TeamController.getMembers);
router.get('/:id/points', authenticate, enforceTeamIsolation, TeamController.getPoints);

export default router;
