import { ReportRepository } from '../repositories/report.repository.js';

function arrayToCsv(data: any[], fallbackHeaders: string[] = []): string {
  if (!data || data.length === 0) {
    return fallbackHeaders.length > 0 ? fallbackHeaders.join(',') : '';
  }
  const headers = Object.keys(data[0]);
  const lines = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

export class ReportService {
  static async exportParticipants(format: 'json' | 'csv' = 'csv') {
    const data = await ReportRepository.getParticipantsReport();
    if (format === 'csv') {
      return {
        contentType: 'text/csv',
        content: arrayToCsv(data, ['id', 'participant_name', 'team_name', 'participant_code', 'category_name']),
        filename: 'participants_roster.csv',
      };
    }
    return { contentType: 'application/json', content: data };
  }

  static async exportRegistrations(format: 'json' | 'csv' = 'csv') {
    const data = await ReportRepository.getRegistrationsReport();
    if (format === 'csv') {
      return {
        contentType: 'text/csv',
        content: arrayToCsv(data, ['id', 'competition_name', 'programme_number', 'participant_name', 'team_name', 'status', 'registered_at']),
        filename: 'competition_registrations.csv',
      };
    }
    return { contentType: 'application/json', content: data };
  }

  static async exportScores(format: 'json' | 'csv' = 'csv') {
    const data = await ReportRepository.getScoresReport();
    if (format === 'csv') {
      return { contentType: 'text/csv', content: arrayToCsv(data), filename: 'judging_scores_breakdown.csv' };
    }
    return { contentType: 'application/json', content: data };
  }

  static async exportLeaderboard(format: 'json' | 'csv' = 'csv') {
    const data = await ReportRepository.getLeaderboardReport();
    if (format === 'csv') {
      return { contentType: 'text/csv', content: arrayToCsv(data), filename: 'team_leaderboard_standings.csv' };
    }
    return { contentType: 'application/json', content: data };
  }
}
