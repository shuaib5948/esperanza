import { VenueRepository, ScheduleRepository } from '../repositories/venue_schedule.repository.js';
import { query } from '../database/connection.js';

export class VenueService {
  static async getAll() {
    return VenueRepository.findAll();
  }

  static async getById(id: number) {
    const venue = await VenueRepository.findById(id);
    if (!venue) {
      throw { statusCode: 404, code: 'VENUE_NOT_FOUND', message: 'Venue not found' };
    }
    return venue;
  }

  static async create(data: any) {
    const id = await VenueRepository.create(data);
    return this.getById(id);
  }

  static async update(id: number, data: any) {
    await this.getById(id);
    await VenueRepository.update(id, data);
    return this.getById(id);
  }

  static async delete(id: number) {
    await this.getById(id);
    await VenueRepository.delete(id);
  }

  static async getSchedule(venueId: number) {
    await this.getById(venueId);
    return query(`
      SELECT s.*, c.name as competition_name, c.competition_code
      FROM schedules s
      JOIN competitions c ON c.id = s.competition_id
      WHERE s.venue_id = ?
      ORDER BY s.start_at ASC
    `, [venueId]);
  }
}

export class ScheduleService {
  static async getAll() {
    return ScheduleRepository.findAll();
  }

  static async getById(id: number) {
    const sched = await ScheduleRepository.findById(id);
    if (!sched) {
      throw { statusCode: 404, code: 'SCHEDULE_NOT_FOUND', message: 'Schedule slot not found' };
    }
    return sched;
  }

  static async create(data: any) {
    if (data.competition_id) {
      const compRows = await query<any[]>('SELECT status FROM competitions WHERE id = ?', [data.competition_id]);
      if (compRows && compRows[0]?.status === 'COMPLETED') {
        throw {
          statusCode: 400,
          code: 'COMPETITION_ALREADY_COMPLETED',
          message: 'Cannot schedule a programme that is already marked as COMPLETED.',
        };
      }

      // Guard: At the time of scheduling, the competition must have at least 1 registered participant assigned
      const regRows = await query<any[]>(`
        SELECT COUNT(*) as count 
        FROM registrations 
        WHERE competition_id = ? AND status = 'ASSIGNED'
      `, [data.competition_id]);

      const participantCount = Number(regRows[0]?.count || 0);
      if (participantCount === 0) {
        throw {
          statusCode: 400,
          code: 'NO_PARTICIPANTS_ASSIGNED',
          message: 'Cannot schedule programme: At least 1 participant must be registered and assigned to this competition first.',
        };
      }
    }

    // 1. Conflict detection: venue overlap
    if (data.venue_id) {
      const conflicts = await ScheduleRepository.checkVenueConflict(data.venue_id, data.start_at, data.end_at);
      if (conflicts.length > 0) {
        throw {
          statusCode: 409,
          code: 'VENUE_SCHEDULE_CONFLICT',
          message: `Venue conflict: "${conflicts[0].competition_name}" is already scheduled in this venue during the selected time.`,
          details: conflicts[0],
        };
      }
    }

    const id = await ScheduleRepository.create(data);
    return this.getById(id);
  }

  static async update(id: number, data: any) {
    const existing = await this.getById(id);

    if (existing.status === 'COMPLETED') {
      throw {
        statusCode: 400,
        code: 'SCHEDULE_ALREADY_COMPLETED',
        message: 'This programme has already been completed. Editing or rescheduling completed programmes is disabled.',
      };
    }

    const venueId = data.venue_id !== undefined ? data.venue_id : existing.venue_id;
    const startAt = data.start_at || existing.start_at;
    const endAt = data.end_at || existing.end_at;

    if (venueId) {
      const conflicts = await ScheduleRepository.checkVenueConflict(venueId, startAt, endAt, id);
      if (conflicts.length > 0) {
        throw {
          statusCode: 409,
          code: 'VENUE_SCHEDULE_CONFLICT',
          message: `Venue conflict: "${conflicts[0].competition_name}" overlaps with the rescheduled time.`,
          details: conflicts[0],
        };
      }
    }

    if (data.status === 'LIVE') {
      const existingLive = await query<any[]>(`
        SELECT id FROM schedules 
        WHERE status = 'LIVE' AND id != ?
      `, [id]);

      if (existingLive && existingLive.length > 0) {
        throw {
          statusCode: 400,
          code: 'STAGE_BUSY',
          message: 'Cannot go live: Another programme is currently LIVE on stage. Please finish the active programme first.',
        };
      }

      const presentWithLots = await query<any[]>(`
        SELECT COUNT(*) as count 
        FROM stage_queue 
        WHERE competition_id = ? 
          AND check_in_status = 'REPORTED' 
          AND code_letter IS NOT NULL
      `, [existing.competition_id]);

      const count = Number(presentWithLots[0]?.count || 0);
      if (count === 0) {
        throw {
          statusCode: 400,
          code: 'CHECK_IN_INCOMPLETE',
          message: 'Cannot go live: At least one participant must be marked Present with an assigned lot code letter.',
        };
      }
    }

    const compTypeRows = await query<any[]>(`
      SELECT ct.name as competition_type_name
      FROM competitions c
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      WHERE c.id = ?
    `, [existing.competition_id]);
    const isStageItem = (compTypeRows[0]?.competition_type_name || '').toUpperCase() === 'STAGE';

    if (data.status === 'COMPLETED') {
      // For STAGE items, require live judge scores before finishing.
      // For OFF_STAGE items, the session completes first, and evaluation/marks happen afterwards.
      if (isStageItem) {
        const submittedScores = await query<any[]>(`
          SELECT COUNT(*) as count 
          FROM score_sheets 
          WHERE competition_id = ? AND status IN ('SUBMITTED', 'LOCKED')
        `, [existing.competition_id]);

        const count = Number(submittedScores[0]?.count || 0);
        if (count === 0) {
          throw {
            statusCode: 400,
            code: 'MARKS_NOT_RECEIVED',
            message: 'Cannot finish programme: Official marks have not been submitted by the judge yet.',
          };
        }
      }
    }

    await ScheduleRepository.update(id, data);

    if (data.status === 'COMPLETED') {
      await query(`
        UPDATE stage_queue 
        SET stage_status = 'COMPLETED', stage_ended_at = COALESCE(stage_ended_at, NOW())
        WHERE competition_id = ? AND stage_status != 'ABSENT'
      `, [existing.competition_id]);

      await query(`
        UPDATE competitions 
        SET status = 'COMPLETED' 
        WHERE id = ?
      `, [existing.competition_id]);
    }

    // Auto-assign judges ONLY for STAGE competitions when going LIVE or CHECK_IN
    if (isStageItem && (data.status === 'LIVE' || data.status === 'CHECK_IN')) {
      const judges = await query<any[]>('SELECT id FROM judges WHERE status = "ACTIVE" AND judge_type IN ("STAGE", "ALL")');
      for (const j of judges) {
        await query(`
          INSERT INTO competition_judges (competition_id, judge_id, assigned_by, status)
          VALUES (?, ?, 1, 'ASSIGNED')
          ON DUPLICATE KEY UPDATE status = 'ASSIGNED'
        `, [existing.competition_id, j.id]);
      }
    }

    return this.getById(id);
  }

  static async delete(id: number) {
    const existing = await this.getById(id);
    if (existing.status === 'COMPLETED') {
      throw {
        statusCode: 400,
        code: 'SCHEDULE_ALREADY_COMPLETED',
        message: 'Cannot delete a completed schedule record.',
      };
    }
    await ScheduleRepository.delete(id);
  }

  static async checkConflicts(venueId: number, startAt: string, endAt: string, excludeScheduleId?: number) {
    return ScheduleRepository.checkVenueConflict(venueId, startAt, endAt, excludeScheduleId);
  }
}
