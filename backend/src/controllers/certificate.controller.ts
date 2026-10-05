import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { CertificateService } from '../services/certificate.service.js';
import { ApiResponse } from '../utils/response.js';

export class CertificateController {
  // Public verification endpoint
  static async verify(req: Request, res: Response, next: any) {
    try {
      const code = String(req.params.code);
      const result = await CertificateService.verifyByCode(code);
      return ApiResponse.success(res, result, 'Certificate verified successfully');
    } catch (error) {
      next(error);
    }
  }

  // Admin / Authenticated endpoints
  static async list(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { participant_id, competition_id, status } = req.query;
      const certs = await CertificateService.list({
        participant_id: participant_id ? parseInt(participant_id as string, 10) : undefined,
        competition_id: competition_id ? parseInt(competition_id as string, 10) : undefined,
        status: status as string,
      });
      return ApiResponse.success(res, certs, 'Certificates fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const cert = await CertificateService.getById(id);
      return ApiResponse.success(res, cert, 'Certificate fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async generate(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { competition_id } = req.body;
      const certs = await CertificateService.generate(competition_id);
      return ApiResponse.success(res, certs, 'Certificates generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async revoke(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const cert = await CertificateService.revoke(id);
      return ApiResponse.success(res, cert, 'Certificate revoked successfully');
    } catch (error) {
      next(error);
    }
  }
}
