import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  target_role: z.enum(['ADMIN', 'TEAM_LEADER', 'PARTICIPANT', 'JUDGE']).nullable().optional(),
  target_team_id: z.number().int().positive().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  target_role: z.enum(['ADMIN', 'TEAM_LEADER', 'PARTICIPANT', 'JUDGE']).nullable().optional(),
  target_team_id: z.number().int().positive().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});
