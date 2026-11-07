import React, { useState, useMemo, useEffect } from 'react';
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
  Edit3,
  Save,
  Lock,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { THEME } from '../../theme/theme.js';

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
  is_group?: boolean;
  member_count?: number;
  member_names?: string;
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

  // Admin Score Calibration modal state
  const [isEditScoresModalOpen, setIsEditScoresModalOpen] = useState(false);
  const [editedScores, setEditedScores] = useState<Record<number, { marks: number; remarks: string }>>({});

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
      const isCompleted =
        c.status === 'COMPLETED' ||
        c.schedule_status === 'COMPLETED' ||
        c.status === 'LOCKED' ||
        c.status === 'SUBMITTED' ||
        c.status === 'PUBLISHED';
      const hasMarksOrResults = Number(c.score_sheets_count ?? 0) > 0 || Number(c.results_count ?? 0) > 0;
      const isOffStage = (c.competition_type_name || c.competition_type || '').toUpperCase() === 'OFF_STAGE';
      return (isCompleted && (hasMarksOrResults || isOffStage)) || hasMarksOrResults;
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
      const ssCount = Number(c.score_sheets_count ?? 0);

      const isPublished = pubCount > 0 || c.status === 'PUBLISHED';
      const isVerified = !isPublished && (verCount > 0 || ssCount > 0);

      if (isPublished) {
        published++;
      } else if (isVerified) {
        verified++;
      } else {
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

  // Filter programmes according to statusFilter chip and searchQuery, sorted by submitted order (oldest first, newest last)
  const filteredCompetitions = useMemo(() => {
    const list = eligibleCompetitions.filter((c) => {
      const pubCount = Number(c.published_results_count ?? 0);
      const verCount = Number(c.verified_results_count ?? 0);
      const ssCount = Number(c.score_sheets_count ?? 0);

      const isPublished = pubCount > 0 || c.status === 'PUBLISHED';
      const isVerified = !isPublished && (verCount > 0 || ssCount > 0);
      const isDraft = !isPublished && !isVerified;

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

    // Sort by submitted timestamp: Oldest is first (ASC), Newest is last
    return [...list].sort((a, b) => {
      const timeA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const timeB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;

      if (timeA > 0 && timeB > 0 && timeA !== timeB) {
        return timeA - timeB; // Ascending: earliest submitted at top
      }
      if (timeA > 0 && (!timeB || timeB === 0)) return -1;
      if (timeB > 0 && (!timeA || timeA === 0)) return 1;

      return a.programme_number - b.programme_number;
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

  // Auto-calculate results if judge scores exist but results are not yet compiled
  useEffect(() => {
    if (
      selectedCompId &&
      !isResultsLoading &&
      results.length === 0 &&
      judgeScores.length > 0 &&
      !generateMutation.isPending
    ) {
      generateMutation.mutate();
    }
  }, [selectedCompId, isResultsLoading, results.length, judgeScores.length, generateMutation.isPending]);

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

  // 7. Admin Score update mutation (overrides locked judge scores & recalculates)
  const adminUpdateScoresMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompId) return;
      const updates = Object.entries(editedScores).map(([sheetId, data]) => ({
        score_sheet_id: Number(sheetId),
        total_marks: data.marks,
        remarks: data.remarks,
      }));
      return api.put(`/results/competition/${selectedCompId}/scores`, { updates });
    },
    onSuccess: () => {
      success('Scores updated and results recalculated successfully!');
      setIsEditScoresModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['competition-results', selectedCompId] });
      queryClient.invalidateQueries({ queryKey: ['competition-judge-scores', selectedCompId] });
      queryClient.invalidateQueries({ queryKey: ['competitions-list'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update scores');
    },
  });

  const getGradeBadgeClass = (grade?: string | null) => {
    switch (grade) {
      case 'A+':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'A':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'B':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'C':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-[#121212] text-amber-200/60 border-amber-500/30';
    }
  };

  const getGradeFromMark = (mark: number) => {
    if (!mark || mark <= 0) return { grade: '—', color: 'bg-[#121212] text-amber-200/60 border-amber-500/30' };
    if (mark >= 90) return { grade: 'A+', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-black' };
    if (mark >= 70) return { grade: 'A', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold' };
    if (mark >= 60) return { grade: 'B', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-bold' };
    if (mark >= 50) return { grade: 'C', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold' };
    return { grade: 'NG', color: 'bg-[#121212] text-amber-200/60 border-amber-500/30 font-bold' };
  };

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

  // Helper to get house team styling accent (Rivaya burgundy, Diraya emerald)
  const getHouseTeamClass = (teamName?: string) => {
    const upper = (teamName || '').toUpperCase();
    if (upper.includes('RIVAYA')) return 'text-rose-300 font-bold';
    if (upper.includes('DIRAYA')) return 'text-emerald-300 font-bold';
    return 'text-amber-200/60 font-bold';
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

  // Check if current programme is a group competition
  const isGroup = useMemo(() => {
    return (selectedComp?.participation_type || '').toUpperCase() === 'GROUP' || results.some((r) => r.is_group);
  }, [selectedComp, results]);

  // Top 3 Podium Winners (supports multiple joint winners per rank)
  const firstPlaces = useMemo(() => results.filter((r) => r.position === 1), [results]);
  const secondPlaces = useMemo(() => results.filter((r) => r.position === 2), [results]);
  const thirdPlaces = useMemo(() => results.filter((r) => r.position === 3), [results]);

  const firstPlace = firstPlaces[0];
  const secondPlace = secondPlaces[0];
  const thirdPlace = thirdPlaces[0];

  // =========================================================================
  // VIEW 1: PROGRAMME LIST VIEW (First show list of completed programmes)
  // =========================================================================
  if (selectedCompId === null) {
    return (
      <div className="space-y-6">
        {/* Top Banner & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none">
                Results
              </h1>
              <p className="text-xs text-amber-200/60 font-medium mt-1">
                Score audit & points publish
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetchCompetitions()}
              title="Refresh list"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0A0A0A] hover:bg-[#121212] text-amber-100 text-xs font-semibold border border-white/[0.08] hover:border-amber-400 shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Filter Chips & Search Bar: Single Tone & Size */}
        <div className="bg-[#0A0A0A] rounded-2xl p-3.5 border border-white/[0.08] flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            {[
              { id: 'ALL', label: 'All', count: counts.all, icon: Sparkles },
              { id: 'DRAFT', label: 'Draft', count: counts.draft, icon: Clock },
              { id: 'VERIFIED', label: 'Verified', count: counts.verified, icon: Check },
              { id: 'PUBLISHED', label: 'Published', count: counts.published, icon: CheckCircle2 },
            ].map((pill) => {
              const Icon = pill.icon;
              const isActive = statusFilter === pill.id;

              return (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-xs font-bold'
                      : 'bg-[#121212] hover:bg-white/[0.04] text-amber-200/60 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{pill.label}</span>
                  <span className={`text-[10px] font-mono ${isActive ? 'text-slate-950 font-bold' : 'text-amber-200/50'}`}>
                    ({pill.count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Search Box + Quick Reset */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-200/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search programme, code..."
                className="w-full pl-8 pr-7 py-1.5 bg-[#121212] border border-white/[0.08] rounded-full text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-200/60 hover:text-white text-xs font-bold cursor-pointer"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {(statusFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/15 border border-rose-500/30 rounded-full transition-colors cursor-pointer shrink-0"
                title="Reset filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Programmes List (2 in a Row Grid) */}
        {isCompetitionsLoading ? (
          <div className="py-20 text-center text-amber-200/60 text-xs font-medium">
            Loading completed festival programmes...
          </div>
        ) : filteredCompetitions.length === 0 ? (
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#121212] border border-white/[0.08] flex items-center justify-center text-amber-200/60">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="font-bold text-amber-100 text-sm">No Completed Programmes</p>
            <p className="text-xs text-amber-200/60 max-w-sm mx-auto">
              Submitted judge sheets will appear here for verification.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCompetitions.map((comp) => {
              const hasPublished = Number(comp.published_results_count ?? 0) > 0 || comp.status === 'PUBLISHED';
              const hasVerified =
                !hasPublished &&
                (Number(comp.verified_results_count ?? 0) > 0 || Number(comp.score_sheets_count ?? 0) > 0);
              const isAwaitingEval = !hasPublished && !hasVerified;

              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompId(comp.id)}
                  className="bg-[#0A0A0A] border border-white/[0.08] hover:border-amber-500/30 rounded-2xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2">
                    {/* Header: Participation Type, Item Category & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            comp.participation_type === 'GROUP'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-[#121212] text-amber-200 border-white/[0.08]'
                          }`}
                        >
                          {comp.participation_type === 'GROUP' ? 'Group' : 'Individual'}
                        </span>
                        <span className="text-xs text-amber-200/60 font-medium">
                          {comp.competition_type_name || comp.competition_type || 'General Item'}
                        </span>
                      </div>

                      {hasPublished ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Published</span>
                        </span>
                      ) : hasVerified ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3 text-sky-400" />
                          <span>Ready for Verification</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Awaiting Evaluation</span>
                        </span>
                      )}
                    </div>

                    {/* Programme Name */}
                    <h4 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                      {comp.group_name || comp.programme_group_name ? `${comp.group_name || comp.programme_group_name} - ` : ''}{comp.name}
                    </h4>
                  </div>

                  {/* Footer: Submitted Time (left) & Action (right) */}
                  <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-amber-200/60 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-200/60" />
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
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${THEME.classes.primaryBtn} text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.02]`}
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        <span>Evaluate (Send to Judges)</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#121212] group-hover:bg-gradient-to-r group-hover:from-amber-400 group-hover:to-yellow-400 text-amber-200 group-hover:text-slate-950 border border-white/[0.08] group-hover:border-amber-400 text-xs font-semibold shadow-2xs transition-all">
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
            className="p-2 rounded-xl bg-[#121212] text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 flex items-center justify-center shadow-2xs"
            title="Back to Programmes"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {selectedComp && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight break-words truncate">
                {selectedComp.group_name || selectedComp.programme_group_name ? `${selectedComp.group_name || selectedComp.programme_group_name} - ` : ''}{selectedComp.name}
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    selectedComp.participation_type === 'GROUP'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-[#121212] text-amber-200 border-white/[0.08]'
                  }`}
                >
                  {selectedComp.participation_type === 'GROUP' ? 'Group' : 'Individual'}
                </span>
                <span className="text-xs text-amber-200/60">•</span>
                <span className="text-xs font-medium text-amber-200/60">
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
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full ${THEME.classes.primaryBtn} font-black text-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50`}
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
                  ? 'bg-emerald-500/15 hover:bg-rose-500/15 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/30 group'
                  : `${THEME.classes.primaryBtn} font-black`
              }`}
              title={allPublished ? 'Click to unpublish results and rollback points' : 'Publish results to live leaderboard'}
            >
              {allPublished ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 group-hover:hidden" />
                  <RotateCcw className="w-4 h-4 text-rose-300 hidden group-hover:block" />
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

      {/* FREE-STANDING STEPPED PODIUM (LIVE BROADCAST GRAPHICS) */}
      {results.length > 0 && (firstPlaces.length > 0 || secondPlaces.length > 0 || thirdPlaces.length > 0) && (
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 items-end max-w-4xl mx-auto">
            
            {/* 🥈 2ND PLACE COLUMN (Left) */}
            <div className="order-2 sm:order-1 flex flex-col items-center w-full">
              {/* Standard Position Box on Top */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#121212] text-slate-200 font-sans font-bold text-xs shadow-2xs border border-white/[0.08] -mb-3 z-20">
                <Medal className="w-3.5 h-3.5 text-amber-200/60" />
                <span>{secondPlaces.length > 1 ? 'Joint 2nd Place' : '2nd Place'}</span>
              </div>

              {/* Main Pillar Body */}
              <div className="w-full bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-5 pt-6 sm:pt-7 shadow-xs flex flex-col items-center text-center space-y-3.5">
                {secondPlaces.length > 0 ? (
                  <div className="w-full space-y-3.5">
                    {secondPlaces.map((sp, idx) => (
                      <div key={sp.id || idx} className={`${idx > 0 ? 'pt-3.5 border-t border-white/[0.08]' : ''} space-y-3`}>
                        {/* Title & Subtitle */}
                        <div className="space-y-1 w-full min-h-[50px] flex flex-col justify-center">
                          <h4
                            className="text-base sm:text-lg font-black text-white truncate px-1"
                            title={sp.is_group ? sp.team_name : sp.participant_name}
                          >
                            {sp.is_group ? sp.team_name : sp.participant_name}
                          </h4>
                          {sp.is_group ? (
                            <p
                              className="text-xs text-amber-200/60 font-medium line-clamp-2 px-1 leading-snug"
                              title={sp.member_names || ''}
                            >
                              {sp.member_names || (sp.member_count ? `${sp.member_count} Members` : '—')}
                            </p>
                          ) : (
                            <p className={`text-xs ${getHouseTeamClass(sp.team_name)}`}>
                              {sp.team_name}
                            </p>
                          )}
                        </div>

                        {/* Dedicated Highlighted Metrics Row */}
                        <div className="w-full grid grid-cols-2 gap-2 text-center bg-[#0A0A0A] p-2.5 rounded-xl border border-white/[0.08] shadow-2xs">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-200/60 block">
                              Grade
                            </span>
                            <span
                              className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${getGradeBadgeClass(
                                sp.grade
                              )}`}
                            >
                              {sp.grade || 'NG'}
                            </span>
                          </div>
                          <div className="border-l border-amber-500/30 pl-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-200/60 block">
                              Points
                            </span>
                            <span className="font-mono font-black text-white text-base block leading-tight mt-0.5">
                              {Number(sp.final_score).toFixed(0)}{' '}
                              <span className="text-[10px] text-amber-200/60 font-bold">pts</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-amber-200/60 font-medium italic">
                    No 2nd place awarded
                  </div>
                )}
              </div>
            </div>

            {/* 🥇 1ST PLACE COLUMN (Center - Elevated Champion) */}
            <div className="order-1 sm:order-2 flex flex-col items-center w-full z-10 sm:-translate-y-3">
              {/* Standard Position Box on Top */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-sans font-bold text-xs shadow-xs border border-white/[0.08] -mb-3 z-20">
                <Trophy className="w-3.5 h-3.5 text-slate-950" />
                <span>{firstPlaces.length > 1 ? 'Joint 1st Place' : '1st Place'}</span>
              </div>

              {/* Main Pillar Body */}
              <div className="w-full bg-[#121212] border-2 border-amber-400 shadow-lg shadow-amber-500/10 rounded-2xl p-5 sm:p-6 pt-7 sm:pt-8 flex flex-col items-center text-center space-y-4">
                {firstPlaces.length > 0 ? (
                  <div className="w-full space-y-4">
                    {firstPlaces.map((fp, idx) => (
                      <div key={fp.id || idx} className={`${idx > 0 ? 'pt-3.5 border-t border-amber-400/20' : ''} space-y-3`}>
                        {/* Title & Subtitle */}
                        <div className="space-y-1 w-full min-h-[50px] flex flex-col justify-center">
                          <h4
                            className="text-lg sm:text-xl font-black text-white truncate px-1"
                            title={fp.is_group ? fp.team_name : fp.participant_name}
                          >
                            {fp.is_group ? fp.team_name : fp.participant_name}
                          </h4>
                          {fp.is_group ? (
                            <p
                              className="text-xs text-amber-200/60 font-medium line-clamp-2 px-1 leading-snug"
                              title={fp.member_names || ''}
                            >
                              {fp.member_names || (fp.member_count ? `${fp.member_count} Members` : '—')}
                            </p>
                          ) : (
                            <p className={`text-xs ${getHouseTeamClass(fp.team_name)}`}>
                              {fp.team_name}
                            </p>
                          )}
                        </div>

                        {/* Dedicated Highlighted Metrics Row */}
                        <div className="w-full grid grid-cols-2 gap-2 text-center bg-[#0A0A0A] p-2.5 rounded-xl border border-white/[0.08] shadow-2xs">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-200/60 block">
                              Grade
                            </span>
                            <span
                              className={`inline-block mt-0.5 px-3 py-0.5 rounded-full text-xs font-black border ${getGradeBadgeClass(
                                fp.grade
                              )}`}
                            >
                              {fp.grade || 'NG'}
                            </span>
                          </div>
                          <div className="border-l border-amber-500/30 pl-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-200/60 block">
                              Points
                            </span>
                            <span className="font-mono font-black text-amber-300 text-lg block leading-tight mt-0.5">
                              {Number(fp.final_score).toFixed(0)}{' '}
                              <span className="text-[10px] text-amber-300 font-bold">pts</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-amber-200/60 font-medium italic">
                    No 1st place awarded
                  </div>
                )}
              </div>
            </div>

            {/* 🥉 3RD PLACE COLUMN (Right) */}
            <div className="order-3 sm:order-3 flex flex-col items-center w-full">
              {/* Standard Position Box on Top */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#121212] text-amber-300 font-sans font-bold text-xs shadow-2xs border border-amber-500/30 -mb-3 z-20">
                <Medal className="w-3.5 h-3.5 text-amber-300" />
                <span>{thirdPlaces.length > 1 ? 'Joint 3rd Place' : '3rd Place'}</span>
              </div>

              {/* Main Pillar Body */}
              <div className="w-full bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-5 pt-6 sm:pt-7 shadow-xs flex flex-col items-center text-center space-y-3.5">
                {thirdPlaces.length > 0 ? (
                  <div className="w-full space-y-3.5">
                    {thirdPlaces.map((tp, idx) => (
                      <div key={tp.id || idx} className={`${idx > 0 ? 'pt-3.5 border-t border-white/[0.08]' : ''} space-y-3`}>
                        {/* Title & Subtitle */}
                        <div className="space-y-1 w-full min-h-[50px] flex flex-col justify-center">
                          <h4
                            className="text-base sm:text-lg font-black text-white truncate px-1"
                            title={tp.is_group ? tp.team_name : tp.participant_name}
                          >
                            {tp.is_group ? tp.team_name : tp.participant_name}
                          </h4>
                          {tp.is_group ? (
                            <p
                              className="text-xs text-amber-200/60 font-medium line-clamp-2 px-1 leading-snug"
                              title={tp.member_names || ''}
                            >
                              {tp.member_names || (tp.member_count ? `${tp.member_count} Members` : '—')}
                            </p>
                          ) : (
                            <p className={`text-xs ${getHouseTeamClass(tp.team_name)}`}>
                              {tp.team_name}
                            </p>
                          )}
                        </div>

                        {/* Dedicated Highlighted Metrics Row */}
                        <div className="w-full grid grid-cols-2 gap-2 text-center bg-[#0A0A0A] p-2.5 rounded-xl border border-white/[0.08] shadow-2xs">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-200/60 block">
                              Grade
                            </span>
                            <span
                              className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${getGradeBadgeClass(
                                tp.grade
                              )}`}
                            >
                              {tp.grade || 'NG'}
                            </span>
                          </div>
                          <div className="border-l border-amber-500/30 pl-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-200/60 block">
                              Points
                            </span>
                            <span className="font-mono font-black text-amber-300 text-base block leading-tight mt-0.5">
                              {Number(tp.final_score).toFixed(0)}{' '}
                              <span className="text-[10px] text-amber-300 font-bold">pts</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-amber-200/60 font-medium italic">
                    No 3rd place awarded
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CLEAN 5-COLUMN SCOREBOARD */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-300" />
              <span>Official Scoreboard</span>
            </h3>
            <p className="text-xs text-amber-200/60 mt-0.5">
              {results.length > 0
                ? `${results.length} contestants evaluated.`
                : 'Awaiting judge score sheets'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const initial: Record<number, { marks: number; remarks: string }> = {};
                judgeScores.forEach((js) => {
                  initial[js.score_sheet_id] = {
                    marks: Number(js.total_marks) || 0,
                    remarks: js.remarks || '',
                  };
                });
                setEditedScores(initial);
                setIsEditScoresModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#121212] hover:bg-[#121212] text-amber-200 border border-white/[0.08] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
              <span>Edit Scores ({judgeScores.length})</span>
            </button>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="py-16 text-center text-amber-200/60 text-xs space-y-4 font-medium">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#121212] border border-white/[0.08] flex items-center justify-center text-amber-200/60 shadow-2xs">
              <Trophy className="w-6 h-6 text-amber-200/60" />
            </div>
            <div>
              <p className="font-bold text-amber-200 text-sm">No results calculated yet.</p>
              <p className="text-xs text-amber-200/60 mt-0.5">
                {judgeScores.length > 0
                  ? `✓ ${judgeScores.length} score sheet(s) submitted by judges are ready.`
                  : 'Awaiting judge marks.'}
              </p>
            </div>
            {judgeScores.length > 0 ? (
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full ${THEME.classes.primaryBtn} font-black text-xs mx-auto cursor-pointer`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Calculate Results Now</span>
              </button>
            ) : selectedComp && (
              <button
                onClick={() => evaluateMutation.mutate(selectedComp.id)}
                disabled={evaluateMutation.isPending}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full ${THEME.classes.primaryBtn} font-black text-xs mx-auto cursor-pointer hover:scale-[1.02]`}
              >
                <Gavel className="w-4 h-4" />
                <span>{evaluateMutation.isPending ? 'Sending...' : 'Send to Judges for Evaluation'}</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs font-bold uppercase tracking-wider text-amber-200/60">
                    <th className="py-3 px-4 w-20 text-center">Rank</th>
                    <th className="py-3 px-4">Contestant & Team</th>
                    <th className="py-3 px-4 text-center w-28">Score</th>
                    <th className="py-3 px-4 text-center w-24">Grade</th>
                    <th className="py-3 px-4 text-center w-36 font-bold text-amber-300">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {results.map((res) => {
                    const isFirst = res.position === 1;
                    const isSecond = res.position === 2;
                    const isThird = res.position === 3;

                    return (
                      <tr key={res.id} className="hover:bg-[#0A0A0A] transition-colors">
                        {/* 1. Rank */}
                        <td className="py-3.5 px-4 font-mono font-bold text-center">
                          {res.position ? (
                            <div className="flex items-center justify-center gap-1.5">
                              {isFirst ? (
                                <Trophy className="w-4 h-4 text-amber-500" />
                              ) : isSecond ? (
                                <Medal className="w-4 h-4 text-amber-200/60" />
                              ) : isThird ? (
                                <Medal className="w-4 h-4 text-amber-300" />
                              ) : null}
                              <span
                                className={
                                  isFirst
                                    ? 'text-amber-300 font-black text-base'
                                    : isSecond
                                    ? 'text-amber-200 font-bold'
                                    : isThird
                                    ? 'text-amber-300 font-bold'
                                    : 'text-amber-200/60 font-semibold'
                                }
                              >
                                {res.position}
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-200/60 font-normal">—</span>
                          )}
                        </td>

                        {/* 2. Contestant & Team */}
                        <td className="py-3.5 px-4">
                          {res.is_group ? (
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-bold text-sm ${getHouseTeamClass(res.team_name)}`}>{res.team_name}</span>
                                <span className="font-mono text-xs text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-full border border-white/[0.08] shrink-0">
                                  {res.member_count} Members
                                </span>
                              </div>
                              <span className="text-xs text-amber-200/60 font-medium block mt-0.5 truncate max-w-md" title={res.member_names}>
                                {res.member_names}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{res.participant_name}</span>
                                <span className="font-mono text-xs text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-full border border-white/[0.08]">
                                  {res.participant_code}
                                </span>
                              </div>
                              <span className={`text-xs block mt-0.5 ${getHouseTeamClass(res.team_name)}`}>
                                {res.team_name}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 3. Score */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-100 text-sm">
                          {formatMark(res.raw_marks)}
                        </td>

                        {/* 4. Grade */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black border ${getGradeBadgeClass(
                              res.grade
                            )}`}
                          >
                            {res.grade || 'NG'}
                          </span>
                        </td>

                        {/* 5. Total Points */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-black text-amber-300 text-base block">
                            {Number(res.final_score).toFixed(0)} pts
                          </span>
                          <span className="text-[10px] text-amber-200/60 block font-medium">
                            {res.grade_marks ?? 0} grade + {res.position_points ?? 0} rank
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Dedicated Score Cards */}
            <div className="md:hidden space-y-3">
              {results.map((res) => {
                const isFirst = res.position === 1;
                const isSecond = res.position === 2;
                const isThird = res.position === 3;

                return (
                  <div
                    key={res.id}
                    className="p-3.5 bg-[#121212] border border-white/[0.08] rounded-xl space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {res.position ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                            {isFirst ? (
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            ) : isSecond ? (
                              <Medal className="w-3.5 h-3.5 text-amber-200/60" />
                            ) : isThird ? (
                              <Medal className="w-3.5 h-3.5 text-amber-300" />
                            ) : null}
                            <span
                              className={`font-mono text-xs font-black ${
                                isFirst
                                  ? 'text-amber-300'
                                  : isSecond
                                  ? 'text-amber-200'
                                  : isThird
                                  ? 'text-amber-300'
                                  : 'text-amber-200/60'
                              }`}
                            >
                              Rank {res.position}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-200/60 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                            Unranked
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getGradeBadgeClass(
                            res.grade
                          )}`}
                        >
                          Grade {res.grade || 'NG'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-amber-300 text-sm">
                          {Number(res.final_score).toFixed(0)} pts
                        </span>
                        <span className="text-[10px] text-amber-200/60 block font-medium">
                          {res.grade_marks ?? 0}g + {res.position_points ?? 0}r
                        </span>
                      </div>
                    </div>

                    <div>
                      {res.is_group ? (
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold text-sm ${getHouseTeamClass(res.team_name)}`}>{res.team_name}</span>
                            <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-full border border-white/[0.08]">
                              {res.member_count} Members
                            </span>
                          </div>
                          {res.member_names && (
                            <span className="text-xs text-amber-200/60 font-medium block mt-1 line-clamp-2">
                              {res.member_names}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{res.participant_name}</span>
                            <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-full border border-white/[0.08]">
                              {res.participant_code}
                            </span>
                          </div>
                          <span className={`text-xs block mt-0.5 ${getHouseTeamClass(res.team_name)}`}>
                            {res.team_name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
                      <span className="text-amber-200/60">Raw Score:</span>
                      <span className="font-mono font-bold text-amber-100">{formatMark(res.raw_marks)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* MODAL: ADMIN SCORE CALIBRATION & OVERRIDE */}
      <Modal
        isOpen={isEditScoresModalOpen}
        onClose={() => setIsEditScoresModalOpen(false)}
        title="Edit Judge Scores"
        maxWidth="lg"
      >
        <div className="space-y-3.5 text-xs">
          <p className="text-xs text-amber-200/60">
            Adjust marks directly. Standings and grades recalculate automatically.
          </p>

          {judgeScores.length === 0 ? (
            <div className="py-8 text-center text-amber-200/60 text-xs font-medium">
              No score sheets found for this competition.
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {judgeScores.map((js) => {
                const currentMark = editedScores[js.score_sheet_id]?.marks ?? Number(js.total_marks) ?? 0;
                const liveGrade = getGradeFromMark(currentMark);

                return (
                  <div
                    key={js.score_sheet_id}
                    className="p-3 rounded-xl bg-[#0A0A0A] hover:bg-[#121212] border border-white/[0.08]/90 transition-colors flex items-center justify-between gap-3"
                  >
                    {/* Contestant / Team Info & Judge */}
                    <div className="min-w-0 flex-1">
                      {isGroup ? (
                        <div className="space-y-0.5">
                          <span className={`font-bold text-sm block truncate ${getHouseTeamClass(js.team_name)}`}>
                            {js.team_name}
                          </span>
                          <span className="text-[11px] text-amber-200/60 font-medium block">
                            Judge: <strong className="text-amber-200">{js.judge_name}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">
                              {js.participant_name}
                            </span>
                            {js.participant_code && (
                              <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-500/15 px-1.5 py-0.2 rounded border border-white/[0.08]">
                                {js.participant_code}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-amber-200/60 font-medium">
                            <span className={getHouseTeamClass(js.team_name)}>{js.team_name}</span>
                            <span className="mx-1.5 text-slate-300">•</span>
                            <span>
                              Judge: <strong className="text-amber-200">{js.judge_name}</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Score Input & Live Grade Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={currentMark}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setEditedScores((prev) => ({
                              ...prev,
                              [js.score_sheet_id]: {
                                marks: isNaN(val) ? 0 : Math.min(100, Math.max(0, val)),
                                remarks: prev[js.score_sheet_id]?.remarks ?? js.remarks ?? '',
                              },
                            }));
                          }}
                          className="w-18 px-2 py-1 text-sm font-mono font-bold text-white bg-[#0A0A0A] border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-center"
                        />
                        <span className="text-[11px] font-bold text-amber-200/60">/ 100</span>
                      </div>

                      <span className={`w-9 text-center py-0.5 rounded-md text-xs font-black border ${liveGrade.color}`}>
                        {liveGrade.grade}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
            <button
              className="px-4 py-2 rounded-full text-xs font-semibold text-amber-200/60 hover:text-white hover:bg-[#121212] transition-colors cursor-pointer"
              onClick={() => setIsEditScoresModalOpen(false)}
            >
              Cancel
            </button>
            <button
              onClick={() => adminUpdateScoresMutation.mutate()}
              disabled={adminUpdateScoresMutation.isPending || judgeScores.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{adminUpdateScoresMutation.isPending ? 'Saving...' : 'Save & Recalculate'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
