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
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';

export const LiveScreenControlPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
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
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['live-screen-admin'] });
      queryClient.invalidateQueries({ queryKey: ['live-screen-display'] });
      success(resData?.message || 'Stage screen updated successfully!');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update live stage screen');
    },
  });

  const handleSetMode = (mode: 'AUTO' | 'AD' | 'LEADERBOARD', compId: number | null = null) => {
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
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#0A0A0A] p-4 rounded-2xl border border-white/[0.08] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D472D] text-white flex items-center justify-center shadow-xs">
            <Tv className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bento-title font-bold text-white leading-tight">
                Stage Live Screen Controller
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                BROADCAST CONSOLE
              </span>
            </div>
            <p className="text-xs text-amber-200/60 font-medium">
              Direct operator controller for the audience-facing 16:9 LED wall / TV screen
            </p>
          </div>
        </div>

        {/* Launch Live Screen Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={openStageScreen}
            className="bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs rounded-xl shadow-xs px-3.5 py-2 cursor-pointer flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>Launch Stage Screen ↗</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Control Actions (Left 7 Cols) + Live Preview Monitor (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ================================================================= */}
        {/* LEFT SECTION (7 Cols): Direct Mode Switchers & Result Trigger     */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Panel 1: Primary Screen Mode Buttons */}
          <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-white/[0.08] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <h3 className="text-xs font-bento-title uppercase tracking-wider text-amber-200 font-bold flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-emerald-300" />
                Select Stage Screen Mode
              </h3>
              <span className="text-[10px] font-bold text-amber-200/60">
                Current: <strong className="text-amber-100 uppercase">{state.mode}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Auto Cycle (Default) */}
              <button
                onClick={() => handleSetMode('AUTO')}
                disabled={updateMutation.isPending}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  state.mode === 'AUTO'
                    ? 'bg-emerald-500/15 border-[#0D472D] ring-2 ring-[#0D472D]/20 shadow-xs'
                    : 'bg-[#0A0A0A] border-amber-500/30 hover:border-amber-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <RefreshCw className={`w-4 h-4 ${state.mode === 'AUTO' ? 'text-emerald-300 animate-spin' : 'text-amber-200/60'}`} />
                  {state.mode === 'AUTO' && (
                    <span className="text-[9px] font-bold bg-[#0D472D] text-white px-1.5 py-0.2 rounded uppercase">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Auto-Loop (Promo ⟷ Battle ⟷ Results)</h4>
                  <p className="text-[10px] text-amber-200/60 mt-0.5 leading-snug">
                    Cycles Promo, Leaderboard, and up to 5 latest Result Posters ({Math.min(resultPosters.length, 5)} in rotation) every 14s.
                  </p>
                </div>
              </button>

              {/* Option 2: Lock on Promo Ad */}
              <button
                onClick={() => handleSetMode('AD')}
                disabled={updateMutation.isPending}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  state.mode === 'AD'
                    ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-[#0A0A0A] border-amber-500/30 hover:border-amber-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Flame className={`w-4 h-4 ${state.mode === 'AD' ? 'text-amber-600' : 'text-amber-200/60'}`} />
                  {state.mode === 'AD' && (
                    <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                      LOCKED
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Lock: Esperanza Promo</h4>
                  <p className="text-[10px] text-amber-200/60 mt-0.5 leading-snug">
                    Fixed festival branding & house crests. Ideal for breaks.
                  </p>
                </div>
              </button>

              {/* Option 3: Lock on Live Leaderboard */}
              <button
                onClick={() => handleSetMode('LEADERBOARD')}
                disabled={updateMutation.isPending}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  state.mode === 'LEADERBOARD'
                    ? 'bg-emerald-500/15 border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                    : 'bg-[#0A0A0A] border-amber-500/30 hover:border-amber-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Trophy className={`w-4 h-4 ${state.mode === 'LEADERBOARD' ? 'text-emerald-300' : 'text-amber-200/60'}`} />
                  {state.mode === 'LEADERBOARD' && (
                    <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded uppercase">
                      LOCKED
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Lock: Leaderboard</h4>
                  <p className="text-[10px] text-amber-200/60 mt-0.5 leading-snug">
                    Fixed Diraya vs Rivaya scoreboard with live battle line.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Panel 2: One-Click Result Poster Flash */}
          <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-white/[0.08] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-amber-200 font-bold">
                  Push Official Result Poster
                </h3>
              </div>
              <span className="text-[10px] text-amber-200/60 font-medium">
                {publishedCompetitions.length} Verified Competitions Available
              </span>
            </div>

            <p className="text-xs text-amber-200/60 font-normal">
              Click <strong>"Push Poster"</strong> on any completed competition below to immediately display its celebration podium poster on the stage screen:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {publishedCompetitions.length > 0 ? (
                publishedCompetitions.map((comp) => {
                  const poster = resultPosters.find((p) => p.competition_id === comp.id);
                  const champion = poster?.winners?.find((w: any) => Number(w.position) === 1);
                  const isCurrentlyActive =
                    state.mode === 'RESULT' && Number(state.active_competition_id) === Number(comp.id);

                  return (
                    <div
                      key={comp.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${
                        isCurrentlyActive
                          ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/20'
                          : 'bg-[#0A0A0A] border-amber-500/30 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {comp.competition_name}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#121212] text-amber-200 uppercase">
                            {comp.programme_group || 'GENERAL'}
                          </span>
                          {publishedCompetitions.slice(0, 5).some((c) => c.id === comp.id) && (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase">
                              In Auto-Loop
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-amber-200/60 mt-0.5 truncate">
                          🏆 1st:{' '}
                          <strong className="text-amber-100">
                            {champion?.participant_name || 'Champion'}
                          </strong>{' '}
                          ({champion?.team_name || 'House'})
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isCurrentlyActive ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-amber-400 text-slate-950 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                              ON SCREEN NOW
                            </span>
                            <button
                              onClick={() => handleSetMode('AUTO')}
                              className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase bg-[#121212] hover:bg-[#121212] text-amber-200 cursor-pointer"
                              title="Dismiss and resume Auto-loop"
                            >
                              Dismiss
                            </button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePushResult(comp.id)}
                            disabled={updateMutation.isPending}
                            className="text-xs font-bold py-1 px-3 rounded-lg bg-[#0A0A0A] border border-white/[0.08] hover:bg-[#0D472D] hover:text-white hover:border-[#0D472D] transition-all cursor-pointer"
                          >
                            Push Poster
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center bg-[#121212] rounded-xl border border-dashed border-amber-500/30 space-y-1">
                  <AlertCircle className="w-5 h-5 text-amber-200/60 mx-auto" />
                  <p className="text-xs font-semibold text-amber-200">No Published Results Yet</p>
                  <p className="text-[10px] text-amber-200/60">
                    Once results are published in Results Verification, they will appear here ready to push to the stage screen.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT SECTION (5 Cols): Live Screen Mini-Monitor (Live Preview)   */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-white/[0.08] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-300" />
                <h3 className="text-xs font-bento-title uppercase tracking-wider text-amber-200 font-bold">
                  Stage Screen Mini-Monitor
                </h3>
              </div>
              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                AUDIENCE VIEW
              </span>
            </div>

            {/* 16:9 Aspect Ratio Television Mockup */}
            <div className="relative aspect-video w-full rounded-2xl bg-[#040404] border-2 border-amber-500/30 p-3 flex flex-col justify-between overflow-hidden shadow-2xl text-white select-none">
              {/* Header preview */}
              <div className="flex items-center justify-between text-[8px] text-amber-200/60 shrink-0">
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400">
                  ESPERANZA 9.0 • NEXUS VERITATIS
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#0A0A0A] border border-amber-500/40 text-amber-300 font-semibold text-[7px]">
                  {state.mode === 'RESULT'
                    ? 'VICTORY POSTER'
                    : state.mode === 'AD'
                    ? 'FESTIVAL PROMO'
                    : state.mode === 'LEADERBOARD'
                    ? 'STANDINGS'
                    : `AUTO-LOOP (${Math.min(resultPosters.length, 5)} POSTERS)`}
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
                      {data?.active_poster?.competition_name || 'General - DTP'}
                    </h5>
                    <div className="text-[8px] text-amber-300 font-bold">
                      🏆 1st: {data?.active_poster?.winners?.[0]?.participant_name || 'Winner'}
                    </div>
                  </div>
                ) : state.mode === 'AD' ? (
                  <div className="space-y-1">
                    <Flame className="w-5 h-5 text-amber-400 mx-auto" />
                    <h5 className="text-xs font-black text-white tracking-wider">
                      ESPERANZA 9.0
                    </h5>
                    <span className="text-[8px] text-amber-300 font-bold block">
                      DIRAYA (Forest) vs RIVAYA (Burgundy)
                    </span>
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
                <span>1080p LED Wall Broadcast</span>
                <span className="text-amber-400 font-semibold">Live Synced</span>
              </div>
            </div>

            <div className="text-center pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={openStageScreen}
                className="w-full text-xs font-bold py-1.5 rounded-xl border border-white/[0.08] hover:bg-[#121212] flex items-center justify-center gap-1.5"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Open Fullscreen Stage Screen</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
