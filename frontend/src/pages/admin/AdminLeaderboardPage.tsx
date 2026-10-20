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
    first_places: number;
    second_places: number;
    third_places: number;
    a_plus_count: number;
    a_count: number;
    b_count: number;
    c_count: number;
    scored_competitions_count: number;
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
    },
    onError: (err: any) => {
      error(err.message || 'Failed to recalculate points');
    },
  });

  const handleRefreshAll = () => {
    refetchTeams();
    refetchIndividual();
    refetchLog();
  };

  const isGlobalFetching = isTeamFetching || isIndividualFetching || isLogFetching;

  // Teams & Lead calculations
  const teams = teamData?.teams || [];
  const leader = teams[0];
  const runnerUp = teams[1];
  const pointGap = leader && runnerUp ? Number(leader.total_points) - Number(runnerUp.total_points) : 0;
  
  // Duel calculations for Polar Balance Gauge Arena
  const team1 = teams[0] || null;
  const team2 = teams[1] || null;
  const t1Points = Number(team1?.total_points || 0);
  const t2Points = Number(team2?.total_points || 0);
  const duelTotal = (t1Points + t2Points) || 1;
  const t1Share = Math.round((t1Points / duelTotal) * 1000) / 10;
  const t2Share = Math.round((100 - t1Share) * 10) / 10;
  const duelGap = Math.abs(t1Points - t2Points);
  const needleTilt = Math.max(-42, Math.min(42, -(t1Share - 50) * 4));

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
    return Math.max(...teams.map((t) => Number(t.scored_competitions_count) || 0), 0);
  }, [teams]);

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
    <div className="space-y-6 pb-12">
      {/* Top Banner & Actions — Matching Admin Dashboard Header */}
      <div className="flex items-center justify-between gap-3 px-1 py-0.5 shrink-0">
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bento-title font-bold text-slate-900 truncate leading-tight tracking-[-0.035em]">
              Leaderboard & Points
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
            Real-time championship standings, group rankings, and points ledger
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRefreshAll}
            disabled={isGlobalFetching}
            title="Refresh Points Data"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 hover:border-slate-800 shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGlobalFetching ? 'animate-spin text-amber-600' : 'text-slate-600'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Recalculate and re-synchronize all team points from all published results?')) {
                recalculateMutation.mutate();
              }
            }}
            disabled={recalculateMutation.isPending}
            title="Re-sync team_points table with all published results"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full ${THEME.classes.primaryBtn} text-xs font-black shadow-xs transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{recalculateMutation.isPending ? 'Recalculating...' : 'Recalculate Points'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards — Bento Stat Tile Structure (Matching Admin Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 shrink-0">
        {activeTab === 'INDIVIDUAL' ? (
          <>
            {/* 1. Top Junior Contestant */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
                  Top Junior Contestant
                </span>
                <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Medal className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bento-title font-bold text-slate-900 tracking-[-0.03em] truncate" title={topJunior?.participant_name}>
                  {topJunior ? topJunior.participant_name : '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span className="truncate">{topJunior ? `${topJunior.team_name} • ${topJunior.participant_code}` : 'No points awarded yet'}</span>
              </div>
            </div>

            {/* 2. Junior Top Mark */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
                  Junior Top Score
                </span>
                <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bento-num text-slate-900 tracking-[-0.04em] font-bold">
                  {topJunior ? Number(topJunior.total_points).toFixed(1) : '0.0'}
                </span>
                <span className="text-xs font-bento-title text-slate-400 font-normal">PTS</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-amber-900 font-bold truncate">
                <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80">
                  {runnerUpJunior && juniorLeadMargin !== null
                    ? `+${juniorLeadMargin.toFixed(1)} pts lead ahead of ${runnerUpJunior.participant_name}`
                    : topJunior
                    ? 'Sole scorer in Junior'
                    : 'Awaiting scores'}
                </span>
              </div>
            </div>

            {/* 3. Top Senior Contestant */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
                  Top Senior Contestant
                </span>
                <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bento-title font-bold text-slate-900 tracking-[-0.03em] truncate" title={topSenior?.participant_name}>
                  {topSenior ? topSenior.participant_name : '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span className="truncate">{topSenior ? `${topSenior.team_name} • ${topSenior.participant_code}` : 'No points awarded yet'}</span>
              </div>
            </div>

            {/* 4. Senior Top Mark */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
                  Senior Top Score
                </span>
                <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bento-num text-slate-900 tracking-[-0.04em] font-bold">
                  {topSenior ? Number(topSenior.total_points).toFixed(1) : '0.0'}
                </span>
                <span className="text-xs font-bento-title text-slate-400 font-normal">PTS</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-amber-900 font-bold truncate">
                <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80">
                  {runnerUpSenior && seniorLeadMargin !== null
                    ? `+${seniorLeadMargin.toFixed(1)} pts lead ahead of ${runnerUpSenior.participant_name}`
                    : topSenior
                    ? 'Sole scorer in Senior'
                    : 'Awaiting scores'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 1. Leading Team Name */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
                  Leading Team
                </span>
                <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bento-num text-slate-900 tracking-[-0.04em] font-bold truncate">
                  {leader ? leader.name : '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: leader?.color || '#d97706' }} />
                <span>{leader ? `${leader.code} Contingent Leading` : 'Awaiting published scores'}</span>
              </div>
            </div>

            {/* 2. Leading Point */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
                  Leading Score
                </span>
                <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bento-num text-slate-900 tracking-[-0.04em] font-bold">
                  {leader ? Number(leader.total_points).toFixed(1) : '0.0'}
                </span>
                <span className="text-xs font-bento-title text-slate-400 font-normal">PTS</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span>Championship top score</span>
              </div>
            </div>

            {/* 3. Number of Results Published */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
                  Results Published
                </span>
                <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bento-num text-slate-900 tracking-[-0.04em] font-bold">
                  {publishedEventsCount}
                </span>
                <span className="text-xs font-bento-title text-slate-400 font-normal">/ 60</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-amber-900 font-bold">
                <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80">
                  {Math.round((publishedEventsCount / 60) * 100)}% Verified
                </span>
              </div>
            </div>

            {/* 4. Lead Margin */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 min-h-[110px] shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bento-title uppercase tracking-wider text-slate-500 font-semibold">
                  Lead Margin
                </span>
                <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Flame className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bento-num text-slate-900 tracking-[-0.04em] font-bold">
                  +{pointGap.toFixed(1)}
                </span>
                <span className="text-xs font-bento-title text-slate-400 font-normal">PTS</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span>{runnerUp ? `Ahead of ${runnerUp.name}` : 'Awaiting 2nd house score'}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('TEAMS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'TEAMS'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border border-amber-400 shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Team House Standings</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${activeTab === 'TEAMS' ? 'bg-slate-950/15 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'}`}>
            {teams.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('INDIVIDUAL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'INDIVIDUAL'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border border-amber-400 shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Individual Contestants</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${activeTab === 'INDIVIDUAL' ? 'bg-slate-950/15 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'}`}>
            {individualData.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('LOG')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'LOG'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border border-amber-400 shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Points Ledger Log</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${activeTab === 'LOG' ? 'bg-slate-950/15 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'}`}>
            {pointsLog.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TEAM HOUSE STANDINGS & GROUP BREAKDOWNS                            */}
      {/* ========================================================================= */}
      {activeTab === 'TEAMS' && (
        <div className="space-y-6">
          {/* Championship Podium Towers — Large, Visual, Minimum Clutter */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs relative overflow-hidden">
            {/* Minimal Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                  House Championship Podium
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400 font-semibold">
                {publishedEventsCount} / 60 Programmes Scored
              </span>
            </div>

            {/* Main Grand Podium Arena */}
            <div className="pt-8 pb-4">
              <div className="flex items-end justify-center gap-3 sm:gap-8 max-w-3xl mx-auto min-h-[360px]">
                
                {/* 1. Leader Podium Tower */}
                <div className="flex-1 max-w-[280px] flex flex-col items-center">
                  {/* Top Stats on Leader */}
                  <div className="flex flex-col items-center mb-3 text-center space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-xs font-black shadow-xs">
                      <Flame className="w-3.5 h-3.5" />
                      <span>RANK #1 LEADER</span>
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
                      {team1?.name || 'Leader'}
                    </h2>
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bento-num font-black text-slate-900 tracking-tight">
                      {Number(team1?.total_points || 0).toFixed(1)}
                      <span className="text-sm font-bento-title text-amber-700 font-bold ml-1.5">PTS</span>
                    </div>
                  </div>

                  {/* Tower Column (Tall Leader Tower) */}
                  <div className="w-full h-56 sm:h-64 rounded-2xl bg-gradient-to-t from-amber-400/25 via-amber-300/20 to-amber-100/40 border-2 border-amber-400 shadow-md flex flex-col justify-between p-4 text-center transition-all">
                    <div className="flex items-center justify-center">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-black shadow-xs"
                        style={{ backgroundColor: team1?.color || '#d97706' }}
                      >
                        {team1?.code ? team1.code[0] : 'T'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="inline-block text-xs font-mono font-bold text-amber-950 bg-amber-200/60 border border-amber-300 px-2.5 py-0.5 rounded-full">
                        {t1Share}% Battle Share
                      </span>
                      <p className="text-[11px] text-amber-900/80 font-medium font-mono">
                        {team1?.scored_competitions_count || 0} events scored
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Center Delta Caliper (The Point Gap Indicator) */}
                <div className="flex flex-col items-center justify-center shrink-0 pb-16 z-10">
                  <div className="flex flex-col items-center text-center space-y-1.5">
                    {/* Caliper Top Marker */}
                    <div className="w-px h-6 bg-gradient-to-b from-transparent to-amber-400" />
                    
                    {/* Delta Badge */}
                    <div className="px-3 sm:px-4 py-2 rounded-2xl bg-amber-50 border-2 border-amber-300/90 shadow-sm flex flex-col items-center">
                      <span className="text-[10px] font-mono uppercase font-bold text-amber-800 tracking-wider">
                        LEAD GAP
                      </span>
                      <span className="text-base sm:text-xl font-black text-amber-950 tracking-tight whitespace-nowrap">
                        +{duelGap.toFixed(1)} PTS
                      </span>
                    </div>

                    {/* Caliper Bottom Marker */}
                    <div className="w-px h-6 bg-gradient-to-t from-transparent to-amber-400" />
                  </div>
                </div>

                {/* 3. Chaser Podium Tower */}
                <div className="flex-1 max-w-[280px] flex flex-col items-center">
                  {/* Top Stats on Chaser */}
                  <div className="flex flex-col items-center mb-3 text-center space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                      <span>RANK #2 CHASER</span>
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-700 tracking-tight pt-1">
                      {team2?.name || 'Chaser'}
                    </h2>
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bento-num font-black text-slate-700 tracking-tight">
                      {Number(team2?.total_points || 0).toFixed(1)}
                      <span className="text-sm font-bento-title text-slate-400 font-bold ml-1.5">PTS</span>
                    </div>
                  </div>

                  {/* Tower Column (Noticeably Shorter) */}
                  <div className="w-full h-40 sm:h-48 rounded-2xl bg-gradient-to-t from-slate-200/50 via-slate-100 to-slate-50 border border-slate-300 shadow-xs flex flex-col justify-between p-4 text-center transition-all">
                    <div className="flex items-center justify-center">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-black shadow-xs"
                        style={{ backgroundColor: team2?.color || '#64748b' }}
                      >
                        {team2?.code ? team2.code[0] : 'T'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="inline-block text-xs font-mono font-bold text-slate-700 bg-slate-200/70 border border-slate-300 px-2.5 py-0.5 rounded-full">
                        {t2Share}% Battle Share
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium font-mono">
                        {team2?.scored_competitions_count || 0} events scored
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Minimal Bottom Baseline / Executive Summary */}
              <div className="text-center pt-6 mt-4 border-t border-slate-100">
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  {team1 && team2 ? (
                    <>
                      <span className="font-bold text-slate-900">{team1.name}</span> holds a{' '}
                      <span className="font-bold text-amber-900">+{duelGap.toFixed(1)} point</span> lead over{' '}
                      <span className="font-bold text-slate-900">{team2.name}</span> with{' '}
                      <span className="font-mono font-bold text-slate-800">{60 - publishedEventsCount}</span> programmes remaining.
                    </>
                  ) : (
                    'Championship points will calculate as competition results publish.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Any remaining houses beyond the Top 2 (Resilient) */}
          {teams.length > 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {teams.slice(2).map((team, idx) => (
                <div key={team.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: team.color || '#94a3b8' }}
                    >
                      {team.code ? team.code[0] : 'T'}
                    </div>
                    <div>
                      <span className="text-xs font-mono text-slate-400 font-bold">RANK #{idx + 3}</span>
                      <div className="font-bold text-slate-900 text-sm">{team.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-slate-900">{Number(team.total_points).toFixed(1)}</div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">PTS</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Group / Division Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Division Points Breakdown (J1, J2, Junior, Senior, General)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Points accrued by each House in official category divisions.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                    <th className="py-3 px-4">House Team</th>
                    {groupColumns.map((grp) => (
                      <th key={grp.code} className="py-3 px-4 text-center">
                        {grp.name} ({grp.code})
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teams.map((t) => {
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span>{t.name}</span>
                        </td>
                        {groupColumns.map((grp) => {
                          const match = (teamData?.groupBreakdown || []).find(
                            (r) => r.team_id === t.id && r.group_code === grp.code
                          );
                          const pts = Number(match?.points || 0);
                          return (
                            <td key={grp.code} className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                              {pts > 0 ? pts.toFixed(1) : <span className="text-slate-400">0</span>}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right font-mono font-black text-amber-900 text-base">
                          {Number(t.total_points).toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Event Type Breakdown (Stage vs Off-Stage) */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Event Discipline Breakdown (Stage vs Off-Stage)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['STAGE', 'OFF_STAGE', 'GENERAL'].map((typeCode) => {
                const title = typeCode === 'STAGE' ? 'Stage Events' : typeCode === 'OFF_STAGE' ? 'Off-Stage Events' : 'General Events';
                return (
                  <div key={typeCode} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
                      {title}
                    </span>
                    <div className="space-y-2">
                      {teams.map((t) => {
                        const match = (teamData?.typeBreakdown || []).find(
                          (r) => r.team_id === t.id && r.type_name === typeCode
                        );
                        const pts = Number(match?.points || 0);
                        return (
                          <div key={t.id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                              {t.name}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {pts.toFixed(1)} pts
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
          <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search contestant or code..."
                value={individualSearch}
                onChange={(e) => setIndividualSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Division & Team Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
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
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
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
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
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
                <tbody className="divide-y divide-slate-100">
                  {filteredIndividuals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-medium text-xs">
                        No contestant records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredIndividuals.map((item, idx) => {
                      const isExpanded = expandedParticipantId === item.participant_id;
                      const isTop3 = idx < 3 && Number(item.total_points) > 0;

                      return (
                        <React.Fragment key={item.participant_id}>
                          <tr className="hover:bg-slate-50/90 transition-colors">
                            {/* Rank Badge */}
                            <td className="py-3 px-4 text-center">
                              {isTop3 ? (
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shadow-xs ${
                                    idx === 0
                                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                                      : idx === 1
                                      ? 'bg-slate-200 text-slate-800 ring-2 ring-slate-300'
                                      : 'bg-amber-100 text-amber-900 ring-2 ring-amber-200'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                              ) : (
                                <span className="font-mono text-xs font-bold text-slate-400">
                                  {idx + 1}
                                </span>
                              )}
                            </td>

                            {/* Contestant Name & Code */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-sm">{item.participant_name}</div>
                              <span className="font-mono text-xs text-amber-950 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 inline-block mt-0.5">{item.participant_code}</span>
                            </td>

                            {/* House Team */}
                            <td className="py-3 px-4">
                              <span
                                className="px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                                style={{ backgroundColor: `${item.team_color}18`, color: item.team_color, border: `1px solid ${item.team_color}40` }}
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.team_color }} />
                                {item.team_name}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4">
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {item.category_name}
                              </span>
                            </td>

                            {/* Events Count */}
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                              {item.scored_events_count}
                            </td>

                            {/* Podium Finishes */}
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 text-xs font-mono">
                                <span className="text-amber-800 font-bold" title="1st Place">{item.first_places}</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-slate-600 font-bold" title="2nd Place">{item.second_places}</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-amber-700 font-bold" title="3rd Place">{item.third_places}</span>
                              </div>
                            </td>

                            {/* Grades Distribution */}
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 text-xs font-bold">
                                {item.a_plus_count > 0 && <span className="text-amber-950 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{item.a_plus_count} A+</span>}
                                {item.a_count > 0 && <span className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{item.a_count} A</span>}
                                {item.b_count > 0 && <span className="text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">{item.b_count} B</span>}
                                {item.c_count > 0 && <span className="text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">{item.c_count} C</span>}
                                {item.a_plus_count === 0 && item.a_count === 0 && item.b_count === 0 && item.c_count === 0 && (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </div>
                            </td>

                            {/* Total Points */}
                            <td className="py-3 px-4 text-right">
                              <span className="font-mono text-base font-black text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
                                {Number(item.total_points).toFixed(1)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-center">
                              <button
                                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
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
                            <tr className="bg-slate-50/70">
                              <td colSpan={9} className="p-4 border-y border-slate-200">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                      <FileCheck2 className="w-3.5 h-3.5 text-amber-700" />
                                      Scored Events Breakdown for {item.participant_name}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono font-bold">
                                      {item.events.length} published event(s)
                                    </span>
                                  </div>

                                  {item.events.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">
                                      No published event marks found for this contestant yet.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {item.events.map((ev) => (
                                        <div
                                          key={ev.result_id}
                                          className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                              #{ev.programme_number}
                                            </span>
                                            <span className="font-mono font-black text-amber-900 text-sm">
                                              +{Number(ev.points_awarded || ev.final_score || 0).toFixed(1)} PTS
                                            </span>
                                          </div>
                                          <div className="font-semibold text-slate-900 truncate" title={ev.competition_name}>
                                            {ev.competition_name}
                                          </div>
                                          <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100">
                                            <span>
                                              Grade:{' '}
                                              <strong className="text-slate-900 font-bold">{ev.grade || '—'}</strong>
                                              {ev.grade_marks ? ` (${ev.grade_marks}m)` : ''}
                                            </span>
                                            <span>
                                              Place:{' '}
                                              <strong className="text-slate-900 font-bold">
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POINTS LEDGER LOG & AUDIT                                          */}
      {/* ========================================================================= */}
      {activeTab === 'LOG' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search event name, code, contestant..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>

            <select
              value={logTeamFilter}
              onChange={(e) => setLogTeamFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
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
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
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
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {filteredLog.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                        No points awarded yet. Once competitions are scored and results published, points will record here.
                      </td>
                    </tr>
                  ) : (
                    filteredLog.map((log) => (
                      <tr key={log.point_id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-sans">
                          {new Date(log.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-800">
                          <span className="bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full text-xs">
                            {log.programme_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold font-sans text-slate-900">
                          {log.competition_name}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-600">
                          {log.participant_name ? `${log.participant_name} (${log.participant_code})` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2.5 py-0.5 rounded-full font-sans font-bold text-xs border"
                            style={{ 
                              backgroundColor: `${log.team_color}15`, 
                              color: log.team_color,
                              borderColor: `${log.team_color}35`
                            }}
                          >
                            {log.team_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600 font-sans">
                          {log.grade ? (
                            <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              {log.grade}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-700 font-sans">
                          {log.position ? `${log.position} Place` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-900 text-sm">
                          +{Number(log.points).toFixed(1)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
