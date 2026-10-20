import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import {
  Trophy,
  Radio,
  Flame,
  Sparkles,
  Award,
  RefreshCw,
  Medal,
  ChevronRight,
  TrendingUp,
  Shield,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { THEME } from '../theme/theme.js';

interface LeaderboardItem {
  id: number;
  name: string;
  code: string;
  color: string;
  total_points: string | number;
  first_places: number;
  second_places: number;
  third_places: number;
  scored_competitions_count: number;
}

export const LiveLeaderboardPage: React.FC = () => {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await api.get<LeaderboardItem[]>('/points/leaderboard');
      return res.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const teams = data || [];
  const leader = teams[0];
  const runnerUp = teams[1];
  const leaderPts = leader ? Number(leader.total_points) : 0;
  const runnerUpPts = runnerUp ? Number(runnerUp.total_points) : 0;
  const totalCombinedPts = leaderPts + runnerUpPts;
  const pointGap = leaderPts - runnerUpPts;

  // Percentages for comparison bar
  const leaderShare = totalCombinedPts > 0 ? Math.round((leaderPts / totalCombinedPts) * 100) : 50;
  const runnerUpShare = totalCombinedPts > 0 ? 100 - leaderShare : 50;

  return (
    <div className="space-y-8 py-3 max-w-6xl mx-auto">
      {/* 1. Header Banner (Festival Luxury Hero Card with Ambient Waves) */}
      <div className={`relative overflow-hidden rounded-[2.25rem] p-8 sm:p-12 ${THEME.classes.heroCard} shadow-xl`}>
        {/* Ambient Festival Waves Background */}
        <svg
          className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path d="M0 20 Q 30 60 60 20 T 100 40 L 100 100 L 0 100 Z" fill="#d97706" opacity="0.3" />
          <path d="M0 50 Q 40 10 80 50 T 100 80 L 100 100 L 0 100 Z" fill="#f59e0b" opacity="0.18" />
        </svg>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 text-amber-200 border border-amber-400/30 backdrop-blur-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                LIVE POINT SYNC
              </span>
              <span className="text-xs text-amber-200/70 font-medium">Auto-syncs every 10s</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-black text-white tracking-tight">
              Festival Championship Standings
            </h1>
            <p className="text-sm sm:text-base text-amber-100/80 max-w-2xl font-normal leading-relaxed">
              Official live scores across all 60 competitions in J1, J2, Junior, Senior & General categories.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => refetch()}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full ${THEME.classes.primaryBtn} text-xs font-black shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isFetching ? 'Syncing...' : 'Sync Live'}</span>
            </button>
          </div>
        </div>

        {/* Lead Difference Callout */}
        {leader && runnerUp && (
          <div className="mt-8 pt-6 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-amber-300 font-extrabold bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/30 text-xs">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>CHAMPIONSHIP GAP</span>
              </span>
              <span className="text-xs sm:text-sm text-amber-100/90">
                <strong className="text-white font-black">{leader.name}</strong> leads by{' '}
                <strong className="text-amber-400 font-black font-mono">
                  {pointGap > 0 ? `+${pointGap.toFixed(1)}` : '0.0'} pts
                </strong>{' '}
                over {runnerUp.name}
              </span>
            </div>

            <span className="text-xs font-mono font-bold text-amber-200/70">
              Total Points Contested: {totalCombinedPts.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* 2. Dual Team Championship Arena */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team, idx) => {
          const isFirst = idx === 0;
          const isDiraya = team.code?.toUpperCase().includes('DIR') || team.name?.toLowerCase().includes('diraya');
          const share = isFirst ? leaderShare : runnerUpShare;

          return (
            <div
              key={team.id}
              className={`relative overflow-hidden p-7 sm:p-8 rounded-[2.25rem] bg-white border transition-all duration-300 hover:shadow-xl ${
                isFirst
                  ? 'border-amber-400 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/20'
                  : 'border-slate-200 shadow-xs'
              }`}
            >
              {/* Decorative warm aura */}
              <div
                className={`absolute -right-16 -top-16 w-52 h-52 rounded-full blur-3xl opacity-30 pointer-events-none ${
                  isFirst ? 'bg-amber-300' : 'bg-slate-200'
                }`}
              />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-md shrink-0"
                    style={{
                      backgroundColor: team.color || (isDiraya ? '#2563eb' : '#dc2626'),
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900">{team.name}</h2>
                      {isFirst && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border border-amber-400 shadow-2xs">
                          <Trophy className="w-3 h-3 text-slate-950" />
                          <span>Rank 1</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono font-bold mt-0.5">{team.code}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-display text-5xl sm:text-6xl font-black tracking-tight text-slate-900">
                    {Number(team.total_points).toFixed(1)}
                  </span>
                  <span className="text-xs font-black text-amber-700 uppercase tracking-wider block mt-0.5">
                    Total Score
                  </span>
                </div>
              </div>

              {/* Placements Podium Strip */}
              <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-2.5 relative z-10">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    🥇 1st Place
                  </span>
                  <span className="font-display text-2xl font-black text-amber-950">
                    {team.first_places || 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                    🥈 2nd Place
                  </span>
                  <span className="font-display text-2xl font-black text-slate-800">
                    {team.second_places || 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                    🥉 3rd Place
                  </span>
                  <span className="font-display text-2xl font-black text-amber-900">
                    {team.third_places || 0}
                  </span>
                </div>
              </div>

              {/* Point Share Progress Bar */}
              <div className="mt-6 space-y-2 relative z-10">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Share of Championship Points</span>
                  <span className="font-mono font-bold text-slate-700">{share}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/60">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${share}%`,
                      backgroundColor: team.color || (isDiraya ? '#2563eb' : '#dc2626'),
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Live Head-to-Head Ratio & Scoring Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Head to Head Ratio Donut & Bar */}
        <div className="md:col-span-2 p-7 rounded-[2rem] bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <span>Points Tug-of-War</span>
            </h3>
            <span className="text-xs font-mono font-semibold text-slate-400">
              {leader ? leader.name : 'House 1'} vs {runnerUp ? runnerUp.name : 'House 2'}
            </span>
          </div>

          {/* Tug-of-War Split Pill Bar */}
          <div className="space-y-2">
            <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-100 p-1 border border-slate-200/80">
              <div
                className="h-full rounded-l-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-1000"
                style={{ width: `${leaderShare}%` }}
              />
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-1000"
                style={{ width: `${runnerUpShare}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-blue-700">{leader?.name || 'Diraya'} ({leaderShare}%)</span>
              <span className="text-rose-700">{runnerUp?.name || 'Rivaya'} ({runnerUpShare}%)</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed pt-2">
            Scores are calculated immediately as judging panels submit signed criteria rubrics from stage tablets.
          </p>
        </div>

        {/* Official Scoring Matrix Rules Card */}
        <div className="p-7 rounded-[2rem] bg-gradient-to-br from-amber-50/40 via-white to-slate-50 border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Official Scoring Rules</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
              <span className="font-bold text-slate-700">🥇 1st Place</span>
              <span className="font-mono font-black text-amber-900">10 Points</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="font-bold text-slate-700">🥈 2nd Place</span>
              <span className="font-mono font-black text-slate-800">7 Points</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-amber-100 shadow-2xs">
              <span className="font-bold text-slate-700">🥉 3rd Place</span>
              <span className="font-mono font-black text-amber-800">5 Points</span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <Link
              to="/schedule"
              className="text-xs font-bold text-amber-800 hover:text-amber-950 inline-flex items-center gap-1 hover:underline"
            >
              <span>View Upcoming Programmes</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
