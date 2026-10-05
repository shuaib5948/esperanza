import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { TeamService, CategoryService } from '../services/team.service.js';
import { ApiResponse } from '../utils/response.js';

export class TeamController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teams = await TeamService.getAllTeams();
      return ApiResponse.success(res, teams, 'Teams fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teamId = parseInt(req.params.id, 10);
      const team = await TeamService.getTeamById(teamId);
      return ApiResponse.success(res, team, 'Team fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teamId = parseInt(req.params.id, 10);
      const updated = await TeamService.updateTeam(teamId, req.body);
      return ApiResponse.success(res, updated, 'Team updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMembers(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teamId = parseInt(req.params.id, 10);
      const members = await TeamService.getTeamMembers(teamId);
      return ApiResponse.success(res, members, 'Team members fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPoints(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const teamId = parseInt(req.params.id, 10);
      const points = await TeamService.getTeamPoints(teamId);
      return ApiResponse.success(res, points, 'Team points breakdown fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getLeaderboard(_req: any, res: Response, next: any) {
    try {
      const leaderboard = await TeamService.getLeaderboard();
      return ApiResponse.success(res, leaderboard, 'Leaderboard fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}

export class CategoryController {
  static async getAll(_req: any, res: Response, next: any) {
    try {
      const categories = await CategoryService.getAll();
      return ApiResponse.success(res, categories, 'Categories fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const cat = await CategoryService.getById(id);
      return ApiResponse.success(res, cat, 'Category fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const created = await CategoryService.create(req.body);
      return ApiResponse.success(res, created, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await CategoryService.update(id, req.body);
      return ApiResponse.success(res, updated, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: any) {
    try {
      const id = parseInt(req.params.id, 10);
      await CategoryService.delete(id);
      return ApiResponse.success(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
