import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { DeviceSessionRepository } from '../repositories/device_session.repository.js';
import { ApiResponse } from '../utils/response.js';

export class DeviceSessionController {
  static async heartbeat(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { device_id, device_name, browser, portal, current_path } = req.body;
      if (!device_id) {
        return ApiResponse.error(res, 'MISSING_DEVICE_ID', 'Device ID is required', 400);
      }

      const ipAddress = (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress ||
        req.ip ||
        ''
      ).replace(/^.*:/, '');

      const result = await DeviceSessionRepository.recordHeartbeat({
        deviceId: String(device_id),
        userId: req.user?.id || null,
        deviceName: String(device_name || 'Web Browser'),
        browser: browser ? String(browser) : undefined,
        portal: String(portal || 'Web Portal'),
        currentPath: current_path ? String(current_path) : undefined,
        ipAddress: ipAddress || undefined,
      });

      return ApiResponse.success(res, result, 'Heartbeat recorded');
    } catch (error) {
      next(error);
    }
  }

  static async list(_req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const devices = await DeviceSessionRepository.getAllDevices();
      return ApiResponse.success(res, devices, 'Connected devices retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async disconnect(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { deviceId } = req.params;
      if (!deviceId) {
        return ApiResponse.error(res, 'MISSING_DEVICE_ID', 'Device ID is required', 400);
      }

      const success = await DeviceSessionRepository.disconnectDevice(deviceId, req.user!.id);
      return ApiResponse.success(
        res,
        { success },
        success ? 'Device disconnected successfully' : 'Device not found or already disconnected'
      );
    } catch (error) {
      next(error);
    }
  }

  static async disconnectAll(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const { current_device_id } = req.body;
      const count = await DeviceSessionRepository.disconnectAll(req.user!.id, current_device_id);
      return ApiResponse.success(
        res,
        { count },
        `Successfully disconnected ${count} device session(s)`
      );
    } catch (error) {
      next(error);
    }
  }
}
