import { z } from 'zod';

export const createParticipantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters').default('Esperanza@2026'),
  team_id: z.number().int().positive('Valid team ID is required'),
  category_id: z.number().int().positive('Valid category ID is required'),
  registration_number: z.string().optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  class_name: z.string().optional().nullable(),
});

export const updateParticipantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional().nullable(),
  team_id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().optional(),
  registration_number: z.string().optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  class_name: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
