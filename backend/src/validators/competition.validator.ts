import { z } from 'zod';

export const createCompetitionSchema = z.object({
  programme_number: z.coerce.number().int().positive('Programme number is required'),
  name: z.string().min(2, 'Competition name is required'),
  programme_group_id: z.coerce.number().int().positive('Programme group is required'),
  competition_type_id: z.coerce.number().int().positive().optional().nullable(),
  participation_type: z.enum(['INDIVIDUAL', 'GROUP']).default('INDIVIDUAL'),
  description: z.string().optional().nullable(),
  rules: z.string().optional().nullable(),
  max_participants: z.coerce.number().int().positive().optional().nullable(),
  max_entries_per_team: z.coerce.number().int().positive().optional().nullable(),
  registration_open: z.string().optional().nullable(),
  registration_close: z.string().optional().nullable(),
});

export const updateCompetitionSchema = z.object({
  programme_number: z.coerce.number().int().positive().optional(),
  name: z.string().min(2).optional(),
  programme_group_id: z.coerce.number().int().positive().optional(),
  competition_type_id: z.coerce.number().int().positive().optional().nullable(),
  participation_type: z.enum(['INDIVIDUAL', 'GROUP']).optional(),
  description: z.string().optional().nullable(),
  rules: z.string().optional().nullable(),
  max_participants: z.coerce.number().int().positive().optional().nullable(),
  max_entries_per_team: z.coerce.number().int().positive().optional().nullable(),
  registration_open: z.string().optional().nullable(),
  registration_close: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'PUBLISHED', 'CLOSED']).optional(),
});

export const setEligibilitySchema = z.object({
  categoryIds: z.array(z.number().int().positive()),
});

export const createCriterionSchema = z.object({
  name: z.string().min(2, 'Criterion name is required'),
  description: z.string().optional().nullable(),
  max_marks: z.number().positive('Max marks must be greater than 0'),
  weight: z.number().positive().default(1.0),
  display_order: z.number().int().default(1),
});

export const updateCriterionSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  max_marks: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  display_order: z.number().int().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
