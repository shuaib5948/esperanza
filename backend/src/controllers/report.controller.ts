import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { ReportService } from '../services/report.service.js';

export class ReportController {
  static async exportParticipants(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'csv';
      const result = await ReportService.exportParticipants(format);
      if (format === 'csv') {
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        return res.send(result.content);
      }
      return res.json({ success: true, data: result.content });
    } catch (error) {
      next(error);
    }
  }

  static async exportRegistrations(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'csv';
      const result = await ReportService.exportRegistrations(format);
      if (format === 'csv') {
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        return res.send(result.content);
      }
      return res.json({ success: true, data: result.content });
    } catch (error) {
      next(error);
    }
  }

  static async exportScores(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'csv';
      const result = await ReportService.exportScores(format);
      if (format === 'csv') {
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        return res.send(result.content);
      }
      return res.json({ success: true, data: result.content });
    } catch (error) {
      next(error);
    }
  }

  static async exportLeaderboard(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'csv';
      const result = await ReportService.exportLeaderboard(format);
      if (format === 'csv') {
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        return res.send(result.content);
      }
      return res.json({ success: true, data: result.content });
    } catch (error) {
      next(error);
    }
  }
}
