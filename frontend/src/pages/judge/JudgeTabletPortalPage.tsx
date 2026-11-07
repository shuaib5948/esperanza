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
  Search,
  FileText,
  Eye,
  Medal,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { THEME } from '../../theme/theme.js';

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
  is_group?: boolean | number;
  member_count?: number;
  member_names?: string | null;
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

export const formatProgTitle = (name?: string, group?: string) => {
  if (!name) return 'Programme Evaluation';
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

export const getGrade = (marks: number): 'A+' | 'A' | 'B' | 'C' | 'NG' => {
  if (marks >= 90) return 'A+';
  if (marks >= 70) return 'A';
  if (marks >= 60) return 'B';
  if (marks >= 50) return 'C';
  return 'NG';
};

export const getGradeBadgeStyle = (marks: number): string => {
  const g = getGrade(marks);
  switch (g) {
    case 'A+':
      return 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-xs font-black';
    case 'A':
      return 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30 font-black';
    case 'B':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-black';
    case 'C':
      return 'bg-amber-600/15 text-amber-400 border-amber-600/30 font-black';
    default:
      return 'bg-[#121212] text-slate-400 border-white/[0.08]';
  }
};

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

  // All off-stage competitions assigned to this judge
  const offStageComps = useMemo(() => {
    return assignments.filter((c) => {
      const typeStr = (c.competition_type || '').toUpperCase();
      return typeStr === 'OFF_STAGE' || typeStr === 'OFF-STAGE' || judge?.judge_type === 'OFF_STAGE';
    });
  }, [assignments, judge]);

  // Track competitions this judge has already submitted marks for (prevents re-selection race condition)
  const [completedCompIds, setCompletedCompIds] = useState<Set<number>>(new Set());

  // Desk state: search query and filter tabs
  const [deskSearch, setDeskSearch] = useState('');
  const [deskFilter, setDeskFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED'>('ALL');

  const isOffStageJudge = judge?.judge_type === 'OFF_STAGE' || (offStageComps.length > 0 && !activeLiveComp);

  // Unsubmitted / pending off-stage competitions
  const pendingComps = useMemo(() => {
    return offStageComps.filter(
      (c) =>
        !(
          (c.total_registered > 0 && c.total_submitted === c.total_registered) ||
          completedCompIds.has(c.competition_id)
        )
    );
  }, [offStageComps, completedCompIds]);

  // Submitted off-stage competitions
  const submittedComps = useMemo(() => {
    return offStageComps.filter(
      (c) =>
        (c.total_registered > 0 && c.total_submitted === c.total_registered) ||
        completedCompIds.has(c.competition_id)
    );
  }, [offStageComps, completedCompIds]);

  // Filtered off-stage competitions for the desk grid
  const filteredOffStageComps = useMemo(() => {
    let list = offStageComps;
    if (deskFilter === 'PENDING') {
      list = pendingComps;
    } else if (deskFilter === 'SUBMITTED') {
      list = submittedComps;
    }

    if (!deskSearch.trim()) return list;
    const q = deskSearch.toLowerCase().trim();
    return list.filter(
      (c) =>
        (c.competition_name || '').toLowerCase().includes(q) ||
        String(c.programme_number || '').toLowerCase().includes(q) ||
        (c.programme_group || '').toLowerCase().includes(q)
    );
  }, [offStageComps, deskFilter, pendingComps, submittedComps, deskSearch]);

  // Selected competition ID for scoring
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);

  // Live stage competition takes priority as soon as it goes live for stage judges
  useEffect(() => {
    if (activeLiveComp && judge?.judge_type !== 'OFF_STAGE') {
      if (selectedCompId !== activeLiveComp.competition_id) {
        setSelectedCompId(activeLiveComp.competition_id);
        setShowOverallReview(false);
      }
    }
  }, [activeLiveComp, judge?.judge_type, selectedCompId]);

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

  // Selected assignment from judge dashboard list (has programme_group, etc.)
  const currentAssignment = useMemo(() => {
    return assignments.find((a) => a.competition_id === selectedCompId);
  }, [assignments, selectedCompId]);

  // Robust group name fallback (e.g. General, J1, J2)
  const progGroupName = useMemo(() => {
    return (
      competition?.programme_group ||
      competition?.programme_group_name ||
      competition?.group_name ||
      competition?.category_name ||
      competition?.programme_group_code ||
      competition?.category ||
      currentAssignment?.programme_group ||
      currentAssignment?.category_name ||
      ''
    );
  }, [competition, currentAssignment]);

  // Unified formatted title: "General - Magazine"
  const progTitle = useMemo(() => {
    return formatProgTitle(
      competition?.name || currentAssignment?.competition_name,
      progGroupName
    );
  }, [competition, currentAssignment, progGroupName]);

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
          newMarks[p.participant_id] = Math.round(Number(p.total_marks));
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

  const compType = (
    competition?.competition_type ||
    competition?.competition_type_name ||
    activeLiveComp?.competition_type ||
    ''
  ).toUpperCase();
  const isStageComp = compType === 'STAGE';
  const isGroupComp = (competition?.participation_type || '').toUpperCase() === 'GROUP' || !!competition?.is_group || !!currentParticipant?.is_group;

  const isAllLocked = useMemo(() => {
    const allParticipantsLocked =
      participants.length > 0 &&
      participants.every((p) => p.status === 'SUBMITTED' || p.status === 'LOCKED');
    const isLocallyCompleted = selectedCompId !== null && completedCompIds.has(selectedCompId);
    const isAssignmentSubmitted =
      !!currentAssignment &&
      currentAssignment.total_registered > 0 &&
      currentAssignment.total_submitted === currentAssignment.total_registered;

    return allParticipantsLocked || isLocallyCompleted || isAssignmentSubmitted;
  }, [participants, selectedCompId, completedCompIds, currentAssignment]);

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
    <div className="w-full min-h-full flex flex-col justify-between space-y-4 text-slate-100">

      {/* =================================================================== */}
      {/* 1. DEFAULT IDLE / STANDBY SCREEN (Waiting for Admin to Go Live)       */}
      {/* =================================================================== */}
      {!selectedCompId ? (
        isOffStageJudge ? (
          /* =================================================================== */
          /* 1A. OFF-STAGE EVALUATION DESK                                       */
          /* =================================================================== */
          <div className="w-full flex-1 flex flex-col bg-[#0A0A0A] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
            {/* Desk Header */}
            <div className="p-5 sm:p-6 border-b border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 bg-[#121212]">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Off-Stage Evaluation Desk
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                  Select an assigned offline programme below to evaluate and submit scores.
                </p>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={deskSearch}
                    onChange={(e) => setDeskSearch(e.target.value)}
                    placeholder="Search programme..."
                    className="w-full sm:w-56 pl-9 pr-8 py-2 rounded-xl text-xs bg-[#0A0A0A] border border-white/[0.08] text-slate-100 placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400/60 transition-all"
                  />
                  {deskSearch && (
                    <button
                      onClick={() => setDeskSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Status Filter Tabs */}
                <div className="inline-flex items-center bg-[#0A0A0A] p-1 rounded-xl border border-white/[0.08]">
                  {(
                    [
                      { key: 'ALL', label: `All (${offStageComps.length})` },
                      { key: 'PENDING', label: `Pending (${pendingComps.length})` },
                      { key: 'SUBMITTED', label: `Submitted (${submittedComps.length})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setDeskFilter(tab.key)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        deskFilter === tab.key
                          ? THEME.classes.activeTab
                          : THEME.classes.inactiveTab
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Desk Cards Grid */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#0A0A0A]">
              {filteredOffStageComps.length === 0 ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-amber-500/30 rounded-2xl bg-[#0A0A0A]/80">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-300 border border-amber-400/20 flex items-center justify-center mb-3">
                    <Award className="w-6 h-6 text-amber-300" />
                  </div>
                  <h3 className="text-base font-black text-white">
                    {offStageComps.length === 0
                      ? 'No Off-Stage Programmes Assigned'
                      : 'No Programmes Match Your Search'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    {offStageComps.length === 0
                      ? 'Your judge account is ready. Once festival administrators assign off-stage items to your panel, they will appear here in real time.'
                      : `No programmes found matching "${deskSearch}". Try clearing your search keyword or switching filter tabs.`}
                  </p>
                  {deskSearch && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4 rounded-xl font-bold text-xs"
                      onClick={() => {
                        setDeskSearch('');
                        setDeskFilter('ALL');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredOffStageComps.map((comp) => {
                    const isSubmitted =
                      (comp.total_registered > 0 && comp.total_submitted === comp.total_registered) ||
                      completedCompIds.has(comp.competition_id);
                    const isPartiallyScored =
                      !isSubmitted && ((comp.total_evaluated || 0) > 0 || (comp.total_submitted || 0) > 0);
                    const progressPct =
                      comp.total_registered > 0
                        ? Math.round(((comp.total_submitted || 0) / comp.total_registered) * 100)
                        : 0;

                    return (
                      <div
                        key={comp.competition_id}
                        className="bg-[#0A0A0A] rounded-2xl border border-white/[0.08] p-5 shadow-lg hover:shadow-xl hover:border-amber-500/30 transition-all flex flex-col justify-between gap-4 group"
                      >
                        {/* Card Top */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-end gap-2">
                            {isSubmitted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                                <CheckCircle2 className="w-3 h-3 text-amber-300" />
                                <span>Submitted</span>
                              </span>
                            ) : isPartiallyScored ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>In Progress</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#121212] text-slate-400 border border-white/[0.08]">
                                <span>Ready</span>
                              </span>
                            )}
                          </div>

                          {/* Title - formatted as General - Magazine */}
                          <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors leading-snug line-clamp-2">
                            {formatProgTitle(comp.competition_name, comp.programme_group || comp.category_name)}
                          </h3>
                        </div>

                        {/* Card Bottom: Progress & CTA Button */}
                        <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-400">Evaluation Progress</span>
                              <span className="font-black text-white">
                                {comp.total_submitted || 0} / {comp.total_registered || 0}{' '}
                                <span className="font-normal text-slate-400">({progressPct}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#121212] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 h-full rounded-full transition-all duration-300 shadow-xs shadow-amber-400/20"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          {isSubmitted ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full font-bold text-xs rounded-xl"
                              onClick={() => {
                                setSelectedCompId(comp.competition_id);
                                setShowOverallReview(true);
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              <span>View Submitted Scores</span>
                            </Button>
                          ) : isPartiallyScored ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className={`w-full ${THEME.classes.primaryBtn} text-xs py-2.5 rounded-xl flex items-center justify-center`}
                              onClick={() => {
                                setSelectedCompId(comp.competition_id);
                                setActivePerformerIndex(0);
                                setShowOverallReview(false);
                              }}
                            >
                              <Play className="w-3.5 h-3.5 mr-1.5" />
                              <span>Continue Scoring</span>
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              className={`w-full ${THEME.classes.primaryBtn} text-xs py-2.5 rounded-xl flex items-center justify-center`}
                              onClick={() => {
                                setSelectedCompId(comp.competition_id);
                                setActivePerformerIndex(0);
                                setShowOverallReview(false);
                              }}
                            >
                              <Play className="w-3.5 h-3.5 mr-1.5" />
                              <span>Start Scoring ({comp.total_registered || 0})</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* 1B. LIVE STAGE STANDBY SCREEN (Waiting for stage coordinator)       */
          /* =================================================================== */
          <div className="w-full text-center my-auto flex flex-col items-center justify-center flex-1 py-8 space-y-5 relative">
            {/* Ambient Background Glow */}
            <div className="absolute w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none -translate-y-6" />

            {/* Official Esperanza Emblem Logo */}
            <div className="relative z-10 flex items-center justify-center">
              <img
                src="/assets/esperanza-logo.png"
                alt="Esperanza Emblem"
                className="h-20 sm:h-24 md:h-28 w-auto object-contain mx-auto drop-shadow-[0_0_30px_rgba(245,158,11,0.45)] transition-transform duration-500 hover:scale-105"
              />
            </div>

            {/* Official Esperanza Font Logo & Subtitle */}
            <div className="relative z-10 space-y-2">
              <img
                src="/assets/esperanza-font-logo.png"
                alt="ESPERANZA"
                className="h-8 sm:h-11 md:h-13 w-auto object-contain mx-auto drop-shadow-[0_4px_24px_rgba(245,158,11,0.5)] select-none"
              />
              <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide pt-1">
                Live Stage Evaluation Portal
              </p>
            </div>

            {/* Live Competition or Waiting Radar Section */}
            <div className="mt-4 pt-6 border-t border-white/[0.08] max-w-lg w-full mx-auto relative z-10">
              {activeLiveComp ? (
                /* LIVE PROGRAMME DETECTED ALERT */
                <div className="p-6 rounded-2xl bg-[#0A0A0A] text-white shadow-2xl space-y-4 text-left border border-amber-500/40 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-400" />
                  <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <span>● Live On Stage Now</span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-amber-300">
                      PROGRAMME {activeLiveComp.programme_number}
                    </span>
                    <h2 className="text-xl font-black text-white mt-0.5">
                      {activeLiveComp.competition_name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Present contestants ready with drawn lots
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className={`w-full ${THEME.classes.primaryBtn} text-sm py-3.5 rounded-xl shadow-lg flex items-center justify-center cursor-pointer`}
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
                  <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] text-amber-200 text-xs font-bold shadow-lg">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Waiting for stage coordinator to start next programme...</span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto font-medium leading-relaxed">
                    The stage coordinator is currently conducting backstage check-in. Once they start the event, this screen will instantly prompt you.
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      ) : isSheetLoading ? (
        <Card className="py-24 text-center space-y-3 border-amber-500/30 bg-[#0A0A0A] rounded-3xl shadow-xs">
          <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Loading present contestants...</p>
        </Card>
      ) : participants.length === 0 ? (
        <Card className="py-16 text-center space-y-4 border-amber-500/30 bg-[#0A0A0A] rounded-3xl shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Present Contestants Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
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
          <div className="bg-[#0A0A0A] border border-white/[0.08] p-3 sm:p-4 rounded-2xl shadow-xs space-y-2.5 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Back & Title */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <button
                  onClick={() => {
                    if (isAllLocked) {
                      setSelectedCompId(null);
                      setShowOverallReview(false);
                    } else {
                      setShowOverallReview(false);
                    }
                  }}
                  className="p-2 rounded-xl bg-[#121212] text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 border border-white/[0.08] shadow-2xs"
                  title={isAllLocked ? 'Return to Evaluation Desk' : 'Back to Scorecard'}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base md:text-xl font-black text-white truncate leading-tight" title={progTitle}>
                    {progTitle}
                  </h2>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                    Score Overview & Rank Calibration
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-t-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => saveBulkScoresMutation.mutate({ isDraft: true })}
                  isLoading={saveBulkScoresMutation.isPending}
                  disabled={isAllLocked}
                  className="bg-[#121212] hover:bg-white/10 text-amber-300 border border-amber-500/30 hover:border-amber-400 font-bold text-xs px-3.5 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save</span>
                </Button>
                {isAllLocked ? (
                  <span className="px-3.5 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-300" />
                    <span>Submitted</span>
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className={`${THEME.classes.primaryBtn} text-xs px-4 py-1.5 sm:py-2 rounded-xl flex items-center justify-center cursor-pointer`}
                    onClick={() => setIsBulkLockModalOpen(true)}
                    disabled={isAllLocked}
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    <span>Submit All</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile View: Dedicated Calibration Cards */}
          <div className="md:hidden space-y-3">
            {rankedParticipants.map((p, idx) => {
              const displayLetter = p.code_letter || String.fromCharCode(65 + idx);
              const mark = p.currentMark;

              let rankBadge = (
                <span className="font-bold text-xs text-slate-400 tabular-nums">
                  #{p.rank}
                </span>
              );
              if (mark > 0) {
                if (p.rank === 1) {
                  rankBadge = (
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-black">
                      <Medal className="w-4 h-4 text-amber-400" />
                      <span>1st</span>
                    </div>
                  );
                } else if (p.rank === 2) {
                  rankBadge = (
                    <div className="flex items-center gap-1 text-slate-300 text-xs font-black">
                      <Medal className="w-4 h-4 text-slate-300" />
                      <span>2nd</span>
                    </div>
                  );
                } else if (p.rank === 3) {
                  rankBadge = (
                    <div className="flex items-center gap-1 text-[#CD7F32] text-xs font-black">
                      <Medal className="w-4 h-4 text-[#CD7F32]" />
                      <span>3rd</span>
                    </div>
                  );
                }
              }

              return (
                <div
                  key={p.participant_id}
                  className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#121212] border border-amber-500/30 text-amber-300 font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                        {displayLetter}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {isGroupComp ? p.team_name : (p.participant_name || `Contestant ${p.participant_code}`)}
                        </span>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span>Code: <strong className="text-amber-300 font-semibold">{p.participant_code}</strong></span>
                          <span>•</span>
                          <span>Lot: <strong className="text-white">{displayLetter}</strong></span>
                          {p.team_name && !isGroupComp && (
                            <>
                              <span>•</span>
                              <span>{p.team_name}</span>
                            </>
                          )}
                        </div>
                        {isGroupComp && p.member_names && (
                          <p className="text-[10px] text-slate-400 line-clamp-1">{p.member_names}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rankBadge}
                      {mark > 0 ? (
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${getGradeBadgeStyle(mark)}`}>
                          Grade {getGrade(mark)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">NG</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-[#121212] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-xs font-bold text-slate-400">Total Score:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isAllLocked || mark <= 0}
                        onClick={() => handleMarkChange(p.participant_id, Math.max(0, mark - 1))}
                        className="w-8 h-8 rounded-lg bg-[#0A0A0A] border border-white/[0.08] text-amber-200 font-bold hover:bg-white/10 active:scale-95 disabled:opacity-40"
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        disabled={isAllLocked}
                        value={Math.round(mark)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          handleMarkChange(p.participant_id, val);
                        }}
                        className="w-16 px-2 py-1 bg-[#0A0A0A] border border-amber-500/30 rounded-lg text-lg font-black text-amber-300 text-center tabular-nums focus:outline-none focus:border-amber-400 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={isAllLocked || mark >= 100}
                        onClick={() => handleMarkChange(p.participant_id, Math.min(100, mark + 1))}
                        className="w-8 h-8 rounded-lg bg-[#0A0A0A] border border-white/[0.08] text-amber-200 font-bold hover:bg-white/10 active:scale-95 disabled:opacity-40"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Remarks / Observations..."
                    disabled={isAllLocked}
                    value={allRemarks[p.participant_id] || ''}
                    onChange={(e) => handleRemarksChange(p.participant_id, e.target.value)}
                    className="w-full px-3 py-2 bg-[#121212] border border-white/[0.06] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 disabled:opacity-50"
                  />
                </div>
              );
            })}
          </div>

          {/* Desktop Bento Review Table Card */}
          <Card className="hidden md:flex p-0 overflow-hidden border border-white/[0.08] bg-[#0A0A0A] shadow-xs rounded-2xl flex-col flex-1 min-h-0">
            <div className="overflow-auto max-h-[calc(100vh-14rem)] scrollbar-thin flex-1">
              <table className="w-full text-center border-collapse">
                <thead className="sticky top-0 z-10 bg-[#121212] border-b border-white/[0.08] shadow-2xs">
                  <tr className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4 text-center bg-[#121212]">Lot</th>
                    <th className="py-3.5 px-4 text-left bg-[#121212]">
                      {isGroupComp ? 'Team & Members' : 'Contestant & Code'}
                    </th>
                    <th className="py-3.5 px-4 text-center bg-[#121212]">Rank</th>
                    <th className="py-3.5 px-4 text-center w-36 bg-[#121212]">Mark</th>
                    <th className="py-3.5 px-4 text-center w-28 bg-[#121212]">Grade</th>
                    <th className="py-3.5 px-4 text-center bg-[#121212]">Remarks / Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-base">
                  {rankedParticipants.map((p, idx) => {
                    const displayLetter = p.code_letter || String.fromCharCode(65 + idx);
                    const mark = p.currentMark;

                    // Standard Rank icon (Standard Medal icons for 1st, 2nd, 3rd)
                    let rankBadge = (
                      <span className="font-bold text-sm text-slate-400 tabular-nums">
                        {p.rank}
                      </span>
                    );
                    if (mark > 0) {
                      if (p.rank === 1) {
                        rankBadge = (
                          <div className="flex items-center justify-center" title="1st Place">
                            <Medal className="w-5 h-5 text-amber-400" />
                          </div>
                        );
                      } else if (p.rank === 2) {
                        rankBadge = (
                          <div className="flex items-center justify-center" title="2nd Place">
                            <Medal className="w-5 h-5 text-slate-300" />
                          </div>
                        );
                      } else if (p.rank === 3) {
                        rankBadge = (
                          <div className="flex items-center justify-center" title="3rd Place">
                            <Medal className="w-5 h-5 text-[#CD7F32]" />
                          </div>
                        );
                      }
                    }

                    return (
                      <tr
                        key={p.participant_id}
                        className="hover:bg-[#121212]/50 transition-colors"
                      >
                        {/* Lot Code */}
                        <td className="py-4 px-4 text-center">
                          <span className="w-10 h-10 rounded-xl bg-[#121212] border border-amber-500/30 text-amber-300 font-black text-sm flex items-center justify-center mx-auto shadow-2xs">
                            {displayLetter}
                          </span>
                        </td>

                        {/* Contestant Name, Code Number & Team */}
                        <td className="py-4 px-4 text-left">
                          <div className="flex flex-col items-start justify-center">
                            <span className="font-bold text-sm sm:text-base text-white">
                              {isGroupComp ? p.team_name : (p.participant_name || `Contestant ${p.participant_code}`)}
                            </span>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span>Code: <strong className="text-amber-300 font-semibold">{p.participant_code}</strong></span>
                              <span>•</span>
                              <span>Lot: <strong className="text-white">{displayLetter}</strong></span>
                              {p.team_name && !isGroupComp && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400">{p.team_name}</span>
                                </>
                              )}
                            </div>
                            {isGroupComp && p.member_names && (
                              <div className="text-xs text-slate-400 mt-0.5 line-clamp-1" title={p.member_names}>
                                {p.member_names}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Rank */}
                        <td className="py-4 px-4 text-center">
                          {rankBadge}
                        </td>

                        {/* Score Input */}
                        <td className="py-4 px-3 text-center">
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              disabled={isAllLocked}
                              value={Math.round(mark)}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                handleMarkChange(p.participant_id, val);
                              }}
                              className="w-24 px-3 py-1.5 bg-[#0A0A0A] border border-white/[0.08] rounded-xl text-lg sm:text-xl font-black text-amber-300 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400/80 disabled:opacity-50 shadow-2xs"
                            />
                          </div>
                        </td>

                        {/* Dedicated Proper Grade near Score */}
                        <td className="py-4 px-3 text-center">
                          {mark > 0 ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black border ${getGradeBadgeStyle(mark)}`}>
                              Grade {getGrade(mark)}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500">NG</span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="py-4 px-4 text-center">
                          <input
                            type="text"
                            placeholder="Add brief observation..."
                            disabled={isAllLocked}
                            value={allRemarks[p.participant_id] || ''}
                            onChange={(e) => handleRemarksChange(p.participant_id, e.target.value)}
                            className="w-full max-w-md mx-auto px-3.5 py-2 bg-[#0A0A0A] border border-white/[0.08] rounded-xl text-sm text-slate-200 text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400/80 disabled:opacity-50"
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
        <div className="flex flex-col flex-1 justify-between gap-3 text-white min-h-0">
          {/* Top Programme Bar */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] p-3 sm:px-4 sm:py-2.5 rounded-2xl shadow-xs shrink-0">
            <div className="flex items-center justify-between gap-3">
              {/* Back & Programme Title */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <button
                  onClick={() => {
                    setSelectedCompId(null);
                    setShowOverallReview(false);
                  }}
                  className="p-2 rounded-xl bg-[#121212] text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 border border-white/[0.08] shadow-2xs"
                  title="Return to Desk"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base md:text-lg font-black text-white truncate leading-tight" title={progTitle}>
                    {progTitle}
                  </h2>
                </div>
              </div>

              {/* Desktop Action Buttons (Hidden on mobile, clean side-by-side on desktop) */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
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
                  className="bg-[#121212] hover:bg-white/10 text-amber-300 border border-amber-500/30 hover:border-amber-400 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Save Draft Score"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className={`${
                    isEveryPerformerMarked
                      ? THEME.classes.primaryBtn
                      : 'bg-[#121212] hover:bg-white/10 text-slate-200 border border-white/[0.12] hover:border-white/30'
                  } font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer`}
                  onClick={() => setShowOverallReview(true)}
                  title="Review All Participants & Marks"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Review Marks</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile View: Horizontal Stepper Strip */}
          <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
            {participants.map((p, idx) => {
              const isSelected = idx === activePerformerIndex;
              const pMark = getParticipantMark(p.participant_id);
              const isCompleted = pMark > 0;
              const displayLetter = p.code_letter || String.fromCharCode(65 + idx);

              return (
                <button
                  key={p.participant_id}
                  onClick={() => setActivePerformerIndex(idx)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black border-amber-400 shadow-xs'
                      : isCompleted
                      ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                      : 'bg-[#0A0A0A] text-slate-400 border-white/[0.08]'
                  }`}
                >
                  <span>Lot {displayLetter}</span>
                  <span className="text-[10px] opacity-75 font-mono">({p.participant_code})</span>
                  {isCompleted && (
                    <span className="font-mono text-[10px] font-black">
                      • {Math.round(pMark)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Scoring Grid */}
          {currentParticipant && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0 overflow-hidden">
              {/* Left Column (Desktop Only 4 Cols): Performer Queue */}
              <div className="hidden md:flex md:col-span-4 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 shadow-lg flex-col justify-between overflow-hidden space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Participants Queue ({participants.length})
                  </span>
                  <span className="text-[11px] font-bold text-amber-400">
                    {participants.filter((p) => getParticipantMark(p.participant_id) > 0).length} / {participants.length} Scored
                  </span>
                </div>

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
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-400/20 to-yellow-400/10 text-white border-amber-400/50 shadow-xs'
                            : isCompleted
                            ? 'bg-[#121212] text-amber-300 border-amber-500/20 hover:border-amber-400/40'
                            : 'bg-[#121212]/60 text-slate-400 border-white/[0.06] hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : isCompleted
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                : 'bg-[#0A0A0A] text-slate-400'
                            }`}
                          >
                            {displayLetter}
                          </span>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="text-xs font-bold text-white truncate">
                              {isGroupComp ? p.team_name : (p.participant_name || `Contestant ${p.participant_code}`)}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                              <span>Code: <strong className="text-amber-300 font-semibold">{p.participant_code}</strong></span>
                              {p.team_name && !isGroupComp && (
                                <>
                                  <span>•</span>
                                  <span>{p.team_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {isCompleted ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${getGradeBadgeStyle(pMark)}`}>
                              {getGrade(pMark)}
                            </span>
                            <span className="font-bold text-xs tabular-nums text-amber-300">{Math.round(pMark)}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 shrink-0">Pending</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Hero Evaluation Station */}
              <div className="col-span-1 md:col-span-8 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between overflow-y-auto space-y-4 scrollbar-thin">
                {/* Clean Performer Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-xs shrink-0">
                      {currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-400">
                          LOT {currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)} ({activePerformerIndex + 1}/{participants.length})
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                          CODE: <strong className="text-amber-300 font-bold">{currentParticipant.participant_code}</strong>
                        </span>
                        {currentParticipant.team_name && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            • {currentParticipant.team_name}
                          </span>
                        )}
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
                      <h3 className="text-base sm:text-lg md:text-xl font-black text-white truncate mt-0.5">
                        {isGroupComp ? currentParticipant.team_name : (currentParticipant.participant_name || `Contestant ${currentParticipant.participant_code}`)}
                      </h3>
                      {isGroupComp && currentParticipant.member_names && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {currentParticipant.member_names}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Single Authoritative Grade Badge in Header */}
                  <div className="shrink-0 flex items-center">
                    {(allMarks[currentParticipant.participant_id] ?? 0) > 0 ? (
                      <span className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-black border shadow-xs ${getGradeBadgeStyle(allMarks[currentParticipant.participant_id] ?? 0)}`}>
                        Grade {getGrade(allMarks[currentParticipant.participant_id] ?? 0)}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500 px-2.5 py-1 rounded-lg bg-[#121212] border border-white/[0.06]">
                        Not Graded
                      </span>
                    )}
                  </div>
                </div>

                {!startedPerformers[currentParticipant.participant_id] && !isAllLocked ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 p-6">
                    <div className="w-14 h-14 rounded-2xl bg-amber-400/10 text-amber-300 border border-amber-400/30 flex items-center justify-center">
                      <Play className="w-7 h-7 ml-0.5 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-lg sm:text-xl font-black text-white">
                        {isGroupComp ? currentParticipant.team_name : (currentParticipant.participant_name || `Contestant ${currentParticipant.participant_code}`)}
                      </h4>
                      <p className="text-xs text-amber-300/80 font-mono mt-1">
                        Lot: <strong className="text-white font-bold">{currentParticipant.code_letter || String.fromCharCode(65 + activePerformerIndex)}</strong> • Code: <strong className="text-white font-bold">{currentParticipant.participant_code}</strong> {currentParticipant.team_name ? `• ${currentParticipant.team_name}` : ''}
                      </p>
                      <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
                        {isStageComp ? 'Tap start when contestant begins their performance to activate score controls.' : 'Tap start to begin scoring this submission.'}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      className={`${THEME.classes.primaryBtn} px-6 py-2.5 text-sm shadow-md rounded-full flex items-center justify-center cursor-pointer`}
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
                      <span>{isStageComp ? 'Start Performance' : 'Start Scoring'}</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    {/* Hero Score Station: ONE authoritative score display */}
                    <div className="space-y-3 py-1">
                      {/* Tactile Stepper Dial */}
                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                        <button
                          type="button"
                          disabled={isAllLocked || (allMarks[currentParticipant.participant_id] ?? 0) <= 0}
                          onClick={() => {
                            const current = allMarks[currentParticipant.participant_id] ?? 0;
                            handleMarkChange(currentParticipant.participant_id, Math.max(0, current - 5));
                          }}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#121212] border border-white/[0.08] text-amber-200/80 font-bold hover:bg-white/10 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-30"
                          title="-5 Points"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          disabled={isAllLocked || (allMarks[currentParticipant.participant_id] ?? 0) <= 0}
                          onClick={() => {
                            const current = allMarks[currentParticipant.participant_id] ?? 0;
                            handleMarkChange(currentParticipant.participant_id, Math.max(0, current - 1));
                          }}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#121212] border border-white/[0.08] text-amber-200/80 font-bold hover:bg-white/10 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-30"
                          title="-1 Point"
                        >
                          -1
                        </button>

                        <div className="relative flex items-center justify-center px-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            disabled={isAllLocked}
                            value={Math.round(allMarks[currentParticipant.participant_id] ?? 0)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              handleMarkChange(currentParticipant.participant_id, val);
                            }}
                            className="w-28 sm:w-36 py-1.5 bg-[#121212] border-2 border-amber-500/40 focus:border-amber-400 rounded-2xl text-4xl sm:text-5xl font-black text-amber-300 text-center focus:outline-none focus:ring-4 focus:ring-amber-500/10 tabular-nums shadow-lg shadow-amber-500/5 transition-all"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isAllLocked || (allMarks[currentParticipant.participant_id] ?? 0) >= 100}
                          onClick={() => {
                            const current = allMarks[currentParticipant.participant_id] ?? 0;
                            handleMarkChange(currentParticipant.participant_id, Math.min(100, current + 1));
                          }}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#121212] border border-white/[0.08] text-amber-200/80 font-bold hover:bg-white/10 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-30"
                          title="+1 Point"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          disabled={isAllLocked || (allMarks[currentParticipant.participant_id] ?? 0) >= 100}
                          onClick={() => {
                            const current = allMarks[currentParticipant.participant_id] ?? 0;
                            handleMarkChange(currentParticipant.participant_id, Math.min(100, current + 5));
                          }}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#121212] border border-white/[0.08] text-amber-200/80 font-bold hover:bg-white/10 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-30"
                          title="+5 Points"
                        >
                          +5
                        </button>
                      </div>

                      {/* Smooth Range Slider */}
                      <div className="space-y-1 max-w-lg mx-auto w-full pt-1">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          disabled={isAllLocked}
                          value={Math.round(allMarks[currentParticipant.participant_id] ?? 0)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            handleMarkChange(currentParticipant.participant_id, val);
                          }}
                          className="w-full accent-amber-400 h-2 bg-[#121212] rounded-lg cursor-pointer disabled:opacity-40"
                        />
                        <div className="flex justify-between text-[10px] font-semibold text-slate-500 px-0.5">
                          <span>0</span>
                          <span>25</span>
                          <span>50</span>
                          <span>75</span>
                          <span>100</span>
                        </div>
                      </div>

                      {/* Quick Preset Pills */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                        {SCORE_PRESETS.map((preset) => {
                          const isPresetActive = allMarks[currentParticipant.participant_id] === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              disabled={isAllLocked}
                              onClick={() => handleMarkChange(currentParticipant.participant_id, preset)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                isPresetActive
                                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black border-amber-400 shadow-sm scale-105'
                                  : 'bg-[#121212] text-slate-300 border-white/[0.08] hover:bg-white/10 hover:border-white/20'
                              }`}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Observations / Remarks */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Observations / Remarks (Optional)
                      </label>
                      <input
                        type="text"
                        disabled={isAllLocked}
                        placeholder="Add qualitative feedback or observations..."
                        value={allRemarks[currentParticipant.participant_id] || ''}
                        onChange={(e) => handleRemarksChange(currentParticipant.participant_id, e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#121212] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400/80 disabled:opacity-60"
                      />
                    </div>

                    {/* Standard Action Navigation Footer */}
                    <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3 shrink-0 bg-[#0A0A0A] sticky bottom-0 z-10">
                      <div className="flex items-center gap-2">
                        {activePerformerIndex > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActivePerformerIndex(activePerformerIndex - 1)}
                            className="bg-[#121212] hover:bg-white/10 text-slate-200 border border-white/[0.12] text-xs py-2 px-3.5 font-bold rounded-xl flex items-center"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                            <span>Prev Lot</span>
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
                          className="bg-[#121212] hover:bg-white/10 text-amber-300 border border-amber-500/30 hover:border-amber-400 text-xs py-2 px-3.5 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5 text-amber-400" />
                          <span>Save Draft</span>
                        </Button>
                      </div>

                      <div>
                        {activePerformerIndex < participants.length - 1 ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className={`${THEME.classes.primaryBtn} text-xs shadow-md px-6 py-2.5 rounded-xl cursor-pointer flex items-center`}
                            onClick={handleCompleteAndNext}
                            isLoading={saveIndividualScoresMutation.isPending}
                            disabled={isAllLocked}
                          >
                            <span>
                              Next: Lot {participants[activePerformerIndex + 1]?.code_letter || String.fromCharCode(65 + activePerformerIndex + 1)} ({participants[activePerformerIndex + 1]?.participant_name || participants[activePerformerIndex + 1]?.participant_code || ''}) →
                            </span>
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            className={`${THEME.classes.primaryBtn} text-xs shadow-md px-6 py-2.5 rounded-xl cursor-pointer flex items-center`}
                            onClick={handleCompleteAndNext}
                            isLoading={saveIndividualScoresMutation.isPending}
                            disabled={isAllLocked}
                          >
                            <BarChart3 className="w-4 h-4 mr-1.5" />
                            <span>Review All Marks →</span>
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
          <div className="p-4 rounded-xl bg-[#121212] border border-white/[0.08] space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Programme:</span>
              <strong className="text-white">
                {competition?.programme_number ? `${competition.programme_number} - ` : ''}{competition?.name || 'Programme Evaluation'}
              </strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Present Contestants Evaluated:</span>
              <strong className="text-amber-300 font-bold">{participants.length} Lots</strong>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" onClick={() => setIsBulkLockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className={`${THEME.classes.primaryBtn} font-bold rounded-xl px-5 py-2 cursor-pointer flex items-center`}
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
