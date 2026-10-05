import { z } from 'zod';

export const createJudgeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().nullable(),
  password: z.string().min(6).default('Judge@Esperanza2026!'),
  judge_code: z.string().min(2, 'Judge code is required'),
  qualification: z.string().optional().nullable(),
});

export const assignJudgeSchema = z.object({
  judge_id: z.number().int().positive('Valid judge ID is required'),
});

export const saveScoresSchema = z.object({
  participant_id: z.number().int().positive('Participant ID is required'),
  marks: z.number().min(0, 'Marks must be at least 0').max(100, 'Marks cannot exceed 100').optional(),
  remarks: z.string().optional().nullable(),
  scores: z.array(
    z.object({
      criterion_id: z.number().int().positive().optional(),
      marks: z.number().min(0, 'Marks must be greater than or equal to 0'),
      remarks: z.string().optional().nullable(),
    })
  ).optional(),
  is_draft: z.boolean().default(true),
}).refine(data => data.marks !== undefined || (data.scores && data.scores.length > 0), {
  message: 'Either direct marks (out of 100) or criteria scores array is required',
});

export const saveBulkScoresSchema = z.object({
  items: z.array(
    z.object({
      participant_id: z.number().int().positive('Participant ID is required'),
      marks: z.number().min(0, 'Marks must be at least 0').max(100, 'Marks cannot exceed 100').optional(),
      remarks: z.string().optional().nullable(),
      scores: z.array(
        z.object({
          criterion_id: z.number().int().positive().optional(),
          marks: z.number().min(0, 'Marks must be greater than or equal to 0'),
          remarks: z.string().optional().nullable(),
        })
      ).optional(),
    }).refine(item => item.marks !== undefined || (item.scores && item.scores.length > 0), {
      message: 'Either direct marks (out of 100) or criteria scores array is required for each participant',
    })
  ).min(1, 'At least one participant score is required'),
  is_draft: z.boolean().default(true),
});

export const unlockScoreSheetSchema = z.object({
  reason: z.string().min(5, 'Reason for unlocking score sheet is required for audit logs'),
});
