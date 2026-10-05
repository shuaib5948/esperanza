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
      {/* 1. Header Banner (iOS Card + Festie Energy) */}
      <div className="relative overflow-hidden rounded-[2.25rem] p-8 sm:p-12 bg-white border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.03)]">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-[450px] h-[450px] bg-gradient-to-br from-blue-100/60 via-indigo-50/40 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-[350px] h-[350px] bg-gradient-to-tr from-amber-100/40 via-rose-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                LIVE POINT SYNC
              </span>
              <span className="text-xs text-slate-400 font-medium">Refreshes every 10s</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Festival Championship Standings
            </h1>
            <p className="text-sm sm:text-base text-slate-500 max-w-2xl font-normal">
              Official live scores across all 60 competitions in J1, J2, Junior, Senior & General categories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#007AFF]' : 'text-slate-500'}`} />
              <span>{isFetching ? 'Syncing...' : 'Sync Live'}</span>
            </button>
          </div>
        </div>

        {/* Lead Difference Callout */}
        {leader && runnerUp && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 text-amber-600 font-extrabold bg-amber-50 px-3 py-1 rounded-full border border-amber-200/70 text-xs">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>CHAMPIONSHIP GAP</span>
              </span>
              <span className="text-xs sm:text-sm text-slate-700">
                <strong className="text-slate-900 font-black">{leader.name}</strong> leads by{' '}
                <strong className="text-amber-600 font-black font-mono">
                  {pointGap > 0 ? `+${pointGap.toFixed(1)}` : '0.0'} pts
                </strong>{' '}
                over {runnerUp.name}
              </span>
            </div>

            <span className="text-xs font-mono font-semibold text-slate-400">
              Total Points Contested: {totalCombinedPts.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* 2. Model 1 & 2 Dual Team Championship Arena */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team, idx) => {
          const isFirst = idx === 0;
          const isDiraya = team.code?.toUpperCase().includes('DIR') || team.name?.toLowerCase().includes('diraya');
          const share = isFirst ? leaderShare : runnerUpShare;

          return (
            <div
              key={team.id}
              className={`relative overflow-hidden p-8 rounded-[2.25rem] bg-white border transition-all duration-300 hover:shadow-xl ${
                isFirst
                  ? 'border-blue-300 shadow-md ring-1 ring-blue-500/10'
                  : 'border-slate-200/90 shadow-xs'
              }`}
            >
              {/* Decorative pastel aura */}
              <div
                className={`absolute -right-16 -top-16 w-52 h-52 rounded-full blur-3xl opacity-40 pointer-events-none ${
                  isDiraya ? 'bg-blue-300' : 'bg-amber-300'
                }`}
              />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-md"
                    style={{
                      backgroundColor: team.color || (isDiraya ? '#007AFF' : '#ef4444'),
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900">{team.name}</h2>
                      {isFirst && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          <Trophy className="w-3 h-3 text-amber-600" />
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
                  <span className="text-xs font-extrabold text-[#007AFF] uppercase tracking-wider block mt-0.5">
                    Total Score
                  </span>
                </div>
              </div>

              {/* Placements Podium Strip (Model 1 Rounded Badges) */}
              <div className="mt-8 pt-6 border-t border-slate-100/90 grid grid-cols-3 gap-2.5 relative z-10">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                    🥇 1st Place
                  </span>
                  <span className="font-display text-2xl font-black text-amber-900">
                    {team.first_places || 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/70 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                    🥈 2nd Place
                  </span>
                  <span className="font-display text-2xl font-black text-slate-800">
                    {team.second_places || 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-100 text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 block">
                    🥉 3rd Place
                  </span>
                  <span className="font-display text-2xl font-black text-orange-900">
                    {team.third_places || 0}
                  </span>
                </div>
              </div>

              {/* Point Share Progress Bar (Model 1 Chunky Pill Bar) */}
              <div className="mt-6 space-y-2 relative z-10">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Share of Championship Points</span>
                  <span className="font-mono font-bold text-slate-700">{share}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${share}%`,
                      backgroundColor: team.color || (isDiraya ? '#007AFF' : '#ef4444'),
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
        {/* Head to Head Ratio Donut & Bar (Model 1 Style) */}
        <div className="md:col-span-2 p-7 rounded-[2rem] bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#007AFF]" />
              <span>Points Tug-of-War</span>
            </h3>
            <span className="text-xs font-mono font-semibold text-slate-400">
              {leader ? leader.name : 'Team A'} vs {runnerUp ? runnerUp.name : 'Team B'}
            </span>
          </div>

          {/* Tug-of-War Split Pill Bar */}
          <div className="space-y-2">
            <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-100 p-1">
              <div
                className="h-full rounded-l-full bg-[#007AFF] transition-all duration-1000"
                style={{ width: `${leaderShare}%` }}
              />
              <div
                className="h-full rounded-r-full bg-[#ef4444] transition-all duration-1000"
                style={{ width: `${runnerUpShare}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#007AFF]">{leader?.name || 'Diraya'} ({leaderShare}%)</span>
              <span className="text-[#ef4444]">{runnerUp?.name || 'Rivaya'} ({runnerUpShare}%)</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed pt-2">
            Scores are calculated immediately as judging panels submit signed criteria rubrics from stage tablets.
          </p>
        </div>

        {/* Official Scoring Matrix Rules Card */}
        <div className="p-7 rounded-[2rem] bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Official Scoring Rules</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
              <span className="font-medium text-slate-600">1st Place</span>
              <span className="font-mono font-bold text-slate-900">10 Points</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
              <span className="font-medium text-slate-600">2nd Place</span>
              <span className="font-mono font-bold text-slate-900">7 Points</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
              <span className="font-medium text-slate-600">3rd Place</span>
              <span className="font-mono font-bold text-slate-900">5 Points</span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <Link
              to="/schedule"
              className="text-xs font-bold text-[#007AFF] hover:text-blue-700 inline-flex items-center gap-1"
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
