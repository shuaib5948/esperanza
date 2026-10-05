import { Router } from 'express';
import { CompetitionController } from '../controllers/competition.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
  setEligibilitySchema,
  createCriterionSchema,
  updateCriterionSchema,
} from '../validators/competition.validator.js';

const router = Router();

// Public / Authenticated read routes
router.get('/', CompetitionController.getAll);
router.get('/meta/types', CompetitionController.getTypes);
router.get('/:id', CompetitionController.getById);
router.get('/:id/eligibility', CompetitionController.getEligibility);
router.get('/:id/criteria', CompetitionController.getCriteria);
router.get('/:id/participants', authenticate, CompetitionController.getParticipants);

// Admin-only management routes
router.post('/registration/lock-all', authenticate, authorizeRoles('ADMIN'), CompetitionController.lockAllRegistrations);
router.post('/registration/unlock-all', authenticate, authorizeRoles('ADMIN'), CompetitionController.unlockAllRegistrations);
router.post('/', authenticate, authorizeRoles('ADMIN'), validateRequest(createCompetitionSchema), CompetitionController.create);
router.patch('/:id', authenticate, authorizeRoles('ADMIN'), validateRequest(updateCompetitionSchema), CompetitionController.update);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), CompetitionController.delete);
router.post('/:id/publish', authenticate, authorizeRoles('ADMIN'), CompetitionController.publish);
router.post('/:id/open-registration', authenticate, authorizeRoles('ADMIN'), CompetitionController.openRegistration);
router.post('/:id/close-registration', authenticate, authorizeRoles('ADMIN'), CompetitionController.closeRegistration);

// Eligibility management
router.put(
  '/:id/eligibility',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(setEligibilitySchema),
  CompetitionController.setEligibility
);

// Criteria management
router.post(
  '/:id/criteria',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(createCriterionSchema),
  CompetitionController.addCriterion
);
router.patch(
  '/:id/criteria/:criterionId',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateCriterionSchema),
  CompetitionController.updateCriterion
);
router.delete(
  '/:id/criteria/:criterionId',
  authenticate,
  authorizeRoles('ADMIN'),
  CompetitionController.deleteCriterion
);

// Judge assignments
import { JudgeController } from '../controllers/judging.controller.js';
import { assignJudgeSchema } from '../validators/judging.validator.js';

router.get(
  '/:id/judges',
  authenticate,
  JudgeController.getCompetitionJudges
);

router.post(
  '/:id/judges',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(assignJudgeSchema),
  JudgeController.assignJudge
);

router.delete(
  '/:id/judges/:judgeId',
  authenticate,
  authorizeRoles('ADMIN'),
  JudgeController.removeJudge
);

export default router;
