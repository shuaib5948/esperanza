import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Tv,
  Trophy,
  Sparkles,
  Flame,
  ArrowUpRight,
  RefreshCw,
  Lock,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  Radio,
  Share2,
  TrendingUp,
  Award,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { formatProgramName } from '../LiveStageScreenPage.js';

export const LiveScreenControlPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { error } = useToast();
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);

  // Fetch current live screen display & control state
  const { data, isLoading } = useQuery({
    queryKey: ['live-screen-admin'],
    queryFn: async () => {
      const res = await api.get<any>('/live-screen/display');
      return res.data;
    },
    refetchInterval: 3000,
  });

  const state = data?.state || { mode: 'AUTO', active_competition_id: null };
  const publishedCompetitions: any[] = data?.published_competitions || [];
  const resultPosters: any[] = data?.result_posters || [];
  const leaderboard = data?.leaderboard || [];

  // Update State Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: { mode: string; active_competition_id?: number | null }) => {
      const res = await api.post<any>('/live-screen/control', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-screen-admin'] });
      queryClient.invalidateQueries({ queryKey: ['live-screen-display'] });
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update live stage screen');
    },
  });

  const handleSetMode = (mode: 'AUTO' | 'AD' | 'LEADERBOARD' | 'GRAPH' | 'RESULT', compId: number | null = null) => {
    updateMutation.mutate({ mode, active_competition_id: compId });
  };

  const handlePushResult = (competitionId: number) => {
    setSelectedCompId(competitionId);
    updateMutation.mutate({
      mode: 'RESULT',
      active_competition_id: competitionId,
    });
  };

  const openStageScreen = () => {
    window.open('/live-screen', '_blank');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 text-slate-100">
      {/* 1. Header (Clean, Frameless Bento Style matching Admin Dashboard) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-0.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white truncate leading-tight tracking-[-0.035em]">
                Live Screen
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                BROADCAST
              </span>
            </div>
            <p className="text-xs text-amber-200/60 font-medium mt-0.5 truncate">
              Stage LED wall display & rotation controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openStageScreen}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121212] border border-white/[0.08] hover:border-white/[0.16] text-amber-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Launch Screen</span>
            <ArrowUpRight className="w-3 h-3 text-amber-200/60" />
          </button>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Section (7 Cols): Mode Switcher + Result Posters List */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Display Mode Bar (Sleek Segmented Pill Bar - No Boxy Clutter) */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-200/70 shrink-0">
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span className="uppercase tracking-wider font-bento-title text-[11px]">Display Mode</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-[#121212] p-1 rounded-xl border border-white/[0.06] flex-1 sm:max-w-2xl">
              <button
                onClick={() => handleSetMode('AUTO')}
                disabled={updateMutation.isPending}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  state.mode === 'AUTO'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Cycles all views every 14s"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${state.mode === 'AUTO' ? 'animate-spin' : ''}`} />
                <span>Auto Loop</span>
              </button>

              <button
                onClick={() => handleSetMode('AD')}
                disabled={updateMutation.isPending}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  state.mode === 'AD'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Lock on festival promo branding"
              >
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Promo</span>
              </button>

              <button
                onClick={() => handleSetMode('LEADERBOARD')}
                disabled={updateMutation.isPending}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  state.mode === 'LEADERBOARD'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Lock on 3D standings duel arena"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Standings</span>
              </button>

              <button
                onClick={() => handleSetMode('GRAPH')}
                disabled={updateMutation.isPending}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  state.mode === 'GRAPH'
                    ? 'bg-purple-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Lock on battle progression graph"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Graph</span>
              </button>

              <button
                onClick={() => handleSetMode('RESULT')}
                disabled={updateMutation.isPending}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  state.mode === 'RESULT'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Lock on official victory result poster"
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Poster</span>
              </button>
            </div>
          </div>

          {/* Result Posters Section (Last Published 5 Results Only) */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-white font-bold">
                  Result Posters
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-200/60 bg-[#121212] px-2 py-0.5 rounded-full border border-white/[0.06]">
                Last 5 Published
              </span>
            </div>

            <div className="divide-y divide-white/[0.06] overflow-hidden">
              {publishedCompetitions.slice(0, 5).length > 0 ? (
                publishedCompetitions.slice(0, 5).map((comp) => {
                  const poster = resultPosters.find((p) => p.competition_id === comp.id);
                  const champion = poster?.winners?.find((w: any) => Number(w.position) === 1);
                  const isCurrentlyActive =
                    state.mode === 'RESULT' && Number(state.active_competition_id) === Number(comp.id);

                  const isGroup =
                    comp.participation_type === 'GROUP' ||
                    comp.participation_type === 'TEAM' ||
                    Boolean(champion?.is_group);
                  const mainChamp = isGroup
                    ? champion?.team_name || 'House Team'
                    : champion?.participant_name || 'Champion';
                  const subChamp = isGroup
                    ? champion?.group_members || champion?.participant_name || ''
                    : champion?.team_name || 'House';

                  return (
                    <div
                      key={comp.id}
                      className={`px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                        isCurrentlyActive
                          ? 'bg-amber-500/10'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {formatProgramName(comp.programme_group, comp.competition_name)}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-200/60 mt-0.5 truncate">
                          🏆 1st: <strong className="text-amber-100 font-semibold">{mainChamp}</strong>
                          {subChamp ? ` (${subChamp})` : ''}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isCurrentlyActive ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-400 text-slate-950 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                              LIVE
                            </span>
                            <button
                              onClick={() => handleSetMode('AUTO')}
                              className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[#121212] hover:bg-white/10 text-amber-200 cursor-pointer border border-white/[0.08]"
                            >
                              Dismiss
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePushResult(comp.id)}
                            disabled={updateMutation.isPending}
                            className="text-xs font-bold py-1 px-3 rounded-lg bg-[#121212] border border-white/[0.08] hover:bg-[#0D472D] hover:text-white hover:border-[#0D472D] text-slate-200 transition-all cursor-pointer"
                          >
                            Push
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-amber-200/60">
                  No published results yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section (5 Cols): Live Monitor */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-white/[0.08] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-300" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-amber-200 font-bold">
                  Live Monitor
                </h3>
              </div>
              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                STAGE VIEW
              </span>
            </div>

            {/* 16:9 Aspect Ratio Television Mockup */}
            <div className="relative aspect-video w-full rounded-2xl bg-[#040404] border border-white/[0.12] p-3 flex flex-col justify-between overflow-hidden shadow-2xl text-white select-none">
              {/* Header preview */}
              <div className="flex items-center justify-between text-[8px] text-amber-200/60 shrink-0">
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400">
                  ESPERANZA 9.0
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#0A0A0A] border border-amber-500/40 text-amber-300 font-semibold text-[7px]">
                  {state.mode === 'RESULT'
                    ? 'VICTORY POSTER'
                    : state.mode === 'AD'
                    ? 'PROMO'
                    : state.mode === 'LEADERBOARD'
                    ? 'STANDINGS'
                    : state.mode === 'GRAPH'
                    ? 'GRAPH'
                    : `AUTO (${Math.min(resultPosters.length, 5)})`}
                </span>
              </div>

              {/* Middle preview content */}
              <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-1">
                {state.mode === 'RESULT' ? (
                  <div className="space-y-1">
                    <span className="text-[7px] text-amber-300 font-black uppercase tracking-wider block">
                      OFFICIAL RESULT
                    </span>
                    <h5 className="text-[11px] font-black text-white truncate max-w-[200px]">
                      {formatProgramName(
                        data?.active_poster?.programme_group,
                        data?.active_poster?.competition_name
                      ) || 'General - DTP'}
                    </h5>
                    {(() => {
                      const firstWinner = data?.active_poster?.winners?.[0];
                      const isPosterGroup =
                        (data?.active_poster?.participation_type || '').toUpperCase() === 'GROUP' ||
                        (data?.active_poster?.participation_type || '').toUpperCase() === 'TEAM' ||
                        Boolean(firstWinner?.is_group);
                      const mainText = isPosterGroup
                        ? firstWinner?.team_name || 'House Team'
                        : firstWinner?.participant_name || 'Winner';
                      const subText = isPosterGroup
                        ? firstWinner?.group_members || firstWinner?.participant_name || ''
                        : firstWinner?.team_name || 'House';

                      return (
                        <div className="text-[8px] text-amber-300 font-bold truncate max-w-[220px]">
                          🏆 1st: {mainText} {subText ? `(${subText})` : ''}
                        </div>
                      );
                    })()}
                  </div>
                ) : state.mode === 'AD' ? (
                  <div className="space-y-1">
                    <Flame className="w-5 h-5 text-amber-400 mx-auto" />
                    <h5 className="text-xs font-black text-white tracking-wider">
                      ESPERANZA 9.0
                    </h5>
                    <span className="text-[8px] text-amber-300 font-bold block">
                      DIRAYA vs RIVAYA
                    </span>
                  </div>
                ) : state.mode === 'GRAPH' ? (
                  <div className="space-y-1 w-full px-3">
                    <span className="text-[7px] font-bold text-amber-300 uppercase tracking-widest block">
                      CHAMPIONSHIP GRAPH
                    </span>
                    <div className="flex items-center justify-between text-[8px] font-bold px-1">
                      <span className="text-emerald-400">Diraya ({leaderboard[0]?.total_points || 842})</span>
                      <span className="text-rose-400">Rivaya ({leaderboard[1]?.total_points || 794})</span>
                    </div>
                    <div className="h-6 w-full flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 24">
                        <path d="M 5 18 L 30 14 L 60 10 L 95 6" fill="none" stroke="#00E676" strokeWidth="2" strokeLinecap="round" />
                        <path d="M 5 20 L 30 16 L 60 12 L 95 8" fill="none" stroke="#FF2A6D" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 w-full px-2">
                    <span className="text-[7px] font-bold text-amber-300 uppercase tracking-widest block">
                      NEXUS VERITATIS BATTLE
                    </span>
                    <div className="flex items-center justify-around">
                      <div className="text-left">
                        <span className="text-[8px] font-bold text-emerald-400">DIRAYA</span>
                        <div className="text-sm font-black text-white leading-none">
                          {leaderboard[0]?.total_points || 842}
                        </div>
                      </div>
                      <span className="text-[8px] text-amber-500 font-bold">VS</span>
                      <div className="text-right">
                        <span className="text-[8px] font-bold text-rose-400">RIVAYA</span>
                        <div className="text-sm font-black text-white leading-none">
                          {leaderboard[1]?.total_points || 794}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom preview footer */}
              <div className="flex items-center justify-between text-[7px] text-amber-200/60 border-t border-white/[0.08] pt-1 shrink-0">
                <span>1080p Stage Wall</span>
                <span className="text-emerald-400 font-semibold">Live Synced</span>
              </div>
            </div>

            <div className="text-center pt-0.5">
              <button
                onClick={openStageScreen}
                className="w-full text-xs font-bold py-2 rounded-xl bg-[#121212] border border-white/[0.08] hover:border-white/[0.18] text-amber-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Open Fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
