import { Router } from 'express';
import { CompetitionController } from '../controllers/competition.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { query } from '../database/connection.js';
import { ApiResponse } from '../utils/response.js';

const router = Router();

// Protect all admin routes: must be authenticated and have role ADMIN
router.use(authenticate, authorizeRoles('ADMIN'));

// Competition Management
router.get('/competitions', CompetitionController.getAll);
router.get('/competitions/:id', CompetitionController.getById);
router.post('/competitions', CompetitionController.create);
router.patch('/competitions/:id', CompetitionController.update);
router.delete('/competitions/:id', CompetitionController.delete);

// Meta endpoints
router.get('/competition-groups', async (_req, res, next) => {
  try {
    const groups = await query('SELECT * FROM programme_groups WHERE status = "ACTIVE" ORDER BY display_order ASC');
    return ApiResponse.success(res, groups, 'Competition groups fetched successfully');
  } catch (err) {
    next(err);
  }
});

router.get('/participant-categories', async (_req, res, next) => {
  try {
    const categories = await query('SELECT * FROM participant_categories WHERE status = "ACTIVE" ORDER BY id ASC');
    return ApiResponse.success(res, categories, 'Participant categories fetched successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
