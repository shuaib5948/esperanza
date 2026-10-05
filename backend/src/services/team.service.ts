import { TeamRepository, TeamRow } from '../repositories/team.repository.js';
import { CategoryRepository } from '../repositories/category.repository.js';

export class TeamService {
  static async getAllTeams() {
    return TeamRepository.findAll();
  }

  static async getTeamById(id: number) {
    const team = await TeamRepository.findById(id);
    if (!team) {
      throw { statusCode: 404, code: 'TEAM_NOT_FOUND', message: 'Team not found' };
    }
    return team;
  }

  static async updateTeam(id: number, data: Partial<TeamRow>) {
    await this.getTeamById(id);
    await TeamRepository.update(id, data);
    return this.getTeamById(id);
  }

  static async getTeamMembers(teamId: number) {
    await this.getTeamById(teamId);
    return TeamRepository.getMembers(teamId);
  }

  static async getTeamPoints(teamId: number) {
    await this.getTeamById(teamId);
    return TeamRepository.getPointsBreakdown(teamId);
  }

  static async getLeaderboard() {
    return TeamRepository.findAll();
  }
}

export class CategoryService {
  static async getAll() {
    return CategoryRepository.findAll();
  }

  static async getById(id: number) {
    const cat = await CategoryRepository.findById(id);
    if (!cat) {
      throw { statusCode: 404, code: 'CATEGORY_NOT_FOUND', message: 'Category not found' };
    }
    return cat;
  }

  static async create(data: { name: string; code: string; description?: string }) {
    const id = await CategoryRepository.create(data);
    return this.getById(id);
  }

  static async update(id: number, data: any) {
    await this.getById(id);
    await CategoryRepository.update(id, data);
    return this.getById(id);
  }

  static async delete(id: number) {
    await this.getById(id);
    await CategoryRepository.delete(id);
  }
}
