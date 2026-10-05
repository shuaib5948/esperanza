import { Router } from 'express';
import { ResultController } from '../controllers/result_points.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { generateResultsSchema, updateResultSchema } from '../validators/result.validator.js';

const router = Router();

// Admin-only Competition-specific Results & Complete Judge Marks
router.get('/competition/:competitionId', authenticate, authorizeRoles('ADMIN'), ResultController.getByCompetition);
router.get('/competition/:competitionId/judge-scores', authenticate, authorizeRoles('ADMIN'), ResultController.getCompetitionJudgeScores);

// Public / Authenticated published results
router.get('/', ResultController.getAll);
router.get('/:id', ResultController.getById);

// Admin-only Result Operations
router.post(
  '/generate/:competitionId',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(generateResultsSchema),
  ResultController.generate
);

router.post('/competition/:competitionId/evaluate', authenticate, authorizeRoles('ADMIN'), ResultController.evaluate);
router.post('/competition/:competitionId/publish', authenticate, authorizeRoles('ADMIN'), ResultController.publishCompetition);
router.post('/competition/:competitionId/unpublish', authenticate, authorizeRoles('ADMIN'), ResultController.unpublishCompetition);

router.post('/:id/verify', authenticate, authorizeRoles('ADMIN'), ResultController.verify);
router.post('/:id/publish', authenticate, authorizeRoles('ADMIN'), ResultController.publish);
router.post('/:id/unpublish', authenticate, authorizeRoles('ADMIN'), ResultController.unpublish);
router.patch('/:id', authenticate, authorizeRoles('ADMIN'), validateRequest(updateResultSchema), ResultController.update);

export default router;
