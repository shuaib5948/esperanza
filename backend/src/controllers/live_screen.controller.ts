import { Request, Response, NextFunction } from 'express';
import { LiveScreenRepository } from '../repositories/live_screen.repository.js';

export class LiveScreenController {
  /**
   * Public display endpoint for the TV/LED stage screen
   */
  static async getDisplay(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await LiveScreenRepository.getDisplayData();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current state
   */
  static async getState(_req: Request, res: Response, next: NextFunction) {
    try {
      const state = await LiveScreenRepository.getState();
      return res.status(200).json({
        success: true,
        data: state,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Update live screen state (mode, active competition, custom message)
   */
  static async updateControl(req: Request, res: Response, next: NextFunction) {
    try {
      const { mode, active_competition_id, custom_title } = req.body;
      const validModes = ['AUTO', 'AD', 'LEADERBOARD', 'RESULT'];
      
      const selectedMode = validModes.includes(mode) ? mode : 'AUTO';
      const compId = active_competition_id ? Number(active_competition_id) : null;

      const updated = await LiveScreenRepository.updateState(
        selectedMode,
        compId,
        custom_title || null
      );

      return res.status(200).json({
        success: true,
        data: updated,
        message: `Live screen mode updated to ${selectedMode}`,
      });
    } catch (error) {
      next(error);
    }
  }
}
