import { Router } from 'express';
import { PointsController } from '../controllers/result_points.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { pointRuleSchema } from '../validators/result.validator.js';

const router = Router();

// Public / Authenticated Leaderboard
router.get('/leaderboard', PointsController.getLeaderboard);

// Point Rules
router.get('/rules', PointsController.getRules);
router.post(
  '/rules',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(pointRuleSchema),
  PointsController.createRule
);
router.patch(
  '/rules/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(pointRuleSchema.partial()),
  PointsController.updateRule
);

// Admin Leaderboard & Points Management
router.get(
  '/admin/team-breakdown',
  authenticate,
  authorizeRoles('ADMIN'),
  PointsController.getTeamBreakdown
);
router.get(
  '/admin/individual-leaderboard',
  authenticate,
  authorizeRoles('ADMIN'),
  PointsController.getIndividualLeaderboard
);
router.get(
  '/admin/points-log',
  authenticate,
  authorizeRoles('ADMIN'),
  PointsController.getPointsLog
);
router.post(
  '/admin/recalculate',
  authenticate,
  authorizeRoles('ADMIN'),
  PointsController.recalculatePoints
);

export default router;
