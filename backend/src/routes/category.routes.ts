import { Router } from 'express';
import { CategoryController } from '../controllers/team.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { createCategorySchema, updateCategorySchema } from '../validators/team.validator.js';

const router = Router();

router.get('/', authenticate, CategoryController.getAll);
router.get('/:id', authenticate, CategoryController.getById);
router.post('/', authenticate, authorizeRoles('ADMIN'), validateRequest(createCategorySchema), CategoryController.create);
router.patch('/:id', authenticate, authorizeRoles('ADMIN'), validateRequest(updateCategorySchema), CategoryController.update);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), CategoryController.delete);

export default router;
