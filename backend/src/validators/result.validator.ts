import { z } from 'zod';

export const generateResultsSchema = z.object({
  calculation_method: z.enum(['AVERAGE', 'WEIGHTED_AVERAGE', 'HIGHEST']).default('AVERAGE'),
});

export const updateResultSchema = z.object({
  position: z.number().int().positive().optional().nullable(),
  final_score: z.number().optional().nullable(),
  points_awarded: z.number().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const pointRuleSchema = z.object({
  name: z.string().min(2, 'Rule name is required'),
  position: z.number().int().positive().optional().nullable(),
  points: z.number().min(0, 'Points must be >= 0'),
  participation_points: z.number().min(0).default(0),
  active: z.boolean().default(true),
});
