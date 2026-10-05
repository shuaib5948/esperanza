import { z } from 'zod';

export const updateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code (e.g. #3b82f6)').optional(),
  logo_url: z.string().url('Must be a valid URL').optional().nullable(),
  leader_user_id: z.number().int().positive().optional().nullable(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  code: z.string().min(2, 'Category code must be at least 2 characters'),
  description: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').optional(),
  code: z.string().min(2, 'Category code must be at least 2 characters').optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
