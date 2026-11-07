import { query } from '../database/connection.js';

export interface LiveScreenState {
  id: number;
  mode: 'AUTO' | 'AD' | 'LEADERBOARD' | 'GRAPH' | 'RESULT';
  active_competition_id: number | null;
  custom_title: string | null;
  updated_at: Date;
}

// Helper to format programme name cleanly, e.g. "General - Magazine" (stripping internal codes like "j1-booktest")
function formatProgramName(group?: string, name?: string): string {
  const g = (group || '').trim();
  let n = (name || '').trim();
  if (!n) return g || 'Competition';

  // Strip code prefixes like "j1-", "j01-", "s2-", "g1-", "sj1-", "p1-"
  n = n.replace(/^[a-z]{1,3}[-_]?\d+\s*[-:–—.]?\s*/i, '');
  n = n.replace(/^\d+\s*[-:–—.]\s*/, '');
  n = n.replace(/^[-:–—.]+\s*/, '').trim();

  if (!g) return n;

  const groupRegex = new RegExp(`^${g}\\s*[-–—:]?\\s*`, 'i');
  const cleanName = groupRegex.test(n) ? n.replace(groupRegex, '').trim() : n;
  const formattedGroup = g
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return `${formattedGroup} - ${cleanName || n}`;
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
    mode: 'AUTO' | 'AD' | 'LEADERBOARD' | 'GRAPH' | 'RESULT',
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
        LEFT JOIN team_points tp ON tp.team_id = t.id AND tp.is_published = 1
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
      publishedCompetitions = (publishedCompetitions || []).map((comp) => ({
        ...comp,
        competition_name: formatProgramName(comp.programme_group, comp.competition_name),
      }));
    } catch {
      publishedCompetitions = [];
    }

    // 3. Detailed Results of Published Competitions (1st, 2nd, 3rd, 4th, etc.)
    let resultPosters: any[] = [];
    try {
      // Map group members for team/group competitions: "competition_id:team_id" -> "Name 1, Name 2, ..."
      const groupMembersMap = new Map<string, string>();
      try {
        const entryMembers = await query<any[]>(`
          SELECT 
            ce.competition_id,
            ce.team_id,
            GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as member_names
          FROM competition_entries ce
          JOIN entry_participants ep ON ep.entry_id = ce.id
          JOIN participants p ON p.id = ep.participant_id
          JOIN users u ON u.id = p.user_id
          WHERE ce.status != 'CANCELLED'
          GROUP BY ce.competition_id, ce.team_id
        `);
        for (const m of (entryMembers || [])) {
          if (m.member_names) {
            groupMembersMap.set(`${m.competition_id}:${m.team_id}`, m.member_names);
          }
        }

        const regMembers = await query<any[]>(`
          SELECT 
            r.competition_id,
            p.team_id,
            GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as member_names
          FROM registrations r
          JOIN participants p ON p.id = r.participant_id
          JOIN users u ON u.id = p.user_id
          WHERE r.status != 'REMOVED'
          GROUP BY r.competition_id, p.team_id
        `);
        for (const m of (regMembers || [])) {
          const key = `${m.competition_id}:${m.team_id}`;
          if (!groupMembersMap.has(key) && m.member_names) {
            groupMembersMap.set(key, m.member_names);
          }
        }
      } catch (err) {
        console.error('Error fetching group members for live screen:', err);
      }

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
        WHERE r.status = 'PUBLISHED' AND r.position IS NOT NULL AND r.position > 0
        ORDER BY r.position ASC
      `);

      // Group winners by competition preserving publishedCompetitions latest order
      const compMap = new Map<number, any>();
      for (const comp of publishedCompetitions) {
        compMap.set(comp.id, {
          competition_id: comp.id,
          programme_number: comp.programme_number,
          competition_name: formatProgramName(comp.programme_group, comp.competition_name),
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
            competition_name: formatProgramName(row.programme_group, row.competition_name),
            programme_group: row.programme_group,
            participation_type: row.participation_type,
            published_at: row.published_at,
            winners: [],
          });
        }

        const key = `${row.competition_id}:${row.team_id}`;
        const groupMembers = groupMembersMap.get(key) || null;
        const isGroup = (row.participation_type || '').toUpperCase() === 'GROUP' || (row.participation_type || '').toUpperCase() === 'TEAM';

        compMap.get(row.competition_id).winners.push({
          position: Number(row.position),
          participant_name: row.participant_name || row.team_name,
          group_members: groupMembers,
          is_group: isGroup,
          team_name: row.team_name,
          team_code: row.team_code,
          team_color: row.team_color,
          score: row.final_score,
        });
      }
      // Sort winners in each poster by position (1st, 2nd, 3rd, 4th, etc.)
      resultPosters = Array.from(compMap.values())
        .filter((p) => p.winners && p.winners.length > 0)
        .map((p) => ({
          ...p,
          winners: p.winners.sort((a: any, b: any) => Number(a.position) - Number(b.position)),
        }));
    } catch {
      resultPosters = [];
    }

    // 4. Recent Completed / Verified Results for Battle Line Progression Graph
    let recentResults: any[] = [];
    try {
      recentResults = await query<any[]>(`
        SELECT c.id as competition_id, c.programme_number, c.name as competition_name,
               c.participation_type, pg.name as programme_group,
               COALESCE(SUM(CASE WHEN UPPER(t.code) = 'DIRAYA' OR UPPER(t.name) LIKE '%DIRAYA%' THEN tp.points ELSE 0 END), 0) as diraya_score,
               COALESCE(SUM(CASE WHEN UPPER(t.code) = 'RIVAYA' OR UPPER(t.name) LIKE '%RIVAYA%' THEN tp.points ELSE 0 END), 0) as rivaya_score
        FROM competitions c
        JOIN team_points tp ON tp.competition_id = c.id
        JOIN teams t ON t.id = tp.team_id
        LEFT JOIN programme_groups pg ON pg.id = c.programme_group_id
        GROUP BY c.id, c.programme_number, c.name, c.participation_type, pg.name
        HAVING diraya_score > 0 OR rivaya_score > 0
        ORDER BY c.programme_number ASC, c.id ASC
      `);
    } catch {
      recentResults = [];
    }

    // 5. Resolve Active Result Poster (if specific competition chosen or fallback to most recent)
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
      recent_results: recentResults,
      active_poster: activePoster,
      timestamp: new Date().toISOString(),
    };
  }
}
