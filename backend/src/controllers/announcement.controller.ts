import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { AnnouncementService } from '../services/announcement.service.js';
import { ApiResponse } from '../utils/response.js';

export class AnnouncementController {
  static async list(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const announcements = await AnnouncementService.listForUser(req.user?.role, req.user?.teamId);
      return ApiResponse.success(res, announcements, 'Announcements fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const announcement = await AnnouncementService.getById(id);
      return ApiResponse.success(res, announcement, 'Announcement fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const announcement = await AnnouncementService.create(req.body, req.user!.id);
      return ApiResponse.success(res, announcement, 'Announcement created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await AnnouncementService.update(id, req.body);
      return ApiResponse.success(res, updated, 'Announcement updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      await AnnouncementService.delete(id);
      return ApiResponse.success(res, null, 'Announcement deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
