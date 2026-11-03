import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import {
  Trophy,
  Award,
  Users,
  ClipboardList,
  Clock,
  Radio,
  ArrowUpRight,
  Sparkles,
  FileText,
  BarChart3,
  Megaphone,
} from 'lucide-react';
import { THEME } from '../../theme/theme.js';

const formatProgTitle = (name?: string, group?: string) => {
  if (!name) return 'Live Stage Event';
  if (!group) return name;
  const trimmedName = name.trim();
  const trimmedGroup = group.trim();
  if (
    trimmedName.toLowerCase().startsWith(trimmedGroup.toLowerCase()) ||
    trimmedName.toLowerCase().includes(`(${trimmedGroup.toLowerCase()})`) ||
    trimmedName.toLowerCase().endsWith(`- ${trimmedGroup.toLowerCase()}`)
  ) {
    return trimmedName;
  }
  return `${trimmedGroup} - ${trimmedName}`;
};

export const TeamDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // 1. Fetch live team dashboard summary
  const { data, isLoading } = useQuery({
    queryKey: ['team-dashboard'],
    queryFn: async () => {
      const res = await api.get<any>('/dashboard/team');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const team = data?.team;
  const isRivaya = (team?.name || team?.code || '').toUpperCase().includes('RIVAYA');
  const officialTeamColor = isRivaya ? '#FF2A6D' : '#00E676';
  const houseBgChip = isRivaya
    ? 'bg-[#FF2A6D]/15 text-[#FF2A6D] border-[#FF2A6D]/30'
    : 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30';

  const metrics = data?.metrics || {};
  const totalPoints = Number(metrics.total_points || 0);
  const teamRank = metrics.rank || 1;
  const totalPodiums = metrics.podium_count || 0;
  const firstPlaces = metrics.first_places || 0;
  const secondPlaces = metrics.second_places || 0;
  const thirdPlaces = metrics.third_places || 0;

  // Podium calculations
  const goldPct = totalPodiums > 0 ? (firstPlaces / totalPodiums) * 100 : 0;

  // Radar items
  const activeProgramme = data?.active_programme;
  const nextCallProgramme = data?.next_call_programme;

  // Broadcasts feed
  const broadcasts: any[] = data?.broadcasts || [];

  return (
    <div className="w-full flex flex-col space-y-3.5 text-white">
      {/* 1. Header Bar: Responsive, Two-Tier on Mobile, Luxury Obsidian Bento on Desktop */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] p-3 sm:px-4 sm:py-3 rounded-2xl shadow-xs shrink-0 space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-2xs shrink-0 font-bento-num border border-white/[0.12]"
              style={{ backgroundColor: officialTeamColor }}
            >
              {team?.code?.substring(0, 2) || (isRivaya ? 'RV' : 'DR')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg md:text-xl font-black text-white truncate leading-tight tracking-tight">
                  {team?.name || (isRivaya ? 'Team Rivaya' : 'Team Diraya')}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${houseBgChip}`}>
                  {team?.code || (isRivaya ? 'RIVAYA' : 'DIRAYA')}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 truncate mt-0.5">
                Contingent Command Center
              </p>
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-t-0 justify-end">
            <button
              onClick={() => navigate('/team/roster')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-white/10 text-slate-200 border border-white/[0.12] text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Roster</span>
            </button>
            <button
              onClick={() => navigate('/team/registrations')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${THEME.classes.primaryBtn} text-xs font-black transition-all cursor-pointer shadow-xs`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Register Entries</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Column (4 Cols): Hero KPI & Podium Breakdown */}
        <div className="lg:col-span-4 flex flex-col gap-3.5">
          {/* Hero KPI Card */}
          <div
            onClick={() => navigate('/#standings')}
            className={`${THEME.classes.heroCard} rounded-2xl p-5 shadow-xs flex flex-col justify-between shrink-0 cursor-pointer hover:border-amber-400/50 transition-all relative overflow-hidden group min-h-[140px]`}
          >
            <div className="flex items-center justify-between z-10">
              <span className="text-xs uppercase tracking-wider text-slate-300 font-bold">
                Live Standings Score
              </span>
              <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="my-2 z-10 flex items-baseline gap-2">
              <span className={`text-4xl xl:text-5xl font-black tracking-tight ${THEME.classes.goldTextGradient}`}>
                {totalPoints.toFixed(0)}
              </span>
              <span className="text-xs font-bold text-amber-400/80">PTS</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs text-slate-300 z-10">
              <div className="flex items-center gap-1.5 font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>House Standing</span>
              </div>
              <span className="font-black text-white tabular-nums">
                Rank #{teamRank}
              </span>
            </div>

            <div
              className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-2xl opacity-20 transition-all"
              style={{ backgroundColor: officialTeamColor }}
            />
          </div>

          {/* Podium Breakdown Card: Clean, Uncluttered */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Podium Breakdown
                </h3>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 py-4 my-auto">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/[0.08]"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-amber-400"
                    strokeDasharray={`${goldPct}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-white leading-none tabular-nums">
                    {totalPodiums}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Podiums</span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-slate-400">1st Place:</span>
                  <strong className="text-white font-black tabular-nums">{firstPlaces}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                  <span className="text-slate-400">2nd Place:</span>
                  <strong className="text-white font-black tabular-nums">{secondPlaces}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#CD7F32] shrink-0" />
                  <span className="text-slate-400">3rd Place:</span>
                  <strong className="text-white font-black tabular-nums">{thirdPlaces}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column (4 Cols): Live Stage Radar */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl p-5 shadow-xs flex-1 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Stage Dispatch Radar
                </h3>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-evenly gap-3 py-1">
              {/* Item 1: Active Stage Performer */}
              <div className="p-4 rounded-xl bg-[#121212] border border-white/[0.06] space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Now on Stage</span>
                </div>

                <div className="pt-0.5">
                  <h4 className="text-sm font-black text-white leading-snug">
                    {formatProgTitle(activeProgramme?.name, activeProgramme?.programme_group || activeProgramme?.group_name)}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeProgramme?.performer_name ? (
                      <span>Contestant: <strong className="text-white font-bold">{activeProgramme.performer_name}</strong></span>
                    ) : (
                      <span>In evaluation</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Item 2: Next Call Queue */}
              <div className="p-4 rounded-xl bg-[#121212] border border-white/[0.06] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Next Call Backstage</span>
                </div>

                <div className="pt-0.5">
                  <h4 className="text-sm font-black text-white leading-snug">
                    {formatProgTitle(nextCallProgramme?.name, nextCallProgramme?.programme_group || nextCallProgramme?.group_name)}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Report to backstage check-in
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols): Broadcasts */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Broadcasts
                </h3>
              </div>
            </div>

            <div className="flex-1 my-3 overflow-y-auto pr-1 space-y-2.5 max-h-[300px] scrollbar-thin">
              {broadcasts.length > 0 ? (
                broadcasts.map((log: any, idx: number) => (
                  <div key={log.id || idx} className="p-3 rounded-xl bg-[#121212] border border-white/[0.06] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">
                        {log.action || 'Official Announcement'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Live'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {log.details || 'Broadcast notice'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-xs text-slate-500">
                  No active broadcasts
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/[0.08] text-center shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">
                Live alerts sync automatically
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
