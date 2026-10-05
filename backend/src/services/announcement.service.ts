import { AnnouncementRepository } from '../repositories/announcement.repository.js';

export class AnnouncementService {
  static async create(data: {
    title: string;
    content: string;
    target_role?: string | null;
    target_team_id?: number | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  }, userId: number) {
    return AnnouncementRepository.create({
      ...data,
      created_by: userId,
    });
  }

  static async getById(id: number) {
    const announcement = await AnnouncementRepository.findById(id);
    if (!announcement) {
      throw {
        statusCode: 404,
        code: 'ANNOUNCEMENT_NOT_FOUND',
        message: 'Announcement not found',
      };
    }
    return announcement;
  }

  static async listForUser(role?: string, teamId?: number | null) {
    if (role === 'ADMIN') {
      return AnnouncementRepository.findAllAdmin();
    }
    return AnnouncementRepository.findAllForUser(role, teamId);
  }

  static async update(id: number, data: any) {
    const existing = await AnnouncementRepository.findById(id);
    if (!existing) {
      throw {
        statusCode: 404,
        code: 'ANNOUNCEMENT_NOT_FOUND',
        message: 'Announcement not found',
      };
    }
    return AnnouncementRepository.update(id, data);
  }

  static async delete(id: number) {
    const existing = await AnnouncementRepository.findById(id);
    if (!existing) {
      throw {
        statusCode: 404,
        code: 'ANNOUNCEMENT_NOT_FOUND',
        message: 'Announcement not found',
      };
    }
    return AnnouncementRepository.delete(id);
  }
}
