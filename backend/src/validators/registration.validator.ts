import { z } from 'zod';

export const createRegistrationSchema = z.object({
  competition_id: z.number().int().positive('Competition ID is required'),
  participant_id: z.number().int().positive('Participant ID is required'),
});

export const bulkRegistrationSchema = z.object({
  competition_id: z.number().int().positive('Competition ID is required'),
  participant_ids: z.array(z.number().int().positive()).min(1, 'At least one participant required'),
});

export const updateRegistrationSchema = z.object({
  status: z.enum(['ASSIGNED', 'REMOVED']),
});
