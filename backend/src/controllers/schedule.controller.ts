import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { VenueService, ScheduleService } from '../services/schedule.service.js';
import { ApiResponse } from '../utils/response.js';

export class VenueController {
  static async getAll(_req: any, res: Response, next: any) {
    try {
      const venues = await VenueService.getAll();
      return ApiResponse.success(res, venues, 'Venues fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const venue = await VenueService.getById(id);
      return ApiResponse.success(res, venue, 'Venue fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const venue = await VenueService.create(req.body);
      return ApiResponse.success(res, venue, 'Venue created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await VenueService.update(id, req.body);
      return ApiResponse.success(res, updated, 'Venue updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      await VenueService.delete(id);
      return ApiResponse.success(res, null, 'Venue deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getSchedule(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const schedule = await VenueService.getSchedule(id);
      return ApiResponse.success(res, schedule, 'Venue schedule fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}

export class ScheduleController {
  static async getAll(_req: any, res: Response, next: any) {
    try {
      const schedules = await ScheduleService.getAll();
      return ApiResponse.success(res, schedules, 'Schedules fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const schedule = await ScheduleService.getById(id);
      return ApiResponse.success(res, schedule, 'Schedule fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const created = await ScheduleService.create(req.body);
      return ApiResponse.success(res, created, 'Schedule created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await ScheduleService.update(id, req.body);
      return ApiResponse.success(res, updated, 'Schedule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      await ScheduleService.delete(id);
      return ApiResponse.success(res, null, 'Schedule deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async checkConflicts(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { venueId, startAt, endAt, excludeScheduleId } = req.query;
      const conflicts = await ScheduleService.checkConflicts(
        parseInt(venueId as string, 10),
        startAt as string,
        endAt as string,
        excludeScheduleId ? parseInt(excludeScheduleId as string, 10) : undefined
      );
      return ApiResponse.success(res, { hasConflict: conflicts.length > 0, conflicts });
    } catch (error) {
      next(error);
    }
  }
}
