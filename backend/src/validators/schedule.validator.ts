import { z } from 'zod';

export const createVenueSchema = z.object({
  name: z.string().min(2, 'Venue name is required'),
  code: z.string().min(2, 'Venue code is required'),
  location: z.string().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
});

export const updateVenueSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).optional(),
  location: z.string().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const createScheduleSchema = z.object({
  competition_id: z.number().int().positive('Competition ID is required'),
  venue_id: z.number().int().positive().optional().nullable(),
  start_at: z.string().datetime('Valid ISO start time required'),
  end_at: z.string().datetime('Valid ISO end time required'),
  stage_order: z.number().int().optional().nullable(),
});

export const updateScheduleSchema = z.object({
  venue_id: z.number().int().positive().optional().nullable(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  stage_order: z.number().int().optional().nullable(),
  status: z.enum(['SCHEDULED', 'CHECK_IN', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
});
