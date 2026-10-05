import { query } from '../database/connection.js';

export class DashboardRepository {
  static async getAdminStats() {
    // 1. Core Counts
    const [teamCount] = await query<any[]>('SELECT COUNT(*) as total FROM teams');
    const [partCount] = await query<any[]>('SELECT COUNT(*) as total FROM participants');
    const [compCount] = await query<any[]>('SELECT COUNT(*) as total FROM competitions');
    const [pubCompCount] = await query<any[]>("SELECT COUNT(*) as total FROM competitions WHERE status = 'CLOSED'");
    const [liveCompCount] = await query<any[]>("SELECT COUNT(*) as total FROM schedules WHERE status = 'LIVE'");
    const [regCount] = await query<any[]>('SELECT COUNT(*) as total FROM registrations');
    const [pendingRegCount] = await query<any[]>("SELECT COUNT(*) as total FROM registrations WHERE status = 'ASSIGNED'");
    const [judgeCount] = await query<any[]>('SELECT COUNT(*) as total FROM judges');

    // 2. Leaderboard Standings
    const leaderboard = await query<any[]>(`
      SELECT t.id, t.name, t.code, t.color,
             COALESCE(SUM(tp.points), 0) as total_points
      FROM teams t
      LEFT JOIN team_points tp ON tp.team_id = t.id
      GROUP BY t.id, t.name, t.code, t.color
      ORDER BY total_points DESC, t.name ASC
    `);

    // 3. Recent Audit Logs
    const recentAudits = await query<any[]>(`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 6
    `);

    // 4. Total points across both teams
    const totalPoints = leaderboard.reduce((acc: number, curr: any) => acc + Number(curr.total_points || 0), 0);

    // 5. Recent Completed / Verified Results for Battle Line Progression
    let recentResults: any[] = [];
    try {
      recentResults = await query<any[]>(`
        SELECT c.id as competition_id, c.programme_number, c.name as competition_name, c.type as category, c.status,
               COALESCE(SUM(CASE WHEN UPPER(t.code) = 'DIRAYA' OR UPPER(t.name) LIKE '%DIRAYA%' THEN tp.points ELSE 0 END), 0) as diraya_score,
               COALESCE(SUM(CASE WHEN UPPER(t.code) = 'RIVAYA' OR UPPER(t.name) LIKE '%RIVAYA%' THEN tp.points ELSE 0 END), 0) as rivaya_score
        FROM competitions c
        LEFT JOIN team_points tp ON tp.competition_id = c.id
        LEFT JOIN teams t ON t.id = tp.team_id
        WHERE c.status IN ('CLOSED', 'COMPLETED', 'ACTIVE')
        GROUP BY c.id, c.programme_number, c.name, c.type, c.status
        HAVING diraya_score > 0 OR rivaya_score > 0
        ORDER BY c.id ASC
        LIMIT 8
      `);
    } catch {
      recentResults = [];
    }

    // 6. Next Upcoming Event
    let nextEvent = null;
    try {
      const [event] = await query<any[]>(`
        SELECT c.id, c.name, c.type as category, c.status,
               s.start_time, v.name as venue_name
        FROM competitions c
        LEFT JOIN schedules s ON s.competition_id = c.id
        LEFT JOIN venues v ON v.id = s.venue_id
        WHERE c.status IN ('ACTIVE', 'SCHEDULED', 'READY', 'DRAFT')
        ORDER BY CASE WHEN s.status = 'LIVE' THEN 1 ELSE 2 END, s.start_at ASC, c.id ASC
        LIMIT 1
      `);
      nextEvent = event || null;
    } catch {
      nextEvent = null;
    }

    // 7. Live Stage Dispatch Item
    let nextDispatch = null;
    try {
      const [dispatchRow] = await query<any[]>(`
        SELECT sq.id, sq.queue_order, sq.stage_status,
               c.id as competition_id, c.programme_number, c.name as competition_name,
               p.id as participant_id, p.participant_code, u.name as participant_name,
               v.name as venue_name
        FROM stage_queue sq
        JOIN participants p ON p.id = sq.participant_id
        JOIN users u ON u.id = p.user_id
        JOIN competitions c ON c.id = sq.competition_id
        LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
        LEFT JOIN schedules s ON s.competition_id = c.id
        LEFT JOIN venues v ON v.id = s.venue_id
        WHERE s.status = 'LIVE' AND (ct.name = 'STAGE' OR ct.name IS NULL) AND sq.stage_status IN ('ON_STAGE', 'CALLED', 'WAITING')
        ORDER BY CASE WHEN sq.stage_status = 'ON_STAGE' THEN 1 WHEN sq.stage_status = 'CALLED' THEN 2 ELSE 3 END, sq.queue_order ASC
        LIMIT 1
      `);
      if (dispatchRow) {
        const orderVal = dispatchRow.queue_order ? Math.max(1, dispatchRow.queue_order) : 1;
        nextDispatch = {
          ...dispatchRow,
          code_letter: String.fromCharCode(64 + orderVal),
        };
      }
    } catch {
      nextDispatch = null;
    }

    // 8. Checking-in Programmes (status = 'CHECK_IN')
    let checkinProgrammes: any[] = [];
    try {
      checkinProgrammes = await query<any[]>(`
        SELECT c.id as competition_id, c.programme_number, c.name as competition_name,
               c.participation_type, pg.name as group_name,
               v.name as venue_name, s.start_at, s.status as schedule_status,
               (
                 SELECT COUNT(*) 
                 FROM registrations r 
                 WHERE r.competition_id = c.id AND r.status = 'ASSIGNED'
               ) as total_registered,
               (
                 SELECT COUNT(*) 
                 FROM stage_queue sq 
                 WHERE sq.competition_id = c.id AND sq.check_in_status = 'REPORTED'
               ) as checked_in_count
        FROM competitions c
        LEFT JOIN programme_groups pg ON pg.id = c.programme_group_id
        LEFT JOIN schedules s ON s.competition_id = c.id
        LEFT JOIN venues v ON v.id = s.venue_id
        WHERE s.status = 'CHECK_IN' OR c.status = 'CHECK_IN'
        ORDER BY s.start_at ASC, c.programme_number ASC
        LIMIT 4
      `);
    } catch {
      checkinProgrammes = [];
    }

    return {
      counts: {
        total_teams: teamCount.total,
        total_participants: partCount.total,
        total_competitions: compCount.total,
        completed_competitions: pubCompCount.total,
        live_competitions: liveCompCount.total,
        total_registrations: regCount.total,
        pending_registrations: pendingRegCount.total,
        total_judges: judgeCount.total,
        total_points: totalPoints,
      },
      leaderboard,
      recent_audits: recentAudits,
      recent_results: recentResults,
      next_event: nextEvent,
      next_dispatch: nextDispatch,
      checkin_programmes: checkinProgrammes,
    };
  }

  static async getTeamStats(teamId: number) {
    let team = null;
    try {
      const [t] = await query<any[]>('SELECT * FROM teams WHERE id = ?', [teamId]);
      team = t || null;
    } catch {
      team = null;
    }
    if (!team) return null;

    let partTotal = 0;
    try {
      const [partCount] = await query<any[]>('SELECT COUNT(*) as total FROM participants WHERE team_id = ?', [teamId]);
      partTotal = partCount?.total || 0;
    } catch {
      partTotal = 0;
    }

    let regStats = { total: 0, approved: 0, pending: 0 };
    try {
      const [r] = await query<any[]>(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN r.status = 'ASSIGNED' THEN 1 ELSE 0 END) as approved,
               SUM(CASE WHEN r.status = 'REMOVED' THEN 1 ELSE 0 END) as pending
        FROM registrations r
        JOIN participants p ON p.id = r.participant_id
        WHERE p.team_id = ?
      `, [teamId]);
      if (r) {
        regStats = {
          total: Number(r.total) || 0,
          approved: Number(r.approved) || 0,
          pending: Number(r.pending) || 0,
        };
      }
    } catch {
      regStats = { total: 0, approved: 0, pending: 0 };
    }

    let breakdownStats = { individual_count: 0, group_count: 0 };
    try {
      const [b] = await query<any[]>(`
        SELECT 
          SUM(CASE WHEN c.participation_type = 'INDIVIDUAL' THEN 1 ELSE 0 END) as individual_count,
          SUM(CASE WHEN c.participation_type IN ('GROUP', 'TEAM') THEN 1 ELSE 0 END) as group_count
        FROM registrations r
        JOIN participants p ON p.id = r.participant_id
        JOIN competitions c ON c.id = r.competition_id
        WHERE p.team_id = ?
      `, [teamId]);
      if (b) {
        breakdownStats = {
          individual_count: Number(b.individual_count) || 0,
          group_count: Number(b.group_count) || 0,
        };
      }
    } catch {
      breakdownStats = { individual_count: 0, group_count: 0 };
    }

    let totalPoints = 0;
    try {
      const [pointsRow] = await query<any[]>(`
        SELECT COALESCE(SUM(points), 0) as total_points
        FROM team_points
        WHERE team_id = ?
      `, [teamId]);
      totalPoints = Number(pointsRow?.total_points) || 0;
    } catch {
      totalPoints = 0;
    }

    let teamRank = 1;
    try {
      const allTeams = await query<any[]>(`
        SELECT t.id, COALESCE(SUM(tp.points), 0) as total_points
        FROM teams t
        LEFT JOIN team_points tp ON tp.team_id = t.id
        GROUP BY t.id, t.name, t.code, t.color
        ORDER BY total_points DESC, t.name ASC
      `);
      const rankIndex = allTeams.findIndex((t: any) => Number(t.id) === Number(teamId));
      teamRank = rankIndex !== -1 ? rankIndex + 1 : 1;
    } catch {
      teamRank = 1;
    }

    let positions: any[] = [];
    try {
      positions = await query<any[]>(`
        SELECT position, COUNT(*) as count
        FROM results
        WHERE team_id = ? AND status = 'PUBLISHED'
        GROUP BY position
      `, [teamId]);
    } catch {
      positions = [];
    }

    let nextDispatch = null;
    try {
      const [dispatchRow] = await query<any[]>(`
        SELECT sq.id, sq.queue_order, sq.stage_status,
               c.id as competition_id, c.programme_number, c.name as competition_name,
               p.id as participant_id, p.participant_code, u.name as participant_name,
               v.name as venue_name
        FROM stage_queue sq
        JOIN participants p ON p.id = sq.participant_id
        JOIN users u ON u.id = p.user_id
        JOIN competitions c ON c.id = sq.competition_id
        LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
        LEFT JOIN schedules s ON s.competition_id = c.id
        LEFT JOIN venues v ON v.id = s.venue_id
        WHERE p.team_id = ? AND s.status = 'LIVE' AND (ct.name = 'STAGE' OR ct.name IS NULL) AND sq.stage_status IN ('ON_STAGE', 'CALLED', 'WAITING')
        ORDER BY CASE WHEN sq.stage_status = 'ON_STAGE' THEN 1 WHEN sq.stage_status = 'CALLED' THEN 2 ELSE 3 END, sq.queue_order ASC
        LIMIT 1
      `, [teamId]);
      if (dispatchRow) {
        const orderVal = dispatchRow.queue_order ? Math.max(1, dispatchRow.queue_order) : 1;
        nextDispatch = {
          ...dispatchRow,
          code_letter: String.fromCharCode(64 + orderVal),
        };
      }
    } catch {
      nextDispatch = null;
    }

    let unreportedStudents: any[] = [];
    try {
      unreportedStudents = await query<any[]>(`
        SELECT sq.id, sq.stage_status, sq.check_in_status,
               c.id as competition_id, c.programme_number, c.name as competition_name,
               p.id as participant_id, p.participant_code, u.name as participant_name,
               v.name as venue_name
        FROM stage_queue sq
        JOIN participants p ON p.id = sq.participant_id
        JOIN users u ON u.id = p.user_id
        JOIN competitions c ON c.id = sq.competition_id
        LEFT JOIN schedules s ON s.competition_id = c.id
        LEFT JOIN venues v ON v.id = s.venue_id
        WHERE p.team_id = ? 
          AND (
            (s.status = 'CHECK_IN' AND (sq.check_in_status IN ('ABSENT', 'PENDING') OR sq.stage_status = 'ABSENT'))
            OR sq.stage_status = 'ABSENT'
            OR sq.check_in_status = 'ABSENT'
          )
        ORDER BY CASE WHEN sq.stage_status = 'ABSENT' OR sq.check_in_status = 'ABSENT' THEN 1 ELSE 2 END, sq.id ASC
        LIMIT 10
      `, [teamId]);
    } catch {
      unreportedStudents = [];
    }

    let broadcastLogs: any[] = [];
    try {
      broadcastLogs = await query<any[]>(`
        SELECT al.id, al.action, al.details, al.created_at, u.name as user_name
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.user_id
        ORDER BY al.created_at DESC
        LIMIT 4
      `);
    } catch {
      broadcastLogs = [];
    }

    return {
      team,
      rank: teamRank,
      participants_count: partTotal,
      registrations: {
        total: regStats.total,
        approved: regStats.approved,
        pending: regStats.pending,
        individual_count: breakdownStats.individual_count,
        group_count: breakdownStats.group_count,
      },
      total_points: totalPoints,
      positions,
      next_dispatch: nextDispatch,
      unreported_students: unreportedStudents,
      unreported_student: unreportedStudents.length > 0 ? unreportedStudents[0] : null,
      broadcasts: broadcastLogs,
    };
  }

  static async getParticipantStats(participantId: number) {
    const [participant] = await query<any[]>(`
      SELECT p.*, u.name as user_name, u.email, t.name as team_name, t.color as team_color, cat.name as category_name
      FROM participants p
      JOIN users u ON u.id = p.user_id
      JOIN teams t ON t.id = p.team_id
      LEFT JOIN participant_categories cat ON cat.id = p.category_id
      WHERE p.id = ?
    `, [participantId]);

    if (!participant) return null;

    const registrations = await query<any[]>(`
      SELECT r.id as registration_id, r.status as registration_status,
             c.id as competition_id, c.programme_number, c.name as competition_name,
             ct.name as competition_type, pg.name as group_name,
             s.start_at, s.end_at, v.name as venue_name,
             sq.stage_status, sq.queue_order,
             att.status as attendance_status,
             res.position, res.status as result_status
      FROM registrations r
      JOIN competitions c ON c.id = r.competition_id
      JOIN programme_groups pg ON pg.id = c.programme_group_id
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      LEFT JOIN schedules s ON s.competition_id = c.id
      LEFT JOIN venues v ON v.id = s.venue_id
      LEFT JOIN stage_queue sq ON sq.competition_id = c.id AND sq.participant_id = r.participant_id
      LEFT JOIN attendance att ON att.registration_id = r.id
      LEFT JOIN results res ON res.competition_id = c.id AND res.participant_id = r.participant_id
      WHERE r.participant_id = ?
      ORDER BY s.start_at ASC, c.programme_number ASC
    `, [participantId]);

    const certs = await query<any[]>(`
      SELECT cert.*, c.name as competition_name
      FROM certificates cert
      JOIN competitions c ON c.id = cert.competition_id
      WHERE cert.participant_id = ? AND cert.status = 'ISSUED'
    `, [participantId]);

    return {
      participant,
      registrations,
      certificates: certs,
    };
  }

  static async getJudgeStats(judgeId: number) {
    const [judge] = await query<any[]>(`
      SELECT j.*, u.name as user_name, u.email
      FROM judges j
      JOIN users u ON u.id = j.user_id
      WHERE j.id = ?
    `, [judgeId]);

    if (!judge) return null;

    const assignments = await query<any[]>(`
      SELECT c.id as competition_id, c.programme_number, c.name as competition_name, c.status as competition_status,
             ct.name as competition_type,
             MAX(s.status) as schedule_status,
             COUNT(DISTINCT r.id) as total_registered,
             COUNT(DISTINCT ss.id) as total_evaluated,
             COUNT(DISTINCT CASE WHEN ss.status = 'SUBMITTED' OR ss.status = 'LOCKED' THEN ss.id END) as total_submitted
      FROM competitions c
      JOIN competition_judges cj ON cj.competition_id = c.id AND cj.judge_id = ? AND cj.status = 'ASSIGNED'
      LEFT JOIN competition_types ct ON ct.id = c.competition_type_id
      LEFT JOIN schedules s ON s.competition_id = c.id
      LEFT JOIN registrations r ON r.competition_id = c.id AND r.status = 'ASSIGNED'
      LEFT JOIN score_sheets ss ON ss.competition_id = c.id AND ss.judge_id = ?
      GROUP BY c.id, c.programme_number, c.name, c.status, ct.name
      ORDER BY 
        CASE WHEN MAX(s.status) = 'LIVE' THEN 1 
             WHEN MAX(s.status) = 'CHECK_IN' THEN 2 
             WHEN MAX(s.status) = 'SCHEDULED' THEN 3 
             ELSE 4 END ASC,
        c.programme_number ASC
    `, [judgeId, judgeId]);

    return {
      judge,
      assignments,
    };
  }
}
