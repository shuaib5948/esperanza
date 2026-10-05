import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Trophy,
  Play,
  CheckCircle2,
  Lock,
  Save,
  ArrowLeft,
  Award,
  AlertTriangle,
  Clock,
  Sparkles,
  BarChart3,
  Layers,
  LogOut,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';

interface Participant {
  participant_id: number;
  queue_id?: number | null;
  participant_code: string;
  participant_name: string;
  team_name: string;
  queue_order?: number;
  code_letter?: string | null;
  check_in_status?: string | null;
  stage_status?: string | null;
  sheet_id?: number | null;
  status?: string | null;
  scoring_status?: string | null;
  total_marks?: number | null;
  remarks?: string | null;
}

const compareQueueOrder = (
  a: { queue_order?: number; code_letter?: string | null; participant_id: number },
  b: { queue_order?: number; code_letter?: string | null; participant_id: number }
) => {
  const orderA = a.queue_order ?? 999;
  const orderB = b.queue_order ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  if (a.code_letter && b.code_letter) {
    const letterCmp = a.code_letter.localeCompare(b.code_letter);
    if (letterCmp !== 0) return letterCmp;
  } else if (a.code_letter) {
    return -1;
  } else if (b.code_letter) {
    return 1;
  }
  return a.participant_id - b.participant_id;
};

const SCORE_PRESETS = [60, 70, 75, 80, 85, 90, 95, 100];

export const JudgeTabletPortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { logout } = useAuth();

  // 1. Poll Judge Dashboard stats every 2.5s for real-time live stage detection
  const { data: dashboardData } = useQuery({
    queryKey: ['judge-dashboard'],
    queryFn: async () => {
      const res = await api.get<any>('/dashboard/judge');
      return res.data;
    },
    refetchInterval: 2500,
  });

  const judge = dashboardData?.judge;
  const assignments: any[] = dashboardData?.assignments || [];

  // Identify currently active live stage competition (if any)
  const activeLiveComp = useMemo(() => {
    return assignments.find((c) => c.schedule_status === 'LIVE' && c.competition_type === 'STAGE') || 
           assignments.find((c) => c.schedule_status === 'LIVE') || null;
  }, [assignments]);

  // List of offline/offstage programmes assigned for evaluation
  const offStagePendingComps = useMemo(() => {
    return assignments.filter((c) => c.competition_type === 'OFF_STAGE' || c.schedule_status === 'COMPLETED');
  }, [assignments]);

  // Track competitions this judge has already submitted marks for (prevents re-selection race condition)
  const [completedCompIds, setCompletedCompIds] = useState<Set<number>>(new Set());

  // Unsubmitted / pending off-stage competitions (excludes already-submitted ones)
  const pendingOffStageComps = useMemo(() => {
    return offStagePendingComps.filter((c) =>
      !(c.total_registered > 0 && c.total_submitted === c.total_registered) &&
      !completedCompIds.has(c.competition_id)
    );
  }, [offStagePendingComps, completedCompIds]);

  // Selected competition ID for scoring
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);

  // Automatically open the judge scoring portal:
  // 1. Live stage competition takes priority as soon as it goes live
  // 2. Off-stage competition automatically opens as soon as admin clicks "Evaluate"
  useEffect(() => {
    if (activeLiveComp) {
      if (selectedCompId !== activeLiveComp.competition_id) {
        setSelectedCompId(activeLiveComp.competition_id);
        setShowOverallReview(false);
      }
    } else if (!selectedCompId && pendingOffStageComps.length > 0) {
      setSelectedCompId(pendingOffStageComps[0].competition_id);
      setShowOverallReview(false);
    }
  }, [activeLiveComp, pendingOffStageComps, selectedCompId]);

  const [activePerformerIndex, setActivePerformerIndex] = useState(0);
  const [showOverallReview, setShowOverallReview] = useState(false);

  // Started performers tracking
  const [startedPerformers, setStartedPerformers] = useState<Record<number, boolean>>({});

  // Direct marks & remarks
  const [allMarks, setAllMarks] = useState<Record<number, number>>({});
  const [allRemarks, setAllRemarks] = useState<Record<number, string>>({});

  const [isBulkLockModalOpen, setIsBulkLockModalOpen] = useState(false);

  // 2. Fetch score sheet for the selected competition (Auto-polls every 3s so late arrivals and stage changes sync in real-time)
  const { data: sheetData, isLoading: isSheetLoading } = useQuery({
    queryKey: ['judge-scoresheet', selectedCompId],
    queryFn: async () => {
      if (!selectedCompId) return null;
      const res = await api.get<any>(`/judge/competitions/${selectedCompId}/scoresheet`);
      return res.data;
    },
    enabled: !!selectedCompId,
    refetchInterval: 3000,
  });

  const competition = sheetData?.competition;
  const rawParticipants: Participant[] = sheetData?.participants || [];

  // IN JUDGES PLATFORM: ONLY SEE PRESENT PARTICIPANTS ASSIGNED DURING CHECK-IN
  const participants = useMemo(() => {
    const presentOnly = rawParticipants.filter((p) => {
      if (p.check_in_status === 'ABSENT' || p.stage_status === 'ABSENT') return false;
      if (rawParticipants.some((rp) => rp.code_letter || rp.check_in_status === 'REPORTED')) {
        return p.code_letter || p.check_in_status === 'REPORTED';
      }
      return true;
    });

    return [...presentOnly].sort(compareQueueOrder);
  }, [rawParticipants]);

  // Ranked participants for Overall Review
  const rankedParticipants = useMemo(() => {
    const sorted = [...participants].map((p) => ({
      ...p,
      currentMark: allMarks[p.participant_id] ?? 0,
    })).sort((a, b) => b.currentMark - a.currentMark);

    let currentRank = 1;
    const rankMap = new Map<number, number>();
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].currentMark < sorted[i - 1].currentMark) {
        currentRank = i + 1;
      }
      rankMap.set(sorted[i].participant_id, currentRank);
    }

    return participants.map((p) => ({
      ...p,
      rank: rankMap.get(p.participant_id) || 1,
      currentMark: allMarks[p.participant_id] ?? 0,
    }));
  }, [participants, allMarks]);

  // Sync marks into local state
  useEffect(() => {
    if (participants.length > 0) {
      const newMarks: Record<number, number> = {};
      const newRemarks: Record<number, string> = {};
      const newStarted: Record<number, boolean> = {};

      participants.forEach((p) => {
        if (p.total_marks !== null && p.total_marks !== undefined) {
          newMarks[p.participant_id] = Number(p.total_marks);
          newStarted[p.participant_id] = true;
        }
        if (p.remarks) {
          newRemarks[p.participant_id] = p.remarks;
        }
        if (p.status === 'SUBMITTED' || p.status === 'LOCKED' || p.status === 'DRAFT' || p.stage_status === 'ON_STAGE') {
          newStarted[p.participant_id] = true;
        }
      });

      setAllMarks((prev) => ({ ...newMarks, ...prev }));
      setAllRemarks((prev) => ({ ...newRemarks, ...prev }));
      setStartedPerformers((prev) => ({ ...newStarted, ...prev }));
    }
  }, [participants]);

  const currentParticipant: Participant | undefined = participants[activePerformerIndex];

  const isAllLocked = useMemo(() => {
    return participants.length > 0 && participants.every((p) => p.status === 'SUBMITTED' || p.status === 'LOCKED');
  }, [participants]);

  // Check if all performers have a mark > 0
  const isEveryPerformerMarked = useMemo(() => {
    return participants.length > 0 && participants.every((p) => (allMarks[p.participant_id] ?? 0) > 0);
  }, [participants, allMarks]);

  const getParticipantMark = (pId: number): number => {
    return allMarks[pId] ?? 0;
  };

  // Mutation: Save individual score (Draft)
  const saveIndividualScoresMutation = useMutation({
    mutationFn: async ({ participantId, isDraft }: { participantId: number; isDraft: boolean }) => {
      const pMark = allMarks[participantId] ?? 0;
      const pRemarks = allRemarks[participantId] || '';

      return api.post(`/judge/competitions/${selectedCompId}/scores`, {
        participant_id: participantId,
        marks: pMark,
        remarks: pRemarks,
        is_draft: isDraft,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-scoresheet', selectedCompId] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to save scores');
    },
  });

  // Mutation: Final lock & submit (Finishes programme)
  const saveBulkScoresMutation = useMutation({
    mutationFn: async ({ isDraft }: { isDraft: boolean }) => {
      const items = participants.map((p) => ({
        participant_id: p.participant_id,
        marks: allMarks[p.participant_id] ?? 0,
        remarks: allRemarks[p.participant_id] || '',
      }));

      return api.post(`/judge/competitions/${selectedCompId}/bulk-scores`, {
        items,
        is_draft: isDraft,
      });
    },
    onSuccess: (_, vars) => {
      if (vars.isDraft) {
        success('All draft marks saved!');
      } else {
        const progNum = competition?.programme_number ? competition.programme_number : '46';
        setIsBulkLockModalOpen(false);
        success(`${progNum}- dtp record submitted successfully`);

        // Record as completed locally to prevent auto-reselecting before refetch completes
        if (selectedCompId) {
          setCompletedCompIds((prev) => new Set(prev).add(selectedCompId));
        }

        // Automatically return to standby / wait for next judgment
        setSelectedCompId(null);
        setShowOverallReview(false);
        setActivePerformerIndex(0);
        setAllMarks({});
        setAllRemarks({});
        setStartedPerformers({});
      }
      queryClient.invalidateQueries({ queryKey: ['judge-scoresheet', selectedCompId] });
      queryClient.invalidateQueries({ queryKey: ['judge-dashboard'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to submit marks');
    },
  });

  const handleMarkChange = (participantId: number, val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    setAllMarks((prev) => ({
      ...prev,
      [participantId]: clamped,
    }));
  };

  const handleRemarksChange = (participantId: number, val: string) => {
    setAllRemarks((prev) => ({
      ...prev,
      [participantId]: val,
    }));
  };

  // Complete current performer and advance to next code letter
  const handleCompleteAndNext = async () => {
    if (!currentParticipant) return;

    try {
      await saveIndividualScoresMutation.mutateAsync({
        participantId: currentParticipant.participant_id,
        isDraft: true,
      });

      // Bi-Directional Performer Pacing Sync:
      // Mark current performer as COMPLETED in stage_queue
      if (currentParticipant.queue_id) {
        api.patch(`/stage/${currentParticipant.queue_id}/status`, { stage_status: 'COMPLETED' }).catch(() => {});
      }

      const currentLetter = currentParticipant.code_letter || `Code ${activePerformerIndex + 1}`;

      if (activePerformerIndex < participants.length - 1) {
        const nextIndex = activePerformerIndex + 1;
        const nextPerformer = participants[nextIndex];
        const nextLetter = nextPerformer?.code_letter || `Code ${nextIndex + 1}`;
        setActivePerformerIndex(nextIndex);

        // Bi-Directional Performer Pacing Sync:
        // Set next performer to ON_STAGE in stage_queue
        if (nextPerformer?.queue_id) {
          api.patch(`/stage/${nextPerformer.queue_id}/status`, { stage_status: 'ON_STAGE' }).catch(() => {});
          setStartedPerformers((prev) => ({
            ...prev,
            [nextPerformer.participant_id]: true,
          }));
        }

        success(`Saved ${currentLetter}. Evaluating ${nextLetter}!`);
      } else {
        // Last performer reached: transition to Overall Review!
        setShowOverallReview(true);
        success(`All participants evaluated! Reviewing overall marks.`);
      }
    } catch {
      // Handled by mutation
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">

      {/* =================================================================== */}
      {/* 1. DEFAULT IDLE / STANDBY SCREEN (Waiting for Admin to Go Live)       */}
      {/* =================================================================== */}
      {/* =================================================================== */}
      {/* 1. DEFAULT IDLE / STANDBY SCREEN (Waiting for Admin to Go Live)       */}
      {/* =================================================================== */}
      {!selectedCompId ? (
        <div className="w-full text-center my-auto flex flex-col items-center justify-center flex-1 py-4 space-y-5 relative">
          {/* Trophy Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 text-emerald-300 border border-white/20 flex items-center justify-center shadow-inner mb-4 backdrop-blur-sm relative z-10">
            <Trophy className="w-8 h-8 text-emerald-300" />
          </div>

          {/* Festival Header Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-md relative z-10">
            Esperanza
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl mx-auto font-medium relative z-10">
            {judge?.judge_type === 'OFF_STAGE'
              ? 'Inter-Collegiate Arts & Cultural Festival • Off-Stage Submissions Evaluation Portal'
              : 'Inter-Collegiate Arts & Cultural Festival • Live Stage Evaluation Portal'}
          </p>

          {/* Live Competition or Waiting Radar Section */}
          <div className="mt-8 pt-8 border-t border-emerald-700/50 max-w-lg mx-auto relative z-10">
            {activeLiveComp ? (
              /* LIVE PROGRAMME DETECTED ALERT */
              <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-xl space-y-4 text-left border border-emerald-100">
                <div className="flex items-center gap-2 text-[#0D472D] font-black text-xs uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                  <span>● Live On Stage Now</span>
                </div>

                <div>
                  <span className="text-xs font-mono font-bold text-[#0D472D]">
                    PROGRAMME {activeLiveComp.programme_number}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">
                    {activeLiveComp.competition_name}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Present contestants ready with drawn lots
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedCompId(activeLiveComp.competition_id);
                    setActivePerformerIndex(0);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  <span>START EVALUATION</span>
                </Button>
              </div>
            ) : (
              /* WAITING STATUS RADAR */
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-emerald-100 text-xs font-bold backdrop-blur-md shadow-xs">
                  <Clock className="w-4 h-4 text-emerald-300 animate-spin" />
                  <span>
                    {judge?.judge_type === 'OFF_STAGE'
                      ? 'Waiting for admin to dispatch off-stage programme for evaluation...'
                      : 'Waiting for stage coordinator to start next programme...'}
                  </span>
                </div>
                <p className="text-xs text-emerald-100/70 max-w-md mx-auto font-medium leading-relaxed">
                  {judge?.judge_type === 'OFF_STAGE'
                    ? 'When the admin sends completed off-stage submissions for evaluation, this screen will automatically open the scoring panel.'
                    : 'The stage coordinator is currently conducting backstage check-in and drawing lots. As soon as they press Go Live, this tablet will automatically prompt you to start scoring.'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : isSheetLoading ? (
        <Card className="py-24 text-center space-y-3 border-slate-200/80 bg-white rounded-3xl shadow-xs">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-[#0D472D] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading present contestants...</p>
        </Card>
      ) : participants.length === 0 ? (
        <Card className="py-16 text-center space-y-4 border-slate-200/80 bg-white rounded-3xl shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">No Present Contestants Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Backstage check-in has not marked any participants present yet.
          </p>
          <Button variant="secondary" onClick={() => setSelectedCompId(null)}>
            Return to Standby
          </Button>
        </Card>
      ) : showOverallReview ? (
        /* =================================================================== */
        /* 2. OVERALL REVIEW & CALIBRATION (After All Participants Complete)   */
        /* =================================================================== */
        <div className="space-y-6">
          {/* Top Programme Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {competition?.is_group ? 'Group' : 'Individual'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#E6F4EA] text-[#0D472D] border border-emerald-200">
                  {competition?.competition_type === 'OFF_STAGE' ? 'Off-Stage' : 'Stage'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                General - DTP
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-wider">
                Score Overview
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOverallReview(false)}
                className="rounded-xl font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Scorecard</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => saveBulkScoresMutation.mutate({ isDraft: true })}
                isLoading={saveBulkScoresMutation.isPending}
                disabled={isAllLocked}
                className="rounded-xl font-bold"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                <span>Save</span>
              </Button>
              {isAllLocked ? (
                <span className="px-3.5 py-1.5 rounded-xl bg-[#E6F4EA] border border-emerald-200 text-[#0D472D] text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0D472D]" />
                  <span>Submitted</span>
                </span>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-[#0D472D] hover:bg-[#07321e] text-white font-bold rounded-xl shadow-xs cursor-pointer px-4 py-2"
                  onClick={() => setIsBulkLockModalOpen(true)}
                  disabled={isAllLocked}
                >
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  <span>Submit</span>
                </Button>
              )}
            </div>
          </div>

          {/* Subtitle guidance banner */}


          {/* Bento Review Table Card */}
          <Card className="p-0 overflow-hidden border border-slate-200/80 bg-white shadow-xs rounded-2xl flex flex-col flex-1 min-h-0">
            <div className="overflow-auto max-h-[calc(100vh-14rem)] scrollbar-thin flex-1">
              <table className="w-full text-center border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200/80 shadow-2xs">
                  <tr className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-4 text-center bg-slate-50">Lot</th>
                    <th className="py-3.5 px-4 text-center bg-slate-50">Contestant Code</th>
                    <th className="py-3.5 px-4 text-center bg-slate-50">Rank</th>
                    <th className="py-3.5 px-4 text-center w-40 bg-slate-50">Mark</th>
                    <th className="py-3.5 px-4 text-center bg-slate-50">Remarks / Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-base">
                  {rankedParticipants.map((p, idx) => {
                    const displayLetter = p.code_letter || String.fromCharCode(65 + idx);
                    const mark = p.currentMark;

                    // Rank badge styling
                    let rankBadge = (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                        {p.rank}
                      </span>
                    );
                    if (mark > 0) {
                      if (p.rank === 1) {
                        rankBadge = (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            🥇 1st
                          </span>
                        );
                      } else if (p.rank === 2) {
                        rankBadge = (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs">
                            🥈 2nd
                          </span>
                        );
                      } else if (p.rank === 3) {
                        rankBadge = (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                            🥉 3rd
                          </span>
                        );
                      }
                    }

                    return (
                      <tr
                        key={p.participant_id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Lot Code */}
                        <td className="py-4 px-4 text-center">
                          <span className="w-10 h-10 rounded-xl bg-[#E6F4EA] border border-emerald-200 text-[#0D472D] font-black text-sm flex items-center justify-center mx-auto shadow-2xs">
                            {displayLetter}
                          </span>
                        </td>

                        {/* Contestant Chest Code */}
                        <td className="py-4 px-4 text-center font-mono font-bold text-base sm:text-lg text-slate-900">
                          {p.participant_code}
                        </td>

                        {/* Rank */}
                        <td className="py-4 px-4 text-center">
                          {rankBadge}
                        </td>

                        {/* Mark Input */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              disabled={isAllLocked}
                              value={mark}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleMarkChange(p.participant_id, val);
                              }}
                              className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-lg sm:text-xl font-black text-[#0D472D] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[#0D472D]/20 focus:border-[#0D472D] disabled:opacity-50 shadow-2xs"
                            />
                          </div>
                        </td>

                        {/* Remarks */}
                        <td className="py-4 px-4 text-center">
                          <input
                            type="text"
                            placeholder="Add brief observation..."
                            disabled={isAllLocked}
                            value={allRemarks[p.participant_id] || ''}
                            onChange={(e) => handleRemarksChange(p.participant_id, e.target.value)}
                            className="w-full max-w-md mx-auto px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D472D]/20 focus:border-[#0D472D] disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* =================================================================== */
        /* 3. PURE SEQUENTIAL EVALUATION (Side-by-Side Bento Grid 1-Screen)    */
        /* =================================================================== */
        <div className="flex flex-col h-full justify-between gap-3 overflow-hidden text-slate-900">
          {/* Top Programme Bar (Compact 1-liner) */}
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200/80 px-4 py-2 rounded-2xl shadow-xs shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSelectedCompId(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                title="Return to Standby"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    {competition?.is_group ? 'Group' : 'Individual'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#E6F4EA] text-[#0D472D] border border-emerald-200 shrink-0">
                    {competition?.competition_type === 'OFF_STAGE' ? 'Off-Stage' : 'Stage'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 truncate leading-tight">
                  General - DTP
                </h2>
                <p className="text-xs font-bold text-slate-500 truncate mt-0.5 uppercase tracking-wider">
                  Scorecard
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  saveIndividualScoresMutation.mutate({
                    participantId: currentParticipant?.participant_id || 0,
                    isDraft: true,
                  })
                }
                isLoading={saveIndividualScoresMutation.isPending}
                disabled={isAllLocked || !currentParticipant}
                className="rounded-xl font-bold"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                <span>Save</span>
              </Button>

              {isEveryPerformerMarked && (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs shadow-xs rounded-xl px-4 py-2 shrink-0 cursor-pointer"
                  onClick={() => setShowOverallReview(true)}
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  <span>Review ➔</span>
                </Button>
              )}
            </div>
          </div>

          {/* Main 2-Column Bento Grid */}
          {currentParticipant && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0 overflow-hidden">
              {/* Left Column (4 Cols): Performer Identity & Navigation List */}
              <div className="md:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between overflow-hidden space-y-3">
                {/* Performer Header Info */}
                <div className="space-y-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#0D472D] text-white font-black text-2xl flex items-center justify-center shadow-xs shrink-0">
                      {currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#0D472D]">
                          LOT {activePerformerIndex + 1} OF {participants.length}
                        </span>
                        {isAllLocked ? (
                          <Badge variant="success" size="sm">
                            Locked
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Active
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-black text-slate-900 truncate">
                        CODE LETTER {currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono">
                        REG: {currentParticipant.participant_code}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Mark</span>
                    <span className="text-2xl font-black text-[#0D472D] font-mono leading-none">
                      {getParticipantMark(currentParticipant.participant_id).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Performer Stepper Pills Grid */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Performers Stepper ({participants.length})
                  </span>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {participants.map((p, idx) => {
                      const isSelected = idx === activePerformerIndex;
                      const pMark = getParticipantMark(p.participant_id);
                      const isCompleted = pMark > 0;
                      const displayLetter = p.code_letter || String.fromCharCode(65 + idx);

                      return (
                        <button
                          key={p.participant_id}
                          onClick={() => setActivePerformerIndex(idx)}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                            isSelected
                              ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                              : isCompleted
                              ? 'bg-[#E6F4EA] text-[#0D472D] border-emerald-200 hover:border-emerald-300'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[11px] font-bold ${
                                isSelected
                                  ? 'bg-white text-[#0D472D]'
                                  : isCompleted
                                  ? 'bg-emerald-100 text-[#0D472D]'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {displayLetter}
                            </span>
                            <span>Code {displayLetter}</span>
                          </div>
                          {isCompleted ? (
                            <span className="font-mono text-xs font-bold">{pMark.toFixed(1)}</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Pending</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column (8 Cols): Score Controls, Slider, Presets & Actions */}
              <div className="md:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between overflow-hidden space-y-3">
                {!startedPerformers[currentParticipant.participant_id] && !isAllLocked ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 p-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#E6F4EA] text-[#0D472D] border border-emerald-200 flex items-center justify-center">
                      <Play className="w-7 h-7 ml-0.5 text-[#0D472D]" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900">
                        Performer Code {currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)} on Stage
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Tap start when contestant begins their performance to enable score inputs.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      className="bg-[#0D472D] hover:bg-[#07321e] text-white font-black px-6 py-2.5 text-sm shadow-xs rounded-full"
                      onClick={() => {
                        setStartedPerformers((prev) => ({
                          ...prev,
                          [currentParticipant.participant_id]: true,
                        }));
                        if (currentParticipant.queue_id) {
                          api.patch(`/stage/${currentParticipant.queue_id}/status`, { stage_status: 'ON_STAGE' }).catch(() => {});
                        }
                      }}
                    >
                      <Play className="w-4 h-4 mr-1.5" />
                      <span>Start</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    {/* Upper Score Box: Direct Entry & Presets */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#0D472D]" />
                          <span className="text-xs font-bold text-slate-900">Direct Score</span>
                        </div>

                        {/* Direct Number Input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            disabled={isAllLocked}
                            value={allMarks[currentParticipant.participant_id] ?? 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleMarkChange(currentParticipant.participant_id, val);
                            }}
                            className="w-28 px-3 py-1 bg-white border-2 border-[#0D472D] rounded-xl text-3xl font-black text-[#0D472D] text-center focus:outline-none focus:ring-2 focus:ring-[#0D472D]/20 disabled:opacity-60 font-mono shadow-xs"
                          />
                        </div>
                      </div>

                      {/* Smooth Range Slider */}
                      <div className="space-y-1">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.5"
                          disabled={isAllLocked}
                          value={allMarks[currentParticipant.participant_id] ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleMarkChange(currentParticipant.participant_id, val);
                          }}
                          className="w-full accent-[#0D472D] h-2.5 bg-slate-200 rounded-lg cursor-pointer disabled:opacity-40"
                        />
                        <div className="flex justify-between text-[10px] font-mono font-semibold text-slate-400 px-0.5">
                          <span>0</span>
                          <span>25</span>
                          <span>50</span>
                          <span>75</span>
                          <span>100</span>
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Quick Presets:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {SCORE_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              disabled={isAllLocked}
                              onClick={() => handleMarkChange(currentParticipant.participant_id, preset)}
                              className={`px-4 py-2 rounded-xl text-sm sm:text-base font-extrabold transition-all cursor-pointer border ${
                                allMarks[currentParticipant.participant_id] === preset
                                  ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-sm scale-105'
                                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Remarks / Observation Textarea */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Observations / Remarks (Optional)
                      </label>
                      <textarea
                        rows={2}
                        disabled={isAllLocked}
                        placeholder="Add qualitative feedback or observations..."
                        value={allRemarks[currentParticipant.participant_id] || ''}
                        onChange={(e) => handleRemarksChange(currentParticipant.participant_id, e.target.value)}
                        className="w-full h-16 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D472D]/20 focus:border-[#0D472D] disabled:opacity-60 resize-none"
                      />
                    </div>

                    {/* Action Navigation Footer */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {activePerformerIndex > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActivePerformerIndex(activePerformerIndex - 1)}
                            className="text-xs py-1.5 font-bold rounded-xl"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                            <span>Prev</span>
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            saveIndividualScoresMutation.mutate({
                              participantId: currentParticipant.participant_id,
                              isDraft: true,
                            })
                          }
                          isLoading={saveIndividualScoresMutation.isPending}
                          disabled={isAllLocked}
                          className="text-xs py-1.5 font-bold rounded-xl"
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          <span>Save</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        {activePerformerIndex < participants.length - 1 ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs shadow-xs px-5 py-1.5 rounded-xl cursor-pointer"
                            onClick={handleCompleteAndNext}
                            isLoading={saveIndividualScoresMutation.isPending}
                            disabled={isAllLocked}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            <span>Next ➔</span>
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs shadow-xs px-5 py-1.5 rounded-xl cursor-pointer"
                            onClick={handleCompleteAndNext}
                            isLoading={saveIndividualScoresMutation.isPending}
                            disabled={isAllLocked}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            <span>Review ➔</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lock Confirmation Modal */}
      <Modal
        isOpen={isBulkLockModalOpen}
        onClose={() => setIsBulkLockModalOpen(false)}
        title="Submit Scores"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Programme:</span>
              <strong className="text-slate-900">General - DTP</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Present Contestants Evaluated:</span>
              <strong className="text-[#0D472D] font-bold">{participants.length} Lots</strong>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" onClick={() => setIsBulkLockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-[#0D472D] hover:bg-[#07321e] text-white font-bold rounded-xl px-5 py-2 cursor-pointer"
              isLoading={saveBulkScoresMutation.isPending}
              onClick={() => saveBulkScoresMutation.mutate({ isDraft: false })}
            >
              <Lock className="w-4 h-4 mr-1.5" />
              <span>Confirm Submit</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
