import { Router } from 'express';
import { JudgeController } from '../controllers/judging.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createJudgeSchema,
  assignJudgeSchema,
  saveScoresSchema,
  unlockScoreSheetSchema,
} from '../validators/judging.validator.js';

// 1. Administrative Judge Routes (/api/v1/judges)
export const judgeAdminRouter = Router();

judgeAdminRouter.get('/', authenticate, JudgeController.getAllJudges);
judgeAdminRouter.get('/:id', authenticate, JudgeController.getJudgeById);
judgeAdminRouter.post(
  '/',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(createJudgeSchema),
  JudgeController.createJudge
);

// 2. Judge Evaluation Portal Routes (/api/v1/judge)
export const judgePortalRouter = Router();

judgePortalRouter.use(authenticate, authorizeRoles('JUDGE'));

judgePortalRouter.get('/competitions', JudgeController.getMyCompetitions);
judgePortalRouter.get('/competitions/:id/participants', JudgeController.getParticipantsForCompetition);
judgePortalRouter.get('/competitions/:id/scoresheet', JudgeController.getFullScoreSheet);
judgePortalRouter.get('/competitions/:id/score-sheet/:participantId', JudgeController.getScoreSheet);
judgePortalRouter.post(
  '/competitions/:id/scores',
  validateRequest(saveScoresSchema),
  JudgeController.saveScores
);
judgePortalRouter.post('/competitions/:id/bulk-scores', JudgeController.saveBulkScores);
judgePortalRouter.post('/scores/:sheetId/submit', JudgeController.submitScoreSheet);

// Admin-only score unlock
judgePortalRouter.post(
  '/scores/:sheetId/unlock',
  authorizeRoles('ADMIN'),
  validateRequest(unlockScoreSheetSchema),
  JudgeController.unlockScoreSheet
);
