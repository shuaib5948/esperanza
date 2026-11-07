import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.js';
import {
  Trophy,
  Users,
  Award,
  Radio,
  Flame,
  Search,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Medal,
  Calendar,
  ListOrdered,
  FileCheck2,
  CheckCircle2,
  UploadCloud,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { THEME } from '../../theme/theme.js';

interface TeamBreakdownResponse {
  teams: {
    id: number;
    name: string;
    code: string;
    color: string;
    logo_url?: string;
    total_points: number;
    public_points?: number;
    pending_points?: number;
    first_places: number;
    second_places: number;
    third_places: number;
    a_plus_count: number;
    a_count: number;
    b_count: number;
    c_count: number;
    scored_competitions_count: number;
    total_competitions_count?: number;
  }[];
  groupBreakdown: {
    team_id: number;
    team_name: string;
    group_id: number;
    group_name: string;
    group_code: string;
    points: number;
  }[];
  typeBreakdown: {
    team_id: number;
    team_name: string;
    type_id: number;
    type_name: string;
    points: number;
  }[];
  totalPublishedCompetitions?: number;
  pendingCompetitionsCount?: number;
  pendingPointsTotal?: number;
  lastPublishedAt?: string | null;
}

interface ParticipantEventResult {
  result_id: number;
  competition_id: number;
  programme_number: number;
  competition_name: string;
  competition_code: string;
  group_name: string;
  group_code: string;
  competition_type?: string;
  raw_marks?: number;
  grade?: string;
  grade_marks?: number;
  position?: number;
  position_points?: number;
  final_score?: number;
  points_awarded?: number;
  published_at?: string;
}

interface IndividualLeaderboardItem {
  participant_id: number;
  participant_code: string;
  participant_name: string;
  team_id: number;
  team_name: string;
  team_code: string;
  team_color: string;
  category_id: number;
  category_name: string;
  category_code: string;
  total_points: number;
  scored_events_count: number;
  first_places: number;
  second_places: number;
  third_places: number;
  a_plus_count: number;
  a_count: number;
  b_count: number;
  c_count: number;
  events: ParticipantEventResult[];
}

interface PointLogItem {
  point_id: number;
  points: number;
  created_at: string;
  competition_id: number;
  programme_number: number;
  competition_name: string;
  competition_code: string;
  group_name: string;
  group_code: string;
  competition_type?: string;
  team_id: number;
  team_name: string;
  team_code: string;
  team_color: string;
  participant_id?: number;
  participant_code?: string;
  participant_name?: string;
  grade?: string;
  grade_marks?: number;
  position?: number;
  position_points?: number;
  raw_marks?: number;
  published_at?: string;
}

const formatScore = (val: any): string => {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return parseFloat(num.toFixed(1)).toString();
};

export const AdminLeaderboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'TEAMS' | 'INDIVIDUAL' | 'LOG'>('TEAMS');
  const [individualSearch, setIndividualSearch] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [logTeamFilter, setLogTeamFilter] = useState<string>('ALL');
  const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);
  const [selectedParticipantForModal, setSelectedParticipantForModal] = useState<IndividualLeaderboardItem | null>(null);

  // 1. Fetch Team Breakdown
  const {
    data: teamData,
    isLoading: isTeamLoading,
    refetch: refetchTeams,
    isFetching: isTeamFetching,
  } = useQuery({
    queryKey: ['admin-team-breakdown'],
    queryFn: async () => {
      const res = await api.get<TeamBreakdownResponse>('/points/admin/team-breakdown');
      return res.data;
    },
    refetchInterval: 15000,
  });

  // 2. Fetch Individual Leaderboard
  const {
    data: individualData = [],
    isLoading: isIndividualLoading,
    refetch: refetchIndividual,
    isFetching: isIndividualFetching,
  } = useQuery({
    queryKey: ['admin-individual-leaderboard'],
    queryFn: async () => {
      const res = await api.get<IndividualLeaderboardItem[]>('/points/admin/individual-leaderboard');
      return res.data;
    },
    refetchInterval: 15000,
  });

  // 3. Fetch Points Log
  const {
    data: pointsLog = [],
    isLoading: isLogLoading,
    refetch: refetchLog,
    isFetching: isLogFetching,
  } = useQuery({
    queryKey: ['admin-points-log'],
    queryFn: async () => {
      const res = await api.get<PointLogItem[]>('/points/admin/points-log');
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Recalculate Mutation
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      return api.post('/points/admin/recalculate');
    },
    onSuccess: () => {
      success('Team & Individual points recalculated and synchronized with all published results.');
      queryClient.invalidateQueries({ queryKey: ['admin-team-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['admin-individual-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-points-log'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['public-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['live-screen'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to recalculate points');
    },
  });

  // Publish Leaderboard to Public Mutation
  const publishLeaderboardMutation = useMutation({
    mutationFn: async () => {
      return api.post('/points/admin/publish-leaderboard');
    },
    onSuccess: (res: any) => {
      const msg = res?.data?.message || 'Leaderboard published! Public standings & screens updated.';
      success(msg);
      queryClient.invalidateQueries({ queryKey: ['admin-team-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['admin-individual-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-points-log'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['public-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['live-screen'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err: any) => {
      error(err.message || 'Failed to publish leaderboard');
    },
  });

  const handleRefreshAll = () => {
    refetchTeams();
    refetchIndividual();
    refetchLog();
  };

  const isGlobalFetching = isTeamFetching || isIndividualFetching || isLogFetching;

  // Pending release stats
  const pendingCompsCount = Number(teamData?.pendingCompetitionsCount || 0);
  const pendingPointsTotal = Number(teamData?.pendingPointsTotal || 0);
  const lastPublishedAt = teamData?.lastPublishedAt;

  // Teams & Lead calculations
  const teams = teamData?.teams || [];
  const leader = teams[0];
  const runnerUp = teams[1];
  const pointGap = leader && runnerUp ? Number(leader.total_points) - Number(runnerUp.total_points) : 0;
  
  // Duel calculations for Championship Donut Arena
  const team1 = teams[0] || null;
  const team2 = teams[1] || null;
  const t1Points = Number(team1?.total_points || 0);
  const t2Points = Number(team2?.total_points || 0);
  const duelTotal = (t1Points + t2Points) || 1;
  const t1Share = Math.round((t1Points / duelTotal) * 1000) / 10;
  const t2Share = Math.round((100 - t1Share) * 10) / 10;
  const duelGap = Math.abs(t1Points - t2Points);
  // Dynamic Team Color Mapping (Official House Colors: Diraya Emerald, Rivaya Crimson)
  const getTeamColor = (teamNameOrCode?: string, fallback?: string) => {
    const str = (teamNameOrCode || '').toUpperCase();
    if (str.includes('DIRAYA')) return '#00E676';
    if (str.includes('RIVAYA')) return '#FF2A6D';
    return fallback || '#94a3b8';
  };

  const totalFestivalPoints = useMemo(() => {
    return teams.reduce((acc, t) => acc + Number(t.total_points || 0), 0);
  }, [teams]);

  const maxPoints = Math.max(...teams.map((t) => Number(t.total_points) || 1), 100);

  // Group breakdown mapping
  const groupColumns = useMemo(() => {
    const map = new Map<string, { id: number; name: string; code: string }>();
    (teamData?.groupBreakdown || []).forEach((row) => {
      if (!map.has(row.group_code)) {
        map.set(row.group_code, { id: row.group_id, name: row.group_name, code: row.group_code });
      }
    });
    return Array.from(map.values());
  }, [teamData]);

  // Individual Top Performer
  const topIndividual = useMemo(() => {
    return individualData.length > 0 ? individualData[0] : null;
  }, [individualData]);

  // Junior Top Contestants & Margin
  const juniorContestants = useMemo(() => {
    return individualData.filter((item) => {
      const code = (item.category_code || '').toUpperCase();
      const name = (item.category_name || '').toUpperCase();
      return code === 'JUN' || code === 'J1' || code === 'J2' || name.includes('JUNIOR');
    });
  }, [individualData]);

  const topJunior = juniorContestants[0] || null;
  const runnerUpJunior = juniorContestants[1] || null;
  const juniorLeadMargin = topJunior && runnerUpJunior
    ? Math.max(0, Number(topJunior.total_points) - Number(runnerUpJunior.total_points))
    : null;

  // Senior Top Contestants & Margin
  const seniorContestants = useMemo(() => {
    return individualData.filter((item) => {
      const code = (item.category_code || '').toUpperCase();
      const name = (item.category_name || '').toUpperCase();
      return code === 'SEN' || name.includes('SENIOR');
    });
  }, [individualData]);

  const topSenior = seniorContestants[0] || null;
  const runnerUpSenior = seniorContestants[1] || null;
  const seniorLeadMargin = topSenior && runnerUpSenior
    ? Math.max(0, Number(topSenior.total_points) - Number(runnerUpSenior.total_points))
    : null;

  const publishedEventsCount = useMemo(() => {
    if (teamData?.totalPublishedCompetitions !== undefined && teamData.totalPublishedCompetitions > 0) {
      return teamData.totalPublishedCompetitions;
    }
    return Math.max(...teams.map((t) => Number(t.scored_competitions_count) || 0), 0);
  }, [teamData, teams]);

  // Filtered Individual Contestants
  const filteredIndividuals = useMemo(() => {
    return individualData.filter((item) => {
      const matchSearch =
        item.participant_name.toLowerCase().includes(individualSearch.toLowerCase()) ||
        item.participant_code.toLowerCase().includes(individualSearch.toLowerCase());

      const matchDiv =
        selectedDivision === 'ALL' ||
        item.category_code === selectedDivision ||
        item.category_name.toUpperCase().includes(selectedDivision);

      const matchTeam =
        selectedTeamFilter === 'ALL' ||
        String(item.team_id) === selectedTeamFilter ||
        item.team_code === selectedTeamFilter;

      return matchSearch && matchDiv && matchTeam;
    });
  }, [individualData, individualSearch, selectedDivision, selectedTeamFilter]);

  // Filtered Points Log
  const filteredLog = useMemo(() => {
    return pointsLog.filter((item) => {
      const matchSearch =
        item.competition_name.toLowerCase().includes(logSearch.toLowerCase()) ||
        item.competition_code.toLowerCase().includes(logSearch.toLowerCase()) ||
        String(item.programme_number).includes(logSearch) ||
        (item.participant_name && item.participant_name.toLowerCase().includes(logSearch.toLowerCase()));

      const matchTeam =
        logTeamFilter === 'ALL' ||
        String(item.team_id) === logTeamFilter ||
        item.team_code === logTeamFilter;

      return matchSearch && matchTeam;
    });
  }, [pointsLog, logSearch, logTeamFilter]);

  return (
    <div className="space-y-3.5 pb-4">
      {/* Top Banner Header: Clean & Spaced Without Button Collision */}
      <div className="flex items-center justify-between gap-3 px-1 py-0.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-xs shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-white tracking-tight leading-none truncate">
              Leaderboard
            </h1>
            <p className="text-xs text-amber-200/60 font-medium mt-1 truncate">
              House championship & contestant standings
            </p>
          </div>
        </div>

        {/* Action Controls: Publish Leaderboard + Quick Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {pendingCompsCount > 0 ? (
            <button
              onClick={() => publishLeaderboardMutation.mutate()}
              disabled={publishLeaderboardMutation.isPending}
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${THEME.classes.primaryBtn} text-xs font-black shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer animate-pulse`}
              title="Click to release pending points to public leaderboard & stage screen"
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                {publishLeaderboardMutation.isPending
                  ? 'Publishing...'
                  : `Publish Leaderboard (${pendingCompsCount} new)`}
              </span>
            </button>
          ) : (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-bold"
              title={lastPublishedAt ? `Last published: ${new Date(lastPublishedAt).toLocaleTimeString()}` : 'Public leaderboard is live and up to date'}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Public Live</span>
            </div>
          )}

          {/* Header Quick Refresh Button */}
          <button
            onClick={handleRefreshAll}
            disabled={isGlobalFetching}
            title="Refresh Points Data"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-[#0A0A0A] hover:bg-[#121212] text-amber-100 text-xs font-semibold border border-white/[0.08] hover:border-amber-400 shadow-xs transition-all hover:scale-[1.02] cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGlobalFetching ? 'animate-spin text-amber-400' : 'text-amber-200/60'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Alert Banner when there are pending unpublished scores */}
      {pendingCompsCount > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <UploadCloud className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                <span>{pendingCompsCount} Competition Result{pendingCompsCount > 1 ? 's' : ''} Ready to Release</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-black text-[11px] border border-amber-400/30">
                  +{formatScore(pendingPointsTotal)} PTS PENDING
                </span>
              </h4>
              <p className="text-[11px] text-amber-200/70 mt-0.5">
                These scores are verified internally. Click &ldquo;Publish to Public Now&rdquo; to update the live public leaderboard and stage screen.
              </p>
            </div>
          </div>
          <button
            onClick={() => publishLeaderboardMutation.mutate()}
            disabled={publishLeaderboardMutation.isPending}
            className={`px-4 py-2 rounded-xl ${THEME.classes.primaryBtn} text-xs font-black shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{publishLeaderboardMutation.isPending ? 'Publishing...' : 'Publish to Public Now'}</span>
          </button>
        </div>
      )}

      {/* Structured 3-Tab Segmented Navigation Bar */}
      <div className="bg-[#0A0A0A] border border-white/[0.08] p-1 sm:p-1.5 rounded-2xl">
        <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('TEAMS')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'TEAMS'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-sm font-black'
                : 'text-amber-200/70 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Houses</span>
          </button>

          <button
            onClick={() => setActiveTab('INDIVIDUAL')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'INDIVIDUAL'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-sm font-black'
                : 'text-amber-200/70 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Contestants</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'INDIVIDUAL'
                  ? 'bg-slate-950/20 text-slate-950 font-bold'
                  : 'bg-white/[0.06] text-amber-200'
              }`}
            >
              {individualData.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('LOG')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'LOG'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-sm font-black'
                : 'text-amber-200/70 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Points Log</span>
          </button>
        </div>
      </div>

      {/* Individual Top 4 KPI Cards — Only Displayed on Individual Tab */}
      {activeTab === 'INDIVIDUAL' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 shrink-0">
          {/* 1. Top Junior Contestant */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-3.5 sm:p-4.5 min-h-[105px] sm:min-h-[110px] shadow-xl flex flex-col justify-between hover:border-amber-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-[11.5px] font-bento-title uppercase tracking-wider text-amber-200/60 font-semibold truncate">
                Top Junior
              </span>
              <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-white/[0.08] flex items-center justify-center text-amber-400 shrink-0">
                <Medal className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1 sm:my-1.5 flex items-baseline gap-1.5">
              <span className="text-base sm:text-2xl font-bento-title font-bold text-white tracking-[-0.03em] truncate" title={topJunior?.participant_name}>
                {topJunior ? topJunior.participant_name : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-200/60 font-bold truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">{topJunior ? `${topJunior.team_name} • ${topJunior.participant_code}` : 'No points yet'}</span>
            </div>
          </div>

          {/* 2. Junior Top Mark */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-3.5 sm:p-4.5 min-h-[105px] sm:min-h-[110px] shadow-xl flex flex-col justify-between hover:border-amber-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-[11.5px] font-bento-title uppercase tracking-wider text-amber-200/60 font-semibold truncate">
                Junior Score
              </span>
              <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-white/[0.08] flex items-center justify-center text-amber-400 shrink-0">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1 sm:my-1.5 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-3xl font-bento-num text-white tracking-[-0.04em] font-bold">
                {topJunior ? formatScore(topJunior.total_points) : '0'}
              </span>
              <span className="text-xs font-bento-title text-amber-200/60 font-normal">PTS</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold truncate">
              <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/15 border border-white/[0.08] truncate">
                {runnerUpJunior && juniorLeadMargin !== null
                  ? `+${formatScore(juniorLeadMargin)} pts lead`
                  : topJunior
                  ? 'Leader'
                  : 'Awaiting scores'}
              </span>
            </div>
          </div>

          {/* 3. Top Senior Contestant */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-3.5 sm:p-4.5 min-h-[105px] sm:min-h-[110px] shadow-xl flex flex-col justify-between hover:border-amber-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-[11.5px] font-bento-title uppercase tracking-wider text-amber-200/60 font-semibold truncate">
                Top Senior
              </span>
              <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-white/[0.08] flex items-center justify-center text-amber-400 shrink-0">
                <Trophy className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1 sm:my-1.5 flex items-baseline gap-1.5">
              <span className="text-base sm:text-2xl font-bento-title font-bold text-white tracking-[-0.03em] truncate" title={topSenior?.participant_name}>
                {topSenior ? topSenior.participant_name : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-200/60 font-bold truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">{topSenior ? `${topSenior.team_name} • ${topSenior.participant_code}` : 'No points yet'}</span>
            </div>
          </div>

          {/* 4. Senior Top Mark */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-3.5 sm:p-4.5 min-h-[105px] sm:min-h-[110px] shadow-xl flex flex-col justify-between hover:border-amber-500/40 transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-[11.5px] font-bento-title uppercase tracking-wider text-amber-200/60 font-semibold truncate">
                Senior Score
              </span>
              <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-white/[0.08] flex items-center justify-center text-amber-400 shrink-0">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1 sm:my-1.5 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-3xl font-bento-num text-white tracking-[-0.04em] font-bold">
                {topSenior ? formatScore(topSenior.total_points) : '0'}
              </span>
              <span className="text-xs font-bento-title text-amber-200/60 font-normal">PTS</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold truncate">
              <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/15 border border-white/[0.08] truncate">
                {runnerUpSenior && seniorLeadMargin !== null
                  ? `+${formatScore(seniorLeadMargin)} pts lead`
                  : topSenior
                  ? 'Leader'
                  : 'Awaiting scores'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TEAM HOUSE STANDINGS & GROUP BREAKDOWNS                            */}
      {/* ========================================================================= */}
      {activeTab === 'TEAMS' && (
        <div className="space-y-3.5">
          {/* Championship Battle Arena — Sleek 3-Tier Obsidian Battle Box */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bento-title font-bold uppercase tracking-wider text-white">
                  House Championship
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-white/[0.08] font-mono text-[10px] text-amber-300 font-bold">
                  {duelGap === 0 ? 'TIED' : `+${formatScore(duelGap)} PTS LEAD`}
                </span>
                <span className="text-xs font-mono text-amber-200/60 font-medium hidden sm:inline">
                  {publishedEventsCount} / 60 Scored
                </span>
              </div>
            </div>

            {/* Main Battle Clash: Side-by-side on all screens! */}
            <div className="grid grid-cols-2 md:grid-cols-12 gap-3 sm:gap-4 items-center py-2 sm:py-4">
              {/* Leader House (Left) */}
              <div className="col-span-1 md:col-span-5 flex flex-col items-start text-left space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.6)]" />
                  <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-bold text-[#00E676]">
                    {t1Points >= t2Points ? 'Leader' : 'Chaser'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-none truncate max-w-full">
                  {team1?.name || 'Leader'}
                </h2>
                <div className="flex items-baseline gap-1.5 sm:gap-2 leading-none flex-wrap">
                  <span className="text-2xl sm:text-5xl font-bento-num font-black text-white tracking-tight">
                    {formatScore(team1?.total_points)}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-[#00E676] font-mono">
                    PTS ({t1Share}%)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 pt-0.5 flex-wrap">
                  <span className="bg-[#121212] px-1.5 sm:px-2 py-0.5 rounded-md border border-white/[0.06]">🥇 {team1?.first_places || 0}</span>
                  <span className="bg-[#121212] px-1.5 sm:px-2 py-0.5 rounded-md border border-white/[0.06]">🥈 {team1?.second_places || 0}</span>
                  <span className="bg-[#121212] px-1.5 sm:px-2 py-0.5 rounded-md border border-white/[0.06]">🥉 {team1?.third_places || 0}</span>
                </div>
              </div>

              {/* Center: Lead Gap Pill (Visible on md+) */}
              <div className="hidden md:flex md:col-span-2 flex-col items-center justify-center py-2">
                <div className="p-3 rounded-2xl bg-[#121212] border border-white/[0.08] text-center min-w-[100px] shadow-sm">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-200/60 font-bold block">
                    {duelGap === 0 ? 'TIED' : 'LEAD'}
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-bento-num text-amber-300 tracking-tight leading-none my-1 block">
                    {duelGap === 0 ? '0' : `+${formatScore(duelGap)}`}
                  </span>
                  <span className="text-[9px] font-mono font-semibold text-amber-200/50 block">
                    PTS
                  </span>
                </div>
              </div>

              {/* Chaser House (Right) */}
              <div className="col-span-1 md:col-span-5 flex flex-col items-end text-right space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider font-bold text-[#FF2A6D]">
                    {t2Points > t1Points ? 'Leader' : 'Chaser'}
                  </span>
                  <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#FF2A6D] shadow-[0_0_8px_rgba(255,42,109,0.6)]" />
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-none truncate max-w-full">
                  {team2?.name || 'Chaser'}
                </h2>
                <div className="flex items-baseline gap-1.5 sm:gap-2 leading-none flex-wrap justify-end">
                  <span className="text-[10px] sm:text-xs font-bold text-[#FF2A6D] font-mono">
                    ({t2Share}%) PTS
                  </span>
                  <span className="text-2xl sm:text-5xl font-bento-num font-black text-white tracking-tight">
                    {formatScore(team2?.total_points)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 pt-0.5 flex-wrap justify-end">
                  <span className="bg-[#121212] px-1.5 sm:px-2 py-0.5 rounded-md border border-white/[0.06]">🥇 {team2?.first_places || 0}</span>
                  <span className="bg-[#121212] px-1.5 sm:px-2 py-0.5 rounded-md border border-white/[0.06]">🥈 {team2?.second_places || 0}</span>
                  <span className="bg-[#121212] px-1.5 sm:px-2 py-0.5 rounded-md border border-white/[0.06]">🥉 {team2?.third_places || 0}</span>
                </div>
              </div>
            </div>

            {/* Sleek Dual Progress Line */}
            <div className="pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
                <span className="text-[#00E676] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00E676]" />
                  <span>{team1?.name} {t1Share}%</span>
                </span>
                <span className="text-[#FF2A6D] flex items-center gap-1.5">
                  <span>{t2Share}% {team2?.name}</span>
                  <span className="w-2 h-2 rounded-full bg-[#FF2A6D]" />
                </span>
              </div>

              <div className="w-full h-2.5 bg-[#121212] rounded-full p-0.5 border border-white/[0.08] flex overflow-hidden">
                <div
                  className="h-full rounded-l-full bg-[#00E676] transition-all duration-700 shadow-[0_0_10px_rgba(0,230,118,0.4)]"
                  style={{ width: `${t1Share}%` }}
                />
                <div
                  className="h-full rounded-r-full bg-[#FF2A6D] transition-all duration-700 shadow-[0_0_10px_rgba(255,42,109,0.4)]"
                  style={{ width: `${t2Share}%` }}
                />
              </div>
            </div>
          </div>

          {/* Any remaining houses beyond the Top 2 (Resilient) */}
          {teams.length > 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {teams.slice(2).map((team, idx) => (
                <div key={team.id} className="bg-gradient-to-br from-[#121212] via-[#0a0a0a] to-[#040404] border border-white/[0.08] rounded-2xl p-4 shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: team.color || '#94a3b8' }}
                    >
                      {team.code ? team.code[0] : 'T'}
                    </div>
                    <div>
                      <span className="text-xs font-mono text-amber-200/60 font-bold">RANK {idx + 3}</span>
                      <div className="font-bold text-white text-sm">{team.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-white">{formatScore(team.total_points)}</div>
                    <span className="text-[10px] text-amber-200/60 font-bold uppercase">PTS</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Group / Division Breakdown Table */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl overflow-hidden p-4 sm:p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Division Points Breakdown</span>
                </h3>
                <p className="text-[11px] text-amber-200/60 mt-0.5">
                  Category points tally across houses.
                </p>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-bold text-amber-200/60 uppercase tracking-wider bg-[#121212]/80">
                    <th className="py-2.5 px-3">House Team</th>
                    {groupColumns.map((grp) => (
                      <th key={grp.code} className="py-2.5 px-3 text-center">
                        {grp.name} ({grp.code})
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {teams.map((t) => {
                    return (
                      <tr key={t.id} className="hover:bg-[#121212]/80 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getTeamColor(t.name || t.code, t.color) }} />
                          <span>{t.name}</span>
                        </td>
                        {groupColumns.map((grp) => {
                          const match = (teamData?.groupBreakdown || []).find(
                            (r) => r.team_id === t.id && r.group_code === grp.code
                          );
                          const pts = Number(match?.points || 0);
                          return (
                            <td key={grp.code} className="py-2.5 px-3 text-center font-mono font-bold text-amber-200">
                              {pts > 0 ? formatScore(pts) : <span className="text-amber-200/60">0</span>}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-right font-mono font-black text-white text-sm">
                          {formatScore(t.total_points)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Division Cards View */}
            <div className="md:hidden space-y-3">
              {teams.map((t) => (
                <div key={t.id} className="p-3.5 bg-[#121212] border border-white/[0.08] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getTeamColor(t.name || t.code, t.color) }} />
                      {t.name}
                    </span>
                    <span className="font-mono font-black text-amber-300 text-sm">
                      {formatScore(t.total_points)} pts
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.04]">
                    {groupColumns.map((grp) => {
                      const match = (teamData?.groupBreakdown || []).find(
                        (r) => r.team_id === t.id && r.group_code === grp.code
                      );
                      const pts = Number(match?.points || 0);
                      return (
                        <div key={grp.code} className="p-2 rounded-lg bg-[#0A0A0A] border border-white/[0.06] flex items-center justify-between">
                          <span className="text-[11px] text-amber-200/70 font-semibold">{grp.code}</span>
                          <span className="font-mono font-bold text-white text-xs">{pts > 0 ? formatScore(pts) : '0'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Event Type Breakdown (Stage vs Off-Stage vs General) */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl overflow-hidden p-4 sm:p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Discipline Breakdown</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['STAGE', 'OFF_STAGE', 'GENERAL'].map((typeCode) => {
                const title = typeCode === 'STAGE' ? 'Stage Events' : typeCode === 'OFF_STAGE' ? 'Off-Stage Events' : 'General Events';
                return (
                  <div key={typeCode} className="p-3 rounded-xl bg-[#121212] border border-white/[0.08]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/60 block mb-2">
                      {title}
                    </span>
                    <div className="space-y-1.5">
                      {teams.map((t) => {
                        const match = typeCode === 'GENERAL'
                          ? (teamData?.typeBreakdown || []).find((r) => r.team_id === t.id && r.type_name === 'GENERAL') ||
                            (teamData?.groupBreakdown || []).find((r) => r.team_id === t.id && (r.group_code === 'GEN' || r.group_name === 'GENERAL'))
                          : (teamData?.typeBreakdown || []).find((r) => r.team_id === t.id && r.type_name === typeCode);
                        const pts = Number(match?.points || 0);
                        return (
                          <div key={t.id} className="flex items-center justify-between text-xs">
                            <span className="text-amber-200 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getTeamColor(t.name || t.code, t.color) }} />
                              {t.name}
                            </span>
                            <span className="font-mono font-bold text-white">
                              {formatScore(pts)} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INDIVIDUAL CONTESTANTS LEADERBOARD                                */}
      {/* ========================================================================= */}
      {activeTab === 'INDIVIDUAL' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-3.5 sm:p-4 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-200/60" />
              <input
                type="text"
                placeholder="Search contestant or code..."
                value={individualSearch}
                onChange={(e) => setIndividualSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-white/[0.08] rounded-full text-xs font-medium text-amber-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Division & Team Filters */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-full text-xs font-semibold text-amber-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Divisions</option>
                <option value="J1">J1 Division</option>
                <option value="J2">J2 Division</option>
                <option value="JUN">Junior Division</option>
                <option value="SEN">Senior Division</option>
                <option value="GEN">General Division</option>
              </select>

              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-full text-xs font-semibold text-amber-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Houses</option>
                {teams.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Individual Contestants Table */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl p-3 sm:p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs font-bold text-amber-200/60 uppercase tracking-wider bg-[#121212]/80">
                    <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                    <th className="py-3.5 px-4">Contestant</th>
                    <th className="py-3.5 px-4">House Team</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Events</th>
                    <th className="py-3.5 px-4 text-center">Podium (1/2/3)</th>
                    <th className="py-3.5 px-4 text-center">Grades (A+/A/B/C)</th>
                    <th className="py-3.5 px-4 text-right">Points</th>
                    <th className="py-3.5 px-4 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredIndividuals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-amber-200/60 font-medium text-xs">
                        No contestant records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredIndividuals.map((item, idx) => {
                      const isExpanded = expandedParticipantId === item.participant_id;
                      const isTop3 = idx < 3 && Number(item.total_points) > 0;

                      return (
                        <React.Fragment key={item.participant_id}>
                          <tr className="hover:bg-[#121212]/90 transition-colors">
                            {/* Rank Badge */}
                            <td className="py-3 px-4 text-center">
                              {isTop3 ? (
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shadow-xs ${
                                    idx === 0
                                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                      : idx === 1
                                      ? 'bg-[#121212] text-amber-200 ring-2 ring-amber-500/30'
                                      : 'bg-amber-500/15 text-amber-300 ring-2 ring-amber-200'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                              ) : (
                                <span className="font-mono text-xs font-bold text-amber-200/60">
                                  {idx + 1}
                                </span>
                              )}
                            </td>

                            {/* Contestant Name & Code */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-white text-sm">{item.participant_name}</div>
                              <span className="font-mono text-xs text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-full border border-white/[0.08] inline-block mt-0.5">{item.participant_code}</span>
                            </td>

                            {/* House Team */}
                            <td className="py-3 px-4">
                              {(() => {
                                const tColor = getTeamColor(item.team_name, item.team_color);
                                return (
                                  <span
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                                    style={{ backgroundColor: `${tColor}18`, color: tColor, border: `1px solid ${tColor}40` }}
                                  >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tColor }} />
                                    {item.team_name}
                                  </span>
                                );
                              })()}
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4">
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#121212] text-amber-200 border border-white/[0.08]">
                                {item.category_name}
                              </span>
                            </td>

                            {/* Events Count */}
                            <td className="py-3 px-4 text-center font-mono font-bold text-amber-200">
                              {item.scored_events_count}
                            </td>

                            {/* Podium Finishes */}
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 text-xs font-mono">
                                <span className="text-amber-300 font-bold" title="1st Place">{item.first_places}</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-amber-200/60 font-bold" title="2nd Place">{item.second_places}</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-amber-400 font-bold" title="3rd Place">{item.third_places}</span>
                              </div>
                            </td>

                            {/* Grades Distribution */}
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 text-xs font-bold">
                                {item.a_plus_count > 0 && <span className="text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-white/[0.08]">{item.a_plus_count} A+</span>}
                                {item.a_count > 0 && <span className="text-amber-100 bg-[#121212] px-1.5 py-0.5 rounded">{item.a_count} A</span>}
                                {item.b_count > 0 && <span className="text-sky-300 bg-sky-500/15 px-1.5 py-0.5 rounded">{item.b_count} B</span>}
                                {item.c_count > 0 && <span className="text-amber-200/60 bg-[#121212] px-1.5 py-0.5 rounded">{item.c_count} C</span>}
                                {item.a_plus_count === 0 && item.a_count === 0 && item.b_count === 0 && item.c_count === 0 && (
                                  <span className="text-amber-200/60 text-xs">—</span>
                                )}
                              </div>
                            </td>

                            {/* Total Points */}
                            <td className="py-3 px-4 text-right">
                              <span className="font-mono text-base font-black text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-white/[0.08]">
                                {formatScore(item.total_points)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-center">
                              <button
                                className="p-1.5 rounded-full hover:bg-white/10 text-amber-200/60 hover:text-white transition-colors cursor-pointer"
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedParticipantId(null);
                                  } else {
                                    setExpandedParticipantId(item.participant_id);
                                  }
                                }}
                                title="Expand event breakdown"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Event Breakdown Row */}
                          {isExpanded && (
                            <tr className="bg-[#121212]/70">
                              <td colSpan={9} className="p-4 border-y border-amber-500/30">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                                      <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                                      Scored Events Breakdown for {item.participant_name}
                                    </span>
                                    <span className="text-xs text-amber-200/60 font-mono font-bold">
                                      {item.events.length} published event(s)
                                    </span>
                                  </div>

                                  {item.events.length === 0 ? (
                                    <p className="text-xs text-amber-200/60 italic">
                                      No published marks yet.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {item.events.map((ev) => (
                                        <div
                                          key={ev.result_id}
                                          className="p-3 rounded-xl bg-[#121212] border border-white/[0.08] text-xs space-y-1.5 shadow-inner"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-white/[0.08]">
                                              {ev.programme_number}
                                            </span>
                                            <span className="font-mono font-black text-amber-300 text-sm">
                                              +{formatScore(ev.points_awarded || ev.final_score)} PTS
                                            </span>
                                          </div>
                                          <div className="font-semibold text-white truncate" title={ev.competition_name}>
                                            {ev.competition_name}
                                          </div>
                                          <div className="flex items-center justify-between text-amber-200/60 pt-1 border-t border-white/[0.08]">
                                            <span>
                                              Grade:{' '}
                                              <strong className="text-white font-bold">{ev.grade || '—'}</strong>
                                              {ev.grade_marks ? ` (${ev.grade_marks}m)` : ''}
                                            </span>
                                            <span>
                                              Place:{' '}
                                              <strong className="text-white font-bold">
                                                {ev.position ? `${ev.position} (${ev.position_points}m)` : '—'}
                                              </strong>
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Dedicated Contestant Cards */}
            <div className="md:hidden space-y-3">
              {filteredIndividuals.length === 0 ? (
                <div className="py-12 text-center text-amber-200/60 font-medium text-xs">
                  No contestant records found matching your filters.
                </div>
              ) : (
                filteredIndividuals.map((item, idx) => {
                  const isExpanded = expandedParticipantId === item.participant_id;
                  const isTop3 = idx < 3 && Number(item.total_points) > 0;
                  const tColor = getTeamColor(item.team_name, item.team_color);

                  return (
                    <div
                      key={item.participant_id}
                      className="p-3.5 bg-[#121212] border border-white/[0.08] rounded-xl space-y-3 shadow-2xs"
                    >
                      {/* Top Row: Rank, Contestant Name/Code, Points */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isTop3 ? (
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shrink-0 ${
                                idx === 0
                                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                  : idx === 1
                                  ? 'bg-[#121212] text-amber-200 ring-2 ring-amber-500/30'
                                  : 'bg-amber-500/15 text-amber-300 ring-2 ring-amber-200'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-amber-200/60 w-7 text-center shrink-0">
                              {idx + 1}
                            </span>
                          )}

                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm leading-tight truncate">{item.participant_name}</div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded-full border border-white/[0.08]">
                                {item.participant_code}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1"
                                style={{ backgroundColor: `${tColor}18`, color: tColor, border: `1px solid ${tColor}40` }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tColor }} />
                                {item.team_name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Points badge */}
                        <div className="text-right shrink-0">
                          <span className="font-mono text-base font-black text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-white/[0.08] inline-block">
                            {formatScore(item.total_points)}
                          </span>
                          <span className="text-[10px] text-amber-200/60 block mt-0.5 font-medium">pts</span>
                        </div>
                      </div>

                      {/* Middle Row: Category, Events & Podiums */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A] text-amber-200 border border-white/[0.08]">
                            {item.category_name}
                          </span>
                          <span className="text-[11px] text-amber-200/60">
                            {item.scored_events_count} event{item.scored_events_count !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center gap-1 text-[11px] font-mono">
                            <span className="text-amber-300 font-bold" title="1st">{item.first_places}</span>
                            <span className="text-white/20">/</span>
                            <span className="text-amber-200/60 font-bold" title="2nd">{item.second_places}</span>
                            <span className="text-white/20">/</span>
                            <span className="text-amber-400 font-bold" title="3rd">{item.third_places}</span>
                          </div>

                          <button
                            onClick={() => setExpandedParticipantId(isExpanded ? null : item.participant_id)}
                            className="p-1 rounded-lg bg-white/[0.04] text-amber-200/70 hover:text-white border border-white/[0.06] transition-colors cursor-pointer"
                            aria-label="Toggle details"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Mobile Event Breakdown Expanded */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-amber-500/20 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1">
                              <FileCheck2 className="w-3 h-3 text-amber-400" />
                              Breakdown
                            </span>
                            <span className="text-amber-200/60 font-mono">
                              {item.events.length} event(s)
                            </span>
                          </div>

                          {item.events.length === 0 ? (
                            <p className="text-xs text-amber-200/60 italic">No published marks yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {item.events.map((ev) => (
                                <div
                                  key={ev.result_id}
                                  className="p-2.5 rounded-lg bg-[#0A0A0A] border border-white/[0.06] text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-white/[0.08]">
                                      {ev.programme_number}
                                    </span>
                                    <span className="font-mono font-black text-amber-300 text-xs">
                                      +{formatScore(ev.points_awarded || ev.final_score)} PTS
                                    </span>
                                  </div>
                                  <div className="font-semibold text-white truncate text-xs">
                                    {ev.competition_name}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-amber-200/60 pt-1 border-t border-white/[0.04]">
                                    <span>Grade: <strong className="text-white">{ev.grade || '—'}</strong></span>
                                    <span>Place: <strong className="text-white">{ev.position ? `${ev.position}` : '—'}</strong></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POINTS LEDGER LOG & AUDIT                                          */}
      {/* ========================================================================= */}
      {activeTab === 'LOG' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3.5 sm:p-4 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-200/60" />
              <input
                type="text"
                placeholder="Search event, code, contestant..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-white/[0.08] rounded-full text-xs font-medium text-amber-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={logTeamFilter}
              onChange={(e) => setLogTeamFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 bg-[#121212] border border-white/[0.08] rounded-full text-xs font-semibold text-amber-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Houses</option>
              {teams.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Points Log Table */}
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl p-3 sm:p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs font-bold text-amber-200/60 uppercase tracking-wider bg-[#121212]/80">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Event No</th>
                    <th className="py-3 px-4">Competition Name</th>
                    <th className="py-3 px-4">Beneficiary Contestant</th>
                    <th className="py-3 px-4">House Team</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4 text-center">Rank</th>
                    <th className="py-3 px-4 text-right">Points Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] font-mono text-xs">
                  {filteredLog.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-amber-200/60 font-sans">
                        No points awarded yet. Once competitions are scored and results published, points will record here.
                      </td>
                    </tr>
                  ) : (
                    filteredLog.map((log) => (
                      <tr key={log.point_id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-4 text-amber-200/60 font-sans">
                          {new Date(log.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-300">
                          <span className="bg-amber-500/15 border border-white/[0.08] px-2 py-0.5 rounded-full text-xs">
                            {log.programme_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold font-sans text-white">
                          {log.competition_name}
                        </td>
                        <td className="py-3 px-4 font-sans text-amber-200/60">
                          {log.participant_name ? `${log.participant_name} (${log.participant_code})` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const lColor = getTeamColor(log.team_name, log.team_color);
                            return (
                              <span
                                className="px-2.5 py-0.5 rounded-full font-sans font-bold text-xs border"
                                style={{ 
                                  backgroundColor: `${lColor}15`, 
                                  color: lColor,
                                  borderColor: `${lColor}35`
                                }}
                              >
                                {log.team_name}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600 font-sans">
                          {log.grade ? (
                            <span className="bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                              {log.grade}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-400 font-sans">
                          {log.position ? `${log.position} Place` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-300 text-sm">
                          +{formatScore(log.points)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Dedicated Ledger Cards */}
            <div className="md:hidden space-y-3">
              {filteredLog.length === 0 ? (
                <div className="py-12 text-center text-amber-200/60 font-sans text-xs">
                  No points awarded yet. Once competitions are scored and results published, points will record here.
                </div>
              ) : (
                filteredLog.map((log) => {
                  const lColor = getTeamColor(log.team_name, log.team_color);

                  return (
                    <div
                      key={log.point_id}
                      className="p-3.5 bg-[#121212] border border-white/[0.08] rounded-xl space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-500/15 border border-white/[0.08] px-2 py-0.5 rounded-full text-xs font-mono font-bold text-amber-300">
                            {log.programme_number}
                          </span>
                          <span className="text-[11px] text-amber-200/60 font-sans">
                            {new Date(log.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <span className="font-mono font-black text-amber-300 text-sm">
                          +{formatScore(log.points)} PTS
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-white text-sm">
                          {log.competition_name}
                        </div>
                        {log.participant_name && (
                          <div className="text-xs text-amber-200/70 mt-0.5">
                            {log.participant_name} {log.participant_code ? `(${log.participant_code})` : ''}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.04]">
                        <span
                          className="px-2.5 py-0.5 rounded-full font-sans font-bold text-[11px] border"
                          style={{
                            backgroundColor: `${lColor}15`,
                            color: lColor,
                            borderColor: `${lColor}35`
                          }}
                        >
                          {log.team_name}
                        </span>

                        <div className="flex items-center gap-1.5 text-xs">
                          {log.grade && (
                            <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md font-bold text-[11px]">
                              {log.grade}
                            </span>
                          )}
                          {log.position && (
                            <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-md font-bold text-[11px]">
                              {log.position} Place
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
