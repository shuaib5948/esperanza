import { query } from '../database/connection.js';

export interface LiveScreenState {
  id: number;
  mode: 'AUTO' | 'AD' | 'LEADERBOARD' | 'RESULT';
  active_competition_id: number | null;
  custom_title: string | null;
  updated_at: Date;
}

export class LiveScreenRepository {
  private static tableInitialized = false;

  static async ensureTable() {
    if (this.tableInitialized) return;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS live_screen_state (
          id INT PRIMARY KEY DEFAULT 1,
          mode VARCHAR(32) NOT NULL DEFAULT 'AUTO',
          active_competition_id INT NULL,
          custom_title VARCHAR(255) NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      await query(`
        INSERT IGNORE INTO live_screen_state (id, mode, active_competition_id)
        VALUES (1, 'AUTO', NULL)
      `);
      this.tableInitialized = true;
    } catch (e) {
      console.error('Error ensuring live_screen_state table:', e);
    }
  }

  static async getState(): Promise<LiveScreenState> {
    await this.ensureTable();
    try {
      const rows = await query<any[]>('SELECT * FROM live_screen_state WHERE id = 1');
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch {}
    return {
      id: 1,
      mode: 'AUTO',
      active_competition_id: null,
      custom_title: null,
      updated_at: new Date(),
    };
  }

  static async updateState(
    mode: 'AUTO' | 'AD' | 'LEADERBOARD' | 'RESULT',
    activeCompetitionId: number | null = null,
    customTitle: string | null = null
  ) {
    await this.ensureTable();
    await query(
      `
      INSERT INTO live_screen_state (id, mode, active_competition_id, custom_title, updated_at)
      VALUES (1, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        mode = VALUES(mode), 
        active_competition_id = VALUES(active_competition_id),
        custom_title = VALUES(custom_title),
        updated_at = NOW()
    `,
      [mode, activeCompetitionId || null, customTitle || null]
    );

    return this.getState();
  }

  static async getDisplayData() {
    await this.ensureTable();
    const state = await this.getState();

    // 1. Leaderboard (Diraya vs Rivaya)
    let leaderboard: any[] = [];
    try {
      leaderboard = await query<any[]>(`
        SELECT t.id, t.name, t.code, t.color,
               COALESCE(SUM(tp.points), 0) as total_points,
               (
                 SELECT COUNT(*) FROM results r 
                 WHERE r.team_id = t.id AND r.status = 'PUBLISHED' AND r.position = 1
               ) as gold_count,
               (
                 SELECT COUNT(*) FROM results r 
                 WHERE r.team_id = t.id AND r.status = 'PUBLISHED' AND r.position = 2
               ) as silver_count,
               (
                 SELECT COUNT(*) FROM results r 
                 WHERE r.team_id = t.id AND r.status = 'PUBLISHED' AND r.position = 3
               ) as bronze_count
        FROM teams t
        LEFT JOIN team_points tp ON tp.team_id = t.id
        GROUP BY t.id, t.name, t.code, t.color
        ORDER BY total_points DESC, t.name ASC
      `);
    } catch {
      leaderboard = [];
    }

    // 2. Published Competitions Summary (for Controller selection & poster rendering)
    let publishedCompetitions: any[] = [];
    try {
      publishedCompetitions = await query<any[]>(`
        SELECT DISTINCT c.id, c.programme_number, c.name as competition_name,
               c.participation_type, pg.name as programme_group,
               (SELECT MAX(res.published_at) FROM results res WHERE res.competition_id = c.id) as published_at
        FROM competitions c
        JOIN results r ON r.competition_id = c.id
        JOIN programme_groups pg ON pg.id = c.programme_group_id
        WHERE r.status = 'PUBLISHED'
        ORDER BY published_at DESC, c.programme_number ASC
        LIMIT 20
      `);
    } catch {
      publishedCompetitions = [];
    }

    // 3. Detailed Results of Published Competitions (1st, 2nd, 3rd)
    let resultPosters: any[] = [];
    try {
      const rawResults = await query<any[]>(`
        SELECT r.id, r.competition_id, r.position, r.final_score,
               c.name as competition_name, c.programme_number, c.participation_type,
               pg.name as programme_group,
               u.name as participant_name,
               p.participant_code,
               t.name as team_name, t.code as team_code, t.color as team_color,
               r.published_at
        FROM results r
        JOIN competitions c ON c.id = r.competition_id
        JOIN programme_groups pg ON pg.id = c.programme_group_id
        LEFT JOIN participants p ON p.id = r.participant_id
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN teams t ON t.id = r.team_id
        WHERE r.status = 'PUBLISHED' AND r.position IN (1, 2, 3)
        ORDER BY r.position ASC
      `);

      // Group winners by competition preserving publishedCompetitions latest order
      const compMap = new Map<number, any>();
      for (const comp of publishedCompetitions) {
        compMap.set(comp.id, {
          competition_id: comp.id,
          programme_number: comp.programme_number,
          competition_name: comp.competition_name,
          programme_group: comp.programme_group,
          participation_type: comp.participation_type,
          published_at: comp.published_at,
          winners: [],
        });
      }

      for (const row of rawResults) {
        if (!compMap.has(row.competition_id)) {
          compMap.set(row.competition_id, {
            competition_id: row.competition_id,
            programme_number: row.programme_number,
            competition_name: row.competition_name,
            programme_group: row.programme_group,
            participation_type: row.participation_type,
            published_at: row.published_at,
            winners: [],
          });
        }
        compMap.get(row.competition_id).winners.push({
          position: row.position,
          participant_name: row.participant_name || row.team_name,
          participant_code: row.participant_code,
          team_name: row.team_name,
          team_code: row.team_code,
          team_color: row.team_color,
          score: row.final_score,
        });
      }
      // Sort winners in each poster by position (1st, 2nd, 3rd)
      resultPosters = Array.from(compMap.values())
        .filter((p) => p.winners && p.winners.length > 0)
        .map((p) => ({
          ...p,
          winners: p.winners.sort((a: any, b: any) => Number(a.position) - Number(b.position)),
        }));
    } catch {
      resultPosters = [];
    }

    // 4. Resolve Active Result Poster (if specific competition chosen or fallback to most recent)
    let activePoster = null;
    if (state.active_competition_id) {
      activePoster = resultPosters.find((p) => Number(p.competition_id) === Number(state.active_competition_id)) || null;
    }
    if (!activePoster && resultPosters.length > 0) {
      activePoster = resultPosters[0];
    }

    return {
      state,
      leaderboard,
      published_competitions: publishedCompetitions,
      result_posters: resultPosters,
      active_poster: activePoster,
      timestamp: new Date().toISOString(),
    };
  }
}
