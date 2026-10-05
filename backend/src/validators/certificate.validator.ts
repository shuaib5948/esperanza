import { z } from 'zod';

export const generateCertificatesSchema = z.object({
  competition_id: z.number().int().positive('Competition ID is required'),
});

export const revokeCertificateSchema = z.object({
  reason: z.string().optional(),
});
