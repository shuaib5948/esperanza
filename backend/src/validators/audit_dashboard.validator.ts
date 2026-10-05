import { z } from 'zod';

export const auditLogFilterSchema = z.object({
  user_id: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  action: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  page: z.string().optional().default('1').transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z.string().optional().default('20').transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20))),
});
