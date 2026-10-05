import React, { useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { DownloadCloud, FileSpreadsheet, Users, Trophy, Gavel, ClipboardList } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const ReportsExportPage: React.FC = () => {
  const { success, error } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (endpoint: string, filename: string, id: string) => {
    try {
      setDownloading(id);
      await api.downloadFile(endpoint, filename);
      success(`${filename} exported successfully!`);
    } catch (err: any) {
      error(err.message || 'Export failed');
    } finally {
      setDownloading(null);
    }
  };

  const reports = [
    {
      id: 'participants',
      title: 'Full Participants Roster',
      description: 'Export all registered students, team affiliation, category mapping, and registration numbers.',
      endpoint: '/reports/export/participants',
      filename: 'esperanza_participants_roster.csv',
      icon: Users,
    },
    {
      id: 'registrations',
      title: 'Competition Registrations Master',
      description: 'Export all event entries across all 60 official competitions with registration statuses.',
      endpoint: '/reports/export/registrations',
      filename: 'esperanza_competition_registrations.csv',
      icon: ClipboardList,
    },
    {
      id: 'scores',
      title: 'Judging Scores & Evaluation Marks',
      description: 'Audit report containing judge markings (100-point scale) and remarks.',
      endpoint: '/reports/export/scores',
      filename: 'esperanza_judging_scores.csv',
      icon: Gavel,
    },
    {
      id: 'leaderboard',
      title: 'Team Leaderboard & Standings',
      description: 'Final team standings, allocated points summary, and won places count.',
      endpoint: '/reports/export/leaderboard',
      filename: 'esperanza_team_standings.csv',
      icon: Trophy,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-white">System Reports & CSV Export</h1>
        <p className="text-sm text-slate-400 mt-1">
          Download clean datasets and audit summaries for committee records.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {reports.map((r) => {
          const Icon = r.icon;
          const isBusy = downloading === r.id;

          return (
            <Card key={r.id} className="flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="p-3 w-fit rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{r.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  isLoading={isBusy}
                  onClick={() => handleDownload(r.endpoint, r.filename, r.id)}
                >
                  <DownloadCloud className="w-4 h-4 mr-1.5" />
                  <span>Download CSV</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
