import { Router } from 'express';
import { query } from '../database/connection.js';
import { ApiResponse } from '../utils/response.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const groups = await query('SELECT * FROM programme_groups ORDER BY display_order ASC');
    return ApiResponse.success(res, groups, 'Programme groups fetched successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
