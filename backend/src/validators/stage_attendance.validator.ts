import { z } from 'zod';

export const updateStageStatusSchema = z.object({
  stage_status: z.enum(['WAITING', 'CALLED', 'ON_STAGE', 'COMPLETED', 'ABSENT']).optional(),
  status: z.enum(['WAITING', 'CALLED', 'ON_STAGE', 'COMPLETED', 'ABSENT']).optional(),
}).refine((data) => data.stage_status || data.status, {
  message: 'stage_status or status is required',
});

export const updateAttendanceSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  notes: z.string().optional().nullable(),
});

export const bulkAttendanceSchema = z.object({
  attendance: z.array(
    z.object({
      registration_id: z.number().int().positive(),
      status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
      notes: z.string().optional().nullable(),
    })
  ).min(1, 'At least one attendance record required'),
});

export const submissionSchema = z.object({
  participant_id: z.number().int().positive('Participant ID is required'),
  file_url: z.string().url('Valid file URL is required'),
  file_name: z.string().min(1, 'File name is required'),
  file_type: z.string().optional().nullable(),
  file_size: z.number().int().positive().optional().nullable(),
});
