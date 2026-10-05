import { Router } from 'express';
import { StageAttendanceController } from '../controllers/stage_attendance.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  updateStageStatusSchema,
  updateAttendanceSchema,
  bulkAttendanceSchema,
  submissionSchema,
} from '../validators/stage_attendance.validator.js';

export const stageRouter = Router();
export const attendanceRouter = Router();
export const submissionRouter = Router();

// Stage Queue routes (/api/v1/stage)
stageRouter.get('/:competitionId/queue', StageAttendanceController.getStageQueue);
stageRouter.post(
  '/:competitionId/init',
  authenticate,
  authorizeRoles('ADMIN'),
  StageAttendanceController.initStageQueue
);
stageRouter.patch(
  '/:queueId/status',
  authenticate,
  authorizeRoles('ADMIN', 'JUDGE'),
  validateRequest(updateStageStatusSchema),
  StageAttendanceController.updateStageStatus
);
stageRouter.patch(
  '/:queueId/check-in',
  authenticate,
  authorizeRoles('ADMIN'),
  StageAttendanceController.updateCheckInStatus
);
stageRouter.post(
  '/:queueId/call',
  authenticate,
  authorizeRoles('ADMIN'),
  StageAttendanceController.callParticipant
);
stageRouter.post(
  '/:queueId/notify-leader',
  authenticate,
  authorizeRoles('ADMIN'),
  StageAttendanceController.notifyTeamLeader
);
stageRouter.post(
  '/:competitionId/assign-lots',
  authenticate,
  authorizeRoles('ADMIN'),
  StageAttendanceController.assignLots
);
stageRouter.post(
  '/:competitionId/append-late',
  authenticate,
  authorizeRoles('ADMIN'),
  StageAttendanceController.appendLatePerformer
);

// Attendance routes (/api/v1/attendance)
attendanceRouter.get('/competitions/:id', authenticate, StageAttendanceController.getAttendance);
attendanceRouter.patch(
  '/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(updateAttendanceSchema),
  StageAttendanceController.updateAttendance
);
attendanceRouter.post(
  '/bulk',
  authenticate,
  authorizeRoles('ADMIN'),
  validateRequest(bulkAttendanceSchema),
  StageAttendanceController.bulkAttendance
);

// Submissions routes (/api/v1/submissions)
submissionRouter.get('/:competitionId', authenticate, StageAttendanceController.getSubmissions);
submissionRouter.post(
  '/:competitionId',
  authenticate,
  validateRequest(submissionSchema),
  StageAttendanceController.createSubmission
);
