import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { StageAttendanceService } from '../services/stage_attendance.service.js';
import { ApiResponse } from '../utils/response.js';

export class StageAttendanceController {
  // Stage Queue
  static async getStageQueue(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const queue = await StageAttendanceService.getStageQueue(compId);
      return ApiResponse.success(res, queue, 'Stage queue fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async initStageQueue(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const queue = await StageAttendanceService.initStageQueue(compId);
      return ApiResponse.success(res, queue, 'Stage queue initialized successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateStageStatus(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const queueId = parseInt(req.params.queueId, 10);
      const stageStatus = req.body.stage_status || req.body.status;
      const updated = await StageAttendanceService.updateStageStatus(queueId, stageStatus);
      return ApiResponse.success(res, updated, 'Stage status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateCheckInStatus(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const queueId = parseInt(req.params.queueId, 10);
      const checkInStatus = req.body.check_in_status || req.body.status;
      const updated = await StageAttendanceService.updateCheckInStatus(queueId, checkInStatus);
      return ApiResponse.success(res, updated, 'Check-in status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async callParticipant(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const queueId = parseInt(req.params.queueId, 10);
      const updated = await StageAttendanceService.callParticipant(queueId);
      return ApiResponse.success(res, updated, 'Participant call recorded');
    } catch (error) {
      next(error);
    }
  }

  static async notifyTeamLeader(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const queueId = parseInt(req.params.queueId, 10);
      const adminUserId = req.user?.id || 1;
      const result = await StageAttendanceService.notifyTeamLeader(queueId, adminUserId);
      return ApiResponse.success(res, result, 'Team leader alerted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async assignLots(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const lots = req.body.lots; // Array of { queue_id, code_letter, queue_order }
      const updatedQueue = await StageAttendanceService.assignLots(compId, lots);
      return ApiResponse.success(res, updatedQueue, 'Lots assigned successfully');
    } catch (error) {
      next(error);
    }
  }

  static async appendLatePerformer(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const participantId = parseInt(req.body.participant_id || req.body.participantId, 10);
      const updatedItem = await StageAttendanceService.appendLatePerformer(compId, participantId);
      return ApiResponse.success(res, updatedItem, 'Late performer appended to queue successfully');
    } catch (error) {
      next(error);
    }
  }

  // Attendance
  static async getAttendance(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.id, 10);
      const attendance = await StageAttendanceService.getAttendance(compId);
      return ApiResponse.success(res, attendance, 'Attendance fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateAttendance(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, notes } = req.body;
      const updated = await StageAttendanceService.updateAttendance(id, status, notes, req.user!.id);
      return ApiResponse.success(res, updated, 'Attendance updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async bulkAttendance(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { attendance } = req.body;
      const result = await StageAttendanceService.bulkAttendance(attendance, req.user!.id);
      return ApiResponse.success(res, result, 'Attendance marked in bulk successfully');
    } catch (error) {
      next(error);
    }
  }

  // Submissions
  static async getSubmissions(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const submissions = await StageAttendanceService.getSubmissions(compId);
      return ApiResponse.success(res, submissions, 'Submissions fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createSubmission(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const compId = parseInt(req.params.competitionId, 10);
      const submission = await StageAttendanceService.createSubmission(compId, req.body);
      return ApiResponse.success(res, submission, 'Submission uploaded successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
