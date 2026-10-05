import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Award,
  Sparkles,
  UploadCloud,
  Trophy,
  RefreshCw,
  Search,
  Check,
  Eye,
  RotateCcw,
  Medal,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Gavel,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';

interface CompetitionItem {
  id: number;
  competition_code: string;
  programme_number: number;
  name: string;
  programme_group_name?: string;
  group_name?: string;
  competition_type_name?: string;
  competition_type?: string;
  participation_type?: 'INDIVIDUAL' | 'GROUP' | string;
  status: string;
  schedule_status?: string | null;
  registered_count?: number;
  results_count?: number;
  score_sheets_count?: number;
  draft_results_count?: number;
  verified_results_count?: number;
  published_results_count?: number;
  submitted_at?: string | null;
  updated_at?: string | null;
}

interface ResultItem {
  id: number;
  competition_id: number;
  participant_id: number;
  team_id: number;
  raw_marks?: number | null;
  grade?: 'A+' | 'A' | 'B' | 'C' | 'NG' | null;
  grade_marks?: number | null;
  position: number | null;
  position_points?: number | null;
  final_score: number;
  points_awarded?: number;
  status: 'DRAFT' | 'VERIFIED' | 'PUBLISHED' | 'REVOKED';
  participant_name: string;
  participant_code: string;
  team_name: string;
  team_code?: string;
  verified_by_name?: string;
  published_by_name?: string;
}

interface JudgeScoreItem {
  score_sheet_id: number;
  participant_id: number;
  judge_id: number;
  total_marks: number;
  scoresheet_status: string;
  remarks: string | null;
  submitted_at: string | null;
  participant_code: string;
  participant_name: string;
  team_name: string;
  team_color?: string;
  judge_code: string;
  judge_name: string;
}

export const ResultsVerificationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  // Navigation State: null = Programme List View; number = Selected Programme Results View
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);

  // Status Filter Chips: ALL | DRAFT | VERIFIED | PUBLISHED
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'VERIFIED' | 'PUBLISHED'>('ALL');

  // Search state for Programme List
  const [searchQuery, setSearchQuery] = useState('');

  // Audit modal state
  const [auditParticipantId, setAuditParticipantId] = useState<number | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // 1. Fetch competitions list
  const {
    data: competitions = [],
    isLoading: isCompetitionsLoading,
    refetch: refetchCompetitions,
  } = useQuery({
    queryKey: ['competitions-list'],
    queryFn: async () => {
      const res = await api.get<CompetitionItem[]>('/competitions');
      return res.data;
    },
  });

  // Base list: strictly ONLY finished programmes that have submitted judge marks or completed off-stage awaiting evaluation
  const eligibleCompetitions = useMemo(() => {
    return competitions.filter((c) => {
      const isCompleted = c.status === 'COMPLETED' || c.schedule_status === 'COMPLETED';
      const hasMarksOrResults = Number(c.score_sheets_count ?? 0) > 0 || Number(c.results_count ?? 0) > 0;
      const isOffStage = (c.competition_type_name || c.competition_type || '').toUpperCase() === 'OFF_STAGE';
      return isCompleted && (hasMarksOrResults || isOffStage);
    });
  }, [competitions]);

  // Live counts for status filter chips: All, Draft, Verified, Published
  const counts = useMemo(() => {
    let draft = 0;
    let verified = 0;
    let published = 0;

    for (const c of eligibleCompetitions) {
      const pubCount = Number(c.published_results_count ?? 0);
      const verCount = Number(c.verified_results_count ?? 0);
      const draftCount = Number(c.draft_results_count ?? 0);
      const resCount = Number(c.results_count ?? 0);
      const ssCount = Number(c.score_sheets_count ?? 0);

      if (pubCount > 0) {
        published++;
      } else if (verCount > 0) {
        verified++;
      } else if (draftCount > 0 || ssCount > 0 || resCount === 0) {
        draft++;
      }
    }

    return {
      all: eligibleCompetitions.length,
      draft,
      verified,
      published,
    };
  }, [eligibleCompetitions]);

  // Filter programmes according to statusFilter chip and searchQuery
  const filteredCompetitions = useMemo(() => {
    return eligibleCompetitions.filter((c) => {
      const pubCount = Number(c.published_results_count ?? 0);
      const verCount = Number(c.verified_results_count ?? 0);
      const draftCount = Number(c.draft_results_count ?? 0);
      const resCount = Number(c.results_count ?? 0);
      const ssCount = Number(c.score_sheets_count ?? 0);

      const isPublished = pubCount > 0;
      const isVerified = verCount > 0 && !isPublished;
      const isDraft = !isPublished && !isVerified && (draftCount > 0 || ssCount > 0 || resCount === 0);

      if (statusFilter === 'PUBLISHED' && !isPublished) return false;
      if (statusFilter === 'VERIFIED' && !isVerified) return false;
      if (statusFilter === 'DRAFT' && !isDraft) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesCode = c.competition_code.toLowerCase().includes(query);
        const matchesNum = c.programme_number.toString().includes(query);
        const matchesGroup = (c.group_name || c.programme_group_name || '').toLowerCase().includes(query);
        return matchesName || matchesCode || matchesNum || matchesGroup;
      }
      return true;
    });
  }, [eligibleCompetitions, statusFilter, searchQuery]);

  // Selected Competition Info
  const selectedComp = useMemo(() => {
    if (!selectedCompId) return null;
    return competitions.find((c) => c.id === selectedCompId) || null;
  }, [competitions, selectedCompId]);

  // 2. Fetch results for selected competition (Detail View)
  const {
    data: results = [],
    isLoading: isResultsLoading,
    refetch: refetchResults,
  } = useQuery({
    queryKey: ['competition-results', selectedCompId],
    queryFn: async () => {
      if (!selectedCompId) return [];
      const res = await api.get<ResultItem[]>(`/results/competition/${selectedCompId}`);
      return res.data;
    },
    enabled: !!selectedCompId,
  });

  // 3. Fetch judge marks breakdown for audit
  const {
    data: judgeScores = [],
    refetch: refetchJudgeScores,
  } = useQuery({
    queryKey: ['competition-judge-scores', selectedCompId],
    queryFn: async () => {
      if (!selectedCompId) return [];
      const res = await api.get<JudgeScoreItem[]>(`/results/competition/${selectedCompId}/judge-scores`);
      return res.data;
    },
    enabled: !!selectedCompId,
  });

  // Publication State
  const allPublished = results.length > 0 && results.every((r) => r.status === 'PUBLISHED');

  // 3. Send to judges for offline evaluation mutation
  const evaluateMutation = useMutation({
    mutationFn: async (compId: number) => {
      return api.post(`/results/competition/${compId}/evaluate`);
    },
    onSuccess: () => {
      success('Off-stage programme sent to judge panel for evaluation!');
      queryClient.invalidateQueries({ queryKey: ['competitions-list'] });
      queryClient.invalidateQueries({ queryKey: ['competition-judge-scores', selectedCompId] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to send to judges');
    },
  });

  // 4. Generate / Recalculate results mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompId) return;
      return api.post(`/results/generate/${selectedCompId}`, {
        calculation_method: 'AVERAGE',
      });
    },
    onSuccess: () => {
      success('Results calculated successfully');
      queryClient.invalidateQueries({ queryKey: ['competition-results', selectedCompId] });
      queryClient.invalidateQueries({ queryKey: ['competition-judge-scores', selectedCompId] });
      queryClient.invalidateQueries({ queryKey: ['competitions-list'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to generate results');
    },
  });

  // 5. 1-Click Master Publish All mutation
  const publishAllMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompId) return;
      return api.post(`/results/competition/${selectedCompId}/publish`);
    },
    onSuccess: () => {
      success('All results published! Points credited to team leaderboard.');
      queryClient.invalidateQueries({ queryKey: ['competition-results', selectedCompId] });
      queryClient.invalidateQueries({ queryKey: ['competitions-list'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['public-schedules-full'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to publish results');
    },
  });

  // 6. Master Unpublish mutation
  const unpublishAllMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompId) return;
      return api.post(`/results/competition/${selectedCompId}/unpublish`);
    },
    onSuccess: () => {
      success('Results unpublished and leaderboard points rolled back.');
      queryClient.invalidateQueries({ queryKey: ['competition-results', selectedCompId] });
      queryClient.invalidateQueries({ queryKey: ['competitions-list'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['public-schedules-full'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to unpublish results');
    },
  });

  const handleRefreshDetail = () => {
    refetchResults();
    refetchJudgeScores();
  };

  // Helper to format mark cleanly (e.g. 65.40 -> 65.4, 65.00 -> 65) without 'raw' suffix
  const formatMark = (num?: number | string | null) => {
    if (num === null || num === undefined || num === '') return '-';
    const val = Number(num);
    if (isNaN(val)) return '-';
    return parseFloat(val.toFixed(2)).toString();
  };

  // Helper to format relative time (e.g. Just now, 1 min ago, 2 min ago)
  const formatTimeAgo = (dateStr?: string | Date | null) => {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));

    if (isNaN(diffSecs) || diffSecs < 60) {
      return 'Just now';
    }
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) {
      return `${diffMins} min ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hr ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Top 3 Podium Winners
  const firstPlace = results.find((r) => r.position === 1);
  const secondPlace = results.find((r) => r.position === 2);
  const thirdPlace = results.find((r) => r.position === 3);

  // Filter judge scores for audit modal
  const auditedJudgeScores = useMemo(() => {
    if (!auditParticipantId) return judgeScores;
    return judgeScores.filter((js) => js.participant_id === auditParticipantId);
  }, [judgeScores, auditParticipantId]);

  // =========================================================================
  // VIEW 1: PROGRAMME LIST VIEW (First show list of completed programmes)
  // =========================================================================
  if (selectedCompId === null) {
    return (
      <div className="space-y-6">
        {/* Top Banner & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Award className="w-7 h-7 text-[#0D472D]" />
              <h1 className="text-3xl font-black text-slate-900">Results & Points Verification</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Select a completed programme below to review rankings, calculate final grades, and publish points to the live festival leaderboard.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetchCompetitions()}
              title="Refresh list"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 hover:border-slate-800 shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Filter Chips & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-xs">
          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                statusFilter === 'ALL'
                  ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>All</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                statusFilter === 'DRAFT'
                  ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                  : 'bg-white text-amber-800 border-slate-200 hover:bg-amber-50/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Draft</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusFilter === 'DRAFT' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {counts.draft}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('VERIFIED')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                statusFilter === 'VERIFIED'
                  ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                  : 'bg-white text-blue-800 border-slate-200 hover:bg-blue-50/50'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-blue-600" />
              <span>Verified</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusFilter === 'VERIFIED' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                {counts.verified}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('PUBLISHED')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                statusFilter === 'PUBLISHED'
                  ? 'bg-[#0D472D] text-white border-[#0D472D] shadow-xs'
                  : 'bg-white text-emerald-800 border-slate-200 hover:bg-emerald-50/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Published</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusFilter === 'PUBLISHED' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {counts.published}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search programme, code, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#0D472D] focus:ring-1 focus:ring-[#0D472D] shadow-2xs"
            />
          </div>
        </div>

        {/* Programmes List (2 in a Row Grid) */}
        {isCompetitionsLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs font-medium">
            Loading completed festival programmes...
          </div>
        ) : filteredCompetitions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">No finished programmes with submitted marks found.</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Programmes will appear here once the judge submits score sheets from their tablet and the event is finished on stage.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCompetitions.map((comp) => {
              const hasPublished = Number(comp.published_results_count ?? 0) > 0;
              const hasVerified = Number(comp.verified_results_count ?? 0) > 0 && !hasPublished;
              const isAwaitingEval = Number(comp.score_sheets_count ?? 0) === 0 && Number(comp.results_count ?? 0) === 0;

              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompId(comp.id)}
                  className="bg-white border border-slate-200 hover:border-slate-800 rounded-2xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2">
                    {/* Header: Participation Type, Item Category & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            comp.participation_type === 'GROUP'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {comp.participation_type === 'GROUP' ? 'Group' : 'Individual'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {comp.competition_type_name || comp.competition_type || 'General Item'}
                        </span>
                      </div>

                      {hasPublished ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Published</span>
                        </span>
                      ) : hasVerified ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-blue-600" />
                          <span>Verified</span>
                        </span>
                      ) : isAwaitingEval ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Ready for Evaluation</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Draft</span>
                        </span>
                      )}
                    </div>

                    {/* Programme Name */}
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-[#0D472D] transition-colors leading-snug">
                      {comp.group_name || comp.programme_group_name ? `${comp.group_name || comp.programme_group_name} - ` : ''}{comp.name}
                    </h4>
                  </div>

                  {/* Footer: Submitted Time (left) & Action (right) */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatTimeAgo(comp.submitted_at || comp.updated_at)}</span>
                    </div>

                    {isAwaitingEval ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          evaluateMutation.mutate(comp.id);
                          setSelectedCompId(comp.id);
                        }}
                        disabled={evaluateMutation.isPending}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white border border-[#0D472D] text-xs font-semibold shadow-2xs transition-all cursor-pointer hover:scale-[1.02]"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>Evaluate (Send to Judges)</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-50 group-hover:bg-[#0D472D] text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-[#0D472D] text-xs font-semibold shadow-2xs transition-all">
                        <span>View Results</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: PROGRAMME RESULTS DETAIL VIEW (When pressed on a programme)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Back button & Action Header (Unboxed, clean layout) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
        {/* Back Button & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedCompId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {selectedComp && (
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {selectedComp.group_name || selectedComp.programme_group_name ? `${selectedComp.group_name || selectedComp.programme_group_name} - ` : ''}{selectedComp.name}
              </h2>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    selectedComp.participation_type === 'GROUP'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {selectedComp.participation_type === 'GROUP' ? 'Group' : 'Individual'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-500">
                  {selectedComp.competition_type_name || selectedComp.competition_type || 'General'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Master Actions (Unified Single Publish / Unpublish Toggle) */}
        <div className="flex items-center gap-2 shrink-0">
          {results.length === 0 ? (
            <button
              disabled={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Calculate Results</span>
            </button>
          ) : (
            <button
              disabled={publishAllMutation.isPending || unpublishAllMutation.isPending}
              onClick={() => {
                if (allPublished) {
                  unpublishAllMutation.mutate();
                } else {
                  publishAllMutation.mutate();
                }
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                allPublished
                  ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 border border-emerald-300 hover:border-rose-300 group'
                  : 'bg-[#0D472D] hover:bg-[#07321e] text-white'
              }`}
              title={allPublished ? 'Click to unpublish results and rollback points' : 'Publish results to live leaderboard'}
            >
              {allPublished ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 group-hover:hidden" />
                  <RotateCcw className="w-4 h-4 text-rose-600 hidden group-hover:block" />
                  <span className="group-hover:hidden">Published</span>
                  <span className="hidden group-hover:inline">Unpublish Results</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Publish Results</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* WINNERS PODIUM (2nd Left | 1st Center Prominent | 3rd Right) */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch pt-2">
          {/* 2nd Place Card (Left) */}
          <div className="order-2 md:order-1 bg-gradient-to-b from-slate-100/70 via-slate-50/30 to-white border border-slate-300 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-200/80 text-slate-700 border border-slate-300 flex items-center justify-center shadow-2xs shrink-0">
                  <Medal className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Position</span>
                  <span className="text-sm font-black text-slate-900">2nd Place</span>
                </div>
              </div>
              <Badge variant="neutral" size="sm" className="bg-slate-200/80 text-slate-800 border-slate-300 font-black">
                Silver
              </Badge>
            </div>

            {secondPlace ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-black text-slate-900 truncate" title={secondPlace.participant_name}>
                    {secondPlace.participant_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono text-[11px] text-[#0D472D] font-bold bg-[#E6F4EA] px-2 py-0.5 rounded-md border border-emerald-200/80">
                      {secondPlace.participant_code}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">{secondPlace.team_name}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    Grade {secondPlace.grade || 'A'} ({formatMark(secondPlace.raw_marks)})
                  </span>
                  <span className="font-mono font-black text-[#0D472D] text-lg">
                    +{secondPlace.final_score} <span className="text-xs font-bold text-slate-500">pts</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 font-medium italic">
                No 2nd place awarded
              </div>
            )}
          </div>

          {/* 1st Place Card (Center - Prominent & Bigger) */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-100/90 via-amber-50/40 to-white border-2 border-amber-400 rounded-3xl p-6 shadow-lg shadow-amber-500/10 flex flex-col justify-between gap-5 relative overflow-hidden transform md:-translate-y-2">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 block">Champion</span>
                  <span className="text-base font-black text-amber-950">1st Place</span>
                </div>
              </div>
              <Badge variant="warning" size="sm" className="bg-amber-500 text-white border-amber-600 font-black px-3 py-1 text-xs shadow-2xs">
                Gold Winner
              </Badge>
            </div>

            {firstPlace ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xl font-black text-slate-900 truncate" title={firstPlace.participant_name}>
                    {firstPlace.participant_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono text-xs text-[#0D472D] font-black bg-[#E6F4EA] px-2.5 py-1 rounded-lg border border-emerald-300">
                      {firstPlace.participant_code}
                    </span>
                    <span className="text-xs text-slate-700 font-bold bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-200">
                      {firstPlace.team_name}
                    </span>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-amber-200/60 flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-300">
                    Grade {firstPlace.grade || 'A'} ({formatMark(firstPlace.raw_marks)})
                  </span>
                  <span className="font-mono font-black text-[#0D472D] text-2xl">
                    +{firstPlace.final_score} <span className="text-xs font-bold text-slate-500">pts</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-medium italic">
                No 1st place awarded
              </div>
            )}
          </div>

          {/* 3rd Place Card (Right) */}
          <div className="order-3 md:order-3 bg-gradient-to-b from-amber-900/5 via-amber-50/10 to-white border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shadow-2xs shrink-0">
                  <Medal className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800/80 block">Position</span>
                  <span className="text-sm font-black text-amber-950">3rd Place</span>
                </div>
              </div>
              <Badge variant="warning" size="sm" className="bg-amber-50 text-amber-900 border-amber-300 font-black">
                Bronze
              </Badge>
            </div>

            {thirdPlace ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-black text-slate-900 truncate" title={thirdPlace.participant_name}>
                    {thirdPlace.participant_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono text-[11px] text-[#0D472D] font-bold bg-[#E6F4EA] px-2 py-0.5 rounded-md border border-emerald-200/80">
                      {thirdPlace.participant_code}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">{thirdPlace.team_name}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    Grade {thirdPlace.grade || 'B'} ({formatMark(thirdPlace.raw_marks)})
                  </span>
                  <span className="font-mono font-black text-[#0D472D] text-lg">
                    +{thirdPlace.final_score} <span className="text-xs font-bold text-slate-500">pts</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 font-medium italic">
                No 3rd place awarded
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLEAN 5-COLUMN SCOREBOARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0D472D]" />
              <span>Official Scoreboard</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {results.length > 0
                ? `${results.length} contestants evaluated. Turnout: N = ${results.length}.`
                : 'Awaiting judge score sheets'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAuditParticipantId(null);
                setIsAuditModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#0D472D]" />
              <span>Audit Judge Sheets ({judgeScores.length})</span>
            </button>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-4 font-medium">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
              <Trophy className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-sm">No results calculated yet for this competition.</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {judgeScores.length > 0
                  ? `✓ ${judgeScores.length} score sheet(s) submitted by judges are ready.`
                  : 'Judges submit marks from their scoring tablets during the event.'}
              </p>
            </div>
            {judgeScores.length > 0 ? (
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs shadow-xs mx-auto cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Calculate Results Now</span>
              </button>
            ) : selectedComp && (
              <button
                onClick={() => evaluateMutation.mutate(selectedComp.id)}
                disabled={evaluateMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0D472D] hover:bg-[#07321e] text-white font-bold text-xs shadow-xs mx-auto cursor-pointer hover:scale-[1.02]"
              >
                <Gavel className="w-4 h-4" />
                <span>{evaluateMutation.isPending ? 'Sending...' : 'Send to Judges for Evaluation'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 w-24">Rank</th>
                  <th className="py-3 px-4">Contestant & Team</th>
                  <th className="py-3 px-4 text-center w-28">Grade</th>
                  <th className="py-3 px-4 text-center w-40 font-bold text-[#0D472D]">Total Fest Points</th>
                  <th className="py-3 px-4 text-right w-24">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((res) => {
                  const isFirst = res.position === 1;
                  const isSecond = res.position === 2;
                  const isThird = res.position === 3;

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Rank */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {res.position ? (
                          <div className="flex items-center gap-1.5">
                            {isFirst ? (
                              <Trophy className="w-4 h-4 text-amber-500" />
                            ) : isSecond ? (
                              <Medal className="w-4 h-4 text-slate-400" />
                            ) : isThird ? (
                              <Medal className="w-4 h-4 text-amber-700" />
                            ) : null}
                            <span
                              className={
                                isFirst
                                  ? 'text-amber-700 font-black text-base'
                                  : isSecond
                                  ? 'text-slate-700 font-bold'
                                  : isThird
                                  ? 'text-amber-800 font-bold'
                                  : 'text-slate-600 font-semibold'
                              }
                            >
                              {res.position}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal pl-2">—</span>
                        )}
                      </td>

                      {/* 2. Contestant & Team */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{res.participant_name}</span>
                          <span className="font-mono text-xs text-[#0D472D] font-bold bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-emerald-200/60">
                            {res.participant_code}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                          {res.team_name}
                        </span>
                      </td>

                      {/* 3. Grade & Quality */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              res.grade === 'A+'
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : res.grade === 'A'
                                ? 'bg-[#E6F4EA] text-[#0D472D] border-emerald-300'
                                : res.grade === 'B'
                                ? 'bg-blue-50 text-blue-900 border-blue-200'
                                : res.grade === 'C'
                                ? 'bg-orange-50 text-orange-900 border-orange-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {res.grade || 'NG'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {formatMark(res.raw_marks)}
                          </span>
                        </div>
                      </td>

                      {/* 4. Total Fest Points (with transparent breakdown) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-black text-[#0D472D] text-base block">
                          {Number(res.final_score).toFixed(0)} pts
                        </span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {res.grade_marks ?? 0} grade + {res.position_points ?? 0} rank
                        </span>
                      </td>

                      {/* 5. Audit Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setAuditParticipantId(res.participant_id);
                            setIsAuditModalOpen(true);
                          }}
                          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                          title="View judge scoresheet"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: JUDGE SCORESHEET AUDIT */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Judge Score Sheet Audit"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <p className="text-xs text-slate-500">
            Raw marks and remarks submitted by judges for this programme.
          </p>

          {auditedJudgeScores.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              No individual score sheets found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {auditedJudgeScores.map((js) => (
                <div
                  key={js.score_sheet_id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{js.participant_name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-[#0D472D] font-bold bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-emerald-200">
                          {js.participant_code}
                        </span>
                        <span className="text-slate-500 font-semibold">{js.team_name}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-[#0D472D] text-base block">
                        {formatMark(js.total_marks)} pts
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {js.scoresheet_status}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[11px]">
                    <span>
                      Judge: <strong className="text-slate-800">{js.judge_name}</strong> ({js.judge_code})
                    </span>
                    <span>
                      {js.submitted_at ? new Date(js.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  {js.remarks && (
                    <div className="bg-white p-2.5 rounded-xl text-slate-700 italic text-[11px] border border-slate-200">
                      &quot;{js.remarks}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex justify-end">
            <button
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => setIsAuditModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
