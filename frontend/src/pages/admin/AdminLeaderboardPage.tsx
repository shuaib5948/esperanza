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
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';

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
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/90 border border-slate-800 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>OFFICIAL POINTS CONTROLLER</span>
            </span>
            <span className="text-xs text-slate-500">• Admin Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Festival Leaderboard & Points Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Live aggregation and granular ledger for Team House points, division breakdowns, and individual contestant rankings.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isGlobalFetching}
            title="Refresh Points Data"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isGlobalFetching ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (window.confirm('Recalculate and re-synchronize all team points from all published results?')) {
                recalculateMutation.mutate();
              }
            }}
            isLoading={recalculateMutation.isPending}
            title="Re-sync team_points table with all published results"
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            <span>Recalculate Points</span>
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Leading House */}
        <Card className="p-4 bg-slate-900/60 border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leading House</span>
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {leader ? leader.name : '—'}
            </span>
            <span className="text-sm font-bold text-amber-400">
              {leader ? `${Number(leader.total_points).toFixed(1)} PTS` : ''}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {runnerUp ? `+${pointGap.toFixed(1)} pts ahead of ${runnerUp.name}` : 'Awaiting published scores'}
          </p>
        </Card>

        {/* Individual Champion */}
        <Card className="p-4 bg-slate-900/60 border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Contestant</span>
            <Medal className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-black text-white truncate max-w-[170px]" title={topIndividual?.participant_name}>
              {topIndividual ? topIndividual.participant_name : '—'}
            </span>
            <span className="text-sm font-bold text-indigo-400 shrink-0">
              {topIndividual ? `${Number(topIndividual.total_points).toFixed(1)} PTS` : ''}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {topIndividual ? `${topIndividual.team_name} • ${topIndividual.category_name}` : 'No points awarded yet'}
          </p>
        </Card>

        {/* Total Points Awarded */}
        <Card className="p-4 bg-slate-900/60 border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Points Scored</span>
            <Award className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">
              {totalFestivalPoints.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-bold">TOTAL PTS</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Distributed across published results
          </p>
        </Card>

        {/* Scored Events Count */}
        <Card className="p-4 bg-slate-900/60 border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Programmes Scored</span>
            <ListOrdered className="w-5 h-5 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {Math.max(...teams.map((t) => Number(t.scored_competitions_count) || 0), 0)}
            </span>
            <span className="text-xs text-slate-400 font-bold">/ 60 PROGRAMMES</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            With official published results
          </p>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('TEAMS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'TEAMS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Team House Standings</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'TEAMS' ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-800 text-slate-400'}`}>
            {teams.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('INDIVIDUAL')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'INDIVIDUAL'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Individual Contestants</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'INDIVIDUAL' ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-800 text-slate-400'}`}>
            {individualData.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('LOG')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'LOG'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Points Ledger Log</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'LOG' ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-800 text-slate-400'}`}>
            {pointsLog.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TEAM HOUSE STANDINGS & GROUP BREAKDOWNS                            */}
      {/* ========================================================================= */}
      {activeTab === 'TEAMS' && (
        <div className="space-y-6">
          {/* Main House Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team, idx) => {
              const isFirst = idx === 0;
              const percentage = Math.min(100, Math.round((Number(team.total_points) / maxPoints) * 100));

              return (
                <div
                  key={team.id}
                  className={`rounded-2xl border p-6 transition-all relative overflow-hidden ${
                    isFirst
                      ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 border-indigo-500/40 shadow-xl'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  {isFirst && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>LEADER</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg"
                      style={{ backgroundColor: team.color || '#4f46e5' }}
                    >
                      {team.code ? team.code[0] : 'T'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">PLACE {idx + 1}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {team.code}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-white mt-0.5">{team.name}</h2>
                    </div>
                  </div>

                  {/* Total Points */}
                  <div className="mt-6 flex items-baseline justify-between border-b border-slate-800/80 pb-4">
                    <div>
                      <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-purple-200">
                        {Number(team.total_points).toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-bold ml-2">TOTAL POINTS</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {team.scored_competitions_count} events scored
                    </span>
                  </div>

                  {/* Relative Points Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-400 font-medium mb-1.5">
                      <span>Standing Share</span>
                      <span className="font-bold text-slate-200">{percentage}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: team.color || '#4f46e5',
                        }}
                      />
                    </div>
                  </div>

                  {/* Podium & Grade Breakdown Matrix */}
                  <div className="mt-6 grid grid-cols-2 gap-3 pt-2">
                    {/* Podium Finishes */}
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Podium Finishes
                      </span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-400 font-bold">1st: {team.first_places}</span>
                        <span className="text-slate-300 font-bold">2nd: {team.second_places}</span>
                        <span className="text-amber-600 font-bold">3rd: {team.third_places}</span>
                      </div>
                    </div>

                    {/* Grade Distribution */}
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Top Grades
                      </span>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-emerald-400">A+: {team.a_plus_count}</span>
                        <span className="text-indigo-400">A: {team.a_count}</span>
                        <span className="text-amber-400">B: {team.b_count}</span>
                        <span className="text-slate-400">C: {team.c_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Group / Division Breakdown Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Division Points Breakdown (J1, J2, Junior, Senior, General)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Points accrued by each House in official category divisions.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">House Team</th>
                    {groupColumns.map((grp) => (
                      <th key={grp.code} className="py-3 px-4 text-center">
                        {grp.name} ({grp.code})
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teams.map((t) => {
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span>{t.name}</span>
                        </td>
                        {groupColumns.map((grp) => {
                          const match = (teamData?.groupBreakdown || []).find(
                            (r) => r.team_id === t.id && r.group_code === grp.code
                          );
                          const pts = Number(match?.points || 0);
                          return (
                            <td key={grp.code} className="py-3 px-4 text-center font-mono font-bold text-slate-300">
                              {pts > 0 ? pts.toFixed(1) : <span className="text-slate-600">0</span>}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-right font-mono font-black text-indigo-400 text-base">
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
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Event Discipline Breakdown (Stage vs Off-Stage)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['STAGE', 'OFF_STAGE', 'GENERAL'].map((typeCode) => {
                const title = typeCode === 'STAGE' ? 'Stage Events' : typeCode === 'OFF_STAGE' ? 'Off-Stage Events' : 'General Events';
                return (
                  <div key={typeCode} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
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
                            <span className="text-slate-300 font-medium flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                              {t.name}
                            </span>
                            <span className="font-mono font-bold text-white">
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
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search contestant or code..."
                value={individualSearch}
                onChange={(e) => setIndividualSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Division & Team Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-950/60">
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
                <tbody className="divide-y divide-slate-800/60">
                  {filteredIndividuals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        No contestant records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredIndividuals.map((item, idx) => {
                      const isExpanded = expandedParticipantId === item.participant_id;
                      const isTop3 = idx < 3 && Number(item.total_points) > 0;

                      return (
                        <React.Fragment key={item.participant_id}>
                          <tr className="hover:bg-slate-800/20 transition-colors">
                            {/* Rank Badge */}
                            <td className="py-3 px-4 text-center">
                              {isTop3 ? (
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs shadow-md ${
                                    idx === 0
                                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                                      : idx === 1
                                      ? 'bg-slate-300 text-slate-950 ring-2 ring-slate-100'
                                      : 'bg-amber-700 text-white ring-2 ring-amber-500'
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
                              <div className="font-bold text-white text-sm">{item.participant_name}</div>
                              <span className="font-mono text-xs text-slate-500">{item.participant_code}</span>
                            </td>

                            {/* House Team */}
                            <td className="py-3 px-4">
                              <span
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white inline-flex items-center gap-1.5"
                                style={{ backgroundColor: `${item.team_color}30`, border: `1px solid ${item.team_color}60` }}
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.team_color }} />
                                {item.team_name}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4">
                              <Badge variant="neutral" size="sm">
                                {item.category_name}
                              </Badge>
                            </td>

                            {/* Events Count */}
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-300">
                              {item.scored_events_count}
                            </td>

                            {/* Podium Finishes */}
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 text-xs font-mono">
                                <span className="text-amber-400 font-bold" title="1st Place">{item.first_places}</span>
                                <span className="text-slate-600">/</span>
                                <span className="text-slate-300 font-bold" title="2nd Place">{item.second_places}</span>
                                <span className="text-slate-600">/</span>
                                <span className="text-amber-600 font-bold" title="3rd Place">{item.third_places}</span>
                              </div>
                            </td>

                            {/* Grades Distribution */}
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 text-xs font-bold">
                                {item.a_plus_count > 0 && <span className="text-emerald-400">{item.a_plus_count} A+</span>}
                                {item.a_count > 0 && <span className="text-indigo-400">{item.a_count} A</span>}
                                {item.b_count > 0 && <span className="text-amber-400">{item.b_count} B</span>}
                                {item.c_count > 0 && <span className="text-slate-400">{item.c_count} C</span>}
                                {item.a_plus_count === 0 && item.a_count === 0 && item.b_count === 0 && item.c_count === 0 && (
                                  <span className="text-slate-600 text-xs">—</span>
                                )}
                              </div>
                            </td>

                            {/* Total Points */}
                            <td className="py-3 px-4 text-right">
                              <span className="font-mono text-base font-black text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                                {Number(item.total_points).toFixed(1)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
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
                              </Button>
                            </td>
                          </tr>

                          {/* Expanded Event Breakdown Row */}
                          {isExpanded && (
                            <tr className="bg-slate-950/80">
                              <td colSpan={9} className="p-4 border-y border-slate-800/80">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                      <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
                                      Scored Events Breakdown for {item.participant_name}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">
                                      {item.events.length} published event(s)
                                    </span>
                                  </div>

                                  {item.events.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic">
                                      No published event marks found for this contestant yet.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {item.events.map((ev) => (
                                        <div
                                          key={ev.result_id}
                                          className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-indigo-400">
                                              {ev.programme_number}
                                            </span>
                                            <span className="font-mono font-black text-amber-300 text-sm">
                                              +{Number(ev.points_awarded || ev.final_score || 0).toFixed(1)} PTS
                                            </span>
                                          </div>
                                          <div className="font-semibold text-white truncate" title={ev.competition_name}>
                                            {ev.competition_name}
                                          </div>
                                          <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                                            <span>
                                              Grade:{' '}
                                              <strong className="text-emerald-400 font-bold">{ev.grade || '—'}</strong>
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POINTS LEDGER LOG & AUDIT                                          */}
      {/* ========================================================================= */}
      {activeTab === 'LOG' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search event name, code, contestant..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={logTeamFilter}
              onChange={(e) => setLogTeamFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-950/60">
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
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {filteredLog.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                        No points awarded yet. Once competitions are scored and results published, points will record here.
                      </td>
                    </tr>
                  ) : (
                    filteredLog.map((log) => (
                      <tr key={log.point_id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-sans">
                          {new Date(log.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-400">
                          {log.programme_number}
                        </td>
                        <td className="py-3 px-4 font-bold font-sans text-white">
                          {log.competition_name}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-200">
                          {log.participant_name ? `${log.participant_name} (${log.participant_code})` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-0.5 rounded font-sans font-bold text-xs"
                            style={{ backgroundColor: `${log.team_color}25`, color: log.team_color }}
                          >
                            {log.team_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-400 font-sans">
                          {log.grade || '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-300 font-sans">
                          {log.position ? `${log.position} Place` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-400 text-sm">
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
