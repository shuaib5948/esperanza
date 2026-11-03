import React, { useState } from 'react';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  DownloadCloud,
  FileSpreadsheet,
  Users,
  Trophy,
  Gavel,
  ClipboardList,
  CheckCircle2,
  FileText,
  ArrowDownToLine,
  Sparkles,
} from 'lucide-react';
import { THEME } from '../../theme/theme.js';

export const ReportsExportPage: React.FC = () => {
  const { success, error } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (endpoint: string, filename: string, id: string) => {
    try {
      setDownloading(id);
      await api.downloadFile(endpoint, filename);
      success(`${filename} exported`);
    } catch (err: any) {
      error(err.message || 'Export failed');
    } finally {
      setDownloading(null);
    }
  };

  const reports = [
    {
      id: 'participants',
      title: 'Participants Master',
      subtitle: 'Directory & Roster',
      desc: 'Enrolled contestants, chest numbers & houses.',
      endpoint: '/reports/export/participants',
      filename: 'esperanza_participants_roster.csv',
      icon: Users,
      badge: 'Contestants',
      color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
    },
    {
      id: 'registrations',
      title: 'Programmes Lineup',
      subtitle: '60 Competitions',
      desc: 'Competition master, stages & assignments.',
      endpoint: '/reports/export/registrations',
      filename: 'esperanza_competition_registrations.csv',
      icon: ClipboardList,
      badge: 'Registrations',
      color: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
    },
    {
      id: 'scores',
      title: 'Judge Evaluation Sheets',
      subtitle: '100-Pt Rubrics',
      desc: 'Criteria breakups, penalties & jury notes.',
      endpoint: '/reports/export/scores',
      filename: 'esperanza_judging_scores.csv',
      icon: Gavel,
      badge: 'Judging Marks',
      color: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
    },
    {
      id: 'leaderboard',
      title: 'House Championship',
      subtitle: 'Diraya vs Rivaya',
      desc: 'Points tally, podium finishes & standings.',
      endpoint: '/reports/export/leaderboard',
      filename: 'esperanza_team_standings.csv',
      icon: Trophy,
      badge: 'Standings',
      color: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none">
              Export CSVs
            </h1>
            <p className="text-xs text-amber-200/60 font-medium mt-1">
              Committee report downloads
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-amber-200/60 bg-[#121212] px-3 py-1.5 rounded-full border border-white/[0.08]">
            Format: UTF-8 CSV
          </span>
        </div>
      </div>

      {/* 2. Bento Export Cards: Clean, Compact & Direct */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {reports.map((r) => {
          const Icon = r.icon;
          const isBusy = downloading === r.id;

          return (
            <div
              key={r.id}
              className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 hover:border-white/[0.16] transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#121212] border border-white/[0.08] flex items-center justify-center text-amber-200 group-hover:bg-white/[0.03] group-hover:text-amber-300 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bento-title font-bold text-white leading-none">
                        {r.title}
                      </h3>
                      <span className="text-[10px] text-amber-200/60 font-semibold uppercase tracking-wider block mt-1">
                        {r.subtitle}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.color}`}>
                    {r.badge}
                  </span>
                </div>

                <p className="text-xs text-amber-200/60 leading-relaxed">
                  {r.desc}
                </p>
              </div>

              <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-amber-200/60 truncate max-w-[170px]">
                  {r.filename}
                </span>

                <button
                  disabled={isBusy}
                  onClick={() => handleDownload(r.endpoint, r.filename, r.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${THEME.classes.primaryBtn} text-xs font-black transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs`}
                >
                  {isBusy ? (
                    <span className="w-3 h-3 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <ArrowDownToLine className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span>{isBusy ? 'Downloading...' : 'Export CSV'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
